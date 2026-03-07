const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid request' });

    const rawKey = process.env.ANTHROPIC_API_KEY || '';
    let apiKey = '';
    for (let i = 0; i < rawKey.length; i++) {
      const code = rawKey.charCodeAt(i);
      if (code >= 33 && code <= 126) apiKey += rawKey[i];
    }
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const payload = JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: max_tokens || 1000, messages });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload, 'utf8'),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      };
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });
      request.on('error', reject);
      request.write(payload, 'utf8');
      request.end();
    });

    const data = JSON.parse(result.body);
    if (result.status !== 200) return res.status(result.status).json({ error: data.error?.message || 'API Error' });
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
