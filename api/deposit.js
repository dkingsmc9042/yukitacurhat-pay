import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

export default async function handler(req, res) {
  try {
    // 1. MEMBUAT TRANSACTION / INVOICE PAKASIR
    if (req.method === 'POST') {
      const { phone, coins, amount } = req.body;
      const orderId = "TOPUP-" + Date.now();

      // Panggil API Pakasir
      const pakasirRes = await fetch("https://pakasir.com/api/transaction/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.PAKASIR_API_KEY,
          project_id: process.env.PAKASIR_PROJECT_ID,
          order_id: orderId,
          amount: amount,
          customer_phone: phone
        })
      });

      const pakData = await pakasirRes.json();

      if (pakData.status === "success" || pakData.payment_url) {
        // Simpan transaksi status 'pending' ke Turso
        await db.execute({
          sql: "INSERT INTO transactions (id, user_phone, coins, amount, status, payment_url, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
          args: [orderId, phone, coins, amount, pakData.payment_url, new Date().toISOString()]
        });

        return res.status(200).json({ success: true, paymentUrl: pakData.payment_url, orderId });
      }

      return res.status(400).json({ error: "Gagal membuat invoice Pakasir" });
    }

    // 2. WEBHOOK / CALLBACK DARI PAKASIR
    if (req.method === 'PUT') {
      const { order_id, status } = req.body;

      if (status === 'success' || status === 'PAID') {
        await db.execute({
          sql: "UPDATE transactions SET status = 'completed' WHERE id = ?",
          args: [order_id]
        });
        return res.status(200).json({ success: true, message: "Deposit Berhasil" });
      }

      return res.status(200).json({ message: "Status diabaikan" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
