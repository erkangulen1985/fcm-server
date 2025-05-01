const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Ortamdan alınan kimlik bilgileri
const serviceAccount = {
  project_id: process.env.PROJECT_ID,
  client_email: process.env.CLIENT_EMAIL,
  private_key: process.env.PRIVATE_KEY,
};

// Firebase başlat (Firestore ve FCM için)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Firestore referansı
const db = admin.firestore();

// Bağlantı testi
app.get('/ping', async (req, res) => {
  try {
    await db.collection("users").limit(1).get();
    res.send("✅ Firestore bağlantısı başarılı");
  } catch (err) {
    console.error("❌ Firestore bağlantı hatası:", err);
    res.status(500).send("❌ Firestore bağlantı hatası");
  }
});

// Bildirim gönder
app.post("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.body;
  if (!uid || !title || !body) return res.status(400).send("Eksik veri");

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) return res.status(404).send("fcmToken bulunamadı");

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { url: url || "https://economentor.netlify.app/mesaj.html" }
    });

    res.send("✅ Bildirim gönderildi");
  } catch (err) {
    console.error("❌ Bildirim hatası:", err);
    res.status(500).send("❌ Gönderim başarısız");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`));
