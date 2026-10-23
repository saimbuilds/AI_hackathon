// 'Presses stopped': the hackathon is over and the AI providers are off. The site stays up as a tour:
// every page renders from the sample edition, nothing calls a model, and features that need one say so.
// On by default; set NEXT_PUBLIC_PRESSES_STOPPED=0 to run the live product again.
export const PRESSES_STOPPED = process.env.NEXT_PUBLIC_PRESSES_STOPPED !== '0';

export const STOPPED_MESSAGE =
  'The presses have stopped. Endpaper was built for the NaSCon’26 AI Hackathon and its AI is switched off now, so this part can’t run. Everything else is open to explore.';
