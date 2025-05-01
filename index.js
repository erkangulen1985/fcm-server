const { JWT } = require('google-auth-library');
const { Firestore } = require('@google-cloud/firestore');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const key = JSON.parse(fs.readFileSync('./economentor-8ddc4-firebase-adminsdk-fbsvc-f2cb63bbea.json', 'utf8'));

const client = new JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const firestore = new Firestore({ projectId: key.project_id, auth: client });

app.get('/ping', async (req, res) => {
  try {
    const snapshot = await firestore.collection('users').limit(1).get();
    res.send('✅ Firestore bağlantısı başarılı');
  } catch (err) {
    console.error('❌ Firestore bağlantı hatası:', err);
    res.status(500).send('❌ Firestore bağlantı hatası');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Firestore JWT sunucusu çalışıyor: http://localhost:${PORT}`));
