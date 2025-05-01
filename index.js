import express from "express";
import { google } from "googleapis";
import admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

// Express ayarları
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hizmet hesabı dosyasını yükle
const serviceAccount = JSON.parse(fs.readFileSync("economentor-8ddc4-firebase-adminsdk-fbsvc-8a38f6a8f5.json", "utf8"));
const PROJECT_ID = serviceAccount.project_id;

// Firebase Admin başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 🔑 JWT ile erişim token'ı al
async function getAccessToken() {
  const jwtClient = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

// 🔔 Bildirim gönderme fonksiyonu
async function sendNotification(token, title, body, url = "https://economentor.netlify.app/mesaj.html") {
  const accessToken = await getAccessToken();

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { url },
      },
    }),
  });

  return await response.json();
}

// ✅ POST isteği ile UID’ye gönderim
app.post("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.body;
  if (!uid || !title || !body) return res.status(400).json({ error: "Eksik veri (uid, title, body)" });

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) return res.status(404).json({ error: "Kullanıcının fcmToken'ı yok" });

    const result = await sendNotification(fcmToken, title, body, url);
    return res.status(200).json({ message: "Bildirim gönderildi (POST)", result });
  } catch (error) {
    console.error("❌ Bildirim hatası (POST):", error);
    return res.status(500).json({ error: "Gönderim başarısız" });
  }
});

// ✅ GET isteği (Apps Script vb. için)
app.get("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.query;
  if (!uid || !title || !body) return res.status(400).json({ error: "Eksik veri (uid, title, body)" });

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) return res.status(404).json({ error: "Kullanıcının fcmToken'ı yok" });

    const result = await sendNotification(fcmToken, title, body, url);
    return res.status(200).json({ message: "Bildirim gönderildi (GET)", result });
  } catch (error) {
    console.error("❌ Bildirim hatası (GET):", error);
    return res.status(500).json({ error: "Gönderim başarısız" });
  }
});

// 🚀 Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bildirim sunucusu çalışıyor (http://localhost:${PORT})`);
});
