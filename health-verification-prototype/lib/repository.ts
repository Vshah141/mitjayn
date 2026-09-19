import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { DEMO_BOOKINGS, DEMO_LABS, DEMO_PROFILE, DEMO_REPORTS, DEMO_TOKEN } from './demo';
import { adminSupabase, isSupabaseConfigured } from './supabase';
import { Booking, DiseaseReport, Lab, Profile } from './types';

export async function getCurrentUserData(): Promise<{ profile: Profile; reports: DiseaseReport[]; bookings: Booking[] }> {
  if (!isSupabaseConfigured) {
    const c = cookies();
    const token = c.get('demo-share-token')?.value || DEMO_PROFILE.public_share_token;
    const hide = c.get('demo-hide-name')?.value === '1';
    return { profile: { ...DEMO_PROFILE, public_share_token: token, hide_name: hide }, reports: DEMO_REPORTS, bookings: DEMO_BOOKINGS };
  }
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  const [{ data: profile, error: pe }, { data: reports, error: re }, { data: bookings, error: be }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('disease_reports').select('*, labs(name)').eq('profile_id', user.id).order('report_date', { ascending: false }),
    supabase.from('bookings').select('*, labs(name)').eq('profile_id', user.id).order('booking_date', { ascending: true })
  ]);
  if (pe || re || be) throw pe || re || be;
  let signedPhoto: string | null = null;
  if (profile.photo_url) {
    const { data } = await supabase.storage.from('profile-photos').createSignedUrl(profile.photo_url, 3600);
    signedPhoto = data?.signedUrl ?? null;
  }
  return {
    profile: { ...profile, photo_url: signedPhoto } as Profile,
    reports: (reports ?? []).map((r: any) => ({ ...r, lab_name: r.labs?.name ?? null })) as DiseaseReport[],
    bookings: (bookings ?? []).map((b: any) => ({ ...b, lab_name: b.labs?.name ?? null })) as Booking[]
  };
}

export async function getLabs(): Promise<Lab[]> {
  if (!isSupabaseConfigured) return DEMO_LABS.filter(l => !l.parent_lab_id);
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  const [{ data: labs }, { data: branches }, { data: favorites }] = await Promise.all([
    supabase.from('labs').select('*').is('parent_lab_id', null).order('rating', { ascending: false }),
    supabase.from('labs').select('parent_lab_id').not('parent_lab_id', 'is', null),
    supabase.from('favorite_labs').select('lab_id').eq('profile_id', user.id)
  ]);
  const favoriteIds = new Set((favorites ?? []).map((f: any) => f.lab_id));
  const branchCounts = new Map<string, number>();
  for (const branch of branches ?? []) branchCounts.set((branch as any).parent_lab_id, (branchCounts.get((branch as any).parent_lab_id) ?? 0) + 1);
  return (labs ?? []).map((l: any) => ({ ...l, is_favorite: favoriteIds.has(l.id), branch_count: branchCounts.get(l.id) ?? 0 })) as Lab[];
}

export async function getLab(id: string): Promise<Lab | null> {
  if (!isSupabaseConfigured) return DEMO_LABS.find(l => l.id === id) ?? null;
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.from('labs').select('*').eq('id', id).single();
  return data as Lab | null;
}

export async function getBranches(parentId: string): Promise<Lab[]> {
  if (!isSupabaseConfigured) return DEMO_LABS.filter(l => l.parent_lab_id === parentId);
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.from('labs').select('*').eq('parent_lab_id', parentId).order('rating', { ascending: false });
  return (data ?? []) as Lab[];
}

export async function getPublicHealthCard(token: string) {
  if (!isSupabaseConfigured) {
    const c = cookies();
    const activeToken = c.get('demo-share-token')?.value || DEMO_TOKEN;
    if (token !== activeToken) return null;
    const hide = c.get('demo-hide-name')?.value === '1';
    return { name: hide ? null : DEMO_PROFILE.name, is_verified: DEMO_PROFILE.is_verified, photo_url: null, reports: DEMO_REPORTS.map(r => ({ disease_name: r.disease_name, status: r.status })) };
  }
  const admin = adminSupabase();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for public verification routes.');
  const { data, error } = await admin.rpc('get_public_health_card', { share_token_input: token });
  if (error || !data?.length) return null;
  const first = data[0];
  let signedPhoto: string | null = null;
  const { data: profile } = await admin.from('profiles').select('photo_url').eq('public_share_token', token).maybeSingle();
  if (profile?.photo_url) {
    const { data: signed } = await admin.storage.from('profile-photos').createSignedUrl(profile.photo_url, 600);
    signedPhoto = signed?.signedUrl ?? null;
  }
  return { name: first.name, is_verified: first.is_verified, photo_url: signedPhoto, reports: data.map((r: any) => ({ disease_name: r.disease_name, status: r.status })) };
}

export async function getReportAuthenticity(code: string) {
  if (!isSupabaseConfigured) {
    const r = DEMO_REPORTS.find(x => x.report_verification_code === code);
    if (!r) return null;
    const hide = cookies().get('demo-hide-name')?.value === '1';
    return { lab_name: r.lab_name ?? 'Unknown lab', disease_name: r.disease_name, report_date: r.report_date, status: r.status, patient_name: hide ? null : DEMO_PROFILE.name, file_hash_matches: Boolean(r.report_file_hash), hash_check_available: Boolean(r.report_file_hash) };
  }
  const admin = adminSupabase();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for public report verification.');
  const { data: report } = await admin.from('disease_reports').select('disease_name,status,report_date,report_file_url,report_file_hash, labs(name), profiles(name,hide_name)').eq('report_verification_code', code).single();
  if (!report) return null;
  let matches: boolean | null = null;
  if (report.report_file_url && report.report_file_hash) {
    const { data: file } = await admin.storage.from('reports').download(report.report_file_url);
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      matches = crypto.createHash('sha256').update(buf).digest('hex') === report.report_file_hash;
    }
  }
  const profile: any = report.profiles;
  const lab: any = report.labs;
  return { lab_name: lab?.name ?? 'Unknown lab', disease_name: report.disease_name, report_date: report.report_date, status: report.status, patient_name: profile?.hide_name ? null : profile?.name ?? null, file_hash_matches: matches, hash_check_available: matches !== null };
}

export function requestFingerprint() {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}
