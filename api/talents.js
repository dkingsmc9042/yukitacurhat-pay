import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  // Set header CORS agar bisa diakses dari frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;

  // Cek apakah env terpasang
  if (!url || !authToken) {
    return res.status(500).json({ error: "Environment variables TURSO_URL atau TURSO_TOKEN belum dipasang di Vercel!" });
  }

  try {
    const db = createClient({ url, authToken });
    const result = await db.execute("SELECT * FROM talents");
    
    // Kembalikan array rows
    return res.status(200).json(result.rows || []);
  } catch (error) {
    console.error("Turso DB Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
