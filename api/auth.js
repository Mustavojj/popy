import jwt from 'jsonwebtoken';

let db = null;

function initFirebase() {
    if (db) return db;
    
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const databaseURL = process.env.FIREBASE_DATABASE_URL;
        
        if (!serviceAccount || !databaseURL) {
            throw new Error('Missing Firebase config');
        }
        
        const admin = require('firebase-admin');
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: databaseURL
            });
        }
        
        db = admin.database();
        return db;
    } catch(error) {
        console.error('Firebase init error:', error.message);
        throw error;
    }
}

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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const database = initFirebase();
        const userData = verifyToken(req);
        
        if (!userData) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { userId } = userData;
        const { action, data } = req.body;
        
        switch(action) {
            case 'getUser': {
                const snapshot = await database.ref(`users/${userId}`).once('value');
                const user = snapshot.val() || {};
                return res.json(user);
            }
            
            case 'updateUser': {
                await database.ref(`users/${userId}`).update(data);
                return res.json({ success: true });
            }
            
            case 'getTasks': {
                const snapshot = await database.ref('tasks').once('value');
                return res.json(snapshot.val() || {});
            }
            
            case 'completeTask': {
                const { taskId, rewardPower } = data;
                const completed = await database.ref(`users/${userId}/completedTasks/${taskId}`).once('value');
                if (completed.exists()) {
                    return res.status(400).json({ error: 'Task already completed' });
                }
                await database.ref(`users/${userId}/completedTasks/${taskId}`).set(true);
                const userSnap = await database.ref(`users/${userId}/powerBalance`).once('value');
                const newPower = (userSnap.val() || 0) + rewardPower;
                await database.ref(`users/${userId}`).update({ powerBalance: newPower });
                return res.json({ success: true, newPower });
            }
            
            case 'startMining': {
                const userSnap = await database.ref(`users/${userId}`).once('value');
                if (userSnap.val()?.miningActive) {
                    return res.status(400).json({ error: 'Mining already active' });
                }
                const startTime = Date.now();
                const endTime = startTime + (data.sessionHours * 3600000);
                await database.ref(`users/${userId}`).update({
                    miningActive: true,
                    miningStartTime: startTime,
                    miningEndTime: endTime,
                    miningSessionHours: data.sessionHours
                });
                return res.json({ success: true, startTime, endTime });
            }
            
            case 'stopMining': {
                const userSnap = await database.ref(`users/${userId}`).once('value');
                const user = userSnap.val();
                if (!user?.miningActive) {
                    return res.status(400).json({ error: 'No active mining' });
                }
                const elapsed = Math.min((Date.now() - user.miningStartTime) / 3600000, user.miningSessionHours);
                const hourlyRate = ((user.powerBalance || 0) / 1000) * 0.0000833333;
                const reward = hourlyRate * elapsed;
                await database.ref(`users/${userId}`).update({
                    miningActive: false,
                    miningStartTime: null,
                    miningEndTime: null,
                    pendingTonReward: reward
                });
                return res.json({ success: true, reward });
            }
            
            case 'claimReward': {
                const userSnap = await database.ref(`users/${userId}`).once('value');
                const user = userSnap.val();
                const pending = user?.pendingTonReward || 0;
                if (pending <= 0) {
                    return res.status(400).json({ error: 'No reward to claim' });
                }
                const currentTon = user?.tonBalance || 0;
                await database.ref(`users/${userId}`).update({
                    tonBalance: currentTon + pending,
                    pendingTonReward: 0
                });
                const referredBy = user?.referredBy;
                if (referredBy && referredBy !== userId) {
                    const commission = pending * 0.1;
                    const referrerSnap = await database.ref(`users/${referredBy}/tonBalance`).once('value');
                    const referrerTon = referrerSnap.val() || 0;
                    await database.ref(`users/${referredBy}`).update({
                        tonBalance: referrerTon + commission,
                        referralTon: (user?.referralTon || 0) + commission
                    });
                }
                return res.json({ success: true, amount: pending });
            }
            
            case 'applyPromo': {
                const promoSnap = await database.ref(`promoCodes/${data.code}`).once('value');
                if (!promoSnap.exists()) {
                    return res.status(400).json({ error: 'Invalid code' });
                }
                const usedSnap = await database.ref(`usedPromoCodes/${userId}/${data.code}`).once('value');
                if (usedSnap.exists()) {
                    return res.status(400).json({ error: 'Code already used' });
                }
                await database.ref(`usedPromoCodes/${userId}/${data.code}`).set(true);
                const promoValue = promoSnap.val();
                const userSnap = await database.ref(`users/${userId}`).once('value');
                const user = userSnap.val();
                const updates = {};
                if (promoValue.power) updates.powerBalance = (user?.powerBalance || 0) + promoValue.power;
                if (promoValue.ton) updates.tonBalance = (user?.tonBalance || 0) + promoValue.ton;
                await database.ref(`users/${userId}`).update(updates);
                return res.json({ success: true, reward: promoValue });
            }
            
            case 'withdraw': {
                const userSnap = await database.ref(`users/${userId}`).once('value');
                const tonBalance = userSnap.val()?.tonBalance || 0;
                if (data.amount < 0.01) {
                    return res.status(400).json({ error: 'Minimum withdrawal is 0.01 TON' });
                }
                if (data.amount > tonBalance) {
                    return res.status(400).json({ error: 'Insufficient balance' });
                }
                await database.ref(`users/${userId}`).update({ tonBalance: tonBalance - data.amount });
                const withdrawal = {
                    id: Date.now(),
                    amount: data.amount,
                    wallet: data.wallet,
                    status: 'pending',
                    timestamp: Date.now()
                };
                await database.ref(`withdrawals/${userId}/${withdrawal.id}`).set(withdrawal);
                return res.json({ success: true, withdrawal });
            }
            
            case 'getWithdrawals': {
                const snapshot = await database.ref(`withdrawals/${userId}`).once('value');
                const withdrawals = [];
                snapshot.forEach(w => withdrawals.push({ id: w.key, ...w.val() }));
                withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                return res.json(withdrawals);
            }
            
            case 'watchAd': {
                const lastAdSnap = await database.ref(`users/${userId}/lastAdTime`).once('value');
                const now = Date.now();
                const cooldown = 8 * 3600000;
                if (lastAdSnap.val() && now - lastAdSnap.val() < cooldown) {
                    return res.status(400).json({ error: 'Cooldown active' });
                }
                const powerSnap = await database.ref(`users/${userId}/powerBalance`).once('value');
                const newPower = (powerSnap.val() || 0) + 50;
                await database.ref(`users/${userId}`).update({
                    powerBalance: newPower,
                    lastAdTime: now
                });
                return res.json({ success: true, newPower });
            }
            
            case 'getReferrals': {
                const referralsSnap = await database.ref(`referrals/${userId}`).once('value');
                const statsSnap = await database.ref(`users/${userId}`).once('value');
                const stats = statsSnap.val() || {};
                return res.json({
                    totalReferrals: stats.totalReferrals || 0,
                    verifiedReferrals: stats.verifiedReferrals || 0,
                    referralPower: stats.referralPower || 0,
                    referralTon: stats.referralTon || 0,
                    referrals: referralsSnap.val() || {}
                });
            }
            
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch(error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
