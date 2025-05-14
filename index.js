const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "https://economentor.netlify.app" }));
app.use(express.json());

// 🔐 JSON dosyasını oku
const firebaseConfig = JSON.parse(process.env.FIREBASE_CREDENTIAL_JSON);

// 🔥 Firebase başlat
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();

// ✅ CANLILIK KONTROL ENDPOINTİ
app.get("/ping", (req, res) => {
  res.status(200).send("Alive"); // UptimeRobot bu endpoint'e ping atacak
});

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
      data: { url: url || "https://economentor.netlify.app/mesaj.html" },
      android: {
        priority: "high"
      },
      apns: {
        headers: {
          "apns-priority": "10"
        }
      }
    });

    res.send("✅ Bildirim gönderildi");
  } catch (err) {
    console.error("❌ Bildirim hatası:", err);

    // 🚨 Eğer hata 'token kayıtlı değil' hatasıysa, Firestore'dan sil
    if (err.code === 'messaging/registration-token-not-registered') {
      console.warn("⚠️ Geçersiz token, Firestore'dan siliniyor:", uid);
      await db.collection("users").doc(uid).update({
        fcmToken: admin.firestore.FieldValue.delete()
      });
    }

    res.status(500).send("❌ Gönderim başarısız");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
