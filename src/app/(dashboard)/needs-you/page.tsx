import { NeedsYou } from '@/components/NeedsYou';
import { PageHeader } from '@/components/ui';
import { requireAdmin } from '@/lib/data';

export const metadata = { title: 'Needs you now' };

export default async function NeedsYouPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Needs you now' }]}
        title="Needs you now"
        sub="Everything waiting on a person, most urgent first. This list updates by itself."
      />
      <NeedsYou />
    </>
  );
}
