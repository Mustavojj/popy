import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData, tonAmount } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const POP_PER_TON = 1000;
    const MIN_EXCHANGE = 0.01;
    if (tonAmount < MIN_EXCHANGE) {
        return res.json({ success: false, error: 'Minimum exchange is 0.01 TON' });
    }
    const balanceRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`);
    const balance = await balanceRes.json();
    if ((balance || 0) < tonAmount) {
        return res.json({ success: false, error: 'Insufficient balance' });
    }
    const popAmount = Math.floor(tonAmount * POP_PER_TON);
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`, {
        method: 'PUT',
        body: JSON.stringify((balance || 0) - tonAmount)
    });
    const popRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/pop.json`);
    const pop = await popRes.json();
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/pop.json`, {
        method: 'PUT',
        body: JSON.stringify((pop || 0) + popAmount)
    });
    res.json({ success: true, popAmount });
}
