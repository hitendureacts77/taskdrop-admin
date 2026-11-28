import { NeedsYou } from '@/components/NeedsYou';
import { PageHeader } from '@/components/ui';
import { V2NeedsBoard } from '@/components/v2/dashboard/V2NeedsList';
import * as v2 from '@/components/v2/ui';
import { requireAdmin } from '@/lib/data';
import { parseNeedsFilter } from '@/lib/needs-you';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Needs you now' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function NeedsYouPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  if (await getV2()) {
    const filter = parseNeedsFilter((await searchParams).kind);
    return (
      <>
        <v2.PageHeader crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Needs you' }]} title="Needs you" sub="Everything waiting on a person, most urgent first. This list updates by itself." />
        <V2NeedsBoard filter={filter} />
      </>
    );
  }
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
