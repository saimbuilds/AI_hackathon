import { NextResponse, type NextRequest } from "next/server";
import { PRESSES_STOPPED, STOPPED_MESSAGE } from "@/lib/frozen";

// With the presses stopped, every API route that writes a paper, calls a model or saves reader data
// answers 503 with a plain message. Read-only routes (lab results, shared stories, print) stay open.
export function proxy(request: NextRequest) {
  if (!PRESSES_STOPPED) return NextResponse.next();
  const { pathname } = request.nextUrl;
  const writes = request.method !== "GET" && request.method !== "HEAD";
  const alwaysOff = /^\/api\/(ask|transcribe|scout|edition\/build|onboarding\/(parse|complete|deck))(\/|$)/.test(pathname);
  if (!alwaysOff && !writes) return NextResponse.next();
  return NextResponse.json({ error: STOPPED_MESSAGE, stopped: true, useBrowserSpeech: true }, { status: 503 });
}

export const config = {
  matcher: "/api/:path*",
};
