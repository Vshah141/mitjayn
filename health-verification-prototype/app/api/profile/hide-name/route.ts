import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: Request){
  const { hide_name } = await req.json();
  if(typeof hide_name!=='boolean') return NextResponse.json({error:'Invalid value.'},{status:400});
  if(!isSupabaseConfigured){ cookies().set('demo-hide-name', hide_name?'1':'0',{path:'/',sameSite:'lax'}); return NextResponse.json({ok:true}); }
  const supabase=createRouteHandlerClient({cookies});
  const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {error}=await supabase.from('profiles').update({hide_name}).eq('id',user.id);
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
}
