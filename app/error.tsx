'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client-side error for telemetry and Sentry tracking
    console.error('Unhandled application error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#E4E7EC] shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-[#12172B]">
          Something went wrong
        </h2>
        <p className="text-xs text-[#5B6478] leading-relaxed">
          An unexpected error occurred while loading this view. You can reload the component or return to the verified job listings.
        </p>
        {error?.digest && (
          <p className="text-[10px] text-[#8C94A6] font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B] text-xs font-medium rounded-lg transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
