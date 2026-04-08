import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData, taskId, reward, popReward, url, verification } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const completedRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/completedTasks/${taskId}.json`);
    const completed = await completedRes.json();
    if (completed) {
        return res.json({ success: false, error: 'Already completed' });
    }
    if (verification === 'YES') {
        const match = url.match(/t\.me\/([^\/\?]+)/);
        const chatId = match ? match[1] : null;
        if (chatId) {
            const memberRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
            const memberData = await memberRes.json();
            const isMember = ['member', 'administrator', 'creator'].includes(memberData.result?.status);
            if (!isMember) {
                return res.status(400).json({ error: 'Join channel first' });
            }
        }
    }
    const balanceRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`);
    const balance = await balanceRes.json();
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/balance.json`, {
        method: 'PUT',
        body: JSON.stringify((balance || 0) + reward)
    });
    const popRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/pop.json`);
    const pop = await popRes.json();
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/pop.json`, {
        method: 'PUT',
        body: JSON.stringify((pop || 0) + (popReward || 1))
    });
    const tasksCompletedRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/totalTasksCompleted.json`);
    const tasksCompleted = await tasksCompletedRes.json();
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/totalTasksCompleted.json`, {
        method: 'PUT',
        body: JSON.stringify((tasksCompleted || 0) + 1)
    });
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/completedTasks/${taskId}.json`, {
        method: 'PUT',
        body: JSON.stringify(true)
    });
    res.json({ success: true, reward, popReward: popReward || 1 });
}
