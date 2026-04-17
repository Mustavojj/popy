import admin from 'firebase-admin';
import { verifyTelegramAuth } from './_verify.js';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
    });
}

const db = admin.database();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
        return res.status(401).json({ error: 'Missing init data' });
    }
    
    const botToken = process.env.BOT_TOKEN;
    const telegramUser = verifyTelegramAuth(initData, botToken);
    if (!telegramUser) {
        return res.status(403).json({ error: 'Invalid authentication' });
    }
    
    const { action, data } = req.body;
    const telegramId = telegramUser.id;
    
    try {
        const userRef = db.ref(`users/${telegramId}`);
        const snapshot = await userRef.once('value');
        let userData = snapshot.val();
        
        if (!userData) {
            userData = {
                id: telegramId,
                username: telegramUser.username ? `@${telegramUser.username}` : 'No Username',
                firstName: telegramUser.first_name || 'User',
                photoUrl: telegramUser.photo_url || '',
                balance: 0,
                star: 0,
                completedTasks: [],
                completedTasksCount: 0,
                totalTasksCompleted: 0,
                totalEarned: 0,
                totalWithdrawals: 0,
                totalWithdrawnAmount: 0,
                friends: {},
                friendsCount: 0,
                pendingProfits: 0,
                totalReferralEarnings: 0,
                totalAds: 0,
                totalPromoCodes: 0,
                currentQuestIndex: 0,
                completedQuests: {},
                createdAt: Date.now(),
                lastActive: Date.now(),
                status: 'free',
                deviceId: null
            };
            await userRef.set(userData);
        } else {
            await userRef.update({ lastActive: Date.now() });
        }
        
        switch (action) {
            case 'getUser':
                return res.status(200).json({ success: true, data: userData });
            
            case 'updateUser':
                const { updates } = data;
                await userRef.update(updates);
                return res.status(200).json({ success: true });
            
            case 'getTasks':
                const tasksSnapshot = await db.ref('config/tasks').once('value');
                const userTasksSnapshot = await db.ref('config/userTasks').once('value');
                const allTasks = [];
                
                if (tasksSnapshot.exists()) {
                    tasksSnapshot.forEach(child => {
                        const task = child.val();
                        if (task.status === 'active') {
                            allTasks.push({
                                id: child.key,
                                name: task.name,
                                picture: task.picture,
                                url: task.url,
                                category: task.category,
                                reward: task.reward || 0.001,
                                popReward: task.popReward || 1,
                                verification: task.verification || 'NO',
                                currentCompletions: task.currentCompletions || 0,
                                maxCompletions: task.maxCompletions || 999999,
                                status: task.status
                            });
                        }
                    });
                }
                
                if (userTasksSnapshot.exists()) {
                    userTasksSnapshot.forEach(ownerSnapshot => {
                        ownerSnapshot.forEach(taskSnapshot => {
                            const task = taskSnapshot.val();
                            if (task.status === 'active' && task.category === 'social') {
                                allTasks.push({
                                    id: taskSnapshot.key,
                                    name: task.name,
                                    picture: task.picture,
                                    url: task.url,
                                    category: 'social',
                                    reward: 0.001,
                                    popReward: 1,
                                    verification: task.verification || 'NO',
                                    currentCompletions: task.currentCompletions || 0,
                                    maxCompletions: task.maxCompletions || 100,
                                    status: task.status,
                                    owner: ownerSnapshot.key
                                });
                            }
                        });
                    });
                }
                
                return res.status(200).json({ success: true, data: allTasks });
            
            case 'completeTask':
                const { taskId, reward, starReward } = data;
                const completedTasks = userData.completedTasks || [];
                
                if (completedTasks.includes(taskId)) {
                    return res.status(200).json({ success: false, error: 'Task already completed' });
                }
                
                completedTasks.push(taskId);
                const newBalance = (userData.balance || 0) + reward;
                const newStar = (userData.star || 0) + starReward;
                const newTotalEarned = (userData.totalEarned || 0) + reward;
                const newTotalTasks = (userData.totalTasksCompleted || 0) + 1;
                const newCompletedCount = (userData.completedTasksCount || 0) + 1;
                
                await userRef.update({
                    balance: newBalance,
                    star: newStar,
                    totalEarned: newTotalEarned,
                    totalTasksCompleted: newTotalTasks,
                    completedTasksCount: newCompletedCount,
                    completedTasks: completedTasks,
                    lastActive: Date.now()
                });
                
                const taskRef = db.ref(`config/tasks/${taskId}/currentCompletions`);
                const taskCurrent = await taskRef.once('value');
                await taskRef.set((taskCurrent.val() || 0) + 1);
                
                const referrerId = userData.referredBy;
                if (referrerId && referrerId !== telegramId) {
                    const referrerRef = db.ref(`users/${referrerId}`);
                    const referrerSnap = await referrerRef.once('value');
                    if (referrerSnap.exists()) {
                        const referrer = referrerSnap.val();
                        const profitAmount = reward * 0.2;
                        await referrerRef.update({
                            pendingProfits: (referrer.pendingProfits || 0) + profitAmount,
                            totalReferralEarnings: (referrer.totalReferralEarnings || 0) + profitAmount
                        });
                    }
                }
                
                return res.status(200).json({
                    success: true,
                    balance: newBalance,
                    star: newStar,
                    totalEarned: newTotalEarned,
                    completedTasks: completedTasks
                });
            
            case 'addReferral':
                const { referrerId } = data;
                if (referrerId && referrerId !== telegramId) {
                    const referrerRef = db.ref(`users/${referrerId}`);
                    const referrerSnap = await referrerRef.once('value');
                    if (referrerSnap.exists()) {
                        const referrer = referrerSnap.val();
                        const friends = referrer.friends || {};
                        if (!friends[telegramId]) {
                            friends[telegramId] = {
                                userId: telegramId,
                                username: telegramUser.username ? `@${telegramUser.username}` : 'No Username',
                                firstName: telegramUser.first_name || 'User',
                                photoUrl: telegramUser.photo_url || '',
                                joinedAt: Date.now()
                            };
                            const newFriendsCount = (referrer.friendsCount || 0) + 1;
                            await referrerRef.update({
                                friends: friends,
                                friendsCount: newFriendsCount
                            });
                            
                            const currentQuestIndex = referrer.currentQuestIndex || 0;
                            const quests = [
                                { id: 'quest_1', required: 1 },
                                { id: 'quest_2', required: 3 },
                                { id: 'quest_3', required: 5 },
                                { id: 'quest_4', required: 10 },
                                { id: 'quest_5', required: 25 },
                                { id: 'quest_6', required: 50 },
                                { id: 'quest_7', required: 100 },
                                { id: 'quest_8', required: 250 },
                                { id: 'quest_9', required: 500 },
                                { id: 'quest_10', required: 1000 }
                            ];
                            let newQuestIndex = currentQuestIndex;
                            for (let i = currentQuestIndex; i < quests.length; i++) {
                                if (newFriendsCount >= quests[i].required) {
                                    newQuestIndex = i + 1;
                                } else {
                                    break;
                                }
                            }
                            if (newQuestIndex > currentQuestIndex) {
                                await referrerRef.update({ currentQuestIndex: newQuestIndex });
                            }
                        }
                    }
                }
                return res.status(200).json({ success: true });
            
            case 'getReferrals':
                const friendsRef = db.ref(`friends/${telegramId}`);
                const friendsSnap = await friendsRef.once('value');
                const friendsList = [];
                if (friendsSnap.exists()) {
                    friendsSnap.forEach(child => {
                        friendsList.push({ id: child.key, ...child.val() });
                    });
                }
                return res.status(200).json({ success: true, data: friendsList });
            
            case 'getWithdrawals':
                const withdrawals = [];
                const pendingSnap = await db.ref('withdrawals/pending').once('value');
                const completedSnap = await db.ref('withdrawals/completed').once('value');
                const rejectedSnap = await db.ref('withdrawals/rejected').once('value');
                
                if (pendingSnap.exists()) {
                    pendingSnap.forEach(child => {
                        const val = child.val();
                        if (val.userId === telegramId) {
                            withdrawals.push({ id: child.key, ...val, status: 'pending' });
                        }
                    });
                }
                if (completedSnap.exists()) {
                    completedSnap.forEach(child => {
                        const val = child.val();
                        if (val.userId === telegramId) {
                            withdrawals.push({ id: child.key, ...val, status: 'completed' });
                        }
                    });
                }
                if (rejectedSnap.exists()) {
                    rejectedSnap.forEach(child => {
                        const val = child.val();
                        if (val.userId === telegramId) {
                            withdrawals.push({ id: child.key, ...val, status: 'rejected' });
                        }
                    });
                }
                withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                return res.status(200).json({ success: true, data: withdrawals });
            
            case 'createWithdrawal':
                const { walletAddress, amount, minimumWithdraw, requiredTasks, requiredReferrals, requiredStar } = data;
                
                if ((userData.balance || 0) < amount) {
                    return res.status(200).json({ success: false, error: 'Insufficient balance' });
                }
                if (amount < minimumWithdraw) {
                    return res.status(200).json({ success: false, error: 'Amount too low' });
                }
                if ((userData.totalTasksCompleted || 0) < requiredTasks) {
                    return res.status(200).json({ success: false, error: 'Complete required tasks first' });
                }
                if ((userData.friendsCount || 0) < requiredReferrals) {
                    return res.status(200).json({ success: false, error: 'Invite required friends first' });
                }
                if ((userData.star || 0) < requiredStar) {
                    return res.status(200).json({ success: false, error: 'Earn required STAR first' });
                }
                
                const newBalanceAfter = (userData.balance || 0) - amount;
                await userRef.update({
                    balance: newBalanceAfter,
                    totalWithdrawnAmount: (userData.totalWithdrawnAmount || 0) + amount,
                    totalWithdrawals: (userData.totalWithdrawals || 0) + 1,
                    lastWithdrawalDate: Date.now()
                });
                
                const withdrawalId = `wd_${Date.now()}_${telegramId}`;
                await db.ref(`withdrawals/pending/${withdrawalId}`).set({
                    id: withdrawalId,
                    userId: telegramId,
                    walletAddress: walletAddress,
                    amount: amount,
                    timestamp: Date.now(),
                    status: 'pending',
                    userName: userData.firstName,
                    telegramId: telegramId
                });
                
                return res.status(200).json({ success: true, newBalance: newBalanceAfter });
            
            case 'getDeposits':
                const depositsSnap = await db.ref(`deposits/${telegramId}`).once('value');
                const deposits = [];
                if (depositsSnap.exists()) {
                    depositsSnap.forEach(child => {
                        deposits.push({ id: child.key, ...child.val() });
                    });
                    deposits.sort((a, b) => b.timestamp - a.timestamp);
                }
                return res.status(200).json({ success: true, data: deposits });
            
            case 'getAppStats':
                const statsSnap = await db.ref('appStats').once('value');
                const stats = statsSnap.val() || { totalUsers: 0, totalWithdrawals: 0, totalPayments: 0 };
                return res.status(200).json({ success: true, data: stats });
            
            case 'updateAppStats':
                const { stat, value } = data;
                const statRef = db.ref(`appStats/${stat}`);
                const currentStat = (await statRef.once('value')).val() || 0;
                await statRef.set(currentStat + value);
                return res.status(200).json({ success: true });
            
            case 'usePromoCode':
                const { code } = data;
                const promosSnap = await db.ref('config/promoCodes').once('value');
                let promoData = null;
                let promoId = null;
                
                if (promosSnap.exists()) {
                    for (const id in promosSnap.val()) {
                        if (promosSnap.val()[id].code === code.toUpperCase()) {
                            promoData = promosSnap.val()[id];
                            promoId = id;
                            break;
                        }
                    }
                }
                
                if (!promoData) {
                    return res.status(200).json({ success: false, error: 'Invalid promo code' });
                }
                
                const usedRef = db.ref(`usedPromoCodes/${telegramId}/${promoId}`);
                const usedSnap = await usedRef.once('value');
                if (usedSnap.exists()) {
                    return res.status(200).json({ success: false, error: 'Code already used' });
                }
                
                const rewardAmount = promoData.reward || 0.01;
                const rewardType = promoData.rewardType || 'ton';
                const promoUpdates = {};
                
                if (rewardType === 'ton') {
                    promoUpdates.balance = (userData.balance || 0) + rewardAmount;
                    promoUpdates.totalEarned = (userData.totalEarned || 0) + rewardAmount;
                } else {
                    promoUpdates.star = (userData.star || 0) + rewardAmount;
                }
                promoUpdates.totalPromoCodes = (userData.totalPromoCodes || 0) + 1;
                
                await userRef.update(promoUpdates);
                await usedRef.set({
                    code: code,
                    reward: rewardAmount,
                    rewardType: rewardType,
                    claimedAt: Date.now()
                });
                
                const promoUsedRef = db.ref(`config/promoCodes/${promoId}/usedCount`);
                const usedCount = (await promoUsedRef.once('value')).val() || 0;
                await promoUsedRef.set(usedCount + 1);
                
                return res.status(200).json({
                    success: true,
                    rewardType: rewardType,
                    rewardAmount: rewardAmount,
                    newBalance: promoUpdates.balance || userData.balance,
                    newStar: promoUpdates.star || userData.star
                });
            
            case 'exchangeTonToStar':
                const { tonAmount, popPerTon } = data;
                
                if ((userData.balance || 0) < tonAmount) {
                    return res.status(200).json({ success: false, error: 'Insufficient TON balance' });
                }
                
                const starAmount = Math.floor(tonAmount * popPerTon);
                const exchangeNewBalance = (userData.balance || 0) - tonAmount;
                const exchangeNewStar = (userData.star || 0) + starAmount;
                
                await userRef.update({
                    balance: exchangeNewBalance,
                    star: exchangeNewStar
                });
                
                return res.status(200).json({
                    success: true,
                    newBalance: exchangeNewBalance,
                    newStar: exchangeNewStar,
                    starAmount: starAmount
                });
            
            case 'watchAd':
                const lastAdTime = userData.lastAdTime || 0;
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                
                if (now - lastAdTime < oneHour) {
                    const remainingSeconds = Math.ceil((oneHour - (now - lastAdTime)) / 1000);
                    return res.status(200).json({ success: false, error: 'Cooldown', remainingSeconds: remainingSeconds });
                }
                
                const adTonReward = 0.001;
                const adStarReward = 1;
                const adNewBalance = (userData.balance || 0) + adTonReward;
                const adNewStar = (userData.star || 0) + adStarReward;
                const adNewTotalEarned = (userData.totalEarned || 0) + adTonReward;
                const adNewTotalAds = (userData.totalAds || 0) + 1;
                
                await userRef.update({
                    balance: adNewBalance,
                    star: adNewStar,
                    totalEarned: adNewTotalEarned,
                    totalAds: adNewTotalAds,
                    lastAdTime: now
                });
                
                return res.status(200).json({
                    success: true,
                    balance: adNewBalance,
                    star: adNewStar,
                    tonReward: adTonReward,
                    starReward: adStarReward
                });
            
            case 'watchAdV2':
                const lastAdV2Time = userData.lastAdV2Time || 0;
                const nowV2 = Date.now();
                const oneHourV2 = 60 * 60 * 1000;
                
                if (nowV2 - lastAdV2Time < oneHourV2) {
                    const remainingSecondsV2 = Math.ceil((oneHourV2 - (nowV2 - lastAdV2Time)) / 1000);
                    return res.status(200).json({ success: false, error: 'Cooldown', remainingSeconds: remainingSecondsV2 });
                }
                
                const adV2TonReward = 0.002;
                const adV2StarReward = 2;
                const adV2NewBalance = (userData.balance || 0) + adV2TonReward;
                const adV2NewStar = (userData.star || 0) + adV2StarReward;
                const adV2NewTotalEarned = (userData.totalEarned || 0) + adV2TonReward;
                const adV2NewTotalAds = (userData.totalAds || 0) + 1;
                
                await userRef.update({
                    balance: adV2NewBalance,
                    star: adV2NewStar,
                    totalEarned: adV2NewTotalEarned,
                    totalAds: adV2NewTotalAds,
                    lastAdV2Time: nowV2
                });
                
                return res.status(200).json({
                    success: true,
                    balance: adV2NewBalance,
                    star: adV2NewStar,
                    tonReward: adV2TonReward,
                    starReward: adV2StarReward
                });
            
            case 'claimPendingProfits':
                const pendingAmount = userData.pendingProfits || 0;
                if (pendingAmount <= 0) {
                    return res.status(200).json({ success: false, error: 'No pending profits' });
                }
                
                const claimNewBalance = (userData.balance || 0) + pendingAmount;
                await userRef.update({
                    balance: claimNewBalance,
                    pendingProfits: 0
                });
                
                return res.status(200).json({
                    success: true,
                    newBalance: claimNewBalance,
                    claimedAmount: pendingAmount
                });
            
            case 'getQuests':
                return res.status(200).json({
                    success: true,
                    data: {
                        currentQuestIndex: userData.currentQuestIndex || 0,
                        completedQuests: userData.completedQuests || {}
                    }
                });
            
            case 'claimQuest':
                const { questId, rewardTon, rewardStar, questIndex } = data;
                const completedQuestsObj = userData.completedQuests || {};
                
                if (completedQuestsObj[questId]) {
                    return res.status(200).json({ success: false, error: 'Quest already claimed' });
                }
                
                completedQuestsObj[questId] = true;
                const questNewBalance = (userData.balance || 0) + rewardTon;
                const questNewStar = (userData.star || 0) + rewardStar;
                const newQuestIndex = questIndex + 1;
                
                await userRef.update({
                    balance: questNewBalance,
                    star: questNewStar,
                    completedQuests: completedQuestsObj,
                    currentQuestIndex: newQuestIndex
                });
                
                return res.status(200).json({
                    success: true,
                    newBalance: questNewBalance,
                    newStar: questNewStar,
                    newQuestIndex: newQuestIndex
                });
            
            case 'getUserCreatedTasks':
                const userTasksRef = db.ref(`config/userTasks/${telegramId}`);
                const userTasksSnap = await userTasksRef.once('value');
                const userTasks = [];
                if (userTasksSnap.exists()) {
                    userTasksSnap.forEach(child => {
                        userTasks.push({ id: child.key, ...child.val() });
                    });
                }
                return res.status(200).json({ success: true, data: userTasks });
            
            case 'createTask':
                const { taskName, taskLink, taskType, verification, completions, price } = data;
                
                if ((userData.star || 0) < price) {
                    return res.status(200).json({ success: false, error: 'Insufficient STAR balance' });
                }
                
                const newTaskStar = (userData.star || 0) - price;
                const taskData = {
                    name: taskName,
                    url: taskLink,
                    category: 'social',
                    type: taskType === 'telegram' ? 'channel' : 'website',
                    verification: verification,
                    maxCompletions: completions,
                    currentCompletions: 0,
                    status: 'active',
                    reward: 0.001,
                    popReward: 1,
                    owner: telegramId,
                    createdAt: Date.now(),
                    picture: ''
                };
                
                await userRef.update({ star: newTaskStar });
                const newTaskRef = await db.ref(`config/userTasks/${telegramId}`).push(taskData);
                
                return res.status(200).json({
                    success: true,
                    newStar: newTaskStar,
                    taskId: newTaskRef.key
                });
            
            case 'deleteTask':
                const { taskId: deleteTaskId } = data;
                const taskToDeleteRef = db.ref(`config/userTasks/${telegramId}/${deleteTaskId}`);
                const taskToDelete = await taskToDeleteRef.once('value');
                
                if (!taskToDelete.exists()) {
                    return res.status(200).json({ success: false, error: 'Task not found' });
                }
                
                const taskValue = taskToDelete.val();
                const currentCompletionsValue = taskValue.currentCompletions || 0;
                const pricePer100 = 100;
                const refundAmount = Math.ceil(currentCompletionsValue / 100) * pricePer100 * 0.5;
                const refundNewStar = (userData.star || 0) + refundAmount;
                
                await taskToDeleteRef.remove();
                await userRef.update({ star: refundNewStar });
                
                return res.status(200).json({
                    success: true,
                    newStar: refundNewStar,
                    refundAmount: refundAmount
                });
            
            case 'addCompletions':
                const { taskId: addTaskId, additionalCompletions, pricePer100: pricePer100Value } = data;
                const addTaskRef = db.ref(`config/userTasks/${telegramId}/${addTaskId}`);
                const addTaskSnap = await addTaskRef.once('value');
                
                if (!addTaskSnap.exists()) {
                    return res.status(200).json({ success: false, error: 'Task not found' });
                }
                
                const addTaskData = addTaskSnap.val();
                const addPrice = Math.ceil(additionalCompletions / 100) * pricePer100Value;
                
                if ((userData.star || 0) < addPrice) {
                    return res.status(200).json({ success: false, error: 'Insufficient STAR balance' });
                }
                
                const addNewMaxCompletions = (addTaskData.maxCompletions || 100) + additionalCompletions;
                const addNewStar = (userData.star || 0) - addPrice;
                
                await addTaskRef.update({ maxCompletions: addNewMaxCompletions });
                await userRef.update({ star: addNewStar });
                
                return res.status(200).json({
                    success: true,
                    newStar: addNewStar,
                    newMaxCompletions: addNewMaxCompletions
                });
            
            case 'getMaxCompletionsFromStar':
                const { starAmount, pricePer100: pricePer100Max } = data;
                const maxPossibleCompletions = Math.floor((starAmount / pricePer100Max) * 100);
                return res.status(200).json({
                    success: true,
                    maxCompletions: maxPossibleCompletions
                });
            
            case 'getAdditionalRewards':
                const rewardsRef = db.ref('config/more');
                const rewardsSnap = await rewardsRef.once('value');
                const rewards = [];
                if (rewardsSnap.exists()) {
                    rewardsSnap.forEach(child => {
                        const reward = child.val();
                        if (reward.status === 'active') {
                            rewards.push({
                                id: child.key,
                                name: reward.name || 'Reward',
                                description: reward.description || '',
                                rewardType: reward.rewardType || 'ton',
                                rewardAmount: reward.rewardAmount || 0,
                                starAmount: reward.popAmount || 0,
                                icon: reward.icon || 'fa-gift',
                                action: reward.action || 'none',
                                actionUrl: reward.actionUrl || ''
                            });
                        }
                    });
                }
                return res.status(200).json({ success: true, data: rewards });
            
            case 'claimAdditionalReward':
                const { rewardId } = data;
                const rewardRef = db.ref(`config/more/${rewardId}`);
                const rewardSnap = await rewardRef.once('value');
                
                if (!rewardSnap.exists()) {
                    return res.status(200).json({ success: false, error: 'Reward not found' });
                }
                
                const rewardData = rewardSnap.val();
                const rewardTon = rewardData.rewardAmount || 0;
                const rewardStar = rewardData.popAmount || 0;
                
                const claimedRewardsRef = db.ref(`claimedRewards/${telegramId}/${rewardId}`);
                const alreadyClaimed = await claimedRewardsRef.once('value');
                
                if (alreadyClaimed.exists()) {
                    return res.status(200).json({ success: false, error: 'Reward already claimed' });
                }
                
                const claimNewBalance = (userData.balance || 0) + rewardTon;
                const claimNewStar = (userData.star || 0) + rewardStar;
                
                await userRef.update({
                    balance: claimNewBalance,
                    star: claimNewStar,
                    totalEarned: (userData.totalEarned || 0) + rewardTon
                });
                await claimedRewardsRef.set({ claimedAt: Date.now() });
                
                return res.status(200).json({
                    success: true,
                    newBalance: claimNewBalance,
                    newStar: claimNewStar,
                    tonReward: rewardTon,
                    starReward: rewardStar
                });
            
            case 'registerDevice':
                const { deviceId, userAgent, screenResolution, timezone, language } = data;
                const deviceRef = db.ref(`devices/${deviceId}`);
                const deviceSnap = await deviceRef.once('value');
                
                if (deviceSnap.exists()) {
                    const deviceData = deviceSnap.val();
                    if (deviceData.ownerId && deviceData.ownerId !== telegramId) {
                        return res.status(200).json({ success: false, allowed: false, error: 'Device already registered with another account' });
                    }
                    await deviceRef.update({
                        lastSeen: Date.now(),
                        lastUserId: telegramId
                    });
                } else {
                    await deviceRef.set({
                        ownerId: telegramId,
                        firstSeen: Date.now(),
                        lastSeen: Date.now(),
                        userAgent: userAgent,
                        screenResolution: screenResolution,
                        timezone: timezone,
                        language: language
                    });
                }
                
                await userRef.update({ deviceId: deviceId });
                
                return res.status(200).json({ success: true, allowed: true });
            
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
