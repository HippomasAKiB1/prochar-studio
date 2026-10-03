import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./client";

export const metadata: Metadata = {
  title: "লগইন — Prochar Studio",
  description: "প্রচার স্টুডিও অ্যাকাউন্টে প্রবেশ করুন।",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          লোড হচ্ছে...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
