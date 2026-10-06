'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * A UPI payment QR: scan it with any UPI app on your phone and the payee, amount
 * and note are filled in. On a computer this is the way to pay; upi:// links only
 * open apps on phones.
 */
export function UpiQr({ link, size = 168 }: { link: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [link]);
  return (
    <div className="upi-qr" style={{ width: size, height: size }} role="img" aria-label="UPI QR code with the amount filled in">
      {svg ? <span dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="muted small">Making the QR…</span>}
    </div>
  );
}
