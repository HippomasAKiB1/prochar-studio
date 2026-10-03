import { Suspense } from "react";
import type { Metadata } from "next";
import { CreatePosterForm } from "./client";
import { metaMessages, commonMessages } from "@/messages/bn";

export const metadata: Metadata = {
  title: metaMessages.createTitle,
  description: metaMessages.createDesc,
};

interface PageProps {
  params: {
    templateId: string;
  };
}

export default function CreatePosterPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          {commonMessages.loading}
        </div>
      }
    >
      <CreatePosterForm templateId={params.templateId} />
    </Suspense>
  );
}
