import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import { google } from "googleapis";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Firebase Admin Key Yolu (dosya adını buraya yaz)
const serviceAccount = JSON.parse(fs.readFileSync("economentor-8ddc4-firebase-adminsdk-fbsvc-8a38f6a8f5.json", "utf8"));

// ✅ Firebase Admin başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const PROJECT_ID = serviceAccount.project_id;

// 🔑 Google Auth ile erişim tokenı al
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: serviceAccount.private_key,
      client_email: serviceAccount.client_email
    },
    projectId: PROJECT_ID,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });

  return await auth.getAccessToken();
}

// 🔔 Bildirim gönder
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

// POST: UID'ye gönder
app.post("/sendToUid", async (req, res) => {
  const { uid, title, body, url } = req.body;

  if (!uid || !title || !body) {
    return res.status(400).json({ error: "Eksik veri (uid, title, body)" });
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) return res.status(404).json({ error: "Kullanıcının fcmToken'ı yok" });

    const result = await sendNotification(fcmToken, title, body, url);
    return res.status(200).json({ message: "Bildirim gönderildi", result });
  } catch (error) {
    console.error("❌ Bildirim hatası:", error);
    return res.status(500).json({ error: "Gönderim başarısız" });
  }
});

// ✅ Render için sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
