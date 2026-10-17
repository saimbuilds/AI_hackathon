"use client";

import { useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import { saveWithGoogle, useUser, isSaved } from "./auth";

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
    </svg>
  );
}

/** Offers to keep the paper beyond this browser. Disappears into a quiet line once it's saved. */
export function SavePaper({ reason = "Keep your streak and get tomorrow’s paper on any device.", tone = "sheet" }: { reason?: string; tone?: "sheet" | "sun" }) {
  const user = useUser();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isSaved(user)) {
    return <p className="t-sm text-ink-3">Saved to {user!.email ?? "your Google account"}.</p>;
  }
  return (
    <div className={`rounded-[var(--r-md)] p-6 ${tone === "sun" ? "bg-sun" : "bg-sheet"}`}>
      <p className="t-md">Save my paper</p>
      <p className="t-body mt-2 max-w-[44ch] text-ink-2">{reason}</p>
      <div className="mt-5">
        <PillButton
          tone="ink"
          look="on-color"
          icon={<GoogleG />}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const msg = await saveWithGoogle();
            if (msg) {
              setBusy(false);
              setError(msg.includes("provider is not enabled") || msg.includes("not enabled") ? "Google sign-in isn’t switched on yet." : msg);
            }
          }}
        >
          {busy ? "Opening Google…" : "Continue with Google"}
        </PillButton>
      </div>
      {error && (
        <p className="t-sm mt-3 text-ink-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
