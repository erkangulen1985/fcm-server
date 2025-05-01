const { JWT } = require('google-auth-library');
const { Firestore } = require('@google-cloud/firestore');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Ortamdan kimlik bilgilerini oku
const key = {
  project_id: process.env.PROJECT_ID,
  client_email: process.env.CLIENT_EMAIL,
  private_key: process.env.PRIVATE_KEY,
  token_uri: "https://oauth2.googleapis.com/token"
};

// Firestore için JWT
const client = new JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Firestore başlat
const firestore = new Firestore({
  projectId: key.project_id,
  auth: client
});

// FCM başlat
admin.initializeApp({
  credential: admin.credential.cert(key)
});

// Bağlantı testi
app.get('/ping', async (req, res) => {
  try {
    await firestore.collection('users').limit(1).get();
    res.send('✅ Firestore bağlantısı başarılı');
  } catch (err) {
    console.error('❌ Firestore bağlantı hatası:', err);
    res.status(500).send('❌ Firestore bağlantı hatası');
  }
});

// Bildirim gönder
app.post('/sendToUid', async (req, res) => {
  const { uid, title, body, url } = req.body;
  if (!uid || !title || !body) return res.status(400).send("Eksik veri");

  try {
    const userDoc = await firestore.collection("users").doc(uid).get();
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
