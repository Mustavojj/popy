import { verifyTelegram } from './_verify.js';

export default async function handler(req, res) {
    const { userId, initData, taskName, taskLink, verification, completions, price } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const isValid = await verifyTelegram(initData, BOT_TOKEN);
    if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
    const userRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}.json`);
    const user = await userRes.json();
    if ((user.pop || 0) < price) {
        return res.json({ success: false, error: 'Insufficient POP balance' });
    }
    const taskData = {
        name: taskName,
        url: taskLink,
        category: 'social',
        type: 'channel',
        verification: verification,
        maxCompletions: completions,
        currentCompletions: 0,
        status: 'active',
        reward: 0.001,
        popReward: 1,
        owner: userId,
        createdAt: Date.now(),
        picture: 'https://i.ibb.co/gLb6qFhn/file-00000000473871f4b2902b2708daa633.png'
    };
    const taskRef = await fetch(`${FIREBASE_CONFIG.databaseURL}/config/userTasks/${userId}.json`, {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
    const taskId = (await taskRef.json()).name;
    await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${userId}/pop.json`, {
        method: 'PUT',
        body: JSON.stringify((user.pop || 0) - price)
    });
    res.json({ success: true, taskId });
}
