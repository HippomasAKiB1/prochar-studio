import { Suspense } from "react";
import type { Metadata } from "next";
import { PostersHistoryView } from "./client";

export const metadata: Metadata = {
  title: "আমার পোস্টার — Prochar Studio",
  description: "আপনার তৈরি করা সকল প্রচার পোস্টারের তালিকা ও ইতিহাস।",
};

export default function PostersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          লোড হচ্ছে...
        </div>
      }
    >
      <PostersHistoryView />
    </Suspense>
  );
}
