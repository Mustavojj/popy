export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
        const safeConfig = {
            apiKey: firebaseConfig.apiKey || "AIzaSyDefaultKey123",
            authDomain: firebaseConfig.authDomain || "tornado-default.firebaseapp.com",
            databaseURL: firebaseConfig.databaseURL || "https://tornado-default-rtdb.firebaseio.com",
            projectId: firebaseConfig.projectId || "tornado-default",
            storageBucket: firebaseConfig.storageBucket || "tornado-default.appspot.com",
            messagingSenderId: firebaseConfig.messagingSenderId || "987654321098",
            appId: firebaseConfig.appId || "1:987654321098:web:default1234567890",
            measurementId: firebaseConfig.measurementId || "G-DEFAULT123"
        };
        const encryptedConfig = Buffer.from(JSON.stringify(safeConfig)).toString('base64');
        res.status(200).json({ encrypted: encryptedConfig });
    } catch (error) {
        const fallbackConfig = {
            apiKey: "AIzaSyDefaultKey123",
            authDomain: "tornado-default.firebaseapp.com",
            databaseURL: "https://tornado-default-rtdb.firebaseio.com",
            projectId: "tornado-default",
            storageBucket: "tornado-default.appspot.com",
            messagingSenderId: "987654321098",
            appId: "1:987654321098:web:default1234567890",
            measurementId: "G-DEFAULT123"
        };
        const encryptedFallback = Buffer.from(JSON.stringify(fallbackConfig)).toString('base64');
        res.status(200).json({ encrypted: encryptedFallback });
    }
            }
