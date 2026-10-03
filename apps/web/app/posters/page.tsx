import type { Metadata } from "next";
import { PostersHistoryView } from "./client";
import { metaMessages } from "@/messages/bn";

export const metadata: Metadata = {
  title: metaMessages.postersTitle,
  description: metaMessages.postersDesc,
};

export default function PostersPage() {
  return <PostersHistoryView />;
}
