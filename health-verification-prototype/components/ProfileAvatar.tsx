export function ProfileAvatar({ name, photo, size = 'lg' }: { name: string; photo?: string | null; size?: 'sm'|'lg' }) {
  const cls = size === 'lg' ? 'h-24 w-24 text-2xl' : 'h-10 w-10 text-sm';
  if (photo) return <img src={photo} alt={name} className={`${cls} rounded-3xl object-cover`} />;
  const initials = name.split(' ').map(x => x[0]).slice(0,2).join('');
  return <div className={`${cls} grid place-items-center rounded-3xl bg-mint font-semibold text-moss`}>{initials}</div>;
}
