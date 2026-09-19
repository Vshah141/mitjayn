import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { isSupabaseConfigured } from '@/lib/supabase';
export async function POST(req:Request){
  const form=await req.formData(); const file=form.get('file'); if(!(file instanceof File))return NextResponse.json({error:'No file supplied.'},{status:400});
  if(file.size>5*1024*1024)return NextResponse.json({error:'Image must be under 5MB.'},{status:400});
  if(!isSupabaseConfigured){return NextResponse.json({error:'Photo uploads require Supabase Storage. Demo mode keeps the initials avatar.'},{status:501});}
  const supabase=createRouteHandlerClient({cookies}); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,''); const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
  const {error:uploadError}=await supabase.storage.from('profile-photos').upload(path,file,{upsert:false,contentType:file.type}); if(uploadError)return NextResponse.json({error:uploadError.message},{status:400});
  const {error:updateError}=await supabase.from('profiles').update({photo_url:path}).eq('id',user.id); if(updateError)return NextResponse.json({error:updateError.message},{status:400});
  const {data}=await supabase.storage.from('profile-photos').createSignedUrl(path,3600); return NextResponse.json({url:data?.signedUrl??null});
}
