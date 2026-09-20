import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { DashboardClient } from '@/components/DashboardClient';
import { getCurrentUserData } from '@/lib/repository';

export default async function DashboardPage() {
  try {
    const data = await getCurrentUserData();
    return <AppShell><DashboardClient initialProfile={data.profile} reports={data.reports} bookings={data.bookings} initialNotifications={data.notifications}/></AppShell>;
  } catch (e: any) {
    if (e?.message === 'UNAUTHENTICATED') redirect('/login');
    throw e;
  }
}
