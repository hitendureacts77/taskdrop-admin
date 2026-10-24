// TEMP (Phase 1 verify, remove after the check): throws on purpose when called with the token.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('t') === '6743ef8a8d9f26a4') throw new Error('Sentry verify: test error from the admin server');
  return new Response('ok');
}
