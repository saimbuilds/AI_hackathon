// Short-lived signed tokens that let the headless browser read ONE edition to print it (it has no login).
import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => process.env.PRINT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-only-secret';
const sign = (editionId: string, exp: number) => createHmac('sha256', secret()).update(`print:${editionId}:${exp}`).digest('base64url');

export function signPrintToken(editionId: string, ttlSeconds = 180, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${exp}.${sign(editionId, exp)}`;
}

export function verifyPrintToken(editionId: string, token: string, now = Date.now()): boolean {
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  const good = Buffer.from(sign(editionId, exp));
  const given = Buffer.from(sig);
  return good.length === given.length && timingSafeEqual(good, given);
}
