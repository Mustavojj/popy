export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '';
        const telegramUserId = req.headers['x-telegram-user'];
        const telegramAuth = req.headers['x-telegram-auth'];
        
        const blockedAgents = [
            'python', 'curl', 'wget', 'postman', 'insomnia',
            'bot', 'crawler', 'spider', 'scraper',
            'sqlmap', 'nmap', 'burp', 'hydra',
            'nikto', 'gobuster', 'dirb', 'ffuf'
        ];
        
        const isBlocked = blockedAgents.some(agent => 
            userAgent.toLowerCase().includes(agent.toLowerCase())
        );
        
        if (isBlocked) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!telegramUserId || !telegramAuth) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const isValid = await verifyTelegramInitData(telegramAuth, process.env.BOT_TOKEN);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }
        
        const requestKey = `firebase_${userIp}`;
        const now = Date.now();
        
        if (!global.firebaseRequestStore) global.firebaseRequestStore = {};
        if (!global.firebaseRequestStore[requestKey]) global.firebaseRequestStore[requestKey] = [];
        
        global.firebaseRequestStore[requestKey] = global.firebaseRequestStore[requestKey].filter(
            time => now - time < 300000
        );
        
        if (global.firebaseRequestStore[requestKey].length >= 5) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        
        global.firebaseRequestStore[requestKey].push(now);
        
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        
        const encryptedConfig = Buffer.from(JSON.stringify(firebaseConfig)).toString('base64');
        
        res.status(200).json({
            encrypted: encryptedConfig
        });
        
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
    
    const secretKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('WebAppData'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));
    
    const signatureKey = await crypto.subtle.importKey(
        'raw',
        secret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const calculatedHash = await crypto.subtle.sign('HMAC', signatureKey, new TextEncoder().encode(dataCheckString));
    const calculatedHashHex = Array.from(new Uint8Array(calculatedHash)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return calculatedHashHex === hash;
}
