import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData, updates } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}.json`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
    res.json({ success: true });
}
