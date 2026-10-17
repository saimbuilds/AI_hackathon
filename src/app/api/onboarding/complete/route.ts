import { NextResponse } from 'next/server';
import { fail, parseJson, rateLimit, requireHuman, requireUser, route } from '@/lib/http';
import { OnboardError, OnboardingSchema, applyOnboarding } from '@/lib/onboard';
import { adminClient } from '@/lib/supabase';

// POST /api/onboarding/complete -> saves the profile and its first taste vectors.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`complete:user:${user.id}`, 6, 60_000);
  await requireHuman(user);
  const body = await parseJson(req, OnboardingSchema);
  try {
    const out = await applyOnboarding(adminClient()!, user.id, body);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    if (e instanceof OnboardError) return fail(e.status, e.message);
    throw e;
  }
});
