const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "https://economentor.netlify.app" }));
app.use(express.json());

// 🔐 JSON dosyasını oku
const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);

// 🔥 Firebase başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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
app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
