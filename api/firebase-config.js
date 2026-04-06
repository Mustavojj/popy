export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const telegramAuth = req.headers['x-telegram-auth'];
        
        if (!telegramAuth) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        const encryptedConfig = Buffer.from(JSON.stringify(firebaseConfig)).toString('base64');
        
        res.status(200).json({ encrypted: encryptedConfig });
        
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
