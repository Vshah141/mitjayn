import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { ReportStatus } from '@/lib/types';

export function statusMeta(status: ReportStatus) {
  if (status === 'verified_negative') return { label: 'Verified negative', detail: 'Report scanned and verified successfully', cls: 'bg-emerald-50 text-emerald-800 border-emerald-100', Icon: CheckCircle2 };
  if (status === 'detected_positive') return { label: 'Detected positive', detail: 'Detected in verified lab report', cls: 'bg-red-50 text-red-800 border-red-100', Icon: AlertTriangle };
  return { label: 'Not updated', detail: 'Report not found / report not updated', cls: 'bg-amber-50 text-amber-800 border-amber-100', Icon: Clock3 };
}

export function StatusPill({ status, compact = false }: { status: ReportStatus; compact?: boolean }) {
  const m = statusMeta(status); const Icon = m.Icon;
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${m.cls}`}><Icon size={14}/>{compact ? m.label : m.detail}</span>;
}
