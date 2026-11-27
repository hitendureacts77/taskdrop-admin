import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { STAFF_ROLES, staffCanSee, type StaffView } from '../src/lib/staff-roles';

/**
 * Admin golden path (H80). Part a needs nothing; part b runs per staff role when
 * ADMIN_E2E_<ROLE>_USERNAME / ADMIN_E2E_<ROLE>_PASSWORD are set. It never changes data.
 */

type MenuItem = { href: string; label: string; view?: StaffView };

/** The side menu's pages, read from the Sidebar component itself so this never drifts from it. */
function menuItems(): MenuItem[] {
  const src = readFileSync(join(process.cwd(), 'src', 'components', 'Sidebar.tsx'), 'utf8');
  const items: MenuItem[] = [];
  for (const line of src.split('\n')) {
    const m = line.match(/\{\s*href:\s*'([^']+)',\s*label:\s*'([^']+)'/);
    if (!m) continue;
    const view = line.match(/view:\s*'(money|settings)'/);
    items.push({ href: m[1]!, label: m[2]!, view: view ? (view[1] as StaffView) : undefined });
  }
  return items;
}

const MENU = menuItems();

/** Collects console errors and uncaught page errors for the page's life. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    // next dev's hot-reload socket is not part of the panel (it does not exist in a built admin).
    if (msg.type() === 'error' && !msg.text().includes('/_next/hmr')) errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe('signed out', () => {
  test('the menu was read from the Sidebar', () => {
    expect(MENU.length).toBeGreaterThan(10);
    expect(MENU.map((i) => i.href)).toContain('/');
  });

  test('/login loads with the Ops console heading and no console errors', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Ops console' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Google sign-in starts on the server with an HttpOnly code cookie (H37)', async ({ request }) => {
    const res = await request.get('/auth/google', { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    const to = new URL(res.headers()['location'] ?? '');
    expect(to.pathname).toBe('/auth/v1/authorize');
    expect(to.searchParams.get('provider')).toBe('google');
    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value);
    const verifier = cookies.find((c) => /code-verifier=/.test(c));
    expect(verifier, 'the one-time code verifier cookie is set').toBeTruthy();
    expect(verifier!).toMatch(/HttpOnly/i);
  });

  test('every side-menu page sends a signed-out visitor to /login', async ({ request }) => {
    // next dev compiles each page on its first visit, so a local run needs time.
    test.setTimeout(15 * 60_000);
    for (const item of MENU) {
      const res = await request.get(item.href, { maxRedirects: 0 });
      expect([302, 303, 307, 308], `${item.label} (${item.href}) answers with a redirect`).toContain(res.status());
      const to = new URL(res.headers()['location'] ?? '', 'http://x').pathname;
      expect(to, `${item.label} (${item.href}) redirects to /login`).toBe('/login');
    }
  });

  test('/login?error=<script> does not render the raw text (B130)', async ({ page }) => {
    const raw = '<script>window.__xss=1</script>';
    await page.goto(`/login?error=${encodeURIComponent(raw)}`);
    await expect(page.getByRole('heading', { name: 'Ops console' })).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('__xss');
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });
});

for (const { value: role } of STAFF_ROLES) {
  const key = role.toUpperCase();
  const username = process.env[`ADMIN_E2E_${key}_USERNAME`];
  const password = process.env[`ADMIN_E2E_${key}_PASSWORD`];

  test.describe(`role: ${role}`, () => {
    test.skip(
      !username || !password,
      `ADMIN_E2E_${key}_USERNAME and ADMIN_E2E_${key}_PASSWORD are not set, so the ${role} sign-in is not run`,
    );

    test(`${role}: sign in, open every allowed page, refused pages, sign out`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = watchErrors(page);

      // Sign in through the same form and POST /api/auth/password the login page uses.
      await page.goto('/login');
      await page.getByLabel('Username').fill(username!);
      await page.getByLabel('Password').fill(password!);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith('/api/auth/password') && r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Sign in' }).click(),
      ]);
      expect(res.ok(), 'POST /api/auth/password').toBe(true);
      await page.waitForURL((u) => u.pathname === '/');

      const allowed = MENU.filter((i) => !i.view || staffCanSee(role, i.view));
      const hidden = MENU.filter((i) => i.view && !staffCanSee(role, i.view));

      // Every allowed page loads clean.
      for (const item of allowed) {
        errors.length = 0;
        await page.goto(item.href);
        await expect(page.locator('main#content'), item.href).toBeVisible();
        expect(new URL(page.url()).pathname, `${item.label} stays put`).toBe(item.href);
        await expect(page.locator('body')).not.toContainText('Something went wrong');
        expect(errors, `${item.href} console errors`).toEqual([]);
      }

      // Pages the role may not see: the menu leaves them out and the address is refused.
      // requireSeeing (src/lib/data/shared.ts) sends the role back to the dashboard.
      if (hidden.length === 0) {
        test.info().annotations.push({
          type: 'note',
          description: `${role} may see every menu page, so there is no refused page to open. Actions are refused by staffGate (not run here: it changes data).`,
        });
      } else {
        expect(hidden.length).toBeGreaterThanOrEqual(2);
        await page.goto('/');
        for (const item of hidden.slice(0, 3)) {
          await expect(page.locator(`aside.sidebar a[href="${item.href}"]`), `${item.href} is not in the menu`).toHaveCount(0);
          await page.goto(item.href);
          await page.waitForURL((u) => u.pathname === '/');
          expect(new URL(page.url()).pathname, `${item.href} refused`).toBe('/');
        }
      }

      // One safe action: a search (read-only).
      await page.goto('/search?q=test');
      await expect(page.locator('body')).not.toContainText('Something went wrong');

      // Sign out, then a protected page sends us to /login.
      await page.getByRole('button', { name: /Sign out/ }).click();
      await page.waitForURL(/\/login/);
      await page.goto('/');
      await page.waitForURL(/\/login/);
      await context.close();
    });
  });
}
