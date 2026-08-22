import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { id, name, username, age, gender, avatar, voiceUrl, requestedCoins, bio } = req.body;
      const date = new Date().toISOString().split('T')[0];
      
      await db.execute({
        sql: "INSERT INTO requests (id, name, username, age, gender, avatar, voiceUrl, requestedCoins, bio, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [id, name, username, age, gender, avatar, voiceUrl, requestedCoins, bio, date]
      });
      return res.status(200).json({ success: true, message: "Pendaftaran berhasil dikirim!" });
    } 
    
    if (req.method === 'GET') {
      const result = await db.execute("SELECT * FROM requests");
      return res.status(200).json(result.rows);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
