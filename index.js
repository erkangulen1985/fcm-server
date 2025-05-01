const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// PRIVATE_KEY sadece dosyadan okunacak
const privateKey = JSON.parse(fs.readFileSync('economentor-8ddc4-firebase-adminsdk-fbsvc-8a38f6a8f5.json', 'utf8')).private_key;

const serviceAccount = {
  type: "service_account",
  project_id: process.env.PROJECT_ID,
  private_key: privateKey,
  client_email: process.env.CLIENT_EMAIL,
  token_uri: "https://oauth2.googleapis.com/token"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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

console.log("PROJECT_ID:", process.env.PROJECT_ID);
console.log("CLIENT_EMAIL:", process.env.CLIENT_EMAIL);
console.log("PRIVATE_KEY from file:", privateKey.slice(0, 50) + "...");
