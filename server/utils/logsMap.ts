export const logsMap = {
  table: 'sink',

  // identifiers (use sessionId/userId if you later add them)
  sessionId: null as string | null,
  userId:    null as string | null,
  ip:        'blob4',     // IPv4
  userAgent: 'blob3',     // full UA string
  siteSlug:  'blob1',     // "shorty" (your shortener/site label)
  linkId:    'index1',    // looks like short link code

  // metrics
  sampleInterval: '_sample_interval', // views weighting
  durationMs:     null as string | null, // none in your data (will return 0)

  // dimensions
  referer:  'blob2',
  language: 'blob10',
  os:       'blob11',
  browser:  'blob12',
  country:  'blob6',
  region:   'blob7',      // "🇮🇳 Haryana,India"
  city:     'blob8',      // "🇮🇳 Karnāl,India"
  timezone: 'blob9',

  // geolocation (optional)
  lat: 'double1',         // ≈ 29.69
  lon: 'double2',         // ≈ 76.98
} as const
