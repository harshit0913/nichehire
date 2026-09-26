// ─── Indian Geographic Centroids & Offline Bounding Engine ───────────────────
// Zero-dependency, zero-cost, 100% offline client-side location matcher.
// Eliminates rate limits, latency, and third-party tracking.

export interface LocationMatch {
  state: string;
  district: string;
  isBorderZone: boolean;
  borderNote?: string;
  confidence: 'high' | 'provisional';
}

interface RegionCentroid {
  state: string;
  district: string;
  lat: number;
  lon: number;
  radiusKm: number;
  isBorderZone?: boolean;
  borderNote?: string;
}

// Major Tier-1 / Tier-2 Indian hubs, capitals, and exam centers
const REGIONAL_CENTROIDS: RegionCentroid[] = [
  // Madhya Pradesh
  { state: 'Madhya Pradesh', district: 'Indore', lat: 22.7196, lon: 75.8577, radiusKm: 35 },
  { state: 'Madhya Pradesh', district: 'Bhopal', lat: 23.2599, lon: 77.4126, radiusKm: 35 },
  { state: 'Madhya Pradesh', district: 'Jabalpur', lat: 23.1815, lon: 79.9864, radiusKm: 40 },
  { state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2183, lon: 78.1828, radiusKm: 35 },
  { state: 'Madhya Pradesh', district: 'Ujjain', lat: 23.1765, lon: 75.7885, radiusKm: 30 },

  // Delhi NCR (Special Border / Tri-State Ambiguity Zone)
  {
    state: 'Delhi',
    district: 'New Delhi',
    lat: 28.6139,
    lon: 77.2090,
    radiusKm: 25,
    isBorderZone: true,
    borderNote: 'Bordering Uttar Pradesh (Noida/Ghaziabad) & Haryana (Gurugram/Faridabad). Confirm state for domicile quota.',
  },
  {
    state: 'Uttar Pradesh',
    district: 'Noida / Gautam Buddha Nagar',
    lat: 28.5355,
    lon: 77.3910,
    radiusKm: 20,
    isBorderZone: true,
    borderNote: 'Delhi-NCR Border Region (Uttar Pradesh domicile).',
  },
  {
    state: 'Haryana',
    district: 'Gurugram',
    lat: 28.4595,
    lon: 77.0266,
    radiusKm: 22,
    isBorderZone: true,
    borderNote: 'Delhi-NCR Border Region (Haryana domicile).',
  },

  // Uttar Pradesh
  { state: 'Uttar Pradesh', district: 'Lucknow', lat: 26.8467, lon: 80.9462, radiusKm: 40 },
  { state: 'Uttar Pradesh', district: 'Prayagraj (Allahabad)', lat: 25.4358, lon: 81.8463, radiusKm: 35 },
  { state: 'Uttar Pradesh', district: 'Kanpur', lat: 26.4499, lon: 80.3319, radiusKm: 35 },
  { state: 'Uttar Pradesh', district: 'Varanasi', lat: 25.3176, lon: 82.9739, radiusKm: 30 },

  // Maharashtra
  { state: 'Maharashtra', district: 'Mumbai', lat: 19.0760, lon: 72.8777, radiusKm: 45 },
  { state: 'Maharashtra', district: 'Pune', lat: 18.5204, lon: 73.8567, radiusKm: 40 },
  { state: 'Maharashtra', district: 'Nagpur', lat: 21.1458, lon: 79.0882, radiusKm: 35 },

  // Karnataka
  { state: 'Karnataka', district: 'Bangalore', lat: 12.9716, lon: 77.5946, radiusKm: 50 },
  { state: 'Karnataka', district: 'Mysore', lat: 12.2958, lon: 76.6394, radiusKm: 30 },

  // Bihar
  { state: 'Bihar', district: 'Patna', lat: 25.5941, lon: 85.1376, radiusKm: 35 },
  { state: 'Bihar', district: 'Muzaffarpur', lat: 26.1209, lon: 85.3647, radiusKm: 30 },

  // Rajasthan
  { state: 'Rajasthan', district: 'Jaipur', lat: 26.9124, lon: 75.7873, radiusKm: 40 },
  { state: 'Rajasthan', district: 'Jodhpur', lat: 26.2389, lon: 73.0243, radiusKm: 35 },

  // Telangana & Andhra Pradesh
  { state: 'Telangana', district: 'Hyderabad', lat: 17.3850, lon: 78.4867, radiusKm: 45 },
  { state: 'Andhra Pradesh', district: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, radiusKm: 35 },
  { state: 'Andhra Pradesh', district: 'Vijayawada', lat: 16.5062, lon: 80.6480, radiusKm: 30 },

  // Tamil Nadu
  { state: 'Tamil Nadu', district: 'Chennai', lat: 13.0827, lon: 80.2707, radiusKm: 45 },
  { state: 'Tamil Nadu', district: 'Coimbatore', lat: 11.0168, lon: 76.9558, radiusKm: 35 },

  // West Bengal
  { state: 'West Bengal', district: 'Kolkata', lat: 22.5726, lon: 88.3639, radiusKm: 40 },

  // Gujarat
  { state: 'Gujarat', district: 'Ahmedabad', lat: 23.0225, lon: 72.5714, radiusKm: 40 },
  { state: 'Gujarat', district: 'Surat', lat: 21.1702, lon: 72.8311, radiusKm: 35 },

  // Punjab & Chandigarh
  {
    state: 'Chandigarh',
    district: 'Chandigarh',
    lat: 30.7333,
    lon: 76.7794,
    radiusKm: 25,
    isBorderZone: true,
    borderNote: 'Tri-city border (Chandigarh, Mohali/Punjab, Panchkula/Haryana).',
  },
  { state: 'Punjab', district: 'Ludhiana', lat: 30.9010, lon: 75.8573, radiusKm: 30 },

  // Kerala
  { state: 'Kerala', district: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366, radiusKm: 30 },
  { state: 'Kerala', district: 'Kochi', lat: 9.9312, lon: 76.2673, radiusKm: 30 },
  { state: 'Kerala', district: 'Kannur', lat: 11.8745, lon: 75.3704, radiusKm: 35 },

  // Odisha
  { state: 'Odisha', district: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, radiusKm: 35 },

  // Jharkhand
  { state: 'Jharkhand', district: 'Ranchi', lat: 23.3441, lon: 85.3096, radiusKm: 35 },

  // Chhattisgarh
  { state: 'Chhattisgarh', district: 'Raipur', lat: 21.2514, lon: 81.6296, radiusKm: 35 },

  // Uttarakhand
  { state: 'Uttarakhand', district: 'Dehradun', lat: 30.3165, lon: 78.0322, radiusKm: 30 },
  { state: 'Uttarakhand', district: 'Nainital', lat: 29.3919, lon: 79.4542, radiusKm: 35 },

  // Assam / North East
  { state: 'Assam', district: 'Guwahati', lat: 26.1445, lon: 91.7362, radiusKm: 35 },
];

