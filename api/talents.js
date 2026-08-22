import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.execute("SELECT * FROM talents");
      return res.status(200).json(result.rows);
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
