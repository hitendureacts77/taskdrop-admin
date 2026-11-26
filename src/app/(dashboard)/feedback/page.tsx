import { FeedbackView } from '@/components/views/FeedbackView';
import { requireAdmin } from '@/lib/data';
import { asFeedbackTab, getBoardCounts, getBoardPosts, getPrivateNotes } from '@/lib/feedback';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Feedback board' };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // Before anything is read: the files on feedback are signed with the service key (lib/photos.ts).
  const me = await requireAdmin();
  const tab = asFeedbackTab((await searchParams).tab);
  const empty = { data: [], setup: false, error: null };
  const [posts, notes, counts] = await Promise.all([
    tab === 'notes' ? Promise.resolve(empty) : getBoardPosts(tab),
    tab === 'notes' ? getPrivateNotes() : Promise.resolve(empty),
    getBoardCounts(),
  ]);
  // View-only roles get no buttons; the feedback actions refuse them on the server anyway (B133).
  return <FeedbackView tab={tab} posts={posts} notes={notes} counts={counts} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
