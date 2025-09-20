// netlify/functions/exchange-github.js
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ message: `Invalid JSON body : ${e}` }) };
  }

  const { code, redirect_uri } = body;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing code' }) };
  }

  const params = new URLSearchParams({
    client_id: import.meta.env.GITHUB_CLIENT_ID || '',
    client_secret: import.meta.env.GITHUB_CLIENT_SECRET || '',
    code,
    redirect_uri
  });

  try {
    // Use global fetch provided by Netlify runtime
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: params
    });

    const json = await tokenRes.json();
    if (!json?.access_token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: json.error_description || 'Token exchange failed', raw: json })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ token: json.access_token }) };
  } catch (err) {
    console.error('Exchange error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Server error' }) };
  }
};
