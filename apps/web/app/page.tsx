import Link from "next/link";
import { Wordmark, Card, Button } from "@/components/ui";
import { toBanglaNumber } from "@/lib/format";
import { landingMessages, templatesMessages, commonMessages } from "@/messages/bn";

const OCCASIONS = [
  { slug: "victory_day", label: templatesMessages.occasions.victory_day },
  { slug: "condolence", label: templatesMessages.occasions.condolence },
  { slug: "campaign", label: templatesMessages.occasions.campaign },
  { slug: "greetings", label: templatesMessages.occasions.greetings },
  { slug: "eid_festival", label: templatesMessages.occasions.eid_festival },
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
            {landingMessages.loginButton}
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 flex flex-col gap-12 sm:gap-16">
        {/* ─── Hero Section ─── */}
        <section className="flex flex-col items-start gap-6 pt-2 sm:pt-4">
          {/* Misregistration Headline: ink layer with 2px press-red text-shadow */}
          <h1
            className="text-ink font-display font-extrabold text-3xl sm:text-5xl md:text-6xl leading-[1.15] select-none"
            style={{ textShadow: "2px 2px 0 var(--press-red)" }}
          >
            {landingMessages.heroHeadline1}
            <br />
            {landingMessages.heroHeadline2}
          </h1>

          <p className="font-body text-lg sm:text-xl text-ink max-w-prose leading-relaxed">
            {landingMessages.heroSubtitle}
          </p>

          <Link href="/templates">
            <Button size="lg" className="text-lg">
              {landingMessages.createPosterCta}
            </Button>
          </Link>

          {/* Proof Gallery: 3 sample template thumbnails with crop marks & fictional text */}
          <div className="w-full pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Sample 1: Victory Day */}
              <Card cropMarks caption={landingMessages.sampleVictoryCaption} className="bg-paper-hi">
                <div className="aspect-[3/4] border border-ink p-3 flex flex-col justify-between bg-paper">
                  <div className="text-center border-b border-ink pb-2">
                    <p className="font-display font-bold text-xs text-press-red">{landingMessages.sampleVictorySub}</p>
                    <p className="font-display font-extrabold text-sm sm:text-base text-ink">{landingMessages.sampleVictoryTitle}</p>
                  </div>
                  <div className="my-auto flex flex-col items-center py-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-ink rounded bg-lime-wash flex items-center justify-center halftone">
                      <span className="font-mono text-[10px] text-ink">{landingMessages.samplePhotoLabel}</span>
                    </div>
                  </div>
                  <div className="text-center border-t border-ink pt-2 bg-paper-hi">
                    <p className="font-display font-bold text-sm text-ink">{landingMessages.sampleName}</p>
                    <p className="font-body text-xs text-ink">{landingMessages.sampleVictoryDesignation}</p>
                  </div>
                </div>
              </Card>

              {/* Sample 2: Condolence (with slight desktop tilt) */}
              <Card cropMarks tilt caption={landingMessages.sampleCondolenceCaption} className="bg-paper-hi">
                <div className="aspect-[3/4] border border-ink p-3 flex flex-col justify-between bg-paper">
                  <div className="text-center border-b border-ink pb-2">
                    <p className="font-display font-bold text-xs text-ink">{landingMessages.sampleCondolenceSub}</p>
                    <p className="font-display font-extrabold text-sm sm:text-base text-ink">{landingMessages.sampleCondolenceTitle}</p>
                  </div>
                  <div className="my-auto flex flex-col items-center py-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-ink rounded bg-lime-wash flex items-center justify-center halftone">
                      <span className="font-mono text-[10px] text-ink">{landingMessages.samplePhotoLabel}</span>
                    </div>
                  </div>
                  <div className="text-center border-t border-ink pt-2 bg-paper-hi">
                    <p className="font-display font-bold text-sm text-ink">{landingMessages.sampleName}</p>
                    <p className="font-body text-xs text-ink">{landingMessages.sampleCondolenceDesignation}</p>
                  </div>
                </div>
              </Card>

              {/* Sample 3: Campaign */}
              <Card cropMarks caption={landingMessages.sampleCampaignCaption} className="bg-paper-hi">
                <div className="aspect-[3/4] border border-ink p-3 flex flex-col justify-between bg-paper">
                  <div className="text-center border-b border-ink pb-2">
                    <p className="font-display font-bold text-xs text-paddy">{landingMessages.sampleCampaignSub}</p>
                    <p className="font-display font-extrabold text-sm sm:text-base text-ink">{landingMessages.sampleCampaignTitle}</p>
                  </div>
                  <div className="my-auto flex flex-col items-center py-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-ink rounded bg-lime-wash flex items-center justify-center halftone">
                      <span className="font-mono text-[10px] text-ink">{landingMessages.samplePhotoLabel}</span>
                    </div>
                  </div>
                  <div className="text-center border-t border-ink pt-2 bg-paper-hi">
                    <p className="font-display font-bold text-sm text-ink">{landingMessages.sampleName}</p>
                    <p className="font-body text-xs text-ink">{landingMessages.sampleCampaignDesignation}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Steps Table ─── */}
        <section aria-labelledby="steps-heading" className="border-t-2 border-ink pt-8">
          <h2 id="steps-heading" className="sr-only">
            {landingMessages.stepsHeading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink border-b-2 border-ink">
            <div className="py-6 md:py-8 md:pr-6 flex flex-col gap-2">
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-press-red">
                {toBanglaNumber("01")}
              </span>
              <h3 className="font-display font-bold text-xl text-ink">{landingMessages.step1Title}</h3>
              <p className="font-body text-base text-ink">
                {landingMessages.step1Desc}
              </p>
            </div>

            <div className="py-6 md:py-8 md:px-6 flex flex-col gap-2">
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-mustard">
                {toBanglaNumber("02")}
              </span>
              <h3 className="font-display font-bold text-xl text-ink">{landingMessages.step2Title}</h3>
              <p className="font-body text-base text-ink">
                {landingMessages.step2Desc}
              </p>
            </div>

            <div className="py-6 md:py-8 md:pl-6 flex flex-col gap-2">
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-paddy">
                {toBanglaNumber("03")}
              </span>
              <h3 className="font-display font-bold text-xl text-ink">{landingMessages.step3Title}</h3>
              <p className="font-body text-base text-ink">
                {landingMessages.step3Desc}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Occasion Index (Classifieds-style list) ─── */}
        <section aria-labelledby="occasion-heading" className="flex flex-col gap-4">
          <div className="border-b-2 border-ink pb-2 flex items-baseline justify-between">
            <h2 id="occasion-heading" className="font-display font-extrabold text-2xl text-ink">
              {landingMessages.occasionsHeading}
            </h2>
            <span className="font-mono text-xs uppercase tracking-wider text-ink">{landingMessages.classifiedsIndex}</span>
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
            {commonMessages.creditPrefix} <span className="font-semibold">Prochar Studio</span>
          </p>
          <p className="text-ink/80">{landingMessages.footerTerms}</p>
        </div>
      </footer>
    </div>
  );
}