// Broad state bounding boxes for fallback when outside city radii
interface StateBoundingBox {
  state: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  defaultDistrict: string;
}

const STATE_BOUNDS: StateBoundingBox[] = [
  { state: 'Madhya Pradesh', minLat: 21.0, maxLat: 26.8, minLon: 74.0, maxLon: 82.8, defaultDistrict: 'Indore' },
  { state: 'Uttar Pradesh', minLat: 23.8, maxLat: 30.4, minLon: 77.0, maxLon: 84.6, defaultDistrict: 'Lucknow' },
  { state: 'Maharashtra', minLat: 15.6, maxLat: 22.0, minLon: 72.6, maxLon: 80.9, defaultDistrict: 'Mumbai' },
  { state: 'Karnataka', minLat: 11.5, maxLat: 18.5, minLon: 74.0, maxLon: 78.6, defaultDistrict: 'Bangalore' },
  { state: 'Delhi', minLat: 28.4, maxLat: 28.9, minLon: 76.8, maxLon: 77.4, defaultDistrict: 'New Delhi' },
  { state: 'Bihar', minLat: 24.2, maxLat: 27.5, minLon: 83.3, maxLon: 88.3, defaultDistrict: 'Patna' },
  { state: 'Rajasthan', minLat: 23.0, maxLat: 30.2, minLon: 69.5, maxLon: 78.3, defaultDistrict: 'Jaipur' },
  { state: 'Tamil Nadu', minLat: 8.0, maxLat: 13.5, minLon: 76.2, maxLon: 80.3, defaultDistrict: 'Chennai' },
  { state: 'Telangana', minLat: 15.8, maxLat: 19.9, minLon: 77.2, maxLon: 81.8, defaultDistrict: 'Hyderabad' },
  { state: 'West Bengal', minLat: 21.5, maxLat: 27.3, minLon: 85.8, maxLon: 89.9, defaultDistrict: 'Kolkata' },
  { state: 'Gujarat', minLat: 20.0, maxLat: 24.7, minLon: 68.1, maxLon: 74.5, defaultDistrict: 'Ahmedabad' },
  { state: 'Punjab', minLat: 29.5, maxLat: 32.5, minLon: 73.8, maxLon: 77.0, defaultDistrict: 'Ludhiana' },
  { state: 'Haryana', minLat: 27.6, maxLat: 30.9, minLon: 74.4, maxLon: 77.6, defaultDistrict: 'Gurugram' },
  { state: 'Kerala', minLat: 8.3, maxLat: 12.8, minLon: 74.8, maxLon: 77.4, defaultDistrict: 'Kochi' },
  { state: 'Odisha', minLat: 17.8, maxLat: 22.5, minLon: 81.3, maxLon: 87.5, defaultDistrict: 'Bhubaneswar' },
  { state: 'Jharkhand', minLat: 21.9, maxLat: 25.3, minLon: 83.3, maxLon: 87.9, defaultDistrict: 'Ranchi' },
  { state: 'Chhattisgarh', minLat: 17.7, maxLat: 24.1, minLon: 80.2, maxLon: 84.4, defaultDistrict: 'Raipur' },
  { state: 'Uttarakhand', minLat: 28.7, maxLat: 31.5, minLon: 77.5, maxLon: 81.0, defaultDistrict: 'Dehradun' },
  { state: 'Assam', minLat: 24.1, maxLat: 28.2, minLon: 89.7, maxLon: 96.0, defaultDistrict: 'Guwahati' },
];

