import { FeedbackView } from '@/components/views/FeedbackView';
import { FeedbackV2 } from '@/components/v2/catalog/FeedbackV2';
import { requireAdmin } from '@/lib/data';
import { asFeedbackTab, getBoardCounts, getBoardPosts, getPrivateNotes } from '@/lib/feedback';
import { staffCan } from '@/lib/staff-roles';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Feedback board' };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // Before anything is read: the files on feedback are signed with the service key (lib/photos.ts).
  const me = await requireAdmin();
  const tab = asFeedbackTab((await searchParams).tab);
  const v2 = await getV2();
  // Admin v2 "Hide test data" (false whenever v2 is off, so today's reads are unchanged).
  const opts = { hideTest: await getHideTestData() };
  const empty = { data: [], setup: false, error: null };
  const [posts, notes, counts] = await Promise.all([
    tab === 'notes' ? Promise.resolve(empty) : getBoardPosts(tab, opts),
    tab === 'notes' ? getPrivateNotes(opts) : Promise.resolve(empty),
    getBoardCounts(opts),
  ]);
  // View-only roles get no buttons; the feedback actions refuse them on the server anyway (B133).
  if (v2) return <FeedbackV2 tab={tab} posts={posts} notes={notes} counts={counts} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} hideTest={opts.hideTest} />;
  return <FeedbackView tab={tab} posts={posts} notes={notes} counts={counts} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
