export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyCWnfPAgBHr1beeph4OxxmXokY45MgPsFM",
            authDomain: "vevaia.firebaseapp.com",
            databaseURL: "https://vevaia-default-rtdb.firebaseio.com",
            projectId: "vevaia",
            storageBucket: "vevaia.firebasestorage.app",
            messagingSenderId: "284687408904",
            appId: "1:284687408904:web:25e88c5066b5844aefd6bd",
            measurementId: "G-LPRMK4JY0Z"
        };
        const encryptedConfig = Buffer.from(JSON.stringify(firebaseConfig)).toString('base64');
        res.status(200).json({ encrypted: encryptedConfig });
    } catch (error) {
        const fallbackConfig = {
            apiKey: "AIzaSyCWnfPAgBHr1beeph4OxxmXokY45MgPsFM",
            authDomain: "vevaia.firebaseapp.com",
            databaseURL: "https://vevaia-default-rtdb.firebaseio.com",
            projectId: "vevaia",
            storageBucket: "vevaia.firebasestorage.app",
            messagingSenderId: "284687408904",
            appId: "1:284687408904:web:25e88c5066b5844aefd6bd",
            measurementId: "G-LPRMK4JY0Z"
        };
        const encryptedFallback = Buffer.from(JSON.stringify(fallbackConfig)).toString('base64');
        res.status(200).json({ encrypted: encryptedFallback });
    }
            }
