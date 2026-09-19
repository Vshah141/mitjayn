import { Brand } from './Brand';
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center px-4 py-10"><section className="card w-full max-w-md p-6 sm:p-8"><Brand/><div className="mt-8"><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-black/50">{subtitle}</p></div><div className="mt-7">{children}</div></section></main>;
}
