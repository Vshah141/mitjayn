import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { getBranches, getLab } from '@/lib/repository';
import { BranchesClient } from '@/components/BranchesClient';
import { notFound } from 'next/navigation';
export default async function BranchesPage({params}:{params:{labId:string}}){const [parent,branches]=await Promise.all([getLab(params.labId),getBranches(params.labId)]);if(!parent){notFound();throw new Error('Lab not found');}return <AppShell><div className="mx-auto max-w-4xl"><Link href="/labs" className="inline-flex items-center gap-2 text-sm font-semibold text-moss"><ArrowLeft size={16}/> Back to labs</Link><h1 className="mt-5 text-3xl font-semibold tracking-tight">Choose a {parent.name} branch</h1><p className="mt-2 text-sm text-black/45">Select the location that works best for your appointment.</p><BranchesClient branches={branches}/></div></AppShell>}
