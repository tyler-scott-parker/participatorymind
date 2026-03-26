const GA4_ENDPOINT = (propertyId) =>
  `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlFromBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAuthToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signingInput = `${header}.${payload}`;

  const pemKey = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigBytes = new Uint8Array(signature);
  const jwt = `${signingInput}.${b64urlFromBytes(sigBytes)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Auth failed: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

async function runReport(token, propertyId, body) {
  const res = await fetch(GA4_ENDPOINT(propertyId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GA4 error: ${res.status} ${errText}`);
  }
  return res.json();
}

function parseRows(data) {
  if (!data.rows) return [];
  return data.rows.map(row => {
    const obj = {};
    (data.dimensionHeaders || []).forEach((h, i) => { obj[h.name] = row.dimensionValues[i]?.value; });
    (data.metricHeaders || []).forEach((h, i) => { obj[h.name] = row.metricValues[i]?.value; });
    return obj;
  });
}

async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const propertyId = env.GA4_PROPERTY_ID;
    const credentials = JSON.parse(env.GA4_CREDENTIALS);
    const token = await getAuthToken(credentials);
    const url = new URL(request.url);
    const report = url.searchParams.get('report') || 'overview';

    const results = {};

    if (report === 'overview' || report === 'all') {
      const data = await runReport(token, propertyId, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      });
      results.topPages = parseRows(data);
    }

    if (report === 'sources' || report === 'all') {
      const data = await runReport(token, propertyId, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      });
      results.sources = parseRows(data);
    }

    if (report === 'trend' || report === 'all') {
      const data = await runReport(token, propertyId, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });
      results.trend = parseRows(data);
    }

    if (report === 'summary' || report === 'all') {
      const data = await runReport(token, propertyId, {
        dateRanges: [
          { startDate: '30daysAgo', endDate: 'today' },
          { startDate: '60daysAgo', endDate: '31daysAgo' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
        ],
      });
      results.summary = parseRows(data);
    }

    return new Response(JSON.stringify(results), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env || {}));
});
