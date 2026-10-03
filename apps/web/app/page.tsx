import Link from "next/link";
import { Wordmark, Card, Button } from "@/components/ui";
import { toBanglaNumber } from "@/lib/format";

const OCCASIONS = [
  { slug: "victory_day", label: "বিজয় দিবস" },
  { slug: "condolence", label: "শোক/স্মরণ" },
  { slug: "campaign", label: "নির্বাচনী প্রচার" },
  { slug: "greetings", label: "শুভেচ্ছা" },
  { slug: "eid_festival", label: "ঈদ/উৎসব" },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* ─── Header ─── */}
      <header className="border-b-2 border-ink bg-paper-hi">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center min-h-12 py-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard">
            <Wordmark />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-12 px-5 font-body font-bold text-ink bg-paper-hi border-2 border-ink rounded shadow-hard transition-[transform,box-shadow] duration-[80ms] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            লগইন
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 flex flex-col gap-12 sm:gap-16">
        {/* ─── Hero Section ─── */}
        <section className="flex flex-col items-start gap-6 pt-2 sm:pt-4">
          {/* Misregistration Headline: ink layer over press-red offset by 2px */}
          <div className="relative select-none">
            <span
              aria-hidden="true"
              className="absolute top-[2px] left-[2px] text-press-red font-display font-extrabold text-3xl sm:text-5xl md:text-6xl leading-[1.15]"
            >
              আপনার প্রচার,
              <br />
              আপনার পোস্টার
            </span>
            <h1 className="relative text-ink font-display font-extrabold text-3xl sm:text-5xl md:text-6xl leading-[1.15]">
              আপনার প্রচার,
              <br />
              আপনার পোস্টার
            </h1>
          </div>

          <p className="font-body text-lg sm:text-xl text-ink max-w-prose leading-relaxed">
            ছবি দিন, নাম লিখুন — ছাপার উপযোগী পোস্টার পান কয়েক মিনিটে।
          </p>

          <Link href="/templates">
            <Button size="lg" className="text-lg">
              পোস্টার বানান →
            </Button>
          </Link>

          {/* Proof Gallery: 3 sample template thumbnails with crop marks & fictional text */}
          <div className="w-full pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Sample 1: Victory Day */}
              <Card cropMarks caption="নমুনা ০১ · বিজয় দিবস" className="bg-paper-hi">
                <div className="aspect-[3/4] border border-ink p-3 flex flex-col justify-between bg-paper">
                  <div className="text-center border-b border-ink pb-2">
                    <p className="font-display font-bold text-xs text-press-red">মহান বিজয় দিবস</p>
                    <p className="font-display font-extrabold text-sm sm:text-base text-ink">শুভেচ্ছা ও অভিনন্দন</p>
                  </div>
                  <div className="my-auto flex flex-col items-center py-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-ink rounded bg-lime-wash flex items-center justify-center halftone">
                      <span className="font-mono text-[10px] text-ink">ছবি</span>
                    </div>
                  </div>
                  <div className="text-center border-t border-ink pt-2 bg-paper-hi">
                    <p className="font-display font-bold text-sm text-ink">নমুনা নাম</p>
                    <p className="font-body text-xs text-ink">সভাপতি · নমুনা সংগঠন</p>
                  </div>
                </div>
              </Card>

              {/* Sample 2: Condolence (with slight desktop tilt) */}
              <Card cropMarks tilt caption="নমুনা ০২ · শোক ও শ্রদ্ধা" className="bg-paper-hi">
                <div className="aspect-[3/4] border border-ink p-3 flex flex-col justify-between bg-paper">
                  <div className="text-center border-b border-ink pb-2">
                    <p className="font-display font-bold text-xs text-ink">বিনম্র শ্রদ্ধা</p>
                    <p className="font-display font-extrabold text-sm sm:text-base text-ink">স্মরণ সভা ও দোয়া</p>
                  </div>
                  <div className="my-auto flex flex-col items-center py-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-ink rounded bg-lime-wash flex items-center justify-center halftone">
                      <span className="font-mono text-[10px] text-ink">ছবি</span>
                    </div>
                  </div>
                  <div className="text-center border-t border-ink pt-2 bg-paper-hi">
                    <p className="font-display font-bold text-sm text-ink">নমুনা নাম</p>
                    <p className="font-body text-xs text-ink">সাধারণ সম্পাদক · নমুনা পরিষদ</p>
                  </div>
                </div>
              </Card>

              {/* Sample 3: Campaign */}
              <Card cropMarks caption="নমুনা ০৩ · নির্বাচনী প্রচার" className="bg-paper-hi">
                <div className="aspect-[3/4] border border-ink p-3 flex flex-col justify-between bg-paper">
                  <div className="text-center border-b border-ink pb-2">
                    <p className="font-display font-bold text-xs text-paddy">নির্বাচনী প্রচার</p>
                    <p className="font-display font-extrabold text-sm sm:text-base text-ink">উন্নয়নের পক্ষে থাকুন</p>
                  </div>
                  <div className="my-auto flex flex-col items-center py-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-ink rounded bg-lime-wash flex items-center justify-center halftone">
                      <span className="font-mono text-[10px] text-ink">ছবি</span>
                    </div>
                  </div>
                  <div className="text-center border-t border-ink pt-2 bg-paper-hi">
                    <p className="font-display font-bold text-sm text-ink">নমুনা নাম</p>
                    <p className="font-body text-xs text-ink">চেয়ারম্যান পদপ্রার্থী · নমুনা ইউনিয়ন</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Steps Table ─── */}
        <section aria-labelledby="steps-heading" className="border-t-2 border-ink pt-8">
          <h2 id="steps-heading" className="sr-only">
            পোস্টার তৈরির ধাপসমূহ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink border-b-2 border-ink">
            <div className="py-6 md:py-8 md:pr-6 flex flex-col gap-2">
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-press-red">
                {toBanglaNumber("01")}
              </span>
              <h3 className="font-display font-bold text-xl text-ink">ফর্ম পূরণ</h3>
              <p className="font-body text-base text-ink">
                নাম, পদবি ও ছবি দিন — জটিল গ্রাফিক ডিজাইনের কোনো প্রয়োজন নেই।
              </p>
            </div>

            <div className="py-6 md:py-8 md:px-6 flex flex-col gap-2">
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-mustard">
                {toBanglaNumber("02")}
              </span>
              <h3 className="font-display font-bold text-xl text-ink">আমরা সাজাই</h3>
              <p className="font-body text-base text-ink">
                স্বয়ংক্রিয় বাংলা টাইপোগ্রাফি ও লেআউট নিখুঁতভাবে পোস্টারে বসে যাবে।
              </p>
            </div>

            <div className="py-6 md:py-8 md:pl-6 flex flex-col gap-2">
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-paddy">
                {toBanglaNumber("03")}
              </span>
              <h3 className="font-display font-bold text-xl text-ink">ডাউনলোড</h3>
              <p className="font-body text-base text-ink">
                ছাপার উপযোগী উচ্চ রেজোলিউশন ১৮০০×২৪০০ পিক্সেল PNG পোস্টার সঙ্গে সঙ্গেই প্রস্তুত।
              </p>
            </div>
          </div>
        </section>

        {/* ─── Occasion Index (Classifieds-style list) ─── */}
        <section aria-labelledby="occasion-heading" className="flex flex-col gap-4">
          <div className="border-b-2 border-ink pb-2 flex items-baseline justify-between">
            <h2 id="occasion-heading" className="font-display font-extrabold text-2xl text-ink">
              উপলক্ষ সূচি
            </h2>
            <span className="font-mono text-xs uppercase tracking-wider text-ink">CLASSIFIEDS INDEX</span>
          </div>

          <ul className="flex flex-col divide-y divide-ink/30 border-b-2 border-ink font-body">
            {OCCASIONS.map((occ, idx) => {
              const num = toBanglaNumber(String(idx + 1).padStart(2, "0"));
              return (
                <li key={occ.slug}>
                  <Link
                    href={`/templates?occasion=${occ.slug}`}
                    className="group flex items-center justify-between min-h-12 py-3 px-2 hover:bg-paper-hi focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
                  >
                    <span className="font-body font-semibold text-lg text-ink group-hover:text-press-red transition-colors">
                      {occ.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex-1 mx-3 border-b border-dotted border-ink/40 h-0 self-center"
                    />
                    <span className="font-mono font-bold text-sm text-ink group-hover:text-press-red">
                      {num}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      {/* ─── Colophon Footer ─── */}
      <footer className="border-t-2 border-ink bg-paper-hi mt-auto py-6">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-body text-ink">
          <p>
            প্রচারে: <span className="font-semibold">Prochar Studio</span>
          </p>
          <p className="text-ink/80">গোপনীয়তা ও শর্তাবলী সংরক্ষিত</p>
        </div>
      </footer>
    </div>
  );
}
