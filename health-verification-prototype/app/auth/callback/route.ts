import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
export async function GET(req:NextRequest){const url=new URL(req.url);const code=url.searchParams.get('code');if(code){const s=createRouteHandlerClient({cookies});await s.auth.exchangeCodeForSession(code);}return NextResponse.redirect(new URL('/dashboard',req.url));}
