import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(fs.readFileSync("economentor-8ddc4-firebase-adminsdk-fbsvc-8a38f6a8f5.json", "utf8"));

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

    res.send("Bildirim gönderildi");
  } catch (err) {
    console.error("❌ Bildirim hatası:", err);
    res.status(500).send("Gönderim başarısız");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`));
