"use client";

import { useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import { api, browserClient, token } from "@/components/session/client";

/** Export and delete, against /api/me. Local copies (name, reading marks) are cleared too. */
export function DeleteData() {
  const [step, setStep] = useState<"idle" | "confirm" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const clearLocal = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ep-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const download = async () => {
    setError(null);
    try {
      if (!(await token(false))) return setError("There’s nothing stored for this browser yet.");
      const data = await api<unknown>("/api/me");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "endpaper-my-data.json" });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t download your data.");
    }
  };

  const remove = async () => {
    setStep("working");
    setError(null);
    try {
      if (await token(false)) {
        await api("/api/me", { method: "DELETE", json: { confirm: "delete my paper" } });
        await browserClient()?.auth.signOut();
      }
      clearLocal();
      setStep("done");
    } catch (e) {
      setStep("confirm");
      setError(e instanceof Error ? e.message : "Couldn’t delete right now. Try again.");
    }
  };

  return (
    <section id="delete" className="container-page mt-16 scroll-mt-28">
      <div className="rounded-[var(--r-lg)] bg-ink p-8 text-[var(--on-dark)] md:p-12">
        <h2 className="t-lg text-[var(--on-dark)]">Your data</h2>
        <p className="t-body-lg mt-4 max-w-[52ch] opacity-75">
          Download everything we keep about you as a file, or delete it: your profile, reading history, streak and gift papers. Deleting stops your paper and can’t be undone.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3" aria-live="polite">
          {step === "idle" && (
            <>
              <PillButton tone="sun" onClick={download}>
                Download my data
              </PillButton>
              <PillButton tone="press" onClick={() => setStep("confirm")}>
                Delete my data
              </PillButton>
            </>
          )}
          {(step === "confirm" || step === "working") && (
            <>
              <PillButton tone="press" look="solid" onClick={remove} disabled={step === "working"}>
                {step === "working" ? "Deleting…" : "Yes, delete everything"}
              </PillButton>
              <button type="button" className="tbtn !text-[var(--on-dark)]" onClick={() => setStep("idle")}>
                Keep my paper
              </button>
            </>
          )}
          {step === "done" && <p className="t-md text-[var(--on-dark)]">Deleted. Your paper and everything behind it are gone.</p>}
        </div>
        {error && (
          <p className="t-body mt-4 rounded-[var(--r-sm)] bg-[rgb(236_233_225/0.1)] p-3" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
