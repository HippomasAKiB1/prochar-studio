import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./client";
import { metaMessages, commonMessages } from "@/messages/bn";

export const metadata: Metadata = {
  title: metaMessages.loginTitle,
  description: metaMessages.loginDesc,
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          {commonMessages.loading}
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
