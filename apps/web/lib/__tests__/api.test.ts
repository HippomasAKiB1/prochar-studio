import { describe, it, expect, vi, afterEach } from "vitest";
import { get, post, del, ApiError, parseErrorBody } from "../api";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("parses the nested error envelope", () => {
    const e = parseErrorBody({ error: { code: "NOT_FOUND", message: "nope", details: [1] } }, 404);
    expect(e).toBeInstanceOf(ApiError);
    expect([e.code, e.message, e.status, e.details]).toEqual(["NOT_FOUND", "nope", 404, [1]]);
  });

  it("parses the flat auth error shape", () => {
    const e = parseErrorBody({ error: "UNAUTHORIZED", message: "bad creds" }, 401);
    expect([e.code, e.message]).toEqual(["UNAUTHORIZED", "bad creds"]);
  });

  it("throws ApiError on non-2xx and sends credentials", async () => {
    const f = mockFetch(401, { error: { code: "UNAUTHORIZED", message: "x" } });
    await expect(get("/api/auth/me")).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(f.mock.calls[0][1].credentials).toBe("include");
  });

  it("posts JSON and returns parsed data", async () => {
    const f = mockFetch(200, { ok: true });
    await expect(post("/api/x", { a: 1 })).resolves.toEqual({ ok: true });
    expect(f.mock.calls[0][1].body).toBe('{"a":1}');
  });

  it("returns undefined on 204", async () => {
    mockFetch(204, null);
    await expect(del("/api/posters/1")).resolves.toBeUndefined();
  });

  it("maps network failure to NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(get("/api/x")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
