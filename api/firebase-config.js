export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const origin = req.headers.origin;
        const allowedOrigins = ['https://your-app.vercel.app', 'https://t.me'];
        if (!allowedOrigins.includes(origin)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const userAgent = req.headers['user-agent'] || '';
        if (!userAgent.includes('TelegramBot') && !userAgent.includes('Mobile')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const telegramAuth = req.headers['x-telegram-auth'];
        if (!telegramAuth || !telegramAuth.includes('user=') || !telegramAuth.includes('hash=')) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }
        
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        const encryptedConfig = Buffer.from(JSON.stringify(firebaseConfig)).toString('base64');
        
        res.status(200).json({ encrypted: encryptedConfig });
        
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
