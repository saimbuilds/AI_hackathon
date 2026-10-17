import type { EditionUpdate } from "./api";

/** Opens the paper when something a reader follows has changed. */
export function SinceYouAsked({ updates }: { updates: EditionUpdate[] }) {
  if (!updates.length) return null;
  return (
    <section className="mt-8 rounded-[var(--r-lg)] bg-sun p-6 text-ink md:p-8" aria-labelledby="since-title">
      <h2 id="since-title" className="t-md">
        Since you asked
      </h2>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {updates.map((u) => (
          <li key={u.watchId} className="rounded-[var(--r-md)] bg-sheet p-5">
            <p className="t-sm text-ink-3">{u.question}</p>
            <p className="mt-2 font-serif text-[1.2rem] leading-[1.45] text-pretty">{u.summary}</p>
            {u.sources?.length > 0 && (
              <p className="t-sm mt-3 text-ink-3">
                {u.sources.map((s, i) => (
                  <span key={s.url + i}>
                    {i > 0 && ", "}
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      {s.name}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
