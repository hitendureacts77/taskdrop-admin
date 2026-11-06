import { IntegrationsView } from '@/components/views/AdminConfigViews';
import { emailFor, staffSeesContacts } from '@/lib/contact-mask';
import { getIntegrations } from '@/lib/admin-config';
import { requireSeeing } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const me = await requireSeeing('settings');
  const i = await getIntegrations();
  // The sign-in allowlist is a list of staff emails and phones: masked for roles other than Admin and Support.
  const allowlist = { emails: i.allowlist.emails.map((e) => emailFor(me.staffRole, e) ?? ''), phones: i.allowlist.phones.map((p) => (staffSeesContacts(me.staffRole) ? p : `••••• •${p.slice(-4)}`)) };
  return <IntegrationsView i={{ ...i, allowlist }} />;
}
