const express = require("express");
const { google } = require("googleapis");
const admin = require("firebase-admin");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Firebase Admin başlat
const serviceAccount = require("./economentor-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const PROJECT_ID = serviceAccount.project_id;

// 🔑 Google OAuth üzerinden FCM erişim tokenı al
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });

  return await auth.getAccessToken();
}

// 📲 FCM Bildirimi gönder (notification + data ile)
async function sendNotification(token, title, body, url = "https://economentor.netlify.app/mesaj.html") {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: {
            url // 🔥 Bildirime tıklandığında açılacak sayfa
          }
        }
      })
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

// ✅ GET ile bildirim (Apps Script için - opsiyonel)
app.get("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.query;

  console.log("🔥 [GET] Gelen veri:", { uid, title, body, url });

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

// ✅ Sunucuyu başlat
app.listen(3000, () => {
  console.log("✅ Bildirim sunucusu çalışıyor (http://localhost:3000)");
});
