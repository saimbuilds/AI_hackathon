"use client";

import { useState } from "react";
import { PillButton } from "@/components/ui/PillButton";

/** Deletes everything this device holds now; the account copy is deleted by the API once signed in. */
export function DeleteData() {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  return (
    <section id="delete" className="container-page mt-16 scroll-mt-28">
      <div className="rounded-[var(--r-lg)] bg-ink p-8 text-[var(--on-dark)] md:p-12">
        <h2 className="t-lg text-[var(--on-dark)]">Delete my data</h2>
        <p className="t-body-lg mt-4 max-w-[52ch] opacity-75">
          Removes your profile, reading history, streak and gift papers. Your paper stops arriving tomorrow. This can’t be undone.
        </p>
        <div className="mt-8" aria-live="polite">
          {step === "idle" && (
            <PillButton tone="press" onClick={() => setStep("confirm")}>
              Delete my data
            </PillButton>
          )}
          {step === "confirm" && (
            <div className="flex flex-wrap items-center gap-3">
              <PillButton
                tone="press"
                look="solid"
                onClick={() => {
                  try {
                    Object.keys(localStorage).filter((k) => k.startsWith("ep-")).forEach((k) => localStorage.removeItem(k));
                  } catch {}
                  setStep("done");
                }}
              >
                Yes, delete everything
              </PillButton>
              <button type="button" className="tbtn !text-[var(--on-dark)]" onClick={() => setStep("idle")}>
                Keep my paper
              </button>
            </div>
          )}
          {step === "done" && <p className="t-md text-[var(--on-dark)]">Deleted from this device. Account deletion arrives with sign-in.</p>}
        </div>
      </div>
    </section>
  );
}
