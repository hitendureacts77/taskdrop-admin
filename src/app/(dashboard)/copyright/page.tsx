import { CopyrightView } from '@/components/views/CopyrightView';
import { getCopyrightNotices } from '@/lib/copyright';
import { requireAdmin } from '@/lib/data';

export default async function CopyrightPage() {
  await requireAdmin();
  const { ready, rows } = await getCopyrightNotices();
  return <CopyrightView ready={ready} rows={rows} now={new Date().toISOString()} />;
}
