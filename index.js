import express from "express";
import { google } from "googleapis";
import admin from "firebase-admin";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Firebase Admin başlat
admin.initializeApp({
  credential: admin.credential.cert({
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    project_id: process.env.PROJECT_ID,
  }),
});

const db = admin.firestore();
const PROJECT_ID = process.env.PROJECT_ID;

// 🔑 Google OAuth üzerinden FCM erişim tokenı al
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.CLIENT_EMAIL,
    },
    projectId: process.env.PROJECT_ID,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  return await auth.getAccessToken();
}

// 📲 Bildirim gönderme fonksiyonu
async function sendNotification(token, title, body, url = "https://economentor.netlify.app/mesaj.html") {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
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
    }
  );

  return await response.json();
}

// ✅ POST ile bildirimi UID’ye gönder
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

// ✅ GET ile bildirim (Apps Script için)
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

// ✅ Sunucuyu başlat (Render için)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bildirim sunucusu çalışıyor (http://localhost:${PORT})`);
});
