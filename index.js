const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// JSON dosyasını oku
const serviceAccount = JSON.parse(fs.readFileSync('economentor-8ddc4-firebase-adminsdk-fbsvc-8a38f6a8f5.json', 'utf8'));

// Firebase Admin başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// UID'ye göre FCM bildirimi gönder
app.post('/sendToUid', async (req, res) => {
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

    res.send("Bildirim gönderildi");
  } catch (err) {
    console.error("❌ Bildirim hatası:", err);
    res.status(500).send("Gönderim başarısız");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`));
