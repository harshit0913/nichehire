'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Avoid duplicate triggers on same path
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    try {
      // 1. Get or initialize anonymous visitor ID
      let visitorId = localStorage.getItem('nh_visitor_id');
      if (!visitorId) {
        visitorId = 'vid_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem('nh_visitor_id', visitorId);
      }

      // 2. Detect device type
      let device = 'desktop';
      const width = window.innerWidth;
      const ua = navigator.userAgent.toLowerCase();
      if (/tablet|ipad|playbook|silk/i.test(ua) || (width >= 640 && width <= 1024)) {
        device = 'tablet';
      } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua) || width < 640) {
        device = 'mobile';
      }

      // 3. Simple browser detection
      let browser = 'Chrome';
      if (ua.includes('firefox')) browser = 'Firefox';
      else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
      else if (ua.includes('edg')) browser = 'Edge';

      const payload = {
        path: pathname || '/',
        referrer: document.referrer || '',
        device,
        visitorId,
        browser,
      };

      // 4. Send non-blocking beacon/fetch
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [pathname]);

  return null;
}
