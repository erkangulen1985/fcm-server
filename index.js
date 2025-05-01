const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// ✅ Doğrudan geçerli JSON dosyasını yüklüyoruz
const serviceAccount = require('./economentor-8ddc4-firebase-adminsdk-fbsvc-f2cb63bbea.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

// 🔁 Test endpointi: Firestore bağlantısı kontrolü
app.get('/ping', async (req, res) => {
  try {
    await db.collection('users').limit(1).get();
    res.send('✅ Firestore bağlantısı başarılı');
  } catch (err) {
    console.error('❌ Firestore erişim hatası:', err);
    res.status(500).send('❌ Firestore bağlantı hatası');
  }
});

// 📩 UID'ye FCM bildirimi gönderme
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

    res.send("✅ Bildirim gönderildi");
  } catch (err) {
    console.error("❌ Bildirim hatası:", err);
    res.status(500).send("❌ Gönderim başarısız");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`));
