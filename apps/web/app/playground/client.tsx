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
import {
  commonMessages,
  templatesMessages,
  posterProgressMessages,
  postersHistoryMessages,
} from "@/messages/bn";

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
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">{postersHistoryMessages.deleteAction}</Button>
          <Button size="lg">Large</Button>
          <Button loading>{commonMessages.loading}</Button>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Inputs</h2>
        <Input label="Name" helper="Full name" />
        <Input label="Email" type="email" error="Invalid email" />
        <Textarea label="Message" bangla />
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Chip</h2>
        <div className="flex gap-3">
          <Chip selected={chip} onClick={() => setChip((v) => !v)}>
            {templatesMessages.occasions.victory_day}
          </Chip>
          <Chip>{templatesMessages.occasions.eid_festival}</Chip>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Card + Stamp</h2>
        <Card cropMarks tilt caption="TEMPLATE № 02" className="max-w-xs">
          <div className="aspect-[3/4] bg-lime-wash" />
        </Card>
        <div className="flex gap-6">
          <Stamp variant="ready">{posterProgressMessages.readyStamp}</Stamp>
          <Stamp variant="failed">{posterProgressMessages.failedStamp}</Stamp>
          <Stamp variant="working">{posterProgressMessages.workingStamp}</Stamp>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Toast + Dialog</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary" onClick={() => toast("Success", "success")}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Error", "error")}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Info", "info")}>
            Info toast
          </Button>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Dialog
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const ok = await confirm({
                title: postersHistoryMessages.deleteConfirmTitle,
                message: postersHistoryMessages.deleteConfirmMessage,
                destructive: true,
              });
              toast(ok ? postersHistoryMessages.deleteSuccessToast : commonMessages.cancel, ok ? "success" : "info");
            }}
          >
            confirm()
          </Button>
        </div>
        <Dialog open={open} onClose={() => setOpen(false)} title="Dialog">
          <p className="mb-4 font-body">Press Esc to close.</p>
          <Button onClick={() => setOpen(false)}>{commonMessages.cancel}</Button>
        </Dialog>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Skeleton, Spinner, Stepper, Empty</h2>
        <Skeleton className="h-8 w-full" />
        <Spinner />
        <Stepper steps={posterProgressMessages.stepperStations as unknown as string[]} current={2} />
        <EmptyState
          message={postersHistoryMessages.emptyList}
          action={<Button>{postersHistoryMessages.createButton}</Button>}
        />
      </section>
    </main>
  );
}

export function PlaygroundClient() {
  return <Demo />;
}
