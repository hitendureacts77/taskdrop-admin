import type { AdminPhoto } from '@/lib/photos';

/**
 * The pictures and files on a job. Each tile opens the full-size copy in a new
 * tab. A picture that cannot be shown says why instead of leaving a gap.
 * The links come signed from the server (lib/photos.ts) and expire within two hours.
 */
export function PhotoStrip({ photos }: { photos: AdminPhoto[] }) {
  return (
    <div className="photo-grid">
      {photos.map((p, i) => (
        <figure key={`${p.label}-${i}`} className="photo-tile">
          {p.openUrl ? (
            <a href={p.openUrl} target="_blank" rel="noopener noreferrer" className="photo-link" aria-label={`Open ${p.label} full size`}>
              {p.thumbUrl ? (
                // A plain <img> on purpose: these are signed, private, expiring links, which next/image would cache and proxy.
                <img src={p.thumbUrl} alt={p.label} className="photo-img" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <span className="photo-file">{p.kind === 'video' ? 'Open video' : 'Open file'}</span>
              )}
            </a>
          ) : (
            <span className="photo-file photo-missing">{p.note ?? 'Not available'}</span>
          )}
          <figcaption>{p.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
