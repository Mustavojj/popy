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
        if (!telegramAuth) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const isValid = await verifyTelegramInitData(telegramAuth, process.env.BOT_TOKEN);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }
        
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        const encryptedConfig = Buffer.from(JSON.stringify(firebaseConfig)).toString('base64');
        
        res.status(200).json({ encrypted: encryptedConfig });
        
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function verifyTelegramInitData(initData, botToken) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    
    params.delete('hash');
    params.sort();
    
    const dataCheckString = Array.from(params.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const encoder = new TextEncoder();
    
    const secretKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode('WebAppData'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));
    
    const signatureKey = await crypto.subtle.importKey(
        'raw',
        secret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const calculatedHash = await crypto.subtle.sign('HMAC', signatureKey, encoder.encode(dataCheckString));
    const calculatedHashHex = Array.from(new Uint8Array(calculatedHash)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return calculatedHashHex === hash;
}
