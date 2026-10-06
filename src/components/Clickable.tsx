'use client';

import { useRouter } from 'next/navigation';
import { useTransition, type MouseEvent, type ReactNode } from 'react';

/**
 * Makes a whole table row or card open its page, not just the link inside it.
 * The real <Link> in the row stays the keyboard and screen-reader way in; this
 * only widens the mouse target. Clicks on anything interactive inside (links,
 * buttons, forms, copy buttons) and text selections are left alone. While the
 * next page loads, the row dims so the click visibly registered.
 */
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, details, form, [data-no-row]';

function useOpen(href: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const open = (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    // A confirm panel is open inside this row: clicks there are for filling it in, never for leaving the page.
    if (e.currentTarget.querySelector('form.confirm')) return;
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    if (href.startsWith('#')) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    startTransition(() => router.push(href));
  };
  return { open, pending };
}

export function ClickRow({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const { open, pending } = useOpen(href);
  return (
    <tr className={`click-row${className ? ` ${className}` : ''}`} onClick={open} data-pending={pending || undefined} aria-busy={pending || undefined}>
      {children}
    </tr>
  );
}

export function ClickCard({
  href,
  children,
  className,
  as = 'div',
}: {
  href: string;
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  const { open, pending } = useOpen(href);
  const props = {
    className: `click-card${className ? ` ${className}` : ''}`,
    onClick: open,
    'data-pending': pending || undefined,
    'aria-busy': pending || undefined,
  };
  return as === 'li' ? <li {...props}>{children}</li> : <div {...props}>{children}</div>;
}
