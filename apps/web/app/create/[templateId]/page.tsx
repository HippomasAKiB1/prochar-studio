import { Suspense } from "react";
import type { Metadata } from "next";
import { CreatePosterForm } from "./client";

export const metadata: Metadata = {
  title: "নতুন পোস্টার — Prochar Studio",
  description: "তথ্য দিন ও পোস্টার তৈরি করুন।",
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
          লোড হচ্ছে...
        </div>
      }
    >
      <CreatePosterForm templateId={params.templateId} />
    </Suspense>
  );
}
