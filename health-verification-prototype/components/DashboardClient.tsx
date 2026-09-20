'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Camera, Copy, ExternalLink, FileText, Filter, Link2, Plus, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import type { Booking, DiseaseReport, NotificationItem, Profile, ReportStatus } from '@/lib/types';
import { ProfileAvatar } from './ProfileAvatar';
import { QRCode } from './QRCode';
import { ReportUploadDialog } from './ReportUploadDialog';
import { StatusPill } from './StatusPill';

export function DashboardClient({
  initialProfile,
  reports,
  bookings,
  initialNotifications
}: {
  initialProfile: Profile;
  reports: DiseaseReport[];
  bookings: Booking[];
  initialNotifications: NotificationItem[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [allReports, setAllReports] = useState(reports);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | ReportStatus>('all');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [allBookings, setAllBookings] = useState(bookings);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mitjayn-demo-bookings') || localStorage.getItem('verihealth-demo-bookings') || '[]';
      const extra = JSON.parse(raw);
      if (Array.isArray(extra) && extra.length) setAllBookings([...bookings, ...extra]);
    } catch {}
  }, [bookings]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${profile.public_share_token}` : `/verify/${profile.public_share_token}`;
  const filtered = useMemo(
    () => allReports.filter(r => (!q || `${r.disease_name} ${r.report_date}`.toLowerCase().includes(q.toLowerCase())) && (filter === 'all' || r.status === filter)),
    [q, filter, allReports]
  );
  const verifiedReports = allReports.filter(r => r.verification_state !== 'pending' && r.verification_state !== 'rejected');
  const unreadCount = notifications.filter(n => !n.read_at).length;

  async function refreshNotifications() {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const json = await response.json();
      if (response.ok && Array.isArray(json.notifications)) setNotifications(json.notifications);
    } catch {}
  }

  async function openNotifications() {
    setNotificationOpen(true);
    await refreshNotifications();
    fetch('/api/notifications/read', { method: 'POST' }).catch(() => undefined);
  }

  async function hideName(value: boolean) {
    setProfile(p => ({ ...p, hide_name: value }));
    const res = await fetch('/api/profile/hide-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hide_name: value }) });
    if (!res.ok) {
      setProfile(p => ({ ...p, hide_name: !value }));
      setNotice('Could not update privacy preference.');
    } else {
      setNotice(value ? 'Name hidden on public verification card.' : 'Name visible on public verification card.');
      await refreshNotifications();
    }
  }

  async function rotate() {
    setBusy(true);
    const res = await fetch('/api/profile/share-token', { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (res.ok && json.token) {
      setProfile(p => ({ ...p, public_share_token: json.token }));
      setNotice('Share link regenerated. The old link is now invalid.');
      await refreshNotifications();
    } else setNotice(json.error || 'Could not regenerate link.');
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/profile/photo', { method: 'POST', body: fd });
    const json = await res.json();
    if (res.ok && json.url) {
      setProfile(p => ({ ...p, photo_url: json.url }));
      setNotice('Profile photo updated.');
      await refreshNotifications();
    } else setNotice(json.error || 'Photo upload failed.');
  }

  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setNotice('Verification link copied.');
  }

  function handleReportUploaded(result: { report: DiseaseReport; extracted: any; profile: Profile | null; message: string }) {
    const report = { ...result.report, lab_name: result.extracted?.lab_name || null } as DiseaseReport;
    setAllReports(current => [report, ...current.filter(r => r.id !== report.id)]);
    if (result.profile) {
      setProfile(current => ({
        ...current,
        name: result.profile?.name ?? current.name,
        age: result.profile?.age ?? current.age,
        gender: result.profile?.gender ?? current.gender,
        date_of_birth: result.profile?.date_of_birth ?? current.date_of_birth,
        mobile_number: result.profile?.mobile_number ?? current.mobile_number
      }));
    }
    setNotice(result.message || 'Report uploaded.');
    void refreshNotifications();
  }

  return <div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-moss">Personal health profile</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Hello {profile.name.split(' ')[0]}</h1>
        <p className="mt-2 text-sm text-black/45">Verified status, reports and upcoming lab visits in one place.</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={openNotifications} className="btn-secondary relative !p-3" aria-label="Notifications">
          <Bell size={19}/>
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <button onClick={() => setUploadOpen(true)} className="btn-primary"><Plus size={18}/> Add report</button>
      </div>
    </header>

    {notice && <button onClick={() => setNotice('')} className="mt-5 w-full rounded-2xl bg-mint px-4 py-3 text-left text-sm text-moss">{notice} <span className="float-right">×</span></button>}

    <section className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
      <div className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative"><ProfileAvatar name={profile.name} photo={profile.photo_url}/><label className="absolute -bottom-2 -right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-xl bg-ink text-white shadow"><Camera size={15}/><input type="file" accept="image/*" className="hidden" onChange={uploadPhoto}/></label></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><h2 className="text-xl font-semibold">{profile.name}</h2>{profile.is_verified && <ShieldCheck size={20} className="text-moss"/>}</div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/50"><span><b className="text-ink">Age</b> {profile.age ?? '—'}</span><span><b className="text-ink">Gender</b> {profile.gender ?? '—'}</span><span><b className="text-ink">Reports</b> {allReports.length}</span></div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-moss">Identity verified</span>
              <Link href={`/verify/${profile.public_share_token}`} target="_blank" className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold">Verify card</Link>
              <button onClick={() => setUploadOpen(true)} className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold">Upload report</button>
              <Link href="/labs" className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold">Book lab</Link>
            </div>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-sand p-4"><p className="text-xs text-black/45">Verified negative</p><p className="mt-1 text-2xl font-semibold">{verifiedReports.filter(r => r.status === 'verified_negative').length}</p></div>
          <div className="rounded-2xl bg-sand p-4"><p className="text-xs text-black/45">Needs attention</p><p className="mt-1 text-2xl font-semibold">{allReports.filter(r => r.verification_state === 'pending' || r.status !== 'verified_negative').length}</p></div>
          <div className="rounded-2xl bg-sand p-4"><p className="text-xs text-black/45">Upcoming</p><p className="mt-1 text-2xl font-semibold">{allBookings.filter(b => b.status === 'booked').length}</p></div>
        </div>
      </div>

      <div className="card p-5 sm:p-7">
        <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-moss">Shareable card</p><h2 className="mt-1 text-xl font-semibold">Verify without oversharing</h2></div><Link2 size={20} className="text-moss"/></div>
        <div className="mt-5 flex gap-4"><QRCode value={shareUrl} size={112}/><div className="min-w-0 flex-1"><p className="text-sm leading-6 text-black/50">Anyone with this QR can see only trusted verification status. User-uploaded pending reports are not treated as verified results.</p><div className="mt-3 flex gap-2"><button onClick={copy} className="btn-secondary !px-3 !py-2"><Copy size={15}/> Copy</button><Link href={`/verify/${profile.public_share_token}`} target="_blank" className="btn-secondary !px-3 !py-2"><ExternalLink size={15}/></Link></div></div></div>
        <label className="mt-5 flex items-center justify-between rounded-2xl bg-sand p-4 text-sm"><span><b>Option to hide name</b><span className="mt-1 block text-xs text-black/45">Applies immediately to your public card.</span></span><input type="checkbox" checked={profile.hide_name} onChange={e => hideName(e.target.checked)} className="h-5 w-5 accent-[#17221d]"/></label>
        <button onClick={rotate} disabled={busy} className="mt-3 w-full text-left text-sm font-semibold text-moss">{busy ? 'Regenerating…' : 'Regenerate share link →'}</button>
      </div>
    </section>

    <section className="mt-5 card p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-4 top-3.5 text-black/35" size={18}/><input value={q} onChange={e => setQ(e.target.value)} className="input !pl-11" placeholder="Search reports by disease or date"/></div>
        <div className="relative"><Filter className="pointer-events-none absolute left-3 top-3.5 text-black/35" size={17}/><select value={filter} onChange={e => setFilter(e.target.value as any)} className="input min-w-44 !pl-10"><option value="all">All statuses</option><option value="verified_negative">Negative</option><option value="not_found">Not found</option><option value="not_updated">Not updated</option><option value="detected_positive">Detected</option></select></div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs uppercase tracking-wider text-black/35"><tr><th className="pb-3 font-medium">Report name</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Lab</th><th></th></tr></thead>
          <tbody>{filtered.map(r => <tr key={r.id} className="border-b border-black/5 last:border-0">
            <td className="py-4 font-semibold">{r.disease_name}{r.source_type === 'user_upload' && <span className="ml-2 rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-black/45">Uploaded</span>}</td>
            <td className="py-4 text-black/50">{new Date(r.report_date + 'T12:00:00').toLocaleDateString()}</td>
            <td className="py-4">{r.verification_state === 'pending' ? <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Pending verification · {reportedLabel(r.status)}</span> : <StatusPill status={r.status} compact/>}</td>
            <td className="py-4 text-black/50">{r.lab_name ?? r.extracted_metadata?.lab_name ?? 'Uploaded report'}</td>
            <td className="py-4 text-right"><div className="flex justify-end gap-3"><Link className="font-semibold text-black/45" href={`/api/reports/${r.report_verification_code}/file`} target="_blank">Report</Link>{r.verification_state === 'pending' ? <span className="font-semibold text-black/30">Awaiting verification</span> : <Link className="font-semibold text-moss" href={`/verify-report/${r.report_verification_code}`} target="_blank">Verify →</Link>}</div></td>
          </tr>)}</tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-black/40">No reports match this search.</div>}
      </div>
    </section>

    <section id="bookings" className="mt-5 card p-5 sm:p-7">
      <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-moss">Appointments</p><h2 className="mt-1 text-xl font-semibold">Upcoming bookings</h2></div><Link href="/labs" className="text-sm font-semibold text-moss">Find a lab →</Link></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{allBookings.length ? allBookings.map(b => <div key={b.id} className="rounded-2xl bg-sand p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{b.report_name}</p><p className="mt-1 text-sm text-black/45">{b.lab_name ?? 'Diagnostic lab'}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{b.status}</span></div><p className="mt-4 text-sm"><b>{new Date(b.booking_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</b> · {b.time_slot}</p></div>) : <div className="rounded-2xl bg-sand p-6 text-sm text-black/45">No bookings yet. Book a test from the labs page.</div>}</div>
    </section>

    <ReportUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleReportUploaded}/>
    <NotificationDrawer open={notificationOpen} onClose={() => { setNotificationOpen(false); setNotifications(current => current.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))); }} notifications={notifications}/>
  </div>;
}

function reportedLabel(status: ReportStatus) {
  if (status === 'verified_negative') return 'reported negative';
  if (status === 'detected_positive') return 'reported positive';
  if (status === 'not_found') return 'not found';
  return 'not updated';
}

function NotificationDrawer({ open, onClose, notifications }: { open: boolean; onClose: () => void; notifications: NotificationItem[] }) {
  if (!open) return null;
  const groups: Array<{ type: NotificationItem['type']; title: string; icon: typeof Bell }> = [
    { type: 'booking', title: 'Bookings', icon: CalendarDays },
    { type: 'report', title: 'Reports', icon: FileText },
    { type: 'profile', title: 'Profile changes', icon: UserRound }
  ];
  return <div className="fixed inset-0 z-[90] bg-black/20" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-moss">Notifications</p><h2 className="mt-1 text-2xl font-semibold">Recent activity</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black/5" aria-label="Close notifications"><X size={18}/></button></div>
      <div className="mt-7 space-y-7">{groups.map(group => {
        const items = notifications.filter(n => n.type === group.type);
        const Icon = group.icon;
        return <section key={group.type}><div className="flex items-center gap-2 text-sm font-semibold"><Icon size={17} className="text-moss"/>{group.title}</div><div className="mt-3 space-y-2">{items.length ? items.map(item => <div key={item.id} className={`rounded-2xl border p-4 ${item.read_at ? 'border-black/5 bg-sand' : 'border-moss/15 bg-mint/60'}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p>{!item.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-moss"/>}</div><p className="mt-1 text-sm leading-5 text-black/50">{item.message}</p><p className="mt-2 text-[11px] text-black/35">{new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div>) : <div className="rounded-2xl bg-sand p-4 text-sm text-black/40">No {group.title.toLowerCase()} notifications yet.</div>}</div></section>;
      })}</div>
    </aside>
  </div>;
}
