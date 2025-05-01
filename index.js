import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase admin başlatılıyor
const serviceAccount = JSON.parse(fs.readFileSync("economentor-8ddc4-firebase-adminsdk-fbsvc-8a38f6a8f5.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔔 Bildirim gönderme
async function sendNotification(token, title, body, url = "https://economentor.netlify.app/mesaj.html") {
  const message = {
    token,
    notification: { title, body },
    data: { url },
  };

  return await admin.messaging().send(message);
}

// POST ile UID'ye bildirim
app.post("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.body;
  if (!uid || !title || !body) {
    return res.status(400).json({ error: "Eksik veri (uid, title, body)" });
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      return res.status(404).json({ error: "Kullanıcının fcmToken'ı yok" });
    }

    const result = await sendNotification(fcmToken, title, body, url);
    return res.status(200).json({ message: "Bildirim gönderildi (POST)", result });
  } catch (error) {
    console.error("❌ Bildirim hatası (POST):", error);
    return res.status(500).json({ error: "Gönderim başarısız" });
  }
});

// GET endpoint
app.get("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.query;
  if (!uid || !title || !body) {
    return res.status(400).json({ error: "Eksik veri (uid, title, body)" });
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      return res.status(404).json({ error: "Kullanıcının fcmToken'ı yok" });
    }

    const result = await sendNotification(fcmToken, title, body, url);
    return res.status(200).json({ message: "Bildirim gönderildi (GET)", result });
  } catch (error) {
    console.error("❌ Bildirim hatası (GET):", error);
    return res.status(500).json({ error: "Gönderim başarısız" });
  }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bildirim sunucusu çalışıyor (http://localhost:${PORT})`);
});
