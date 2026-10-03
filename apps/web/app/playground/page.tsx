import { notFound } from "next/navigation";
import { PlaygroundClient } from "./client";

export const metadata = { title: "UI playground (dev only)", robots: { index: false } };

// Dev-only: hidden in production builds. Delete this route before final submission.
export default function PlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PlaygroundClient />;
}
