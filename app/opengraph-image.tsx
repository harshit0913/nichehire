import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NicheHire — Your Job Buddy!!';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#0A0F1D',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #1E293B 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1E293B 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#2B4EE6',
              boxShadow: '0 8px 24px rgba(43, 78, 230, 0.4)',
              color: '#FFFFFF',
              fontSize: '28px',
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.5px',
              }}
            >
              NicheHire
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#38BDF8',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Your Job Buddy!!
            </span>
          </div>
        </div>

        {/* Central Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1
            style={{
              fontSize: '54px',
              fontWeight: 900,
              lineHeight: 1.15,
              color: '#FFFFFF',
              letterSpacing: '-1.5px',
              margin: 0,
            }}
          >
            Verified Careers.{' '}
            <span
              style={{
                backgroundImage: 'linear-gradient(90deg, #38BDF8, #818CF8)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Zero Ghost Jobs.
            </span>
          </h1>
          <p
            style={{
              fontSize: '22px',
              lineHeight: 1.4,
              color: '#94A3B8',
              maxWidth: '900px',
              margin: 0,
            }}
          >
            Listings under 7 days old direct from official company career portals,
            with AI candidate fit matching & public sector exam timetables.
          </p>
        </div>

        {/* Feature Badges & URL Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '999px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38BDF8',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              ⚡ Fresh (&lt;7 Days)
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '999px',
                backgroundColor: 'rgba(129, 140, 248, 0.12)',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                color: '#818CF8',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              🤖 AI Fit Scoring
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '999px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ADE80',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              🏛️ Sarkari Exam Gazette
            </div>
          </div>

          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#E2E8F0',
              letterSpacing: '0.5px',
            }}
          >
            nichehire.tech
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
