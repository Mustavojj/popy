let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getDatabase } = await import('firebase-admin/database');
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    const app = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    cachedDb = getDatabase(app);
    return cachedDb;
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const db = await connectToDatabase();
        const { action, userId, data } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'No userId' });
        }
        
        const ref = db.ref(`users/${userId}`);
        
        switch(action) {
            case 'get':
                const snapshot = await ref.once('value');
                return res.json(snapshot.val() || {});
                
            case 'set':
                await ref.update(data);
                return res.json({ success: true });
                
            case 'addPower':
                const currentPower = (await ref.child('powerBalance').once('value')).val() || 0;
                await ref.child('powerBalance').set(currentPower + data.amount);
                return res.json({ success: true, newPower: currentPower + data.amount });
                
            case 'addTon':
                const currentTon = (await ref.child('tonBalance').once('value')).val() || 0;
                await ref.child('tonBalance').set(currentTon + data.amount);
                return res.json({ success: true });
                
            case 'startMining':
                await ref.update({
                    miningActive: true,
                    miningStartTime: Date.now(),
                    miningEndTime: Date.now() + (data.hours * 3600000)
                });
                return res.json({ success: true });
                
            case 'stopMining':
                const userData = (await ref.once('value')).val();
                const elapsed = Math.min((Date.now() - userData.miningStartTime) / 3600000, userData.miningSessionHours || 1);
                const rate = ((userData.powerBalance || 0) / 1000) * 0.0000833333;
                const reward = rate * elapsed;
                await ref.update({
                    miningActive: false,
                    pendingTonReward: reward
                });
                return res.json({ success: true, reward });
                
            case 'claim':
                const pending = (await ref.child('pendingTonReward').once('value')).val() || 0;
                const tonBalance = (await ref.child('tonBalance').once('value')).val() || 0;
                await ref.child('tonBalance').set(tonBalance + pending);
                await ref.child('pendingTonReward').set(0);
                return res.json({ success: true, amount: pending });
                
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch(error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
