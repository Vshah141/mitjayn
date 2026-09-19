import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Brand() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-3 font-semibold tracking-tight">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white"><ShieldCheck size={20} /></span>
      <span>VeriHealth</span>
    </Link>
  );
}
