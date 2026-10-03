/** Small line icons, drawn for this panel. Decorative unless given a label. */

const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20',
  money: 'M3 7h18v10H3zM7 7v10M17 7v10M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  send: 'M4 12h13M12 6l6 6-6 6M20 4v16',
  undo: 'M9 5 4 10l5 5M4 10h10a5 5 0 0 1 0 10h-4',
  jobs: 'M4 8h16v11H4zM9 8V5.5h6V8M4 13h16',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14.8c1.7.8 2.8 2.5 3 5.2',
  scale: 'M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7ZM19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z',
  help: 'M4 5h16v11H9l-5 4zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4M12 14.2v.3',
  megaphone: 'M4 10v4h3l7 4V6l-7 4H4ZM17 9a4 4 0 0 1 0 6M7 14l1 5h2.5l-1-4.5',
  chart: 'M4 20V4M4 20h16M8 16l3.5-4 3 2.5L20 8',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l4.5 4.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  check: 'M5 12.5 10 17l9-10',
  alert: 'M12 4 2.5 20h19L12 4ZM12 10v4.5M12 17.2v.3',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.5V12l3 2',
  shield: 'M12 3 5 6v5.5c0 4.2 3 7.8 7 9.5 4-1.7 7-5.3 7-9.5V6l-7-3Z',
  bank: 'M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM4 7l11-3v3M16 12.5h4',
  star: 'M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  external: 'M14 5h5v5M19 5l-8 8M18 14v5H5V6h5',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, label, className }: { name: string; size?: number; label?: string; className?: string }) {
  const d = PATHS[name] ?? PATHS.arrow!;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
