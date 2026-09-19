import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
if (!url || !service) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running npm run seed:demo');
const supabase = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

const email = 'demo@verihealth.app';
const password = 'Demo123!';

const parents = [
  ['10000000-0000-4000-8000-000000000001','Northstar Diagnostics','2500 Cedar Springs Rd, Dallas, TX','75201',4.9,32.7977,-96.8062],
  ['10000000-0000-4000-8000-000000000002','Atlas Clinical Labs','1818 N Harwood St, Dallas, TX','75201',4.7,32.7889,-96.8011],
  ['10000000-0000-4000-8000-000000000003','Cedar Health Labs','3414 Oak Lawn Ave, Dallas, TX','75219',4.8,32.8093,-96.8054],
  ['10000000-0000-4000-8000-000000000004','Veridian Diagnostics','8611 Hillcrest Rd, Dallas, TX','75225',4.6,32.8652,-96.7862],
  ['10000000-0000-4000-8000-000000000005','Elm Street Pathology','1700 Pacific Ave, Dallas, TX','75201',4.5,32.7815,-96.7983],
  ['10000000-0000-4000-8000-000000000006','Parkland Reference Lab','5200 Harry Hines Blvd, Dallas, TX','75235',4.9,32.8124,-96.8351],
  ['10000000-0000-4000-8000-000000000007','Trinity Molecular','1445 Ross Ave, Dallas, TX','75202',4.4,32.7839,-96.8031],
  ['10000000-0000-4000-8000-000000000008','Oak Cliff Diagnostics','221 W 12th St, Dallas, TX','75208',4.5,32.7440,-96.8262],
  ['10000000-0000-4000-8000-000000000009','White Rock Lab Services','1151 N Buckner Blvd, Dallas, TX','75218',4.7,32.8345,-96.7166],
  ['10000000-0000-4000-8000-000000000010','Deep Ellum Diagnostics','2801 Elm St, Dallas, TX','75226',4.3,32.7845,-96.7839]
];
const branches = [
  ['11000000-0000-4000-8000-000000000001',parents[0][0],'Northstar Diagnostics — Uptown','3227 McKinney Ave, Dallas, TX','75204',4.8,32.8024,-96.7990],
  ['11000000-0000-4000-8000-000000000002',parents[0][0],'Northstar Diagnostics — Lakewood','6415 Gaston Ave, Dallas, TX','75214',4.7,32.8144,-96.7537],
  ['11000000-0000-4000-8000-000000000003',parents[0][0],'Northstar Diagnostics — Preston','6025 Royal Ln, Dallas, TX','75230',4.8,32.8953,-96.8021],
  ['11000000-0000-4000-8000-000000000004',parents[1][0],'Atlas Clinical Labs — Uptown','3699 McKinney Ave, Dallas, TX','75204',4.8,32.8079,-96.7983],
  ['11000000-0000-4000-8000-000000000005',parents[1][0],'Atlas Clinical Labs — Bishop Arts','408 N Bishop Ave, Dallas, TX','75208',4.6,32.7497,-96.8278]
];

async function ensureUser() {
  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = usersData?.users?.find(u => u.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Maya Patel' } });
    if (error) throw error; user = data.user;
  } else {
    await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }
  return user;
}

