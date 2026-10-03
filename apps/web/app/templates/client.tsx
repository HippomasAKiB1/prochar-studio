"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, Chip, EmptyState, Skeleton, Button } from "@/components/ui";
import { AppHeader } from "@/components/layout/AppHeader";
import { get } from "@/lib/api";

export interface TemplateSummary {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  occasionType: string;
  thumbnailUrl?: string;
}

const OCCASIONS = [
  { slug: "", label: "সব" },
  { slug: "victory_day", label: "বিজয় দিবস" },
  { slug: "condolence", label: "শোক/স্মরণ" },
  { slug: "campaign", label: "নির্বাচনী প্রচার" },
  { slug: "greetings", label: "শুভেচ্ছা" },
  { slug: "eid_festival", label: "ঈদ/উৎসব" },
] as const;

export function TemplatesGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentOccasion = searchParams.get("occasion") || "";

  const {
    data: templates,
    isLoading,
    isError,
    refetch,
  } = useQuery<TemplateSummary[]>({
    queryKey: ["templates", currentOccasion],
    queryFn: () => {
      const endpoint = currentOccasion
        ? `/api/templates?occasion=${encodeURIComponent(currentOccasion)}`
        : "/api/templates";
      return get<TemplateSummary[]>(endpoint);
    },
    staleTime: 30_000,
  });

  const handleSelectOccasion = (slug: string) => {
    if (slug) {
      router.push(`/templates?occasion=${encodeURIComponent(slug)}`);
    } else {
      router.push("/templates");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <AppHeader />

      {/* Sticky Chip Bar */}
      <div className="border-b-2 border-ink bg-paper py-3 px-4 sticky top-[65px] z-20 overflow-x-auto shadow-hard">
        <div className="mx-auto max-w-6xl flex items-center gap-2 sm:gap-3 min-w-max">
          {OCCASIONS.map((occ) => {
            const isSelected = currentOccasion === occ.slug;
            return (
              <Chip
                key={occ.slug || "all"}
                selected={isSelected}
                onClick={() => handleSelectOccasion(occ.slug)}
              >
                {occ.label}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink">
            পোস্টার টেমপ্লেট
          </h1>
          <p className="font-body text-base text-ink/80">
            যেকোনো একটি নকশা বেছে নিন এবং আপনার তথ্য দিয়ে পোস্টার তৈরি করুন।
          </p>
        </div>

        {/* Loading State: 6 Skeleton cards */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-2 border-ink rounded bg-paper-hi p-4 shadow-hard flex flex-col gap-3">
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
              message="টেমপ্লেট লোড করা যায়নি।"
              action={
                <Button variant="secondary" onClick={() => refetch()}>
                  আবার চেষ্টা করুন
                </Button>
              }
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && templates && templates.length === 0 && (
          <div className="py-12">
            <EmptyState message="এই বিভাগের টেমপ্লেট শিগগিরই আসছে।" />
          </div>
        )}

        {/* Grid of Templates */}
        {!isLoading && !isError && templates && templates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {templates.map((tpl, idx) => {
              const numStr = String(idx + 1).padStart(2, "0");
              const caption = `TEMPLATE № ${numStr}`;

              return (
                <Link
                  key={tpl.id}
                  href={`/create/${tpl.id}`}
                  className="group block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink rounded"
                >
                  <Card
                    cropMarks
                    caption={caption}
                    className="h-full flex flex-col justify-between transition-transform duration-[80ms] group-hover:-translate-y-1 group-active:translate-y-0"
                  >
                    <div className="aspect-[3/4] w-full border border-ink bg-paper flex items-center justify-center overflow-hidden mb-3">
                      {tpl.thumbnailUrl ? (
                        <img
                          src={tpl.thumbnailUrl}
                          alt={tpl.title}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-paper halftone">
                          <span className="font-display font-bold text-lg text-ink">
                            {tpl.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-base sm:text-lg text-ink group-hover:text-press-red transition-colors line-clamp-2">
                        {tpl.title}
                      </h2>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-hi py-4 text-center text-xs font-body text-ink/70 mt-auto">
        প্রচারে: Prochar Studio · গোপনীয়তা
      </footer>
    </div>
  );
}
