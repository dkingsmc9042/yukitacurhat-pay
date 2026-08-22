export default async function handler(req, res) {
  // Buka CORS Header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let rawUrl = process.env.TURSO_URL || "";
  const token = process.env.TURSO_TOKEN || "";

  // 1. Cek ketersediaan Environment Variables
  if (!rawUrl || !token) {
    return res.status(500).json({ 
      error: "TURSO_URL atau TURSO_TOKEN belum dipasang di Environment Variables Vercel!" 
    });
  }

  // 2. Format URL agar sesuai dengan Turso HTTP API (https://.../v2/pipeline)
  let baseUrl = rawUrl.replace("libsql://", "https://");
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const endpoint = `${baseUrl}/v2/pipeline`;

  try {
    // 3. Tembak HTTP API Turso secara langsung tanpa SDK
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: "SELECT * FROM talents;" } },
          { type: "close" }
        ]
      })
    });

    const data = await response.json();

    // 4. Cek jika Turso menolak request (misal Token/URL/Query Salah)
    if (!response.ok) {
      return res.status(500).json({ 
        error: `Turso API Error (${response.status}): ${JSON.stringify(data)}` 
      });
    }

    // 5. Parse baris data hasil query
    const results = data.results[0];
    if (results.type === "error") {
      return res.status(500).json({ error: `SQL Error: ${results.error.message}` });
    }

    const cols = results.response.result.cols.map(c => c.name);
    const rows = results.response.result.rows.map(row => {
      let obj = {};
      row.forEach((val, idx) => {
        obj[cols[idx]] = val.value;
      });
      return obj;
    });

    return res.status(200).json(rows);

  } catch (err) {
    return res.status(500).json({ error: `Fetch Exception: ${err.message}` });
  }
}
