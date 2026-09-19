import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { DEMO_PROFILE, DEMO_REPORTS } from '@/lib/demo';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { verificationCode: string } }) {
  if (!isSupabaseConfigured) {
    const report = DEMO_REPORTS.find(r => r.report_verification_code === params.verificationCode);
    if (!report) return new NextResponse('Not found', { status: 404 });
    const pdf = await PDFDocument.create(); const page = pdf.addPage([612,792]); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawText('Northstar Partner Diagnostic Report', {x:46,y:728,size:18,font:bold,color:rgb(.09,.13,.11)});
    page.drawText(`Patient: ${DEMO_PROFILE.name}`,{x:46,y:685,size:11,font}); page.drawText(`Test: ${report.disease_name}`,{x:46,y:660,size:11,font}); page.drawText(`Report date: ${report.report_date}`,{x:46,y:635,size:11,font}); page.drawText(`Status: ${report.status.replaceAll('_',' ')}`,{x:46,y:610,size:11,font:bold});
    page.drawLine({start:{x:46,y:585},end:{x:566,y:585},thickness:1,color:rgb(.85,.87,.86)}); page.drawText('Prototype report: detailed clinical values intentionally omitted.',{x:46,y:555,size:10,font,color:rgb(.35,.39,.37)});
    const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin; const verifyUrl=`${origin}/verify-report/${report.report_verification_code}`; const png=await QRCode.toBuffer(verifyUrl,{type:'png',width:240,margin:1}); const qr=await pdf.embedPng(png); page.drawImage(qr,{x:430,y:70,width:120,height:120}); page.drawText('Scan to check report authenticity',{x:405,y:52,size:8,font});
    const bytes=await pdf.save(); return new NextResponse(Buffer.from(bytes),{headers:{'content-type':'application/pdf','content-disposition':`inline; filename="${report.disease_name.toLowerCase().replace(/\s+/g,'-')}-demo-report.pdf"`}});
  }
  const supabase=createRouteHandlerClient({cookies}); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data:report,error}=await supabase.from('disease_reports').select('report_file_url').eq('report_verification_code',params.verificationCode).single(); if(error||!report?.report_file_url)return NextResponse.json({error:'Report file unavailable.'},{status:404});
  const {data}=await supabase.storage.from('reports').createSignedUrl(report.report_file_url,60); if(!data?.signedUrl)return NextResponse.json({error:'Could not create signed report URL.'},{status:500}); return NextResponse.redirect(data.signedUrl);
}
