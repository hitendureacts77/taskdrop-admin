import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../app/(dashboard)/', import.meta.url);

function pages(dir: URL, found: URL[] = []): URL[] {
  for (const name of readdirSync(dir)) {
    const child = new URL(`${name}${statSync(new URL(name, dir)).isDirectory() ? '/' : ''}`, dir);
    if (name === 'page.tsx') found.push(child);
    else if (name.endsWith('/') || statSync(child).isDirectory()) pages(new URL(`${name}/`, dir), found);
  }
  return found;
}

// A1-6: every page names itself in the tab title, so history and tab lists tell the pages apart.
test('every dashboard page sets its own title', () => {
  const all = pages(root);
  assert.ok(all.length > 30, 'found the pages');
  for (const p of all) {
    const src = readFileSync(p, 'utf8');
    assert.ok(/export const metadata = \{ title: '[^']+' \}|generateMetadata/.test(src), `${p.pathname} has no title`);
  }
});

test('the root layout appends the product name to each page title', () => {
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.ok(layout.includes("template: '%s · TaskDrop Admin'"));
});
