const { GoogleAuth } = require('google-auth-library');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const GA4_ENDPOINT = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

async function getAuthToken() {
  const credentials = JSON.parse(process.env.GA4_CREDENTIALS);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function runReport(token, body) {
  const response = await fetch(GA4_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${response.status} ${err}`);
  }
  return response.json();
}

function parseRows(data) {
  if (!data.rows) return [];
  return data.rows.map(row => {
    const obj = {};
    (data.dimensionHeaders || []).forEach((h, i) => {
      obj[h.name] = row.dimensionValues[i]?.value;
    });
    (data.metricHeaders || []).forEach((h, i) => {
      obj[h.name] = row.metricValues[i]?.value;
    });
    return obj;
  });
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://participatorymind.org',
  };

  try {
    const token = await getAuthToken();
    const report = event.queryStringParameters?.report || 'overview';

    let results = {};

    if (report === 'overview' || report === 'all') {
      // Top articles by page views (last 30 days)
      const topPages = await runReport(token, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      });
      results.topPages = parseRows(topPages);
    }

    if (report === 'sources' || report === 'all') {
      // Traffic sources (last 30 days)
      const sources = await runReport(token, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      });
      results.sources = parseRows(sources);
    }

    if (report === 'trend' || report === 'all') {
      // Daily visitors (last 30 days)
      const trend = await runReport(token, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });
      results.trend = parseRows(trend);
    }

    if (report === 'summary' || report === 'all') {
      // Overall summary (last 30 days vs previous 30)
      const summary = await runReport(token, {
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
      results.summary = parseRows(summary);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results),
    };
  } catch (err) {
    console.error('Analytics function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
