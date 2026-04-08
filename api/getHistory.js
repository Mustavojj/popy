import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const pendingRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/withdrawals/pending.json`);
    const completedRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/withdrawals/completed.json`);
    const rejectedRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/withdrawals/rejected.json`);
    const pending = await pendingRes.json();
    const completed = await completedRes.json();
    const rejected = await rejectedRes.json();
    const withdrawals = [];
    for (const [id, data] of Object.entries(pending || {})) {
        if (data.userId === userId) withdrawals.push({ id, ...data, status: 'pending' });
    }
    for (const [id, data] of Object.entries(completed || {})) {
        if (data.userId === userId) withdrawals.push({ id, ...data, status: 'completed' });
    }
    for (const [id, data] of Object.entries(rejected || {})) {
        if (data.userId === userId) withdrawals.push({ id, ...data, status: 'rejected' });
    }
    withdrawals.sort((a, b) => b.timestamp - a.timestamp);
    res.json(withdrawals);
}
