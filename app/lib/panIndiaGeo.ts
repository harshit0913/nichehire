// app/lib/panIndiaGeo.ts
// Pan-India Master Geographic Engine covering all 28 States & 8 Union Territories.
// Provides deterministic 6-tier geographic proximity matching and regional employer resolution.

export interface StateInfo {
  name: string;
  code: string;
  zone: 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';
  capital: string;
  districts: string[];
  keyEmployers: string[];
}

export const PAN_INDIA_REGIONS: Record<string, StateInfo> = {
  // ─── NORTH ─────────────────────────────────────────────────────────────
  'Delhi': {
    name: 'Delhi',
    code: 'DL',
    zone: 'North',
    capital: 'New Delhi',
    districts: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Connaught Place', 'Saket', 'Nehru Place', 'Dwarka', 'Okhla', 'Aerocity', 'Rohini', 'Karol Bagh'],
    keyEmployers: ['Delhi High Court', 'Supreme Court of India', 'State Bank of India', 'Punjab National Bank', 'NTPC', 'GAIL', 'Delhi University', 'AIIMS New Delhi', 'Delhi Metro (DMRC)', 'DSSSB'],
  },
  'Haryana': {
    name: 'Haryana',
    code: 'HR',
    zone: 'North',
    capital: 'Chandigarh',
    districts: ['Gurugram', 'Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak', 'Sonipat', 'Panchkula', 'Manesar'],
    keyEmployers: ['Maruti Suzuki', 'HCL Technologies', 'Zomato', 'MakeMyTrip', 'DLF Limited', 'Hero MotoCorp', 'Haryana PSC (HPSC)', 'Punjab & Haryana High Court'],
  },
  'Punjab': {
    name: 'Punjab',
    code: 'PB',
    zone: 'North',
    capital: 'Chandigarh',
    districts: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Batala', 'Moga'],
    keyEmployers: ['Punjab National Bank', 'Hero Cycles', 'Vardhman Group', 'Punjab PSC (PPSC)', 'Trident Group', 'Nectar Lifesciences', 'Punjab & Haryana High Court'],
  },
  'Himachal Pradesh': {
    name: 'Himachal Pradesh',
    code: 'HP',
    zone: 'North',
    capital: 'Shimla',
    districts: ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Kangra', 'Hamirpur', 'Bilaspur', 'Una', 'Chamba', 'Sirmaur', 'Kinnaur', 'Lahaul and Spiti'],
    keyEmployers: ['Himachal High Court', 'HPPSC', 'SJVN Limited', 'State Bank of India', 'Himachal Gramin Bank', 'Dabur Baddi', 'Sun Pharma Baddi'],
  },
  'Jammu & Kashmir': {
    name: 'Jammu & Kashmir',
    code: 'JK',
    zone: 'North',
    capital: 'Srinagar',
    districts: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur', 'Pulwama', 'Kupwara', 'Budgam', 'Samba', 'Rajouri'],
    keyEmployers: ['J&K Bank', 'High Court of J&K and Ladakh', 'JKPSC', 'NHPC', 'Chenab Valley Power Projects', 'University of Kashmir', 'Jammu University'],
  },
  'Ladakh': {
    name: 'Ladakh',
    code: 'LA',
    zone: 'North',
    capital: 'Leh',
    districts: ['Leh', 'Kargil'],
    keyEmployers: ['Ladakh Autonomous Hill Development Council', 'State Bank of India', 'NHPC', 'Border Roads Organisation'],
  },
  'Uttarakhand': {
    name: 'Uttarakhand',
    code: 'UK',
    zone: 'North',
    capital: 'Dehradun',
    districts: ['Nainital', 'Dehradun', 'Haridwar', 'Udham Singh Nagar', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Almora', 'Pauri Garhwal', 'Tehri Garhwal', 'Chamoli', 'Pithoragarh', 'Uttarkashi', 'Bageshwar', 'Champawat', 'Bhimtal', 'Bhowali', 'Ramnagar', 'Roorkee', 'Kashipur'],
    keyEmployers: ['High Court of Uttarakhand (Nainital)', 'Nainital Bank', 'Oil and Natural Gas Corporation (ONGC)', 'BHEL Haridwar', 'THDC India', 'Uttarakhand PSC (UKPSC)', 'Patanjali Ayurved', 'District Legal Services Authority', 'Kumaun University'],
  },
  'Uttar Pradesh': {
    name: 'Uttar Pradesh',
    code: 'UP',
    zone: 'North',
    capital: 'Lucknow',
    districts: ['Lucknow', 'Noida', 'Greater Noida', 'Kanpur', 'Prayagraj', 'Varanasi', 'Agra', 'Ghaziabad', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Ayodhya', 'Jhansi', 'Saharanpur', 'Mathura'],
    keyEmployers: ['Allahabad High Court', 'UPPSC', 'State Bank of India', 'Tata Consultancy Services Lucknow', 'HCL Technologies Noida', 'Samsung Noida', 'Bharat Electronics Limited (BEL)', 'BHEL Jhansi'],
  },
  'Chandigarh': {
    name: 'Chandigarh',
    code: 'CH',
    zone: 'North',
    capital: 'Chandigarh',
    districts: ['Chandigarh', 'Mohali', 'Panchkula'],
    keyEmployers: ['Punjab & Haryana High Court', 'PGIMER Chandigarh', 'Infosys Chandigarh', 'State Bank of India', 'Punjab & Sind Bank'],
  },

  // ─── WEST ─────────────────────────────────────────────────────────────
  'Maharashtra': {
    name: 'Maharashtra',
    code: 'MH',
    zone: 'West',
    capital: 'Mumbai',
    districts: ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Pimpri-Chinchwad'],
    keyEmployers: ['Bombay High Court', 'Tata Sons', 'Reliance Industries', 'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Reserve Bank of India', 'MPSC', 'Infosys Pune', 'Larsen & Toubro', 'Mahindra & Mahindra', 'Serum Institute of India'],
  },
  'Gujarat': {
    name: 'Gujarat',
    code: 'GJ',
    zone: 'West',
    capital: 'Gandhinagar',
    districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Bharuch', 'Vapi', 'Mehsana', 'Sanand'],
    keyEmployers: ['Gujarat High Court', 'Adani Group', 'Reliance Jamnagar', 'Tata Motors Sanand', 'Torrent Pharmaceuticals', 'Cadila Healthcare', 'Amul (GCMMF)', 'L&T Hazira', 'GPSC', 'State Bank of India'],
  },
  'Rajasthan': {
    name: 'Rajasthan',
    code: 'RJ',
    zone: 'West',
    capital: 'Jaipur',
    districts: ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar', 'Bharatpur', 'Pali', 'Sri Ganganagar'],
    keyEmployers: ['Rajasthan High Court (Jodhpur/Jaipur)', 'RPSC', 'AU Small Finance Bank', 'Hindustan Zinc', 'Genpact Jaipur', 'Infosys Jaipur', 'State Bank of India', 'Shree Cement'],
  },
  'Goa': {
    name: 'Goa',
    code: 'GA',
    zone: 'West',
    capital: 'Panaji',
    districts: ['North Goa', 'South Goa', 'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
    keyEmployers: ['Bombay High Court at Goa', 'Goa PSC', 'Cipla Goa', 'MRF Verna', 'Zuari Agro', 'State Bank of India', 'Goa Shipyard Limited'],
  },
  'Dadra & Nagar Haveli and Daman & Diu': {
    name: 'Dadra & Nagar Haveli and Daman & Diu',
    code: 'DN',
    zone: 'West',
    capital: 'Daman',
    districts: ['Daman', 'Diu', 'Silvassa'],
    keyEmployers: ['Alkem Laboratories', 'Supreme Industries', 'Sterlite Technologies', 'State Bank of India'],
  },

  // ─── SOUTH ─────────────────────────────────────────────────────────────
  'Karnataka': {
    name: 'Karnataka',
    code: 'KA',
    zone: 'South',
    capital: 'Bangalore',
    districts: ['Bangalore', 'Bengaluru', 'Mysore', 'Hubli', 'Dharwad', 'Mangalore', 'Belgaum', 'Belagavi', 'Gulbarga', 'Kalaburagi', 'Davangere', 'Bellary', 'Shimoga', 'Tumkur', 'Udupi'],
    keyEmployers: ['Karnataka High Court', 'Infosys', 'Wipro', 'ISRO', 'Hindustan Aeronautics Limited (HAL)', 'Canara Bank', 'Flipkart', 'KPSC', 'State Bank of India', 'Biocon'],
  },
  'Tamil Nadu': {
    name: 'Tamil Nadu',
    code: 'TN',
    zone: 'South',
    capital: 'Chennai',
    districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur'],
    keyEmployers: ['Madras High Court', 'Tata Consultancy Services', 'Cognizant Chennai', 'Hyundai India', 'TVS Motor', 'Indian Bank', 'TNPSC', 'Ashok Leyland', 'Zoho Corporation'],
  },
  'Kerala': {
    name: 'Kerala',
    code: 'KL',
    zone: 'South',
    capital: 'Thiruvananthapuram',
    districts: ['Kannur', 'Kochi', 'Ernakulam', 'Kozhikode', 'Calicut', 'Thiruvananthapuram', 'Trivandrum', 'Thrissur', 'Kollam', 'Palakkad', 'Malappuram', 'Kottayam', 'Alappuzha', 'Idukki', 'Wayanad', 'Kasaragod', 'Pathanamthitta'],
    keyEmployers: ['Kerala High Court', 'Federal Bank', 'South Indian Bank', 'Kerala Gramin Bank', 'Kerala PSC', 'LuLu Group', 'Malabar Gold & Diamonds', 'UST Global', 'Infosys Kochi/TVM', 'Cochin Shipyard', 'V-Guard'],
  },
  'Telangana': {
    name: 'Telangana',
    code: 'TS',
    zone: 'South',
    capital: 'Hyderabad',
    districts: ['Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad'],
    keyEmployers: ['Telangana High Court', 'Dr. Reddy\'s Laboratories', 'Aurobindo Pharma', 'TCS Hyderabad', 'Microsoft Hyderabad', 'Google Hyderabad', 'TGPSC', 'State Bank of India', 'Bharat Biotech'],
  },
  'Andhra Pradesh': {
    name: 'Andhra Pradesh',
    code: 'AP',
    zone: 'South',
    capital: 'Amaravati',
    districts: ['Visakhapatnam', 'Vizag', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur'],
    keyEmployers: ['Andhra Pradesh High Court', 'Rashtriya Ispat Nigam Limited (Vizag Steel)', 'APPSC', 'Hindustan Shipyard', 'Sri City SEZ', 'Divi\'s Laboratories', 'State Bank of India'],
  },
  'Puducherry': {
    name: 'Puducherry',
    code: 'PY',
    zone: 'South',
    capital: 'Puducherry',
    districts: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
    keyEmployers: ['JIPMER', 'Pondicherry University', 'Madras High Court jurisdiction', 'State Bank of India'],
  },
  'Lakshadweep': {
    name: 'Lakshadweep',
    code: 'LD',
    zone: 'South',
    capital: 'Kavaratti',
    districts: ['Kavaratti', 'Agatti', 'Amini', 'Andrott'],
    keyEmployers: ['Lakshadweep Administration', 'State Bank of India', 'Kerala High Court jurisdiction'],
  },

  // ─── EAST ─────────────────────────────────────────────────────────────
  'West Bengal': {
    name: 'West Bengal',
    code: 'WB',
    zone: 'East',
    capital: 'Kolkata',
    districts: ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Malda', 'Kharagpur', 'Haldia', 'Darjeeling', 'Jalpaiguri'],
    keyEmployers: ['Calcutta High Court', 'Coal India Limited', 'ITC Limited', 'UCO Bank', 'WBPSC', 'Steel Authority of India (SAIL Durgapur)', 'Tata Steel Kolkata', 'TCS Kolkata'],
  },
  'Bihar': {
    name: 'Bihar',
    code: 'BR',
    zone: 'East',
    capital: 'Patna',
    districts: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra'],
    keyEmployers: ['Patna High Court', 'BPSC', 'State Bank of India', 'Bihar State Power Holding (BSPHCL)', 'Indian Oil Barauni', 'Sudha Dairy (COMFED)'],
  },
  'Odisha': {
    name: 'Odisha',
    code: 'OD',
    zone: 'East',
    capital: 'Bhubaneswar',
    districts: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Angul'],
    keyEmployers: ['Orissa High Court', 'OPSC', 'National Aluminium Company (NALCO)', 'Mahanadi Coalfields', 'Tata Steel Kalinganagar', 'SAIL Rourkela', 'Infosys Bhubaneswar'],
  },
  'Jharkhand': {
    name: 'Jharkhand',
    code: 'JH',
    zone: 'East',
    capital: 'Ranchi',
    districts: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar'],
    keyEmployers: ['Jharkhand High Court', 'JPSC', 'Tata Steel Jamshedpur', 'Steel Authority of India (SAIL Bokaro)', 'Central Coalfields (CCL)', 'Bharat Coking Coal (BCCL Dhanbad)', 'MECON Limited'],
  },
  'Andaman & Nicobar Islands': {
    name: 'Andaman & Nicobar Islands',
    code: 'AN',
    zone: 'East',
    capital: 'Port Blair',
    districts: ['Port Blair', 'South Andaman', 'North and Middle Andaman', 'Nicobar'],
    keyEmployers: ['Andaman & Nicobar Administration', 'Calcutta High Court Circuit Bench', 'State Bank of India'],
  },

  // ─── CENTRAL ──────────────────────────────────────────────────────────
  'Madhya Pradesh': {
    name: 'Madhya Pradesh',
    code: 'MP',
    zone: 'Central',
    capital: 'Bhopal',
    districts: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Chhindwara'],
    keyEmployers: ['Madhya Pradesh High Court (Jabalpur/Indore/Gwalior)', 'MPPSC', 'BHEL Bhopal', 'TCS Indore', 'Infosys Indore', 'Eicher Motors', 'Northern Coalfields (Singrauli)', 'State Bank of India'],
  },
  'Chhattisgarh': {
    name: 'Chhattisgarh',
    code: 'CG',
    zone: 'Central',
    capital: 'Raipur',
    districts: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur'],
    keyEmployers: ['Chhattisgarh High Court (Bilaspur)', 'CGPSC', 'Bhilai Steel Plant (SAIL)', 'South Eastern Coalfields (SECL)', 'NTPC Korba', 'National Mineral Development Corp (NMDC)', 'State Bank of India'],
  },

  // ─── NORTHEAST ─────────────────────────────────────────────────────────
  'Assam': {
    name: 'Assam',
    code: 'AS',
    zone: 'Northeast',
    capital: 'Dispur',
    districts: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Karimganj'],
    keyEmployers: ['Gauhati High Court', 'APSC', 'Oil India Limited (Duliajan)', 'Numaligarh Refinery (NRL)', 'Indian Oil Digboi/Guwahati', 'State Bank of India'],
  },
  'Meghalaya': {
    name: 'Meghalaya',
    code: 'ML',
    zone: 'Northeast',
    capital: 'Shillong',
    districts: ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Williamnagar'],
    keyEmployers: ['Meghalaya High Court', 'Meghalaya PSC', 'NEEPCO', 'North-Eastern Hill University (NEHU)', 'State Bank of India'],
  },
  'Manipur': {
    name: 'Manipur',
    code: 'MN',
    zone: 'Northeast',
    capital: 'Imphal',
    districts: ['Imphal', 'Churachandpur', 'Thoubal', 'Bishnupur', 'Ukhrul'],
    keyEmployers: ['Manipur High Court', 'MPSC', 'Central Agricultural University', 'State Bank of India'],
  },
  'Tripura': {
    name: 'Tripura',
    code: 'TR',
    zone: 'Northeast',
    capital: 'Agartala',
    districts: ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar', 'Belonia'],
    keyEmployers: ['Tripura High Court', 'TPSC', 'ONGC Tripura', 'State Bank of India'],
  },
  'Mizoram': {
    name: 'Mizoram',
    code: 'MZ',
    zone: 'Northeast',
    capital: 'Aizawl',
    districts: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib'],
    keyEmployers: ['Mizoram PSC', 'Mizoram University', 'Gauhati High Court Aizawl Bench', 'State Bank of India'],
  },
  'Nagaland': {
    name: 'Nagaland',
    code: 'NL',
    zone: 'Northeast',
    capital: 'Kohima',
    districts: ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
    keyEmployers: ['Nagaland PSC', 'Nagaland University', 'Gauhati High Court Kohima Bench', 'State Bank of India'],
  },
  'Arunachal Pradesh': {
    name: 'Arunachal Pradesh',
    code: 'AR',
    zone: 'Northeast',
    capital: 'Itanagar',
    districts: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
    keyEmployers: ['Arunachal Pradesh PSC', 'NHPC Hydro Projects', 'Gauhati High Court Itanagar Bench', 'State Bank of India'],
  },
  'Sikkim': {
    name: 'Sikkim',
    code: 'SK',
    zone: 'Northeast',
    capital: 'Gangtok',
    districts: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Pakyong', 'Soreng', 'Rangpo', 'Singtam', 'Kumrek', 'Ranipool'],
    keyEmployers: [
      'Sikkim High Court',
      'Sikkim PSC',
      'Sun Pharma (Kumrek)',
      'Cipla Limited (Rangpo)',
      'Alkem Laboratories Sikkim',
      'Glenmark Pharmaceuticals Sikkim',
      'Torrent Pharmaceuticals Sikkim',
      'State Bank of India',
      'NHPC Teesta V',
      'Sikkim Manipal University'
    ],
  },
};

/**
 * Universal Pan-India Location Matcher
 * Automatically resolves ANY Indian city, district, or state to its full context,
 * nearby satellite hubs, and prominent employers.
 */
export function resolvePanIndiaLocation(query: string): {
  state: string;
  stateCode: string;
  matchedDistrict: string | null;
  nearbyClusters: string[];
  suggestedEmployers: string[];
  zone?: string;
  capital?: string;
  districts?: string[];
} {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    return {
      state: 'All India',
      stateCode: 'IN',
      matchedDistrict: null,
      nearbyClusters: ['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune'],
      suggestedEmployers: ['Google', 'Microsoft', 'Amazon', 'Tata Group', 'State Bank of India', 'Infosys'],
      zone: 'National',
      capital: 'New Delhi',
      districts: [],
    };
  }

  // 1. Check for State name or Code match
  for (const [stName, info] of Object.entries(PAN_INDIA_REGIONS)) {
    const sLow = stName.toLowerCase();
    const cLow = info.code.toLowerCase();
    if (q === sLow || q.includes(sLow) || q === cLow) {
      return {
        state: info.name,
        stateCode: info.code,
        matchedDistrict: info.capital,
        nearbyClusters: info.districts.slice(0, 6),
        suggestedEmployers: info.keyEmployers,
        zone: info.zone,
        capital: info.capital,
        districts: info.districts,
      };
    }
  }

  // 2. Check for District or Satellite City match
  for (const [stName, info] of Object.entries(PAN_INDIA_REGIONS)) {
    for (const d of info.districts) {
      const dLow = d.toLowerCase();
      if (q === dLow || q.includes(dLow) || dLow.includes(q)) {
        const others = info.districts.filter((x) => x.toLowerCase() !== dLow).slice(0, 5);
        return {
          state: info.name,
          stateCode: info.code,
          matchedDistrict: d,
          nearbyClusters: others,
          suggestedEmployers: info.keyEmployers,
          zone: info.zone,
          capital: info.capital,
          districts: info.districts,
        };
      }
    }
  }

  // Default national fallback with verified top employers
  return {
    state: 'All India',
    stateCode: 'IN',
    matchedDistrict: null,
    nearbyClusters: ['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune'],
    suggestedEmployers: ['Google', 'Microsoft', 'Amazon', 'Tata Group', 'State Bank of India', 'Infosys'],
    zone: 'National',
    capital: 'New Delhi',
    districts: [],
  };
}

/**
 * Deterministically evaluates the geographic tier between a job's location and a user's search query.
 * Tier 1: Same city / town
 * Tier 2: Same district / metropolitan cluster / industrial corridor
 * Tier 3: Same state nearby city
 * Tier 4: Same state
 * Tier 5: Across India / National
 * Tier 6: International Remote
 */
export function calculatePanIndiaGeoTier(jobLocation: string = '', queryLocation: string = ''): number {
  const loc = (jobLocation || '').toLowerCase().trim();
  const q = (queryLocation || '').toLowerCase().trim();

  if (!q || q === 'all india' || q === 'india' || q === 'remote') {
    return 5;
  }

  // 1. Exact string match
  if (loc.includes(q)) return 1;

  // Resolve query context
  const queryGeo = resolvePanIndiaLocation(q);
  if (queryGeo.state === 'All India') return 5;

  const qStateLow = queryGeo.state.toLowerCase();
  const qCodeLow = queryGeo.stateCode.toLowerCase();

  // 2. Check if job matches any district / cluster of the query state
  if (queryGeo.matchedDistrict && loc.includes(queryGeo.matchedDistrict.toLowerCase())) {
    return 1;
  }

  for (const cluster of queryGeo.nearbyClusters) {
    if (loc.includes(cluster.toLowerCase())) {
      return 2;
    }
  }

  // 3. Check if job is in the same State
  const stateInfo = PAN_INDIA_REGIONS[queryGeo.state];
  if (stateInfo) {
    for (const d of stateInfo.districts) {
      if (loc.includes(d.toLowerCase())) {
        return 3;
      }
    }
  }

  if (
    loc.includes(qStateLow) ||
    loc.includes(` ${qCodeLow}`) ||
    loc.includes(`, ${qCodeLow}`) ||
    loc.includes(`${qCodeLow},`) ||
    loc.endsWith(` ${qCodeLow}`) ||
    loc.endsWith(`,${qCodeLow}`)
  ) {
    return 4;
  }

  // 5. Domestic other state vs International
  const internationalKeywords = ['usa', 'us', 'uk', 'united kingdom', 'europe', 'germany', 'canada', 'australia', 'singapore'];
  if (internationalKeywords.some((k) => loc.includes(k))) {
    return 6;
  }

  return 5;
}
