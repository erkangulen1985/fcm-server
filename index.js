const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

// ✅ CORS ayarı – sadece Netlify'den gelen isteklere izin ver
app.use(cors({
  origin: "https://economentor.netlify.app",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

// ✅ OPTIONS preflight isteklerini otomatik destekle
app.options("*", cors());

app.use(express.json());

// 🔐 Firebase Admin SDK kimlik bilgileri (çok satırlı PRIVATE_KEY girildi varsayımıyla)
admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.PROJECT_ID,
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY
  })
});

// 🔥 Firestore referansı
const db = admin.firestore();

// 🔔 Test rotası – bağlantı kontrolü
app.get("/ping", async (req, res) => {
  try {
    await db.collection("users").limit(1).get();
    res.send("✅ Firestore bağlantısı başarılı");
  } catch (err) {
    console.error("❌ Firestore bağlantı hatası:", err);
    res.status(500).send("❌ Firestore bağlantı hatası");
  }
});

// 📩 Bildirim gönderme rotası
app.post("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.body;
  if (!uid || !title || !body) {
    return res.status(400).send("Eksik veri");
  }

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

// 🌍 Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`));
