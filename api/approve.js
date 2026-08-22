import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, id } = req.body;

  try {
    if (action === 'approve') {
      // 1. Ambil data dari tabel requests
      const reqData = await db.execute({
        sql: "SELECT * FROM requests WHERE id = ?",
        args: [id]
      });

      if (reqData.rows.length === 0) {
        return res.status(404).json({ error: "Request tidak ditemukan" });
      }

      const r = reqData.rows[0];
      const newTalentId = "t-" + Date.now();

      // 2. Pindahkan ke tabel talents
      await db.execute({
        sql: "INSERT INTO talents (id, name, username, age, gender, avatar, voiceUrl, rating, totalOrders, status, coins, bio) VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 0, 'Online', ?, ?)",
        args: [newTalentId, r.name, r.username, r.age, r.gender, r.avatar, r.voiceUrl, r.requestedCoins, r.bio]
      });

      // 3. Hapus dari tabel requests
      await db.execute({
        sql: "DELETE FROM requests WHERE id = ?",
        args: [id]
      });

      return res.status(200).json({ success: true, message: "Talent disetujui!" });
    }

    if (action === 'reject') {
      await db.execute({
        sql: "DELETE FROM requests WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ success: true, message: "Pendaftaran ditolak." });
    }

    if (action === 'delete') {
      await db.execute({
        sql: "DELETE FROM talents WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ success: true, message: "Talent dihapus dari sistem." });
    }

    return res.status(400).json({ error: "Action tidak valid" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
