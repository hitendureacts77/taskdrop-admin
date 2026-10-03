import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Icon } from '@/components/Icon';
import { getNavCounts, requireAdmin } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

async function signOutAction() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * The admin shell. requireAdmin() here keeps the chrome away from non-admins,
 * and every page calls it again next to its own data, because a layout's
 * redirect does not stop the page beside it from rendering on the server.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const counts = await getNavCounts();
  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="shell">
      <a href="#content" className="skip">
        Skip to content
      </a>
      <Sidebar counts={counts} />
      <div className="main">
        <header className="topbar">
          <form action="/search" method="get" className="top-search" role="search">
            <Icon name="search" size={16} />
            <input type="search" name="q" placeholder="Search jobs and people" aria-label="Search jobs and people" />
          </form>
          <div className="top-right">
            <Link href="/payouts" className="chip" title="Workers' withdrawals are sent by RazorpayX. Open Payouts for the balance and anything that needs you.">
              <span className="chip-dot" aria-hidden="true" /> Payouts: RazorpayX
            </Link>
            <span className="top-date">{today}</span>
            <span className="top-user" title={user.email ?? undefined}>
              {user.email ?? 'Admin'}
            </span>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-small">
                <Icon name="logout" size={14} /> Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="content" id="content">
          {children}
        </main>
      </div>
    </div>
  );
}
