import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appUrl } from '@/email/render';
import { loadProfile } from '@/edition/candidates';
import { fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { OnboardError, OnboardingSchema, applyOnboarding } from '@/lib/onboard';
import { parseOnboarding } from '@/lib/onboarding';
import { adminClient } from '@/lib/supabase';

const MAX_GIFTS_PER_GIVER = 5;

export const giftUrl = (token: string) => (process.env.GIFT_URL_TEMPLATE ?? `${appUrl()}/gift/{token}`).replace('{token}', token);

const Body = z.object({
  forName: z.string().trim().min(1).max(40), // "Abbu"
  relation: z.string().trim().min(1).max(40), // "father"
  fromName: z.string().trim().min(1).max(40).optional(), // defaults to the giver's own name
  text: z.string().trim().max(800).optional(), // free text about what they like; parsed into interests
  interests: OnboardingSchema.shape.interests.optional(),
  language: z.enum(['en', 'ur']).default('en'),
  largePrint: z.boolean().default(true),
  city: z.string().trim().max(60).optional(),
  tz: z.string().default('Asia/Karachi'),
  tone: z.enum(['straight', 'new', 'witty']).default('new'),
  size: z.enum(['espresso', 'standard', 'long']).default('espresso'),
  calm: z.boolean().default(false),
  recipientEmail: z.email().optional(), // only used if the giver ticks "email it to them every morning"
  emailEveryMorning: z.boolean().default(false),
});

// POST /api/gifts  ->  { giftId, token, url }
// "Make one for someone you love": a separate reader profile for the recipient (an Urdu, large-print paper
// for your parents). The recipient reads it at `url` with no account; the giver can rebuild it any time.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`gift:user:${user.id}`, 10, 3_600_000);
  const b = await parseJson(req, Body);
  const db = adminClient()!;

  const { count } = await db.from('gifts').select('id', { count: 'exact', head: true }).eq('from_user_id', user.id);
  if ((count ?? 0) >= MAX_GIFTS_PER_GIVER) return fail(409, `You can make up to ${MAX_GIFTS_PER_GIVER} gift papers.`);

  const giver = await loadProfile(db, user.id);
  const fromName = b.fromName ?? giver?.name ?? 'Someone who loves you';
  let interests = b.interests;
  if (!interests && b.text) {
    const { parsed } = await parseOnboarding(b.text);
    interests = { chips: parsed.interests, topics: parsed.topics, entities: parsed.entities, negatives: parsed.negatives, negativeTopics: parsed.negativeTopics };
  }

  // The recipient is a real reader profile with no login of its own (the giver owns it).
  const { data: created, error } = await db.auth.admin.createUser({ email: `gift-${crypto.randomUUID()}@gifts.invalid`, email_confirm: true, user_metadata: { gift_for: b.forName, gift_from: user.id } });
  if (error || !created.user) return fail(500, 'Could not create the gift paper.');
  const giftUserId = created.user.id;

  try {
    await applyOnboarding(db, giftUserId, OnboardingSchema.parse({
      name: b.forName, city: b.city, tz: b.tz, tone: b.tone, size: b.size, language: b.language, largePrint: b.largePrint, calm: b.calm,
      interests: interests ?? { chips: [], topics: [], entities: [], negatives: [], negativeTopics: [] },
      ...(b.emailEveryMorning && b.recipientEmail ? { email: b.recipientEmail, emailOptIn: true } : {}),
    }), { gift: { fromName, relation: b.relation, giverId: user.id } });

    const { data: gift, error: gErr } = await db.from('gifts').insert({
      from_user_id: user.id, recipient_user_id: giftUserId, for_name: b.forName, relation: b.relation, language: b.language, large_print: b.largePrint, from_name: fromName,
    }).select('id,token').single();
    if (gErr) throw new Error(gErr.message);
    return NextResponse.json({ giftId: gift.id, token: gift.token, url: giftUrl(gift.token) });
  } catch (e) {
    await db.auth.admin.deleteUser(giftUserId); // do not leave an orphan profile behind
    if (e instanceof OnboardError) return fail(e.status, e.message);
    throw e;
  }
});

// GET /api/gifts  ->  the giver's gift papers
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const db = adminClient()!;
  const { data } = await db.from('gifts').select('id,token,for_name,relation,language,large_print,from_name,recipient_user_id,created_at').eq('from_user_id', user.id).order('created_at', { ascending: false });
  const gifts = await Promise.all((data ?? []).map(async (g) => {
    const { data: ed } = await db.from('editions').select('id,date,number').eq('user_id', g.recipient_user_id).order('number', { ascending: false }).limit(1);
    return { giftId: g.id, token: g.token, url: giftUrl(g.token), forName: g.for_name, relation: g.relation, language: g.language, largePrint: g.large_print, fromName: g.from_name, latestEdition: ed?.[0] ?? null };
  }));
  return NextResponse.json({ gifts });
});
