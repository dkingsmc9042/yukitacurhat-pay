export default async function handler(req, res) {
  // Buka Akses CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let rawUrl = process.env.TURSO_URL || "";
  const token = process.env.TURSO_TOKEN || "";

  if (!rawUrl || !token) {
    return res.status(500).json({ 
      error: "TURSO_URL atau TURSO_TOKEN belum terpasang di Environment Variables!" 
    });
  }

  let baseUrl = rawUrl.replace("libsql://", "https://");
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const endpoint = `${baseUrl}/v2/pipeline`;

  try {
    // 1. SUBMIT PENDAFTARAN TALENT BARU (POST)
    if (req.method === 'POST') {
      const { id, name, username, age, gender, avatar, voiceUrl, requestedCoins, bio } = req.body;
      const date = new Date().toISOString().split('T')[0];

      const sqlQuery = "INSERT INTO requests (id, name, username, age, gender, avatar, voiceUrl, requestedCoins, bio, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            { 
              type: "execute", 
              stmt: { 
                sql: sqlQuery,
                args: [
                  { type: "text", value: String(id) },
                  { type: "text", value: String(name) },
                  { type: "text", value: String(username) },
                  { type: "integer", value: String(age) },
                  { type: "text", value: String(gender) },
                  { type: "text", value: String(avatar) },
                  { type: "text", value: String(voiceUrl) },
                  { type: "integer", value: String(requestedCoins) },
                  { type: "text", value: String(bio) },
                  { type: "text", value: String(date) }
                ]
              } 
            },
            { type: "close" }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok || (data.results && data.results[0].type === "error")) {
        const errMsg = data.results ? data.results[0].error.message : JSON.stringify(data);
        return res.status(500).json({ error: `Turso SQL Error: ${errMsg}` });
      }

      return res.status(200).json({ success: true, message: "Pendaftaran berhasil dikirim!" });
    }

    // 2. GET SEMUA PERMINTAAN PENDAFTARAN FOR ADMIN (GET)
    if (req.method === 'GET') {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            { type: "execute", stmt: { sql: "SELECT * FROM requests;" } },
            { type: "close" }
          ]
        })
      });

      const data = await response.json();
      const results = data.results[0];

      if (results.type === "error") {
        return res.status(500).json({ error: results.error.message });
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
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    return res.status(500).json({ error: `Fetch Exception: ${err.message}` });
  }
}
        
