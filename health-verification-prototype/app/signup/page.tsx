'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Chrome } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', mobile:'', dob:'', terms:false });
  const [error, setError] = useState(''); const [loading,setLoading]=useState(false);
  const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const set = (k:string,v:any) => setForm(x=>({...x,[k]:v}));
  async function submit(e:React.FormEvent){
    e.preventDefault(); setError('');
    if(form.password.length<8) return setError('Password must be at least 8 characters.');
    if(form.password!==form.confirm) return setError('Passwords do not match.');
    if(!form.terms) return setError('Please accept the Terms & Conditions.');
    setLoading(true);
    try{
      if(demo){ document.cookie='demo-auth=1; path=/; SameSite=Lax'; }
      else {
        const supabase=createBrowserSupabase();
        const {data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.name}}}); if(error) throw error;
        if(!data.user) throw new Error('Account could not be created.');
        if(data.session){
          const {error:profileError}=await supabase.from('profiles').upsert({id:data.user.id,name:form.name,mobile_number:form.mobile,date_of_birth:form.dob});
          if(profileError) throw profileError;
        } else {
          router.push('/login'); return;
        }
      }
      router.push('/dashboard'); router.refresh();
    }catch(e:any){setError(e.message||'Unable to create account.');}finally{setLoading(false);}
  }
  async function google(){ if(demo){setError('Google OAuth becomes active after Supabase is configured.');return;} await createBrowserSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/dashboard`}}); }
  return <AuthCard title="Create your profile" subtitle="Your private profile stays separate from the data shown on public verification pages.">
    <form onSubmit={submit} className="space-y-4">
      <label><span className="label">Name</span><input className="input" value={form.name} onChange={e=>set('name',e.target.value)} required/></label>
      <label><span className="label">Email</span><input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} required/></label>
      <div className="grid grid-cols-2 gap-3"><label><span className="label">Password</span><input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)} required/></label><label><span className="label">Confirm</span><input className="input" type="password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} required/></label></div>
      <label><span className="label">Mobile Number</span><input className="input" value={form.mobile} onChange={e=>set('mobile',e.target.value)} required/></label>
      <label><span className="label">Date of Birth</span><input className="input" type="date" value={form.dob} onChange={e=>set('dob',e.target.value)} required/></label>
      <label className="flex items-start gap-3 text-sm text-black/60"><input className="mt-1" type="checkbox" checked={form.terms} onChange={e=>set('terms',e.target.checked)}/><span>I agree to the Terms & Conditions and consent to the secure processing of my health-verification data.</span></label>
      {error&&<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <button className="btn-primary w-full" disabled={loading}>{loading?'Creating account…':'Sign Up'}</button>
    </form>
    <button onClick={google} className="btn-secondary mt-3 w-full"><Chrome size={17}/> Sign in using Google</button>
    <p className="mt-6 text-center text-sm text-black/50">Already registered? <Link className="font-semibold text-moss" href="/login">Login</Link></p>
  </AuthCard>;
}
