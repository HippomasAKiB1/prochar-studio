import { Suspense } from "react";
import type { Metadata } from "next";
import { TemplatesGallery } from "./client";

export const metadata: Metadata = {
  title: "পোস্টার টেমপ্লেট — Prochar Studio",
  description: "প্রচার পোস্টারের জন্য টেমপ্লেট বেছে নিন।",
};

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          লোড হচ্ছে...
        </div>
      }
    >
      <TemplatesGallery />
    </Suspense>
  );
}
