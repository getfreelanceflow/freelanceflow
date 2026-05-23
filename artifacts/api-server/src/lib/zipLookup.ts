// Maps a US ZIP 3-digit prefix to a representative "City, ST" string.
// Covers major metro areas; unknown prefixes fall back to the 2-digit state code.
const ZIP3_TO_CITY: Record<string, string> = {
  "100": "New York, NY", "101": "New York, NY", "102": "New York, NY",
  "103": "Staten Island, NY", "104": "Bronx, NY", "111": "Queens, NY",
  "112": "Brooklyn, NY", "113": "Queens, NY", "114": "Queens, NY",
  "115": "Long Island, NY", "116": "Long Island, NY", "117": "Long Island, NY",
  "070": "Newark, NJ", "071": "Newark, NJ", "072": "Elizabeth, NJ",
  "073": "Jersey City, NJ", "074": "Paterson, NJ", "075": "Hackensack, NJ",
  "021": "Boston, MA", "022": "Boston, MA", "023": "Brockton, MA",
  "024": "Lowell, MA", "025": "Cape Cod, MA", "027": "Providence, RI",
  "029": "Providence, RI", "060": "Hartford, CT", "061": "Hartford, CT",
  "065": "New Haven, CT", "068": "Stamford, CT", "190": "Philadelphia, PA",
  "191": "Philadelphia, PA", "192": "Philadelphia, PA", "152": "Pittsburgh, PA",
  "200": "Washington, DC", "202": "Washington, DC", "203": "Washington, DC",
  "204": "Washington, DC", "212": "Baltimore, MD", "210": "Baltimore, MD",
  "232": "Richmond, VA", "222": "Arlington, VA", "303": "Atlanta, GA",
  "300": "Atlanta, GA", "302": "Atlanta, GA", "331": "Miami, FL",
  "330": "Miami, FL", "332": "Miami, FL", "333": "Fort Lauderdale, FL",
  "327": "Orlando, FL", "328": "Orlando, FL", "326": "Gainesville, FL",
  "322": "Jacksonville, FL", "335": "Tampa, FL", "336": "Tampa, FL",
  "606": "Chicago, IL", "607": "Chicago, IL", "608": "Chicago, IL",
  "604": "Chicago, IL", "482": "Detroit, MI", "481": "Detroit, MI",
  "441": "Cleveland, OH", "432": "Columbus, OH", "452": "Cincinnati, OH",
  "532": "Milwaukee, WI", "554": "Minneapolis, MN", "550": "Saint Paul, MN",
  "631": "Saint Louis, MO", "641": "Kansas City, MO", "660": "Kansas City, KS",
  "750": "Dallas, TX", "751": "Dallas, TX", "752": "Dallas, TX",
  "770": "Houston, TX", "771": "Houston, TX", "772": "Houston, TX",
  "773": "Houston, TX", "774": "Houston, TX", "782": "San Antonio, TX",
  "780": "San Antonio, TX", "787": "Austin, TX", "786": "Austin, TX",
  "761": "Fort Worth, TX", "802": "Denver, CO", "800": "Denver, CO",
  "850": "Phoenix, AZ", "852": "Phoenix, AZ", "857": "Tucson, AZ",
  "891": "Las Vegas, NV", "871": "Albuquerque, NM", "841": "Salt Lake City, UT",
  "900": "Los Angeles, CA", "901": "Los Angeles, CA", "902": "Beverly Hills, CA",
  "903": "Inglewood, CA", "904": "Santa Monica, CA", "906": "Long Beach, CA",
  "907": "Long Beach, CA", "908": "Long Beach, CA", "921": "San Diego, CA",
  "920": "San Diego, CA", "922": "Palm Springs, CA", "926": "Anaheim, CA",
  "927": "Santa Ana, CA", "928": "Anaheim, CA", "941": "San Francisco, CA",
  "940": "San Francisco, CA", "943": "Palo Alto, CA", "945": "Oakland, CA",
  "946": "Oakland, CA", "950": "San Jose, CA", "951": "San Jose, CA",
  "952": "San Jose, CA", "953": "Stockton, CA", "956": "Sacramento, CA",
  "958": "Sacramento, CA", "970": "Portland, OR", "972": "Portland, OR",
  "973": "Salem, OR", "980": "Seattle, WA", "981": "Seattle, WA",
  "982": "Everett, WA", "983": "Tacoma, WA", "995": "Anchorage, AK",
  "967": "Honolulu, HI", "968": "Honolulu, HI", "372": "Nashville, TN",
  "381": "Memphis, TN", "402": "Louisville, KY", "352": "Birmingham, AL",
  "282": "Charlotte, NC", "275": "Raleigh, NC", "292": "Columbia, SC",
  "294": "Charleston, SC", "700": "New Orleans, LA", "731": "Oklahoma City, OK",
  "741": "Tulsa, OK", "462": "Indianapolis, IN",
};

// Rough 2-digit-prefix → state fallback (only used when a 3-digit isn't mapped).
const ZIP2_TO_STATE: Record<string, string> = {
  "00": "PR", "01": "MA", "02": "MA", "03": "NH", "04": "ME", "05": "VT",
  "06": "CT", "07": "NJ", "08": "NJ", "09": "AE",
  "10": "NY", "11": "NY", "12": "NY", "13": "NY", "14": "NY", "15": "PA",
  "16": "PA", "17": "PA", "18": "PA", "19": "PA",
  "20": "DC", "21": "MD", "22": "VA", "23": "VA", "24": "VA", "25": "WV",
  "26": "WV", "27": "NC", "28": "NC", "29": "SC",
  "30": "GA", "31": "GA", "32": "FL", "33": "FL", "34": "FL", "35": "AL",
  "36": "AL", "37": "TN", "38": "TN", "39": "MS",
  "40": "KY", "41": "KY", "42": "KY", "43": "OH", "44": "OH", "45": "OH",
  "46": "IN", "47": "IN", "48": "MI", "49": "MI",
  "50": "IA", "51": "IA", "52": "IA", "53": "WI", "54": "WI", "55": "MN",
  "56": "MN", "57": "SD", "58": "ND", "59": "MT",
  "60": "IL", "61": "IL", "62": "IL", "63": "MO", "64": "MO", "65": "MO",
  "66": "KS", "67": "KS", "68": "NE", "69": "NE",
  "70": "LA", "71": "LA", "72": "AR", "73": "OK", "74": "OK", "75": "TX",
  "76": "TX", "77": "TX", "78": "TX", "79": "TX",
  "80": "CO", "81": "CO", "82": "WY", "83": "ID", "84": "UT", "85": "AZ",
  "86": "AZ", "87": "NM", "88": "NM", "89": "NV",
  "90": "CA", "91": "CA", "92": "CA", "93": "CA", "94": "CA", "95": "CA",
  "96": "HI", "97": "OR", "98": "WA", "99": "AK",
};

export type ZipResolution = {
  city: string | null;
  state: string | null;
};

export function resolveZip(zip: string): ZipResolution {
  const trimmed = zip.trim();
  if (!/^\d{5}(-\d{4})?$/.test(trimmed)) return { city: null, state: null };
  const prefix3 = trimmed.slice(0, 3);
  const prefix2 = trimmed.slice(0, 2);
  const city = ZIP3_TO_CITY[prefix3] ?? null;
  const state = city ? city.split(",")[1]?.trim() ?? null : ZIP2_TO_STATE[prefix2] ?? null;
  return { city, state };
}

export function isZipQuery(s: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(s.trim());
}
