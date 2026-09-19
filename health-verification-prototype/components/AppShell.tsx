'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, FlaskConical, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Brand } from './Brand';
import { createBrowserSupabase } from '@/lib/supabase-browser';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/labs', label: 'Find labs', icon: FlaskConical },
  { href: '/dashboard#bookings', label: 'Bookings', icon: CalendarDays }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function logout() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) await createBrowserSupabase().auth.signOut();
    document.cookie = 'demo-auth=; Max-Age=0; path=/';
    router.push('/login'); router.refresh();
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-2xl bg-white shadow lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-black/5 bg-[#f4f7f3] p-5 transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
        <div className="flex items-center justify-between"><Brand /><button onClick={() => setOpen(false)} className="lg:hidden"><X /></button></div>
        <nav className="mt-10 space-y-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === '/labs' && pathname.startsWith('/labs'));
            return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${active ? 'bg-ink text-white' : 'text-black/60 hover:bg-white'}`}><Icon size={18} />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-3xl bg-mint p-4 text-sm leading-6 text-black/60"><b className="text-ink">Demo-safe verification</b><br />Public pages expose status only, never private reports.</div>
        <button onClick={logout} className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-black/60 hover:bg-white"><LogOut size={18}/> Sign out</button>
      </aside>
      <main className="min-w-0 p-4 pt-20 sm:p-7 sm:pt-20 lg:p-10 lg:pt-10">{children}</main>
    </div>
  );
}