// Haversine distance in kilometers
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Deterministically maps latitude & longitude to the closest Indian State and District.
 * Never performs external network requests. Zero latency, 100% private.
 */
export function matchCoordinatesToRegion(lat: number, lon: number): LocationMatch {
  // 1. Check proximity against prominent exam hubs
  let closestHub: RegionCentroid | null = null;
  let minDistance = Infinity;

  for (const hub of REGIONAL_CENTROIDS) {
    const dist = getDistanceFromLatLonInKm(lat, lon, hub.lat, hub.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closestHub = hub;
    }
  }

  // If candidate is within the direct metropolitan radius
  if (closestHub && minDistance <= closestHub.radiusKm) {
    return {
      state: closestHub.state,
      district: closestHub.district,
      isBorderZone: !!closestHub.isBorderZone,
      borderNote: closestHub.borderNote,
      confidence: closestHub.isBorderZone ? 'provisional' : 'high',
    };
  }

  // If outside city radius, evaluate against state bounding envelopes
  for (const bounds of STATE_BOUNDS) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon) {
      return {
        state: bounds.state,
        district: bounds.defaultDistrict,
        isBorderZone: false,
        confidence: 'provisional',
      };
    }
  }

  // Fallback if coordinates are outside mainland India envelope
  return {
    state: 'All India',
    district: 'All Districts',
    isBorderZone: false,
    confidence: 'provisional',
  };
}

// All Indian States for manual dropdown selection
export const ALL_INDIAN_STATES = [
  'All India',
  'Madhya Pradesh',
  'Uttar Pradesh',
  'Maharashtra',
  'Karnataka',
  'Delhi',
  'Bihar',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'West Bengal',
  'Gujarat',
  'Haryana',
  'Punjab',
  'Kerala',
  'Odisha',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Assam',
  'Chandigarh',
] as const;

export const POPULAR_DISTRICTS_BY_STATE: Record<string, string[]> = {
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Rewa', 'Sagar', 'All Districts'],
  'Uttar Pradesh': ['Lucknow', 'Noida / Gautam Buddha Nagar', 'Prayagraj (Allahabad)', 'Kanpur', 'Varanasi', 'Agra', 'All Districts'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'All Districts'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'All Districts'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'All Districts'],
  'Bihar': ['Patna', 'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Darbhanga', 'All Districts'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Bikaner', 'Ajmer', 'All Districts'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'All Districts'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'All Districts'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'All Districts'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'All Districts'],
  'Uttarakhand': ['Nainital', 'Dehradun', 'Haridwar', 'Udham Singh Nagar (Haldwani / Rudrapur)', 'Almora', 'Pauri Garhwal', 'Tehri Garhwal', 'Chamoli', 'Rishikesh', 'All Districts'],
  'Kerala': ['Kannur', 'Kochi / Ernakulam', 'Kozhikode', 'Thiruvananthapuram', 'Thrissur', 'Kollam', 'Palakkad', 'Malappuram', 'Kottayam', 'Alappuzha', 'All Districts'],
};
