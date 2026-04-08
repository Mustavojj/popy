import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const response = await fetch(`${FIREBASE_CONFIG.databaseURL}/referrals/${userId}.json`);
    const data = await response.json();
    const referrals = [];
    for (const [id, ref] of Object.entries(data || {})) {
        referrals.push({ id, ...ref });
    }
    referrals.sort((a, b) => b.joinedAt - a.joinedAt);
    res.json(referrals);
}
