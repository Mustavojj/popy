import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const userData = verifyToken(req);
    if (!userData) return res.status(401).json({ error: 'Unauthorized' });
    
    const { userId } = userData;
    const { action, data } = req.body;
    
    try {
        switch(action) {
            case 'getUser':
                const userSnap = await db.ref(`users/${userId}`).once('value');
                res.json(userSnap.val() || {});
                break;
                
            case 'updateUser':
                const current = await db.ref(`users/${userId}`).once('value');
                const currentData = current.val() || {};
                
                if (data.powerBalance !== undefined) {
                    const powerDiff = data.powerBalance - (currentData.powerBalance || 0);
                    if (powerDiff > 5000) return res.status(400).json({ error: 'Invalid power addition' });
                    if (powerDiff < -5000) return res.status(400).json({ error: 'Invalid power reduction' });
                }
                
                if (data.tonBalance !== undefined) {
                    const tonDiff = data.tonBalance - (currentData.tonBalance || 0);
                    if (tonDiff > 100) return res.status(400).json({ error: 'Invalid TON addition' });
                }
                
                await db.ref(`users/${userId}`).update(data);
                res.json({ success: true });
                break;
                
            case 'getTasks':
                const tasksSnap = await db.ref('tasks').once('value');
                res.json(tasksSnap.val() || {});
                break;
                
            case 'completeTask':
                const { taskId, rewardPower } = data;
                const completedSnap = await db.ref(`users/${userId}/completedTasks/${taskId}`).once('value');
                if (completedSnap.exists()) return res.status(400).json({ error: 'Task already completed' });
                
                await db.ref(`users/${userId}/completedTasks/${taskId}`).set(true);
                const userSnap2 = await db.ref(`users/${userId}`).once('value');
                const newPower = (userSnap2.val()?.powerBalance || 0) + rewardPower;
                await db.ref(`users/${userId}`).update({ powerBalance: newPower });
                res.json({ success: true, newPower });
                break;
                
            case 'startMining':
                const miningSnap = await db.ref(`users/${userId}`).once('value');
                if (miningSnap.val()?.miningActive) return res.status(400).json({ error: 'Mining already active' });
                
                const startTime = Date.now();
                const endTime = startTime + (data.sessionHours * 3600000);
                await db.ref(`users/${userId}`).update({
                    miningActive: true,
                    miningStartTime: startTime,
                    miningEndTime: endTime,
                    miningSessionHours: data.sessionHours
                });
                res.json({ success: true, startTime, endTime });
                break;
                
            case 'stopMining':
                const miningData = await db.ref(`users/${userId}`).once('value');
                const mining = miningData.val();
                if (!mining?.miningActive) return res.status(400).json({ error: 'No active mining' });
                
                const elapsed = Math.min((Date.now() - mining.miningStartTime) / 3600000, mining.miningSessionHours);
                const hourlyRate = ((mining.powerBalance || 0) / 1000) * 0.0000833333;
                const reward = hourlyRate * elapsed;
                
                await db.ref(`users/${userId}`).update({
                    miningActive: false,
                    miningStartTime: null,
                    miningEndTime: null,
                    pendingTonReward: reward
                });
                res.json({ success: true, reward });
                break;
                
            case 'claimReward':
                const claimSnap = await db.ref(`users/${userId}`).once('value');
                const pending = claimSnap.val()?.pendingTonReward || 0;
                if (pending <= 0) return res.status(400).json({ error: 'No reward to claim' });
                
                const currentTon = claimSnap.val()?.tonBalance || 0;
                await db.ref(`users/${userId}`).update({
                    tonBalance: currentTon + pending,
                    pendingTonReward: 0
                });
                
                const referredBy = claimSnap.val()?.referredBy;
                if (referredBy && referredBy !== userId) {
                    const commission = pending * 0.1;
                    const referrerSnap = await db.ref(`users/${referredBy}`).once('value');
                    const referrerTon = referrerSnap.val()?.tonBalance || 0;
                    await db.ref(`users/${referredBy}`).update({
                        tonBalance: referrerTon + commission,
                        referralTon: (referrerSnap.val()?.referralTon || 0) + commission
                    });
                }
                
                res.json({ success: true, amount: pending });
                break;
                
            case 'applyPromo':
                const promoSnap = await db.ref(`promoCodes/${data.code}`).once('value');
                if (!promoSnap.exists()) return res.status(400).json({ error: 'Invalid code' });
                
                const usedSnap = await db.ref(`usedPromoCodes/${userId}/${data.code}`).once('value');
                if (usedSnap.exists()) return res.status(400).json({ error: 'Code already used' });
                
                await db.ref(`usedPromoCodes/${userId}/${data.code}`).set(true);
                const promoValue = promoSnap.val();
                const userSnap3 = await db.ref(`users/${userId}`).once('value');
                
                const updates = {};
                if (promoValue.power) updates.powerBalance = (userSnap3.val()?.powerBalance || 0) + promoValue.power;
                if (promoValue.ton) updates.tonBalance = (userSnap3.val()?.tonBalance || 0) + promoValue.ton;
                await db.ref(`users/${userId}`).update(updates);
                res.json({ success: true, reward: promoValue });
                break;
                
            case 'withdraw':
                const withdrawSnap = await db.ref(`users/${userId}`).once('value');
                const tonBalance = withdrawSnap.val()?.tonBalance || 0;
                if (data.amount < 0.01) return res.status(400).json({ error: 'Minimum withdrawal is 0.01 TON' });
                if (data.amount > tonBalance) return res.status(400).json({ error: 'Insufficient balance' });
                
                await db.ref(`users/${userId}`).update({ tonBalance: tonBalance - data.amount });
                const withdrawal = {
                    id: Date.now(),
                    amount: data.amount,
                    wallet: data.wallet,
                    status: 'pending',
                    timestamp: Date.now()
                };
                await db.ref(`withdrawals/${userId}/${withdrawal.id}`).set(withdrawal);
                res.json({ success: true, withdrawal });
                break;
                
            case 'getWithdrawals':
                const withdrawalsSnap = await db.ref(`withdrawals/${userId}`).once('value');
                const withdrawals = [];
                withdrawalsSnap.forEach(w => withdrawals.push({ id: w.key, ...w.val() }));
                res.json(withdrawals.sort((a,b) => b.timestamp - a.timestamp));
                break;
                
            case 'watchAd':
                const lastAd = await db.ref(`users/${userId}/lastAdTime`).once('value');
                const now = Date.now();
                const cooldown = 8 * 3600000;
                if (lastAd.val() && now - lastAd.val() < cooldown) {
                    return res.status(400).json({ error: 'Cooldown active' });
                }
                
                const powerBefore = (await db.ref(`users/${userId}/powerBalance`).once('value')).val() || 0;
                await db.ref(`users/${userId}`).update({
                    powerBalance: powerBefore + 50,
                    lastAdTime: now
                });
                res.json({ success: true, newPower: powerBefore + 50 });
                break;
                
            case 'getReferrals':
                const referralsSnap = await db.ref(`referrals/${userId}`).once('value');
                const statsSnap = await db.ref(`users/${userId}`).once('value');
                res.json({
                    totalReferrals: statsSnap.val()?.totalReferrals || 0,
                    verifiedReferrals: statsSnap.val()?.verifiedReferrals || 0,
                    referralPower: statsSnap.val()?.referralPower || 0,
                    referralTon: statsSnap.val()?.referralTon || 0,
                    referrals: referralsSnap.val() || {}
                });
                break;
                
            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
}
