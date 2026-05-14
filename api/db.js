import jwt from 'jsonwebtoken';

const FB_API_KEY = 'AIzaSyDefaultKey123'; 

async function firebaseRest(action, path, data = null) {
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    const url = `${databaseURL}${path}.json`;
    
    const options = {
        method: data ? 'PUT' : 'GET',
        headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const res = await fetch(url, options);
    return res.json();
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
        const userData = verifyToken(req);
        if (!userData) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { userId } = userData;
        const { action, data } = req.body;
        
        switch(action) {
            case 'getUser': {
                const result = await firebaseRest('GET', `/users/${userId}`);
                return res.json(result || {});
            }
            
            case 'updateUser': {
                const current = await firebaseRest('GET', `/users/${userId}`);
                const updated = { ...(current || {}), ...data };
                await firebaseRest('PUT', `/users/${userId}`, updated);
                return res.json({ success: true });
            }
            
            case 'getTasks': {
                const result = await firebaseRest('GET', '/tasks');
                return res.json(result || {});
            }
            
            case 'completeTask': {
                const completed = await firebaseRest('GET', `/users/${userId}/completedTasks/${data.taskId}`);
                if (completed) {
                    return res.status(400).json({ error: 'Task already completed' });
                }
                await firebaseRest('PUT', `/users/${userId}/completedTasks/${data.taskId}`, true);
                const powerSnap = await firebaseRest('GET', `/users/${userId}/powerBalance`);
                const newPower = (powerSnap || 0) + data.rewardPower;
                await firebaseRest('PUT', `/users/${userId}/powerBalance`, newPower);
                return res.json({ success: true, newPower });
            }
            
            case 'startMining': {
                const user = await firebaseRest('GET', `/users/${userId}`);
                if (user?.miningActive) {
                    return res.status(400).json({ error: 'Mining already active' });
                }
                const startTime = Date.now();
                const endTime = startTime + (data.sessionHours * 3600000);
                await firebaseRest('PUT', `/users/${userId}/miningActive`, true);
                await firebaseRest('PUT', `/users/${userId}/miningStartTime`, startTime);
                await firebaseRest('PUT', `/users/${userId}/miningEndTime`, endTime);
                await firebaseRest('PUT', `/users/${userId}/miningSessionHours`, data.sessionHours);
                return res.json({ success: true, startTime, endTime });
            }
            
            case 'stopMining': {
                const user = await firebaseRest('GET', `/users/${userId}`);
                if (!user?.miningActive) {
                    return res.status(400).json({ error: 'No active mining' });
                }
                const elapsed = Math.min((Date.now() - user.miningStartTime) / 3600000, user.miningSessionHours);
                const hourlyRate = ((user.powerBalance || 0) / 1000) * 0.0000833333;
                const reward = hourlyRate * elapsed;
                await firebaseRest('PUT', `/users/${userId}/miningActive`, false);
                await firebaseRest('PUT', `/users/${userId}/miningStartTime`, null);
                await firebaseRest('PUT', `/users/${userId}/miningEndTime`, null);
                await firebaseRest('PUT', `/users/${userId}/pendingTonReward`, reward);
                return res.json({ success: true, reward });
            }
            
            case 'claimReward': {
                const user = await firebaseRest('GET', `/users/${userId}`);
                const pending = user?.pendingTonReward || 0;
                if (pending <= 0) {
                    return res.status(400).json({ error: 'No reward to claim' });
                }
                const currentTon = user?.tonBalance || 0;
                await firebaseRest('PUT', `/users/${userId}/tonBalance`, currentTon + pending);
                await firebaseRest('PUT', `/users/${userId}/pendingTonReward`, 0);
                return res.json({ success: true, amount: pending });
            }
            
            case 'applyPromo': {
                const promo = await firebaseRest('GET', `/promoCodes/${data.code}`);
                if (!promo) {
                    return res.status(400).json({ error: 'Invalid code' });
                }
                const used = await firebaseRest('GET', `/usedPromoCodes/${userId}/${data.code}`);
                if (used) {
                    return res.status(400).json({ error: 'Code already used' });
                }
                await firebaseRest('PUT', `/usedPromoCodes/${userId}/${data.code}`, true);
                const user = await firebaseRest('GET', `/users/${userId}`);
                if (promo.power) {
                    await firebaseRest('PUT', `/users/${userId}/powerBalance`, (user?.powerBalance || 0) + promo.power);
                }
                if (promo.ton) {
                    await firebaseRest('PUT', `/users/${userId}/tonBalance`, (user?.tonBalance || 0) + promo.ton);
                }
                return res.json({ success: true, reward: promo });
            }
            
            case 'withdraw': {
                const user = await firebaseRest('GET', `/users/${userId}`);
                const tonBalance = user?.tonBalance || 0;
                if (data.amount < 0.01) {
                    return res.status(400).json({ error: 'Minimum withdrawal is 0.01 TON' });
                }
                if (data.amount > tonBalance) {
                    return res.status(400).json({ error: 'Insufficient balance' });
                }
                await firebaseRest('PUT', `/users/${userId}/tonBalance`, tonBalance - data.amount);
                const withdrawal = {
                    id: Date.now(),
                    amount: data.amount,
                    wallet: data.wallet,
                    status: 'pending',
                    timestamp: Date.now()
                };
                await firebaseRest('PUT', `/withdrawals/${userId}/${withdrawal.id}`, withdrawal);
                return res.json({ success: true, withdrawal });
            }
            
            case 'getWithdrawals': {
                const result = await firebaseRest('GET', `/withdrawals/${userId}`);
                const withdrawals = result ? Object.values(result) : [];
                withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                return res.json(withdrawals);
            }
            
            case 'watchAd': {
                const lastAd = await firebaseRest('GET', `/users/${userId}/lastAdTime`);
                const now = Date.now();
                const cooldown = 8 * 3600000;
                if (lastAd && now - lastAd < cooldown) {
                    return res.status(400).json({ error: 'Cooldown active' });
                }
                const powerSnap = await firebaseRest('GET', `/users/${userId}/powerBalance`);
                const newPower = (powerSnap || 0) + 50;
                await firebaseRest('PUT', `/users/${userId}/powerBalance`, newPower);
                await firebaseRest('PUT', `/users/${userId}/lastAdTime`, now);
                return res.json({ success: true, newPower });
            }
            
            case 'getReferrals': {
                const stats = await firebaseRest('GET', `/users/${userId}`);
                const referrals = await firebaseRest('GET', `/referrals/${userId}`);
                return res.json({
                    totalReferrals: stats?.totalReferrals || 0,
                    verifiedReferrals: stats?.verifiedReferrals || 0,
                    referralPower: stats?.referralPower || 0,
                    referralTon: stats?.referralTon || 0,
                    referrals: referrals || {}
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
