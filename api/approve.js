export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let rawUrl = process.env.TURSO_URL || "";
  const token = process.env.TURSO_TOKEN || "";

  if (!rawUrl || !token) {
    return res.status(500).json({ error: "Environment variable TURSO belum diset!" });
  }

  let baseUrl = rawUrl.replace("libsql://", "https://");
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const endpoint = `${baseUrl}/v2/pipeline`;

  const { action, id } = req.body;

  try {
    // 1. OPSI ACC / APPROVE TALENT
    if (action === 'approve') {
      // Step A: Ambil data calon talent dari tabel 'requests'
      const getRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            { type: "execute", stmt: { sql: "SELECT * FROM requests WHERE id = ?;", args: [{ type: "text", value: String(id) }] } },
            { type: "close" }
          ]
        })
      });

      const getData = await getRes.json();
      const results = getData.results[0];

      if (results.type === "error" || results.response.result.rows.length === 0) {
        return res.status(404).json({ error: "Data pendaftaran tidak ditemukan!" });
      }

      // Format data request ke JSON Object
      const cols = results.response.result.cols.map(c => c.name);
      const rowVal = results.response.result.rows[0];
      let r = {};
      rowVal.forEach((val, idx) => { r[cols[idx]] = val.value; });

      const newTalentId = "t-" + Date.now();

      // Step B: Masukkan data ke tabel 'talents' & hapus dari tabel 'requests'
      const insertSql = "INSERT INTO talents (id, name, username, age, gender, avatar, voiceUrl, rating, totalOrders, status, coins, bio) VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 0, 'Online', ?, ?);";
      const deleteSql = "DELETE FROM requests WHERE id = ?;";

      const pipelineRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            { 
              type: "execute", 
              stmt: { 
                sql: insertSql,
                args: [
                  { type: "text", value: String(newTalentId) },
                  { type: "text", value: String(r.name) },
                  { type: "text", value: String(r.username) },
                  { type: "integer", value: String(r.age) },
                  { type: "text", value: String(r.gender) },
                  { type: "text", value: String(r.avatar) },
                  { type: "text", value: String(r.voiceUrl) },
                  { type: "integer", value: String(r.requestedCoins) },
                  { type: "text", value: String(r.bio) }
                ]
              } 
            },
            {
              type: "execute",
              stmt: { sql: deleteSql, args: [{ type: "text", value: String(id) }] }
            },
            { type: "close" }
          ]
        })
      });

      const execData = await pipelineRes.json();
      if (!pipelineRes.ok || execData.results[0].type === "error") {
        return res.status(500).json({ error: "Gagal memindahkan data ke tabel talents." });
      }

      return res.status(200).json({ success: true, message: "Talent disetujui & tayang di web!" });
    }

    // 2. OPSI TOLAK REQUEST
    if (action === 'reject') {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            { type: "execute", stmt: { sql: "DELETE FROM requests WHERE id = ?;", args: [{ type: "text", value: String(id) }] } },
            { type: "close" }
          ]
        })
      });
      return res.status(200).json({ success: true, message: "Pendaftaran ditolak." });
    }

    // 3. OPSI HAPUS TALENT AKTIF
    if (action === 'delete') {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            { type: "execute", stmt: { sql: "DELETE FROM talents WHERE id = ?;", args: [{ type: "text", value: String(id) }] } },
            { type: "close" }
          ]
        })
      });
      return res.status(200).json({ success: true, message: "Talent berhasil dihapus." });
    }

    return res.status(400).json({ error: "Action tidak valid!" });

  } catch (err) {
    return res.status(500).json({ error: `Fetch Exception: ${err.message}` });
  }
}
