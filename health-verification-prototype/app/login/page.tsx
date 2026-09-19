'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Chrome } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@verihealth.app');
  const [password, setPassword] = useState('Demo123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (demo) {
        if (email !== 'demo@verihealth.app' || password !== 'Demo123!') throw new Error('Use the demo credentials prefilled above.');
        document.cookie = 'demo-auth=1; path=/; SameSite=Lax';
      } else {
        const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push('/dashboard'); router.refresh();
    } catch (e: any) { setError(e.message || 'Unable to sign in.'); }
    finally { setLoading(false); }
  }

  async function google() {
    if (demo) { setError('Google OAuth is enabled after Supabase credentials are configured.'); return; }
    await createBrowserSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } });
  }

  return <AuthCard title="Welcome back" subtitle="Access verified reports, bookings and your shareable health card.">
    <form onSubmit={submit} className="space-y-4">
      <label><span className="label">Email Address</span><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label><span className="label">Password</span><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
    </form>
    <button onClick={google} className="btn-secondary mt-3 w-full"><Chrome size={17}/> Login with Google</button>
    <p className="mt-6 text-center text-sm text-black/50">New User? <Link className="font-semibold text-moss" href="/signup">Sign Up</Link></p>
    {demo && <div className="mt-5 rounded-2xl bg-mint p-3 text-xs leading-5 text-moss"><b>Local demo mode</b><br/>demo@verihealth.app / Demo123!</div>}
  </AuthCard>;
}
