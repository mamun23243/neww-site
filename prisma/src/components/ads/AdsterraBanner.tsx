'use client';

import { useEffect, useRef } from 'react';

interface Props {
  zoneId: string;
  format: '300x250' | '728x90';
}

export default function AdsterraBanner({ zoneId, format }: Props) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;

    const dimensions = format === '300x250' ? { w: 300, h: 250 } : { w: 728, h: 90 };

    const confScript = document.createElement('script');
    confScript.type = 'text/javascript';
    confScript.innerHTML = `
      atOptions = {
        'key' : '${zoneId}',
        'format' : 'iframe',
        'height' : ${dimensions.h},
        'width' : ${dimensions.w},
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `//www.highperformanceformat.com/${zoneId}/invoke.js`;

    adRef.current.appendChild(confScript);
    adRef.current.appendChild(invokeScript);
  }, [zoneId, format]);

  return (
    <div className="flex justify-center items-center my-4">
      <div ref={adRef} className="overflow-hidden rounded-lg border border-dark-border bg-dark-card" />
    </div>
  );
}
