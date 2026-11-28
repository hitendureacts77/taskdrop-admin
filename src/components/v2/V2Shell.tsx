import type { ReactNode } from 'react';
import { IdleGuard } from '@/components/IdleGuard';
import type { AdminUser } from '@/lib/auth';
import type { AppEnvironment } from '@/lib/environment';
import type { MfaState } from '@/lib/mfa';
import { staffCanSee } from '@/lib/staff-roles';
import type { V2Counts } from './nav';
import { V2AutoCrumbs, V2BottomBar } from './V2BottomBar';
import { V2Frame } from './V2Frame';
import { V2Sidebar } from './V2Sidebar';
import { V2TopBar } from './V2TopBar';

/**
 * The admin v2 shell, chosen by app/(dashboard)/layout.tsx when the gate is
 * on. Same data, same LiveProvider, same idle sign-out and same sign-out
 * action as today's shell; only the chrome is new.
 */
export function V2Shell({
  user,
  counts,
  mfa,
  env,
  theme,
  hideTest,
  idleMinutes,
  signOut,
  children,
}: {
  user: AdminUser;
  counts: V2Counts;
  mfa: MfaState;
  env: AppEnvironment;
  theme: 'light' | 'dark' | 'system';
  hideTest: boolean;
  idleMinutes: number;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const seesMoney = staffCanSee(user.staffRole, 'money');
  return (
    <V2Frame role={user.staffRole} env={env} hideTest={hideTest}>
      <IdleGuard idleMinutes={idleMinutes} />
      <a href="#content" className="v2-skip">
        Skip to content
      </a>
      <V2Sidebar counts={counts} />
      <div className="v2-mainwrap">
        <V2TopBar
          email={user.email ?? null}
          seesMoney={seesMoney}
          seesSettings={staffCanSee(user.staffRole, 'settings')}
          unlockMoney={seesMoney && mfa.required && !mfa.verified}
          theme={theme}
          signOut={signOut}
        />
        <main className="v2-main" id="content" tabIndex={-1}>
          <V2AutoCrumbs />
          {children}
        </main>
      </div>
      <V2BottomBar />
    </V2Frame>
  );
}
