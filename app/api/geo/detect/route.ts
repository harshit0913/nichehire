import { NextResponse } from 'next/server';
import { matchCoordinatesToRegion } from '../../../lib/indianGeoBounds';
import { resolvePanIndiaLocation, PAN_INDIA_REGIONS } from '../../../lib/panIndiaGeo';

export const dynamic = 'force-dynamic';

// Map of standard 2-letter Indian state codes to full state names
const STATE_CODE_MAP: Record<string, string> = {
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu & Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TG: 'Telangana',
  TS: 'Telangana',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  UT: 'Uttarakhand',
  WB: 'West Bengal',
};

export async function GET(req: Request) {
  try {
    // ─── 1. Check Vercel Edge Geolocation Headers ────────────────────────────
    const vercelCity = req.headers.get('x-vercel-ip-city');
    const vercelRegion = req.headers.get('x-vercel-ip-country-region')?.toUpperCase(); // e.g. "KA", "DL", "MH"
    const vercelCountry = req.headers.get('x-vercel-ip-country');
    const vercelLatStr = req.headers.get('x-vercel-ip-latitude');
    const vercelLonStr = req.headers.get('x-vercel-ip-longitude');

    // If Vercel provides latitude and longitude
    if (vercelLatStr && vercelLonStr) {
      const lat = parseFloat(vercelLatStr);
      const lon = parseFloat(vercelLonStr);
      if (!isNaN(lat) && !isNaN(lon)) {
        const match = matchCoordinatesToRegion(lat, lon);
        if (match.state && match.state !== 'All India') {
          const rawCity = vercelCity ? decodeURIComponent(vercelCity).trim() : '';
          const cityName = rawCity || match.district;
          return NextResponse.json({
            success: true,
            state: match.state,
            district: match.district !== 'All Districts' ? match.district : (cityName || match.state),
            city: cityName,
            lat,
            lon,
            source: 'vercel_coords',
          });
        }
      }
    }

    // If Vercel provides city or region code
    if (vercelCity || vercelRegion) {
      const rawCity = vercelCity ? decodeURIComponent(vercelCity).trim() : '';
      const stateFromCode = vercelRegion ? STATE_CODE_MAP[vercelRegion] : null;

      if (rawCity) {
        const resolved = resolvePanIndiaLocation(rawCity);
        if (resolved.state && resolved.state !== 'All India') {
          return NextResponse.json({
            success: true,
            state: resolved.state,
            district: resolved.matchedDistrict || rawCity,
            city: rawCity,
            source: 'vercel_city',
          });
        }
      }

      if (stateFromCode) {
        const stateInfo = PAN_INDIA_REGIONS[stateFromCode];
        return NextResponse.json({
          success: true,
          state: stateFromCode,
          district: stateInfo?.capital || rawCity || 'All Districts',
          city: rawCity || stateInfo?.capital || stateFromCode,
          source: 'vercel_region',
        });
      }
    }

    // ─── 2. Fallback: Fast Public IP Geolocation API ─────────────────────────
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '';
    const isPublicIp = clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.');

    try {
      const ipLookupUrl = isPublicIp
        ? `https://freeipapi.com/api/json/${clientIp}`
        : 'https://freeipapi.com/api/json';

      const ipRes = await fetch(ipLookupUrl, {
        signal: AbortSignal.timeout(3000),
      });

      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          const match = matchCoordinatesToRegion(ipData.latitude, ipData.longitude);
          const rawCity = ipData.cityName || '';
          if (match.state && match.state !== 'All India') {
            return NextResponse.json({
              success: true,
              state: match.state,
              district: match.district !== 'All Districts' ? match.district : (rawCity || match.state),
              city: rawCity || match.district,
              lat: ipData.latitude,
              lon: ipData.longitude,
              source: 'ip_api',
            });
          }
          if (ipData.regionName) {
            const resolved = resolvePanIndiaLocation(ipData.regionName);
            if (resolved.state && resolved.state !== 'All India') {
              return NextResponse.json({
                success: true,
                state: resolved.state,
                district: resolved.matchedDistrict || rawCity || resolved.state,
                city: rawCity || resolved.matchedDistrict,
                lat: ipData.latitude,
                lon: ipData.longitude,
                source: 'ip_api_region',
              });
            }
          }
        }
      }
    } catch {
      // Freeipapi failed or timed out, try secondary fallback
    }

    // Secondary IP service fallback: ipapi.co
    try {
      const secondaryRes = await fetch(
        isPublicIp ? `https://ipapi.co/${clientIp}/json/` : 'https://ipapi.co/json/',
        { signal: AbortSignal.timeout(2500) }
      );
      if (secondaryRes.ok) {
        const data = await secondaryRes.json();
        if (data.city || data.region) {
          const resolved = resolvePanIndiaLocation(data.city || data.region);
          if (resolved.state && resolved.state !== 'All India') {
            return NextResponse.json({
              success: true,
              state: resolved.state,
              district: resolved.matchedDistrict || data.city || resolved.state,
              city: data.city || resolved.matchedDistrict,
              lat: data.latitude,
              lon: data.longitude,
              source: 'ipapi_secondary',
            });
          }
        }
      }
    } catch {
      // Secondary fallback timed out
    }

    // ─── 3. Default Indian Metropolitan Hub ──────────────────────────────────
    return NextResponse.json({
      success: true,
      state: 'Karnataka',
      district: 'Bengaluru',
      city: 'Bengaluru',
      source: 'default_hub',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Location resolution failed',
        state: 'Karnataka',
        district: 'Bengaluru',
        city: 'Bengaluru',
      },
      { status: 500 }
    );
  }
}
