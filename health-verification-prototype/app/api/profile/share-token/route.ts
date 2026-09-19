import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { isSupabaseConfigured } from '@/lib/supabase';
export async function POST(){
  const token=crypto.randomBytes(18).toString('base64url');
  if(!isSupabaseConfigured){cookies().set('demo-share-token',token,{path:'/',sameSite:'lax'});return NextResponse.json({token});}
  const supabase=createRouteHandlerClient({cookies}); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {error}=await supabase.from('profiles').update({public_share_token:token}).eq('id',user.id); return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({token});
}
