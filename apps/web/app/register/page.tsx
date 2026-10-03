import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "./client";
import { metaMessages, commonMessages } from "@/messages/bn";

export const metadata: Metadata = {
  title: metaMessages.registerTitle,
  description: metaMessages.registerDesc,
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          {commonMessages.loading}
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
