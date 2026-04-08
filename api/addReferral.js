import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { referrerId, newUserId, username, firstName, photoUrl, initData } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const referralData = {
        userId: newUserId,
        username: username || 'No Username',
        firstName: firstName || 'User',
        photoUrl: photoUrl || '',
        joinedAt: Date.now(),
        state: 'pending',
        bonusGiven: false
    };
    await fetch(`${FIREBASE_CONFIG.databaseURL}/referrals/${referrerId}/${newUserId}.json`, {
        method: 'PUT',
        body: JSON.stringify(referralData)
    });
    res.json({ success: true });
}
