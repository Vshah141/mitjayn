import { AppShell } from '@/components/AppShell';
import { LabsClient } from '@/components/LabsClient';
import { getLabs } from '@/lib/repository';
export default async function LabsPage(){return <AppShell><LabsClient initialLabs={await getLabs()}/></AppShell>}
