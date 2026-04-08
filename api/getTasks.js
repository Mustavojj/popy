import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { initData } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const response = await fetch(`${FIREBASE_CONFIG.databaseURL}/config/tasks.json`);
    const data = await response.json();
    res.json(data || {});
}
