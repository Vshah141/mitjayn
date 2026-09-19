import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { QRCode } from '@/components/QRCode';
import { statusMeta } from '@/components/StatusPill';
import { checkRateLimit } from '@/lib/rate-limit';
import { getPublicHealthCard, requestFingerprint } from '@/lib/repository';
import { ReportStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PublicHealthCard({ params }: { params: { shareToken: string } }) {
  const fingerprint = requestFingerprint();
  const rate = checkRateLimit(`health-card:${fingerprint}`, 45, 60_000);
  if (!rate.ok) {
    return <main className="grid min-h-screen place-items-center p-6"><div className="card max-w-md p-8 text-center"><ShieldOff className="mx-auto text-danger"/><h1 className="mt-4 text-2xl font-semibold">Too many verification requests</h1><p className="mt-2 text-sm leading-6 text-black/50">Please try again after a short interval.</p></div></main>;
  }
  const card = await getPublicHealthCard(params.shareToken);
  if (!card) { notFound(); throw new Error('Health card not found'); }
  const h = headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get('x-forwarded-proto') || 'http'}://${h.get('host') || 'localhost:3000'}`;
  const url = `${origin}/verify/${params.shareToken}`;
  const displayName = card.name || 'Name hidden';
  return <main className="min-h-screen px-4 py-8 sm:py-12"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><Brand/><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black/45 shadow-sm">Public verification</span></div><section className="card mt-7 overflow-hidden"><div className="bg-ink px-6 py-5 text-white sm:px-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/55">Verified health card</p><h1 className="mt-2 text-2xl font-semibold">Status-only verification</h1></div><div className="grid gap-7 p-6 sm:grid-cols-[180px_1fr] sm:p-8"><div className="rounded-3xl bg-sand p-3"><QRCode value={url} size={156}/><p className="mt-3 text-center text-[11px] font-medium leading-4 text-black/45">Scan to reopen this verification page</p></div><div className="flex items-center gap-5"><ProfileAvatar name={displayName} photo={card.photo_url}/><div><div className="flex items-center gap-2"><h2 className="text-2xl font-semibold">{displayName}</h2>{card.is_verified&&<ShieldCheck className="text-moss" size={23}/>}</div><p className="mt-2 max-w-md text-sm leading-6 text-black/50">This page exposes verification status only. Contact details, date of birth, report files and individual test values are not public.</p>{!card.name&&<span className="mt-3 inline-flex rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-moss">Identity name hidden by user</span>}</div></div></div><div className="border-t border-black/5 p-6 sm:p-8"><h3 className="font-semibold">Disease status</h3><div className="mt-4 grid gap-3">{card.reports.map((r:any)=>{const m=statusMeta(r.status as ReportStatus);const Icon=m.Icon;return <article key={r.disease_name} className={`rounded-2xl border p-4 ${m.cls}`}><div className="flex items-start gap-3"><Icon size={20} className="mt-0.5 shrink-0"/><div><h4 className="font-semibold">{r.disease_name}</h4><p className="mt-1 text-sm opacity-75">{r.status==='detected_positive'?`${r.disease_name} Detected`:m.detail}</p></div></div></article>})}</div></div></section><p className="mx-auto mt-5 max-w-xl text-center text-xs leading-5 text-black/35">Verification data is intentionally limited. A separate report QR can be used to authenticate one specific lab document.</p></div></main>;
}
