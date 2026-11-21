import { FeedbackView } from '@/components/views/FeedbackView';
import { requireAdmin } from '@/lib/data';
import { asBoardTab, getBoardCounts, getBoardPosts } from '@/lib/feedback';
import { staffCan } from '@/lib/staff-roles';

export const metadata = { title: 'Feedback board' };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin();
  const tab = asBoardTab((await searchParams).tab);
  const [posts, counts] = await Promise.all([getBoardPosts(tab), getBoardCounts()]);
  // View-only roles get no buttons; the feedback actions refuse them on the server anyway (B133).
  return <FeedbackView tab={tab} posts={posts} counts={counts} now={new Date().toISOString()} canAct={staffCan(me.staffRole, 'people')} />;
}
