import { Suspense } from "react";
import type { Metadata } from "next";
import { PosterProgressView } from "./client";
import { metaMessages, commonMessages } from "@/messages/bn";

export const metadata: Metadata = {
  title: metaMessages.posterDetailTitle,
  description: metaMessages.posterDetailDesc,
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
          {commonMessages.loading}
        </div>
      }
    >
      <PosterProgressView posterId={params.id} />
    </Suspense>
  );
}
