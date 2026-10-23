/** Site-wide strip while the presses are stopped: what this site is now, in the paper's own voice. */
export function PressesStopped() {
  return (
    <div className="presses-stopped no-print" role="status">
      <span className="presses-stopped-dot" aria-hidden />
      <span className="font-medium">Hackathon edition.</span>
      <span className="hidden sm:inline">The presses have stopped: the AI is switched off, and you’re touring a real paper from 17 October 2026.</span>
      <span className="sm:hidden">AI off, tour only.</span>
    </div>
  );
}