async function makeReportPdf({ patient, disease, status, date, verificationCode, labName }) {
  const pdf = await PDFDocument.create(); const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText(labName, { x: 46, y: 730, size: 18, font: bold, color: rgb(.09,.13,.11) });
  page.drawText('Diagnostic Laboratory Report', { x: 46, y: 705, size: 10, font, color: rgb(.35,.4,.37) });
  page.drawLine({ start: {x:46,y:685}, end: {x:566,y:685}, thickness:1, color:rgb(.85,.87,.86) });
  page.drawText(`Patient: ${patient}`, {x:46,y:650,size:11,font});
  page.drawText(`Test / disease: ${disease}`, {x:46,y:625,size:11,font});
  page.drawText(`Report date: ${date}`, {x:46,y:600,size:11,font});
  page.drawText(`Result status: ${status.replaceAll('_',' ')}`, {x:46,y:565,size:12,font:bold,color: status==='detected_positive'?rgb(.72,.18,.18):rgb(.12,.42,.29)});
  page.drawText('This seeded prototype report intentionally omits detailed clinical measurements.', {x:46,y:520,size:9.5,font,color:rgb(.38,.4,.39)});
  const verifyUrl = `${appUrl}/verify-report/${verificationCode}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { type:'png', width:260, margin:1, errorCorrectionLevel:'M' });
  const qr = await pdf.embedPng(qrPng); page.drawImage(qr, {x:420,y:70,width:130,height:130});
  page.drawText('Scan to check report authenticity', {x:398,y:52,size:8,font});
  return Buffer.from(await pdf.save());
}

async function main() {
  const user = await ensureUser();
  await supabase.from('labs').upsert(parents.map(([id,name,address,postal_code,rating,latitude,longitude]) => ({id,name,address,postal_code,rating,latitude,longitude,parent_lab_id:null})), { onConflict:'id' });
  await supabase.from('labs').upsert(branches.map(([id,parent_lab_id,name,address,postal_code,rating,latitude,longitude]) => ({id,parent_lab_id,name,address,postal_code,rating,latitude,longitude})), { onConflict:'id' });
  await supabase.from('profiles').upsert({ id:user.id, name:'Maya Patel', age:29, gender:'Female', mobile_number:'+1 555 014 2291', date_of_birth:'1997-04-14', is_verified:true, hide_name:false }, { onConflict:'id' });

  const { data: oldFiles } = await supabase.storage.from('reports').list(user.id, { limit:100 });
  if (oldFiles?.length) await supabase.storage.from('reports').remove(oldFiles.map(f => `${user.id}/${f.name}`));
  await supabase.from('disease_reports').delete().eq('profile_id', user.id);

  const configs = [
    ['Covid-19','verified_negative',parents[0][0],'Northstar Diagnostics','2026-09-05'],
    ['Dengue','detected_positive',branches[3][0],'Atlas Clinical Labs — Uptown','2026-08-28'],
    ['Malaria','verified_negative',parents[2][0],'Cedar Health Labs','2026-07-17'],
    ['Monkeypox','not_found',parents[4][0],'Elm Street Pathology','2026-06-03'],
    ['Swine Flu','not_updated',parents[3][0],'Veridian Diagnostics','2026-05-22']
  ];
  for (const [disease,status,labId,labName,date] of configs) {
    const verificationCode = crypto.randomBytes(16).toString('base64url');
    const bytes = await makeReportPdf({ patient:'Maya Patel', disease, status, date, verificationCode, labName });
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    const path = `${user.id}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('reports').upload(path, bytes, { contentType:'application/pdf', upsert:false });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from('disease_reports').insert({ profile_id:user.id, disease_name:disease, status, lab_id:labId, report_date:date, report_file_url:path, report_verification_code:verificationCode, report_file_hash:hash });
    if (error) throw error;
  }

  await supabase.from('favorite_labs').delete().eq('profile_id', user.id);
  await supabase.from('favorite_labs').insert([{profile_id:user.id,lab_id:parents[0][0]},{profile_id:user.id,lab_id:parents[1][0]}]);
  await supabase.from('bookings').delete().eq('profile_id', user.id);
  await supabase.from('bookings').insert({ profile_id:user.id, lab_id:parents[2][0], report_name:'Malaria follow-up panel', report_description:'Follow-up after travel', booking_date:'2026-09-12', time_slot:'10:30 AM', status:'booked' });

  console.log('\nSeed complete.');
  console.log(`Demo login: ${email}`);
  console.log(`Demo password: ${password}`);
  console.log(`App URL expected at: ${appUrl}`);
}

main().catch(err => { console.error(err); process.exit(1); });
