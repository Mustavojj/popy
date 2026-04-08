import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData, amount, walletAddress } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const userRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}.json`);
    const user = await userRes.json();
    const minimumWithdraw = 0.20;
    const requiredTasks = 5;
    const requiredPOP = 30;
    if (!user || user.balance < amount || amount < minimumWithdraw) {
        return res.json({ success: false, error: 'Invalid amount' });
    }
    if ((user.totalTasksCompleted || 0) < requiredTasks) {
        return res.json({ success: false, error: 'Complete tasks first' });
    }
    if ((user.pop || 0) < requiredPOP) {
        return res.json({ success: false, error: 'Earn more POP first' });
    }
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`, {
        method: 'PUT',
        body: JSON.stringify(user.balance - amount)
    });
    const withdrawalId = `WITHDRAW_${Date.now()}_${userId}`;
    await fetch(`${FIREBASE_CONFIG.databaseURL}/withdrawals/pending/${withdrawalId}.json`, {
        method: 'PUT',
        body: JSON.stringify({
            userId,
            amount,
            walletAddress,
            timestamp: Date.now(),
            status: 'pending'
        })
    });
    res.json({ success: true });
}
