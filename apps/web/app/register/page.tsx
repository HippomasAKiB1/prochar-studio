import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "./client";

export const metadata: Metadata = {
  title: "নিবন্ধন — Prochar Studio",
  description: "প্রচার স্টুডিওতে নতুন অ্যাকাউন্ট তৈরি করুন।",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          লোড হচ্ছে...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
