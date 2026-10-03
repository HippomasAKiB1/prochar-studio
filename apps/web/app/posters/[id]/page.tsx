import { Suspense } from "react";
import type { Metadata } from "next";
import { PosterProgressView } from "./client";

export const metadata: Metadata = {
  title: "পোস্টার রূপরেখা ও প্রস্তুতি — Prochar Studio",
  description: "পোস্টার তৈরি ও ডাউনলোডের অগ্রগতি।",
};

interface PageProps {
  params: {
    id: string;
  };
}

export default function PosterPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-body">
          লোড হচ্ছে...
        </div>
      }
    >
      <PosterProgressView posterId={params.id} />
    </Suspense>
  );
}
