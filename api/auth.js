import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function verifyTelegramAuth(initData) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    
    const secret = crypto.createHash('sha256')
        .update(process.env.BOT_TOKEN)
        .digest();
    
    const checkString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    
    const computedHash = crypto.createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');
    
    return computedHash === hash;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { initData, userId } = req.body;
    
    if (!verifyTelegramAuth(initData)) {
        return res.status(401).json({ error: 'Invalid authentication' });
    }
    
    const token = jwt.sign(
        { userId, exp: Math.floor(Date.now() / 1000) + 3600 },
        process.env.JWT_SECRET
    );
    
    res.json({ token });
}
