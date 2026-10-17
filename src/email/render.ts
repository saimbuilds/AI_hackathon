// The morning email: a small, table-based, inline-styled newsprint page (email clients ignore everything else).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { BRAND } from '../lib/brand';
import type { Edition } from '../types/edition';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const secret = () => process.env.UNSUBSCRIBE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-only-secret';
const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function unsubscribeToken(userId: string): string {
  return `${b64(userId)}.${createHmac('sha256', secret()).update(`unsub:${userId}`).digest('base64url')}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [idPart, sig] = token.split('.');
  if (!idPart || !sig) return null;
  const userId = Buffer.from(idPart, 'base64url').toString();
  const good = createHmac('sha256', secret()).update(`unsub:${userId}`).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(good);
  return a.length === b.length && timingSafeEqual(a, b) && /^[0-9a-f-]{36}$/.test(userId) ? userId : null;
}

export const appUrl = () => (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-hackathon-five-sigma.vercel.app').replace(/\/$/, '');
// The reader route is the frontend's call; this template lets them change it without touching the backend.
export const editionUrl = (e: Pick<Edition, 'id' | 'date'>) => (process.env.EDITION_URL_TEMPLATE ?? `${appUrl()}/paper/{date}`).replace('{date}', e.date).replace('{id}', e.id);

const INK = '#141414', PAPER = '#F3EFE6', RED = '#C8102E';

export function renderEmail(e: Edition, userId: string, opts: { url?: string } = {}): { subject: string; html: string; text: string; unsubscribeUrl: string } {
  const unsubscribeUrl = `${appUrl()}/api/unsubscribe?t=${unsubscribeToken(userId)}`;
  const url = opts.url ?? editionUrl(e);
  const headlines = [...e.sections.flatMap((s) => s.slots.map((x) => ({ section: s.name, x }))), ...e.offYourBeat.map((x) => ({ section: 'Off your beat', x }))].slice(0, 8);
  const dateLabel = new Date(`${e.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const subject = `${e.paperName}: ${e.lead.headline}`.slice(0, 120);

  const row = (inner: string, pad = '0 0 18px') => `<tr><td style="padding:${pad}">${inner}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:${PAPER};color:${INK};font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
${row(`<div style="text-align:center;border-bottom:3px double ${INK};padding-bottom:10px">
  <div style="font-family:'Old English Text MT','UnifrakturMaguntia',Georgia,serif;font-size:38px;line-height:1.1">${esc(e.paperName)}</div>
  <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding-top:6px">${esc(e.city)} Edition · No. ${e.number} · ${esc(dateLabel)}</div></div>`, '0 0 16px')}
${row(`<div style="font-size:16px;line-height:1.5;font-style:italic">${esc(e.editorNote)}</div>`)}
${(e.updates ?? []).map((u) => row(`<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${RED}">Since you asked</div><div style="font-size:15px;font-weight:bold;padding:4px 0">${esc(u.question)}</div><div style="font-size:15px;line-height:1.5">${esc(u.summary)} <a href="${esc(u.sources[0].url)}" style="color:${INK}">${esc(u.sources[0].name)}</a></div>`)).join('\n')}
${row(`<div style="border-top:1px solid ${INK};padding-top:12px">
  <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${RED}">${esc(e.lead.kicker)}</div>
  <a href="${esc(url)}" style="color:${INK};text-decoration:none"><div style="font-size:28px;line-height:1.15;font-weight:bold;padding:6px 0">${esc(e.lead.headline)}</div></a>
  <div style="font-size:16px;line-height:1.5">${esc(e.lead.dek)}</div>
  <div style="font-size:13px;color:#555;padding-top:6px">${esc(e.lead.whyThis)}</div></div>`)}
${headlines.length ? row(`<div style="border-top:1px solid ${INK};padding-top:12px">${headlines.map(({ section, x }) => `<div style="padding:0 0 10px"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#555">${esc(section)}</div><div style="font-size:17px;line-height:1.3">${esc(x.headline)}</div></div>`).join('')}</div>`) : ''}
${e.threeThings.length ? row(`<div style="border-top:1px solid ${INK};padding-top:12px"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${RED};padding-bottom:6px">Three things to remember</div>${e.threeThings.map((t, i) => `<div style="font-size:15px;line-height:1.45;padding:0 0 6px">${i + 1}. ${esc(t)}</div>`).join('')}</div>`) : ''}
${row(`<div style="text-align:center;padding:6px 0"><a href="${esc(url)}" style="background:${INK};color:${PAPER};text-decoration:none;font-family:Arial,sans-serif;font-size:14px;letter-spacing:.06em;padding:13px 26px;display:inline-block">READ TODAY'S PAPER</a><div style="font-size:12px;color:#555;padding-top:8px">It has an ending. About ${Math.max(3, Math.round([e.lead, ...e.sections.flatMap((s) => s.slots)].reduce((n, s) => n + s.readMinutes, 0)))} minutes.</div></div>`)}
${row(`<div style="border-top:1px solid ${INK};padding-top:10px;font-family:Arial,sans-serif;font-size:11px;color:#666;text-align:center;line-height:1.5">You get this because you asked ${esc(BRAND.name)} for a morning paper.<br><a href="${esc(unsubscribeUrl)}" style="color:#666">Unsubscribe</a> · <a href="${esc(appUrl())}" style="color:#666">${esc(BRAND.name)}</a></div>`, '0')}
</table></td></tr></table></body></html>`;

  const text = [`${e.paperName} · ${e.city} Edition · No. ${e.number} · ${dateLabel}`, '', e.editorNote, '', ...(e.updates ?? []).flatMap((u) => [`SINCE YOU ASKED: ${u.question}`, `${u.summary} (${u.sources[0].name}: ${u.sources[0].url})`, '']), `LEAD: ${e.lead.headline}`, e.lead.dek, '', ...headlines.map(({ x }) => `- ${x.headline}`), '', 'Three things to remember:', ...e.threeThings.map((t, i) => `${i + 1}. ${t}`), '', `Read today's paper: ${url}`, '', `Unsubscribe: ${unsubscribeUrl}`].join('\n');
  return { subject, html, text, unsubscribeUrl };
}
