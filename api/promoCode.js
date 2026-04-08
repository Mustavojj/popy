import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData, code } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const promosRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/config/promoCodes.json`);
    const promos = await promosRes.json();
    let promoData = null;
    for (const [id, data] of Object.entries(promos || {})) {
        if (data.code === code.toUpperCase()) {
            promoData = { id, ...data };
            break;
        }
    }
    if (!promoData) {
        return res.json({ success: false, error: 'Invalid code' });
    }
    const usedRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/usedPromoCodes/${userId}/${promoData.id}.json`);
    const used = await usedRes.json();
    if (used) {
        return res.json({ success: false, error: 'Already used' });
    }
    if (promoData.required) {
        const channelRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${promoData.required}&user_id=${userId}`);
        const channelData = await channelRes.json();
        const isMember = ['member', 'administrator', 'creator'].includes(channelData.result?.status);
        if (!isMember) {
            return res.json({ success: false, error: 'Join channel first', channel: promoData.required });
        }
    }
    const balanceRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`);
    const balance = await balanceRes.json();
    const reward = promoData.reward || 0.01;
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`, {
        method: 'PUT',
        body: JSON.stringify((balance || 0) + reward)
    });
    await fetch(`${FIREBASE_CONFIG.databaseURL}/usedPromoCodes/${userId}/${promoData.id}.json`, {
        method: 'PUT',
        body: JSON.stringify({ code, claimedAt: Date.now() })
    });
    res.json({ success: true, reward });
}
