import { Suspense } from "react";
import type { Metadata } from "next";
import { TemplatesGallery } from "./client";
import { metaMessages, commonMessages } from "@/messages/bn";

export const metadata: Metadata = {
  title: metaMessages.templatesTitle,
  description: metaMessages.templatesDesc,
};

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          {commonMessages.loading}
        </div>
      }
    >
      <TemplatesGallery />
    </Suspense>
  );
}
