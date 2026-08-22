import { createClient } from "@libsql/client/web";

export default async function handler(req, res) {
  // Buka CORS agar tidak diblokir browser
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;

  // 1. Cek apakah Environment Variables terpasang
  if (!url || !authToken) {
    return res.status(200).json({ 
      error: "TURSO_URL atau TURSO_TOKEN belum dipasang di Environment Variables Vercel!" 
    });
  }

  try {
    // Ubah protocol libsql:// menjadi https:// khusus untuk web client HTTP jika diperlukan
    const httpUrl = url.replace("libsql://", "https://");
    
    const db = createClient({ 
      url: httpUrl, 
      authToken: authToken 
    });

    const result = await db.execute("SELECT * FROM talents");

    // Kembalikan data baris
    return res.status(200).json(result.rows || []);
  } catch (error) {
    console.error("Turso Error Detail:", error);
    return res.status(500).json({ 
      error: error.message || "Gagal terkoneksi ke Turso DB" 
    });
  }
}
