'use client';
import QRCodeLib from 'qrcode';
import { useEffect, useState } from 'react';

export function QRCode({ value, size = 156 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCodeLib.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' }).then(setSrc); }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt="Verification QR code" className="rounded-2xl" /> : <div style={{width:size,height:size}} className="animate-pulse rounded-2xl bg-black/5"/>;
}
