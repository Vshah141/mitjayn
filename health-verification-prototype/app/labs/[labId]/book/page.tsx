import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BookingClient } from '@/components/BookingClient';
import { getLab } from '@/lib/repository';
export default async function BookPage({params}:{params:{labId:string}}){const lab=await getLab(params.labId);if(!lab){notFound();throw new Error('Lab not found');}return <AppShell><BookingClient lab={lab}/></AppShell>}
