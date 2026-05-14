const { createHmac } = require('crypto');
const admin = require('firebase-admin');

let db = null;

function initFirebase() {
    if (db) return db;
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    }
    
    db = admin.database();
    return db;
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    
    try {
        const database = initFirebase();
        const { action, userId, data } = JSON.parse(event.body);
        
        if (!userId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'No userId' }) };
        }
        
        const ref = database.ref(`users/${userId}`);
        
        switch(action) {
            case 'get': {
                const snapshot = await ref.once('value');
                return { statusCode: 200, headers, body: JSON.stringify(snapshot.val() || {}) };
            }
            
            case 'set': {
                await ref.update(data);
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }
            
            case 'addPower': {
                const current = (await ref.child('powerBalance').once('value')).val() || 0;
                const newPower = current + data.amount;
                await ref.child('powerBalance').set(newPower);
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, newPower }) };
            }
            
            case 'addTon': {
                const current = (await ref.child('tonBalance').once('value')).val() || 0;
                await ref.child('tonBalance').set(current + data.amount);
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }
            
            case 'startMining': {
                await ref.update({
                    miningActive: true,
                    miningStartTime: Date.now(),
                    miningEndTime: Date.now() + (data.hours * 3600000)
                });
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }
            
            case 'stopMining': {
                const user = (await ref.once('value')).val();
                const elapsed = Math.min((Date.now() - user.miningStartTime) / 3600000, user.miningSessionHours || 1);
                const rate = ((user.powerBalance || 0) / 1000) * 0.0000833333;
                const reward = rate * elapsed;
                await ref.update({
                    miningActive: false,
                    pendingTonReward: reward
                });
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, reward }) };
            }
            
            case 'claim': {
                const pending = (await ref.child('pendingTonReward').once('value')).val() || 0;
                const tonBalance = (await ref.child('tonBalance').once('value')).val() || 0;
                await ref.child('tonBalance').set(tonBalance + pending);
                await ref.child('pendingTonReward').set(0);
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, amount: pending }) };
            }
            
            case 'withdraw': {
                const tonBalance = (await ref.child('tonBalance').once('value')).val() || 0;
                if (data.amount < 0.01) {
                    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Minimum 0.01 TON' }) };
                }
                if (data.amount > tonBalance) {
                    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Insufficient balance' }) };
                }
                await ref.child('tonBalance').set(tonBalance - data.amount);
                const withdrawal = {
                    id: Date.now(),
                    amount: data.amount,
                    wallet: data.wallet,
                    status: 'pending',
                    timestamp: Date.now()
                };
                await database.ref(`withdrawals/${userId}/${withdrawal.id}`).set(withdrawal);
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, withdrawal }) };
            }
            
            case 'getWithdrawals': {
                const snapshot = await database.ref(`withdrawals/${userId}`).once('value');
                const withdrawals = [];
                snapshot.forEach(w => withdrawals.push({ id: w.key, ...w.val() }));
                withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                return { statusCode: 200, headers, body: JSON.stringify(withdrawals) };
            }
            
            case 'watchAd': {
                const lastAd = (await ref.child('lastAdTime').once('value')).val();
                const now = Date.now();
                if (lastAd && now - lastAd < 28800000) {
                    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cooldown 8 hours' }) };
                }
                const power = (await ref.child('powerBalance').once('value')).val() || 0;
                await ref.child('powerBalance').set(power + 50);
                await ref.child('lastAdTime').set(now);
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }
            
            case 'applyPromo': {
                const promo = await database.ref(`promoCodes/${data.code}`).once('value');
                if (!promo.exists()) {
                    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid code' }) };
                }
                const used = await database.ref(`usedPromoCodes/${userId}/${data.code}`).once('value');
                if (used.exists()) {
                    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Code already used' }) };
                }
                await database.ref(`usedPromoCodes/${userId}/${data.code}`).set(true);
                const promoValue = promo.val();
                const user = (await ref.once('value')).val();
                if (promoValue.power) {
                    await ref.child('powerBalance').set((user?.powerBalance || 0) + promoValue.power);
                }
                if (promoValue.ton) {
                    await ref.child('tonBalance').set((user?.tonBalance || 0) + promoValue.ton);
                }
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }
            
            case 'getReferrals': {
                const user = (await ref.once('value')).val();
                return { statusCode: 200, headers, body: JSON.stringify({
                    totalReferrals: user?.totalReferrals || 0,
                    verifiedReferrals: user?.verifiedReferrals || 0,
                    referralPower: user?.referralPower || 0,
                    referralTon: user?.referralTon || 0
                }) };
            }
            
            default:
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
        }
        
    } catch(err) {
        console.error('Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
