"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ArrowLeft, CaretDown, CaretUp, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, EmptyState, Input, Skeleton, Textarea, Stamp, Stepper, useToast } from "@/components/ui";
import { AppHeader } from "@/components/layout/AppHeader";
import { get, post, ApiError } from "@/lib/api";
import { toBanglaNumber } from "@/lib/format";
import { posterProgressMessages, navMessages, createMessages, commonMessages } from "@/messages/bn";

export interface PosterDetail {
  id: string;
  status: "queued" | "generating" | "completed" | "failed";
  stage?: "queued" | "photos" | "layout" | "rendering" | "saving" | "done";
  generatedImageUrl?: string;
  formData: {
    name: string;
    designation: string;
    partyOrOrganization: string;
    union?: string;
    thana?: string;
    district: string;
    occasionType: string;
    headline: string;
    subtext?: string;
    creditLine?: string;
  };
  retriesLeft: number;
  aiAssisted?: boolean;
  error?: { code: string; message: string };
}

interface RegenerateFormValues {
  headline: string;
  subtext: string;
  creditLine: string;
}

const STEPPER_STATIONS = [
  posterProgressMessages.stepperStations[0],
  posterProgressMessages.stepperStations[1],
  posterProgressMessages.stepperStations[2],
  posterProgressMessages.stepperStations[3],
];

function getStationIndex(stage?: string): number {
  switch (stage) {
    case "queued":
    case "photos":
      return 0;
    case "layout":
      return 1;
    case "rendering":
      return 2;
    case "saving":
    case "done":
      return 3;
    default:
      return 0;
  }
}

