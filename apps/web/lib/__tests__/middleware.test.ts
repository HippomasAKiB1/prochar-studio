import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware, COOKIE_NAME } from "../../middleware";

function createReq(url: string, cookieValue?: string) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"));
  if (cookieValue) {
    req.cookies.set(COOKIE_NAME, cookieValue);
  }
  return req;
}

describe("Route protection middleware", () => {
  it("redirects unauthenticated user from /templates to /login?next=/templates", () => {
    const req = createReq("http://localhost:3000/templates");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Ftemplates");
  });

  it("redirects unauthenticated user from /create/123?foo=bar to /login with next encoded", () => {
    const req = createReq("http://localhost:3000/create/123?foo=bar");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fcreate%2F123%3Ffoo%3Dbar");
  });

  it("allows authenticated user through to /templates", () => {
    const req = createReq("http://localhost:3000/templates", "valid-token-present");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated user through to public routes like / and /login", () => {
    const reqLanding = createReq("http://localhost:3000/");
    expect(middleware(reqLanding).status).toBe(200);

    const reqLogin = createReq("http://localhost:3000/login");
    expect(middleware(reqLogin).status).toBe(200);
  });
});
