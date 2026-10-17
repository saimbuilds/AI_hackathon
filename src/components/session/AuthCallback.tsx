"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "./client";
import { signInWithGoogle } from "./auth";
import { PillButton } from "@/components/ui/PillButton";

/** Lands from Google. The client exchanges the code itself (PKCE); we wait for the session and move on. */
export function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search + location.hash.replace(/^#/, "&"));
    const next = q.get("next")?.startsWith("/") ? q.get("next")! : "/paper";
    const code = q.get("error_code");
    let live = true;
    (async () => {
      // This Google account already has a paper: sign in to it instead of linking.
      if (code === "identity_already_exists") {
        const msg = await signInWithGoogle(next);
        if (msg && live) setError(msg);
        return;
      }
      if (q.get("error")) {
        if (live) setError(q.get("error_description") ?? "Google sign-in didn’t finish.");
        return;
      }
      const sb = browserClient();
      for (let i = 0; i < 20 && live; i++) {
        const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
        if (data.session) return router.replace(next);
        await new Promise((r) => setTimeout(r, 250));
      }
      if (live) setError("Google sign-in didn’t finish.");
    })();
    return () => {
      live = false;
    };
  }, [router]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-sun px-[var(--gutter)] text-center" aria-live="polite">
      <div className="max-w-[520px]">
        <h1 className="t-xl">{error ? "That didn’t work." : "Saving your paper…"}</h1>
        {error && (
          <>
            <p className="t-body-lg mt-5 text-ink-2">{error}</p>
            <div className="mt-8">
              <PillButton href="/paper" tone="press" look="solid">
                Back to my paper
              </PillButton>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