export function PosterProgressView({ posterId }: { posterId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const statusContainerRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Poll query
  const { data: poster, isLoading, isError } = useQuery<PosterDetail>({
    queryKey: ["poster", posterId],
    queryFn: () => get<PosterDetail>(`/api/posters/${posterId}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed") return false;
      if (elapsed >= 120) return false; // hard client timeout
      return elapsed >= 20 ? 4000 : 2000;
    },
    staleTime: 0,
  });

  // Track elapsed polling seconds
  useEffect(() => {
    if (!poster || poster.status === "completed" || poster.status === "failed") return;
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [poster?.status, poster]);

  // Focus management: focus status container after navigation
  useEffect(() => {
    if (statusContainerRef.current) {
      statusContainerRef.current.focus();
    }
  }, []);

  const { register, handleSubmit, reset } = useForm<RegenerateFormValues>({
    defaultValues: {
      headline: poster?.formData?.headline || "",
      subtext: poster?.formData?.subtext || "",
      creditLine: poster?.formData?.creditLine || "",
    },
  });

  // Keep form values in sync when poster loads
  useEffect(() => {
    if (poster?.formData) {
      reset({
        headline: poster.formData.headline || "",
        subtext: poster.formData.subtext || "",
        creditLine: poster.formData.creditLine || "",
      });
    }
  }, [poster?.formData, reset]);

  const onRegenerateSubmit = async (values: RegenerateFormValues) => {
    if (!poster || poster.retriesLeft <= 0) return;
    setRegenerating(true);
    try {
      await post(`/api/posters/${posterId}/regenerate`, {
        formData: {
          headline: values.headline,
          subtext: values.subtext || undefined,
          creditLine: values.creditLine || undefined,
        },
      });
      toast(posterProgressMessages.regenerateStartedToast, "success");
      setElapsed(0);
      setAccordionOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["poster", posterId] });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast(err.message, "error");
      } else {
        toast(posterProgressMessages.regenerateFailedToast, "error");
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleRetryFailed = async () => {
    // Note: until Phase 8 backend refinement, this calls regenerate directly (costs a retry)
    setRegenerating(true);
    try {
      await post(`/api/posters/${posterId}/regenerate`, {});
      toast(posterProgressMessages.retryStartedToast, "success");
      setElapsed(0);
      await queryClient.invalidateQueries({ queryKey: ["poster", posterId] });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast(err.message, "error");
      } else {
        toast(posterProgressMessages.retryFailedToast, "error");
      }
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-ink p-8">
        <div className="mx-auto max-w-4xl w-full flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !poster) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-ink p-4">
        <EmptyState
          message={posterProgressMessages.notFoundMessage}
          action={
            <Link href="/templates">
              <Button>{posterProgressMessages.createPosterButton}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isTimedOut = elapsed >= 120 && (poster.status === "generating" || poster.status === "queued");
  const jobCaption = `JOB № ${poster.id.slice(-6).toUpperCase()} · ${posterProgressMessages.jobDurationHint}`;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <AppHeader />

      {/* Sub Header / Breadcrumb */}
      <div className="border-b-2 border-ink bg-paper py-2 px-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 min-h-12 py-2 font-body font-semibold text-ink hover:text-press-red focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <ArrowLeft size={18} weight="bold" />
            <span>{navMessages.backToGallery}</span>
          </Link>
          <span className="font-mono text-xs uppercase tracking-wider text-ink/75">
            {navMessages.posterPreparation}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        {/* Double-ruled Title */}
        <div className="border-y-4 border-double border-ink py-2 text-center mb-6">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink">
            {poster.status === "completed"
              ? posterProgressMessages.statusCompletedHeading
              : poster.status === "failed" || isTimedOut
              ? posterProgressMessages.statusFailedHeading
              : posterProgressMessages.statusGeneratingHeading}
          </h1>
          <p className="font-body text-xs sm:text-sm text-ink/75 mt-0.5">
            {poster.formData?.headline || posterProgressMessages.defaultPosterHeadline}
          </p>
        </div>

        <div
          ref={statusContainerRef}
          tabIndex={-1}
          className="focus:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard rounded"
        >
          {/* ============================================================== */}
          {/* STATE 1: GENERATING OR QUEUED */}
          {/* ============================================================== */}
          {(poster.status === "generating" || poster.status === "queued") && !isTimedOut && (
            <div className="max-w-xl mx-auto flex flex-col items-center gap-8 py-6">
              {/* Stepper with aria-live */}
              <div aria-live="polite" className="w-full">
                <Stepper steps={STEPPER_STATIONS} current={getStationIndex(poster.stage)} />
              </div>

              {/* Proof Canvas with Sweeping Roller */}
              <div className="w-full max-w-sm">
                <Card cropMarks caption={jobCaption} className="bg-paper-hi">
                  <div className="aspect-[3/4] w-full border-2 border-ink rounded bg-lime-wash relative overflow-hidden flex flex-col items-center justify-center p-6 halftone">
                    {/* Sweeping press roller bar */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 w-10 bg-ink/75 animate-roller shadow-hard pointer-events-none"
                    />

                    <div className="relative z-10 bg-paper-hi border-2 border-ink rounded p-4 text-center shadow-hard max-w-[220px]">
                      <p className="font-display font-bold text-lg text-ink">{posterProgressMessages.printingHeadline}</p>
                      <p className="font-body text-xs text-ink/75 mt-1">{posterProgressMessages.printingSubtext}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="text-center font-mono text-xs text-ink/70">
                {posterProgressMessages.elapsedLabel} {toBanglaNumber(elapsed)} {posterProgressMessages.secondsSuffix}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE 2: FAILED OR CLIENT TIMEOUT */}
          {/* ============================================================== */}
          {(poster.status === "failed" || isTimedOut) && (
            <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-8">
              <div className="w-full">
                <Card cropMarks className="bg-paper-hi border-dashed">
                  <div className="aspect-[3/4] w-full border-2 border-dashed border-ink rounded bg-paper flex flex-col items-center justify-center p-6 text-center gap-4">
                    <Stamp variant="failed">{posterProgressMessages.failedStamp}</Stamp>
                    <p className="font-body text-base font-semibold text-press-red-deep">
                      {isTimedOut
                        ? posterProgressMessages.timeoutMessage
                        : poster.error?.message || posterProgressMessages.genericFailedMessage}
                    </p>
                    <p className="font-body text-xs text-ink/70">
                      {posterProgressMessages.noLossNote}
                    </p>
                  </div>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button size="lg" loading={regenerating} onClick={handleRetryFailed}>
                  {posterProgressMessages.retryButton}
                </Button>
                <Link href="/templates">
                  <Button variant="secondary" size="lg">
                    {posterProgressMessages.otherTemplateButton}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE 3: COMPLETED */}
          {/* ============================================================== */}
          {poster.status === "completed" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Proof Card (6 cols) */}
              <div className="md:col-span-6 flex flex-col items-center md:items-start gap-4">
                <Card cropMarks caption="1800 × 2400 PX · PNG" className="w-full max-w-md bg-paper-hi">
                  <div className="aspect-[3/4] w-full border-2 border-ink rounded bg-paper overflow-hidden relative">
                    {/* Stamp landing animation */}
                    <div className="absolute top-3 right-3 z-20 animate-stamp-land">
                      <Stamp variant="ready">{posterProgressMessages.readyStamp}</Stamp>
                    </div>

                    {poster.generatedImageUrl ? (
                      <img
                        src={poster.generatedImageUrl}
                        alt={posterProgressMessages.generatedPosterAlt}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center">
                        <span className="font-display font-bold text-ink">{posterProgressMessages.posterImageReadyPlaceholder}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {poster.aiAssisted === false && (
                  <p className="font-body text-xs text-ink/75 italic">
                    {posterProgressMessages.defaultLayoutNote}
                  </p>
                )}
              </div>

              {/* Right Column: Controls & Accordion (6 cols) */}
              <div className="md:col-span-6 flex flex-col gap-6">
                <div className="border-2 border-ink rounded bg-paper-hi p-6 shadow-hard flex flex-col gap-4">
                  <h2 className="font-display font-extrabold text-2xl text-ink">{posterProgressMessages.completedTitle}</h2>
                  <p className="font-body text-sm text-ink/80">
                    {posterProgressMessages.completedSubtext}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {/* Primary Download PNG button */}
                    <a
                      href={`/api/posters/${poster.id}/download?format=png`}
                      download
                      className="flex-1 inline-flex items-center justify-center gap-2 min-h-12 px-6 font-body font-bold text-paper-hi bg-press-red border-2 border-ink rounded shadow-hard transition-[transform,box-shadow] duration-[80ms] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                    >
                      <DownloadSimple size={20} weight="bold" />
                      <span>{posterProgressMessages.downloadPngButton}</span>
                    </a>

                    {/* Secondary PDF button (disabled) */}
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={posterProgressMessages.pdfComingSoonTitle}
                      className="inline-flex items-center justify-center min-h-12 px-5 font-body font-bold text-ink/40 bg-lime-wash border-2 border-ink/40 rounded cursor-not-allowed select-none"
                    >
                      {posterProgressMessages.pdfButtonComingSoon}
                    </button>
                  </div>
                </div>

                {/* Accordion: Edit Copy */}
                <div className="border-2 border-ink rounded bg-paper-hi p-5 sm:p-6 shadow-hard">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between min-h-12 font-display font-bold text-lg text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                  >
                    <span>{posterProgressMessages.editCopyTitle}</span>
                    {accordionOpen ? <CaretUp size={20} weight="bold" /> : <CaretDown size={20} weight="bold" />}
                  </button>

                  {accordionOpen && (
                    <div className="mt-5 pt-4 border-t-2 border-ink flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs font-semibold text-ink">
                          {poster.retriesLeft > 0 ? (
                            <span className="border border-ink rounded px-2 py-1 bg-mustard text-ink">
                              {posterProgressMessages.retriesRemaining(toBanglaNumber(poster.retriesLeft))}
                            </span>
                          ) : (
                            <span className="text-press-red-deep">
                              {posterProgressMessages.retriesExhausted}
                            </span>
                          )}
                        </span>
                      </div>

                      <form onSubmit={handleSubmit(onRegenerateSubmit)} className="flex flex-col gap-4">
                        <Input
                          id="edit-headline"
                          label={createMessages.headlineLabel}
                          bangla
                          {...register("headline")}
                        />
                        <Textarea
                          id="edit-subtext"
                          label={createMessages.subtextLabel}
                          bangla
                          rows={2}
                          {...register("subtext")}
                        />
                        <Input
                          id="edit-credit"
                          label={createMessages.creditLabel}
                          bangla
                          {...register("creditLine")}
                        />

                        <Button
                          type="submit"
                          loading={regenerating}
                          disabled={poster.retriesLeft <= 0 || regenerating}
                          className="w-full mt-2"
                        >
                          {posterProgressMessages.reprintButton}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-hi py-4 text-center text-xs font-body text-ink/70 mt-auto">
        {commonMessages.footerCopyright}
      </footer>
    </div>
  );
}
