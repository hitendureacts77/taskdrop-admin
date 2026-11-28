import { IntegrationsView } from '@/components/views/AdminConfigViews';
import { IntegrationsV2 } from '@/components/v2/settings-tools/IntegrationsV2';
import { readIdleSetting } from '@/components/v2/settings-tools/reads';
import { emailFor, staffSeesContacts } from '@/lib/contact-mask';
import { getIntegrations } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'Integrations' };

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const me = await requireSeeing('settings');
  const i = await getIntegrations();
  // The sign-in allowlist is a list of staff emails and phones: masked for roles other than Admin and Support.
  const allowlist = { emails: i.allowlist.emails.map((e) => emailFor(me.staffRole, e) ?? ''), phones: i.allowlist.phones.map((p) => (staffSeesContacts(me.staffRole) ? p : `••••• •${p.slice(-4)}`)) };
  if (await getV2()) {
    return <IntegrationsV2 i={{ ...i, allowlist }} role={me.staffRole} idleSetting={await readIdleSetting()} />;
  }
  return <IntegrationsView i={{ ...i, allowlist }} />;
}
