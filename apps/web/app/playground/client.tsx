"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  Input,
  Skeleton,
  Spinner,
  Stamp,
  Stepper,
  Textarea,
  Wordmark,
  useConfirm,
  useToast,
} from "@/components/ui";

const SECTION = "border-b-2 border-ink py-6 flex flex-col gap-4";
const H2 = "font-mono text-sm uppercase tracking-wider";

function Demo() {
  const toast = useToast();
  const confirm = useConfirm();
  const [chip, setChip] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <h1 className="py-6 font-display text-3xl font-extrabold">UI playground</h1>

      <section className={SECTION}>
        <h2 className={H2}>Wordmark</h2>
        <Wordmark />
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>প্রাইমারি</Button>
          <Button variant="secondary">সেকেন্ডারি</Button>
          <Button variant="destructive">মুছুন</Button>
          <Button size="lg">বড় বাটন</Button>
          <Button loading>লোড</Button>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Inputs</h2>
        <Input label="নাম" bangla helper="আপনার পূর্ণ নাম" />
        <Input label="ইমেইল" type="email" error="সঠিক ইমেইল দিন" />
        <Textarea label="বার্তা" bangla />
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Chip</h2>
        <div className="flex gap-3">
          <Chip selected={chip} onClick={() => setChip((v) => !v)}>
            বিজয় দিবস
          </Chip>
          <Chip>স্বাধীনতা দিবস</Chip>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Card + Stamp</h2>
        <Card cropMarks tilt caption="TEMPLATE № 02" className="max-w-xs">
          <div className="aspect-[3/4] bg-lime-wash" />
        </Card>
        <div className="flex gap-6">
          <Stamp variant="ready">প্রস্তুত</Stamp>
          <Stamp variant="failed">ব্যর্থ</Stamp>
          <Stamp variant="working">চলছে</Stamp>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Toast + Dialog</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary" onClick={() => toast("সংরক্ষণ হয়েছে", "success")}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast("কিছু ভুল হয়েছে", "error")}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast("তথ্য", "info")}>
            Info toast
          </Button>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Dialog
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const ok = await confirm({ title: "মুছে ফেলবেন?", message: "এটি ফেরানো যাবে না।", destructive: true });
              toast(ok ? "মুছে ফেলা হয়েছে" : "বাতিল", ok ? "success" : "info");
            }}
          >
            confirm()
          </Button>
        </div>
        <Dialog open={open} onClose={() => setOpen(false)} title="ডায়ালগ">
          <p className="mb-4 font-body">Esc চাপলে বন্ধ হবে।</p>
          <Button onClick={() => setOpen(false)}>বন্ধ করুন</Button>
        </Dialog>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Skeleton, Spinner, Stepper, Empty</h2>
        <Skeleton className="h-8 w-full" />
        <Spinner />
        <Stepper steps={["ছবি", "তথ্য", "রেন্ডার", "ডাউনলোড"]} current={2} />
        <EmptyState message="এখনও কোনো পোস্টার নেই" action={<Button>নতুন পোস্টার</Button>} />
      </section>
    </main>
  );
}

export function PlaygroundClient() {
  return <Demo />;
}
