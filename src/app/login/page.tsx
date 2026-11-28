import { loginErrorText } from '@/lib/login-errors';
import { getV2 } from '@/lib/v2-gate-server';
import { LoginClassic } from './LoginClassic';
import { LoginV2 } from './LoginV2';

/** Sign-in: admin v2's page when the gate is on, today's page otherwise (unchanged). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await getV2())) return <LoginClassic />;
  const raw = (await searchParams).error;
  // Only fixed sentences: a link can carry any text in ?error= (B130).
  return <LoginV2 initialError={loginErrorText(Array.isArray(raw) ? raw[0] : raw)} />;
}
