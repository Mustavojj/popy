import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function verifyTelegramAuth(initData) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    
    const secret = crypto.createHash('sha256')
        .update(process.env.BOT_TOKEN)
        .digest();
    
    const checkString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    
    const computedHash = crypto.createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');
    
    return computedHash === hash;
}

function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

async function fb(path, data = null) {
    const url = `${process.env.FIREBASE_DATABASE_URL}${path}.json`;
    const options = { headers: { 'Content-Type': 'application/json' } };
    if (data) {
        options.method = 'PUT';
        options.body = JSON.stringify(data);
    } else {
        options.method = 'GET';
    }
    const res = await fetch(url, options);
    return res.json();
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { type, data } = req.body;
    
    // AUTH
    if (type === 'auth') {
        const { initData, userId } = data;
        if (!verifyTelegramAuth(initData)) {
            return res.status(401).json({ error: 'Invalid auth' });
        }
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token });
    }
    
    // VERIFY TOKEN FOR OTHER REQUESTS
    const user = verifyToken(req.headers.authorization);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = user.userId;
    
    // ACTIONS
    try {
        switch(type) {
            case 'getUser': {
                const result = await fb(`/users/${userId}`);
                return res.json(result || {});
            }
            
            case 'updateUser': {
                const current = await fb(`/users/${userId}`);
                await fb(`/users/${userId}`, { ...(current || {}), ...data });
                return res.json({ success: true });
            }
            
            case 'getTasks': {
                const tasks = await fb('/tasks');
                return res.json(tasks || {});
            }
            
            case 'completeTask': {
                const completed = await fb(`/users/${userId}/completedTasks/${data.taskId}`);
                if (completed) return res.status(400).json({ error: 'Already completed' });
                await fb(`/users/${userId}/completedTasks/${data.taskId}`, true);
                const power = await fb(`/users/${userId}/powerBalance`);
                await fb(`/users/${userId}/powerBalance`, (power || 0) + data.rewardPower);
                return res.json({ success: true });
            }
            
            case 'startMining': {
                const userData = await fb(`/users/${userId}`);
                if (userData?.miningActive) return res.status(400).json({ error: 'Already active' });
                const start = Date.now();
                const end = start + (data.sessionHours * 3600000);
                await fb(`/users/${userId}/miningActive`, true);
                await fb(`/users/${userId}/miningStartTime`, start);
                await fb(`/users/${userId}/miningEndTime`, end);
                return res.json({ success: true, startTime: start, endTime: end });
            }
            
            case 'stopMining': {
                const userData = await fb(`/users/${userId}`);
                if (!userData?.miningActive) return res.status(400).json({ error: 'No active mining' });
                const elapsed = Math.min((Date.now() - userData.miningStartTime) / 3600000, userData.miningSessionHours || 1);
                const rate = ((userData.powerBalance || 0) / 1000) * 0.0000833333;
                const reward = rate * elapsed;
                await fb(`/users/${userId}/miningActive`, false);
                await fb(`/users/${userId}/pendingTonReward`, reward);
                return res.json({ success: true, reward });
            }
            
            case 'claimReward': {
                const userData = await fb(`/users/${userId}`);
                const pending = userData?.pendingTonReward || 0;
                if (pending <= 0) return res.status(400).json({ error: 'No reward' });
                await fb(`/users/${userId}/tonBalance`, (userData?.tonBalance || 0) + pending);
                await fb(`/users/${userId}/pendingTonReward`, 0);
                return res.json({ success: true, amount: pending });
            }
            
            case 'applyPromo': {
                const promo = await fb(`/promoCodes/${data.code}`);
                if (!promo) return res.status(400).json({ error: 'Invalid code' });
                const used = await fb(`/usedPromoCodes/${userId}/${data.code}`);
                if (used) return res.status(400).json({ error: 'Already used' });
                await fb(`/usedPromoCodes/${userId}/${data.code}`, true);
                const userData = await fb(`/users/${userId}`);
                if (promo.power) await fb(`/users/${userId}/powerBalance`, (userData?.powerBalance || 0) + promo.power);
                if (promo.ton) await fb(`/users/${userId}/tonBalance`, (userData?.tonBalance || 0) + promo.ton);
                return res.json({ success: true });
            }
            
            case 'withdraw': {
                const userData = await fb(`/users/${userId}`);
                if (data.amount < 0.01) return res.status(400).json({ error: 'Min 0.01 TON' });
                if (data.amount > (userData?.tonBalance || 0)) return res.status(400).json({ error: 'Insufficient balance' });
                await fb(`/users/${userId}/tonBalance`, (userData?.tonBalance || 0) - data.amount);
                const withdrawal = { id: Date.now(), amount: data.amount, wallet: data.wallet, status: 'pending', timestamp: Date.now() };
                await fb(`/withdrawals/${userId}/${withdrawal.id}`, withdrawal);
                return res.json({ success: true, withdrawal });
            }
            
            case 'getWithdrawals': {
                const result = await fb(`/withdrawals/${userId}`);
                const list = result ? Object.values(result).sort((a,b) => b.timestamp - a.timestamp) : [];
                return res.json(list);
            }
            
            case 'watchAd': {
                const lastAd = await fb(`/users/${userId}/lastAdTime`);
                const now = Date.now();
                if (lastAd && now - lastAd < 28800000) return res.status(400).json({ error: 'Cooldown 8h' });
                const power = await fb(`/users/${userId}/powerBalance`);
                await fb(`/users/${userId}/powerBalance`, (power || 0) + 50);
                await fb(`/users/${userId}/lastAdTime`, now);
                return res.json({ success: true });
            }
            
            case 'getReferrals': {
                const stats = await fb(`/users/${userId}`);
                return res.json({
                    totalReferrals: stats?.totalReferrals || 0,
                    verifiedReferrals: stats?.verifiedReferrals || 0,
                    referralPower: stats?.referralPower || 0,
                    referralTon: stats?.referralTon || 0
                });
            }
            
            default:
                return res.status(400).json({ error: 'Invalid type' });
        }
    } catch(err) {
        return res.status(500).json({ error: err.message });
    }
}
