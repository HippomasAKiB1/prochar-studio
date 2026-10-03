"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Eye, DownloadSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  Card,
  EmptyState,
  Skeleton,
  Stamp,
  useToast,
  useConfirm,
} from "@/components/ui";
import { AppHeader } from "@/components/layout/AppHeader";
import { get, del, ApiError } from "@/lib/api";
import { toBanglaNumber, formatBanglaDate } from "@/lib/format";
import { postersHistoryMessages, posterProgressMessages, commonMessages } from "@/messages/bn";

export interface PosterListItem {
  id: string;
  status: "draft" | "generating" | "completed" | "failed";
  stage?: string;
  generatedImageUrl?: string;
  headline?: string;
  occasionType?: string;
  createdAt: string;
  retriesLeft: number;
}

interface PostersResponse {
  items: PosterListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserProfile {
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
  };
}

export function PostersHistoryView() {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // 1. Current user
  const { data: authData } = useQuery<UserProfile>({
    queryKey: ["auth", "me"],
    queryFn: () => get<UserProfile>("/api/auth/me"),
    staleTime: 60_000,
  });

  const userId = authData?.user?.id;

  // 2. Posters list with pagination
  const {
    data: postersData,
    isLoading,
    isError,
    refetch,
  } = useQuery<PostersResponse>({
    queryKey: ["posters", userId, page],
    queryFn: () => get<PostersResponse>(`/api/posters/user/${userId}?page=${page}&limit=12`),
    enabled: !!userId,
    staleTime: 10_000,
  });

  // Delete handler with confirm dialog and optimistic removal
  const handleDelete = async (posterId: string, status: string) => {
    if (status === "generating") {
      toast(postersHistoryMessages.cannotDeleteWhileGenerating, "error");
      return;
    }

    const confirmed = await confirm({
      title: postersHistoryMessages.deleteConfirmTitle,
      message: postersHistoryMessages.deleteConfirmMessage,
      confirmLabel: postersHistoryMessages.deleteAction,
      cancelLabel: commonMessages.cancel,
      destructive: true,
    });

    if (!confirmed) return;

    // Snapshot previous data for rollback
    const queryKey = ["posters", userId, page];
    const previousData = queryClient.getQueryData<PostersResponse>(queryKey);

    // Optimistic update
    if (previousData) {
      queryClient.setQueryData<PostersResponse>(queryKey, {
        ...previousData,
        items: previousData.items.filter((item) => item.id !== posterId),
        total: Math.max(0, previousData.total - 1),
      });
    }

    try {
      await del(`/api/posters/${posterId}`);
      toast(postersHistoryMessages.deleteSuccessToast, "success");
      await queryClient.invalidateQueries({ queryKey: ["posters", userId] });
    } catch (err: unknown) {
      // Rollback
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      if (err instanceof ApiError) {
        toast(err.message, "error");
      } else {
        toast(postersHistoryMessages.deleteErrorToast, "error");
      }
    }
  };

  const posters = postersData?.items || [];
  const totalPages = postersData?.totalPages || 1;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <AppHeader />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {/* Double-ruled Title */}
        <div className="border-y-4 border-double border-ink py-2 text-center mb-8">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {postersHistoryMessages.pageTitle}
          </h1>
          <p className="font-body text-sm text-ink/80 mt-1">
            {postersHistoryMessages.pageSubtitle}
          </p>
        </div>

        {/* Loading State: 6 Skeleton cards */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border-2 border-ink rounded bg-paper-hi p-4 shadow-hard flex flex-col gap-3"
              >
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="py-12">
            <EmptyState
              message={postersHistoryMessages.loadError}
              action={
                <Button variant="secondary" onClick={() => refetch()}>
                  {commonMessages.retry}
                </Button>
              }
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && posters.length === 0 && (
          <div className="py-12">
            <EmptyState
              message={postersHistoryMessages.emptyList}
              action={
                <Link href="/templates">
                  <Button size="lg">{postersHistoryMessages.createButton}</Button>
                </Link>
              }
            />
          </div>
        )}

        {/* Grid of Posters */}
        {!isLoading && !isError && posters.length > 0 && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {posters.map((poster) => {
                const jobCaption = `JOB № ${poster.id.slice(-6).toUpperCase()}`;
                const formattedDate = formatBanglaDate(poster.createdAt);

                return (
                  <Card
                    key={poster.id}
                    cropMarks
                    caption={jobCaption}
                    className="h-full flex flex-col justify-between bg-paper-hi"
                  >
                    <div>
                      {/* Thumbnail Container */}
                      <Link
                        href={`/posters/${poster.id}`}
                        className="block aspect-[3/4] w-full border border-ink bg-paper relative overflow-hidden mb-3 group focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard rounded"
                      >
                        {/* Status Stamp */}
                        <div className="absolute top-2 right-2 z-10 scale-90">
                          {poster.status === "completed" && <Stamp variant="ready">{posterProgressMessages.readyStamp}</Stamp>}
                          {(poster.status === "generating" || poster.status === "draft") && (
                            <Stamp variant="working">{posterProgressMessages.workingStamp}</Stamp>
                          )}
                          {poster.status === "failed" && <Stamp variant="failed">{posterProgressMessages.failedStamp}</Stamp>}
                        </div>

                        {poster.generatedImageUrl ? (
                          <img
                            src={poster.generatedImageUrl}
                            alt={poster.headline || postersHistoryMessages.fallbackThumbnail}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-paper halftone">
                            <span className="font-display font-bold text-sm text-ink">
                              {poster.status === "generating" ? postersHistoryMessages.printingThumbnail : postersHistoryMessages.fallbackThumbnail}
                            </span>
                          </div>
                        )}
                      </Link>

                      {/* Headline & Date */}
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/posters/${poster.id}`}
                          className="font-display font-bold text-sm sm:text-base text-ink hover:text-press-red transition-colors line-clamp-2 focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
                        >
                          {poster.headline || postersHistoryMessages.untitledPoster}
                        </Link>
                        {formattedDate && (
                          <span className="font-mono text-xs text-ink/70">{formattedDate}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Row: Open · Download · Delete */}
                    <div className="flex items-center justify-between gap-1 pt-3 mt-3 border-t border-ink/30">
                      <Link
                        href={`/posters/${poster.id}`}
                        aria-label={postersHistoryMessages.openAction}
                        title={postersHistoryMessages.openAction}
                        className="flex-1 min-h-10 py-1 inline-flex items-center justify-center border border-ink rounded bg-paper hover:bg-lime-wash text-ink transition-[transform,box-shadow] duration-[80ms] active:scale-95 focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
                      >
                        <Eye size={16} weight="bold" />
                      </Link>

                      {poster.status === "completed" ? (
                        <a
                          href={`/api/posters/${poster.id}/download?format=png`}
                          download
                          aria-label={postersHistoryMessages.downloadAction}
                          title={postersHistoryMessages.downloadAction}
                          className="flex-1 min-h-10 py-1 inline-flex items-center justify-center border border-ink rounded bg-paper hover:bg-lime-wash text-press-red transition-[transform,box-shadow] duration-[80ms] active:scale-95 focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
                        >
                          <DownloadSimple size={16} weight="bold" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          title={postersHistoryMessages.downloadUnavailable}
                          className="flex-1 min-h-10 py-1 inline-flex items-center justify-center border border-ink/40 rounded bg-lime-wash text-ink/30 cursor-not-allowed"
                        >
                          <DownloadSimple size={16} weight="bold" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(poster.id, poster.status)}
                        disabled={poster.status === "generating"}
                        aria-label={postersHistoryMessages.deleteAction}
                        title={
                          poster.status === "generating"
                            ? postersHistoryMessages.cannotDeleteWhileGenerating
                            : postersHistoryMessages.deleteAction
                        }
                        className="flex-1 min-h-10 py-1 inline-flex items-center justify-center border border-ink rounded bg-paper hover:bg-press-red/10 text-press-red-deep disabled:opacity-40 disabled:pointer-events-none transition-[transform,box-shadow] duration-[80ms] active:scale-95 focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-4 border-t-2 border-ink">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-12"
                >
                  <ArrowLeft size={16} weight="bold" />
                  <span>{commonMessages.previous}</span>
                </Button>

                <span className="font-body text-sm font-semibold text-ink px-2">
                  {commonMessages.page} {toBanglaNumber(page)} / {toBanglaNumber(totalPages)}
                </span>

                <Button
                  variant="secondary"
                  size="md"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-12"
                >
                  <span>{commonMessages.next}</span>
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-hi py-4 text-center text-xs font-body text-ink/70 mt-auto">
        {commonMessages.footerCopyright}
      </footer>
    </div>
  );
}
