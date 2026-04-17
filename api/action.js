import { verifyTelegramAuth } from './_verify.js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, get, set, update, push, remove } from 'firebase/database';

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const initData = req.headers['x-telegram-init-data'];
    const telegramUser = verifyTelegramAuth(initData, process.env.BOT_TOKEN);
    
    if (!telegramUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { action, data } = req.body;
    const telegramId = telegramUser.id;
    
    try {
        const userCredential = await signInAnonymously(auth);
        const firebaseUid = userCredential.user.uid;
        
        const userRef = ref(db, `users/${telegramId}`);
        const snapshot = await get(userRef);
        
        let userData;
        if (!snapshot.exists()) {
            userData = {
                id: telegramId,
                firebaseUid: firebaseUid,
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
                referrals: 0,
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
            await set(userRef, userData);
        } else {
            userData = snapshot.val();
            if (userData.firebaseUid !== firebaseUid) {
                await update(userRef, { firebaseUid: firebaseUid, lastActive: Date.now() });
                userData.firebaseUid = firebaseUid;
            }
        }
        
        switch (action) {
            case 'getUser':
                return res.status(200).json({ success: true, data: userData });
            
            case 'updateUser':
                const { updates } = data;
                await update(userRef, updates);
                return res.status(200).json({ success: true });
            
            case 'getTasks':
                const tasksSnapshot = await get(ref(db, 'config/tasks'));
                const userTasksSnapshot = await get(ref(db, 'config/userTasks'));
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
                                maxCompletions: task.maxCompletions || 999999
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
                
                await update(userRef, {
                    balance: newBalance,
                    star: newStar,
                    totalEarned: newTotalEarned,
                    totalTasksCompleted: newTotalTasks,
                    completedTasksCount: newCompletedCount,
                    completedTasks: completedTasks,
                    lastActive: Date.now()
                });
                
                const taskRef = ref(db, `config/tasks/${taskId}/currentCompletions`);
                const taskSnapshot = await get(taskRef);
                const currentCompletions = taskSnapshot.val() || 0;
                await set(taskRef, currentCompletions + 1);
                
                const referrerId = userData.referredBy;
                if (referrerId && referrerId !== telegramId) {
                    const referrerRef = ref(db, `users/${referrerId}`);
                    const referrerSnapshot = await get(referrerRef);
                    if (referrerSnapshot.exists()) {
                        const referrer = referrerSnapshot.val();
                        const profitAmount = reward * 0.2;
                        const newPending = (referrer.pendingProfits || 0) + profitAmount;
                        const newTotalEarnings = (referrer.totalReferralEarnings || 0) + profitAmount;
                        await update(referrerRef, {
                            pendingProfits: newPending,
                            totalReferralEarnings: newTotalEarnings
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
                    const referrerRef = ref(db, `users/${referrerId}`);
                    const referrerSnapshot = await get(referrerRef);
                    if (referrerSnapshot.exists()) {
                        const referrer = referrerSnapshot.val();
                        const friends = referrer.friends || {};
                        if (!friends[telegramId]) {
                            friends[telegramId] = {
                                userId: telegramId,
                                username: telegramUser.username ? `@${telegramUser.username}` : 'No Username',
                                firstName: telegramUser.first_name || 'User',
                                photoUrl: telegramUser.photo_url || '',
                                joinedAt: Date.now()
                            };
                            await update(referrerRef, {
                                friends: friends,
                                friendsCount: (referrer.friendsCount || 0) + 1
                            });
                            
                            const currentQuestIndex = referrer.currentQuestIndex || 0;
                            const quests = [
                                { id: 'quest_1', required: 1, rewardTon: 0.001, rewardStar: 1 },
                                { id: 'quest_2', required: 3, rewardTon: 0.003, rewardStar: 2 },
                                { id: 'quest_3', required: 5, rewardTon: 0.005, rewardStar: 3 },
                                { id: 'quest_4', required: 10, rewardTon: 0.01, rewardStar: 4 },
                                { id: 'quest_5', required: 25, rewardTon: 0.02, rewardStar: 5 },
                                { id: 'quest_6', required: 50, rewardTon: 0.03, rewardStar: 6 },
                                { id: 'quest_7', required: 100, rewardTon: 0.04, rewardStar: 7 },
                                { id: 'quest_8', required: 250, rewardTon: 0.05, rewardStar: 8 },
                                { id: 'quest_9', required: 500, rewardTon: 0.06, rewardStar: 9 },
                                { id: 'quest_10', required: 1000, rewardTon: 0.07, rewardStar: 10 }
                            ];
                            
                            const newFriendsCount = (referrer.friendsCount || 0) + 1;
                            let newQuestIndex = currentQuestIndex;
                            
                            for (let i = currentQuestIndex; i < quests.length; i++) {
                                if (newFriendsCount >= quests[i].required) {
                                    newQuestIndex = i + 1;
                                } else {
                                    break;
                                }
                            }
                            
                            if (newQuestIndex > currentQuestIndex) {
                                await update(referrerRef, { currentQuestIndex: newQuestIndex });
                            }
                        }
                    }
                }
                return res.status(200).json({ success: true });
            
            case 'getReferrals':
                const friendsRef = ref(db, `friends/${telegramId}`);
                const friendsSnapshot = await get(friendsRef);
                const friendsList = [];
                if (friendsSnapshot.exists()) {
                    friendsSnapshot.forEach(child => {
                        friendsList.push({ id: child.key, ...child.val() });
                    });
                }
                return res.status(200).json({ success: true, data: friendsList });
            
            case 'getWithdrawals':
                const withdrawals = [];
                const pendingSnap = await get(ref(db, 'withdrawals/pending'));
                const completedSnap = await get(ref(db, 'withdrawals/completed'));
                const rejectedSnap = await get(ref(db, 'withdrawals/rejected'));
                
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
                const newTotalWithdrawn = (userData.totalWithdrawnAmount || 0) + amount;
                const newTotalWithdrawals = (userData.totalWithdrawals || 0) + 1;
                
                await update(userRef, {
                    balance: newBalanceAfter,
                    totalWithdrawnAmount: newTotalWithdrawn,
                    totalWithdrawals: newTotalWithdrawals,
                    lastWithdrawalDate: Date.now()
                });
                
                const withdrawalId = `wd_${Date.now()}_${telegramId}`;
                await set(ref(db, `withdrawals/pending/${withdrawalId}`), {
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
                const depositsRef = ref(db, `deposits/${telegramId}`);
                const depositsSnapshot = await get(depositsRef);
                const deposits = [];
                if (depositsSnapshot.exists()) {
                    depositsSnapshot.forEach(child => {
                        deposits.push({ id: child.key, ...child.val() });
                    });
                    deposits.sort((a, b) => b.timestamp - a.timestamp);
                }
                return res.status(200).json({ success: true, data: deposits });
            
            case 'getAppStats':
                const statsSnapshot = await get(ref(db, 'appStats'));
                const stats = statsSnapshot.val() || { totalUsers: 0, totalWithdrawals: 0, totalPayments: 0 };
                return res.status(200).json({ success: true, data: stats });
            
            case 'updateAppStats':
                const { stat, value } = data;
                const statRef = ref(db, `appStats/${stat}`);
                const currentStat = (await get(statRef)).val() || 0;
                await set(statRef, currentStat + value);
                return res.status(200).json({ success: true });
            
            case 'usePromoCode':
                const { code } = data;
                let promoData = null;
                let promoId = null;
                const promosSnapshot = await get(ref(db, 'config/promoCodes'));
                
                if (promosSnapshot.exists()) {
                    promosSnapshot.forEach(child => {
                        if (child.val().code === code.toUpperCase()) {
                            promoData = child.val();
                            promoId = child.key;
                        }
                    });
                }
                
                if (!promoData) {
                    return res.status(200).json({ success: false, error: 'Invalid promo code' });
                }
                
                const usedRef = ref(db, `usedPromoCodes/${telegramId}/${promoId}`);
                const usedSnapshot = await get(usedRef);
                if (usedSnapshot.exists()) {
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
                
                await update(userRef, promoUpdates);
                await set(usedRef, {
                    code: code,
                    reward: rewardAmount,
                    rewardType: rewardType,
                    claimedAt: Date.now()
                });
                
                const promoUsedRef = ref(db, `config/promoCodes/${promoId}/usedCount`);
                const usedCount = (await get(promoUsedRef)).val() || 0;
                await set(promoUsedRef, usedCount + 1);
                
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
                
                await update(userRef, {
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
                
                await update(userRef, {
                    balance: adNewBalance,
                    star: adNewStar,
                    totalEarned: adNewTotalEarned,
                    totalAds: adNewTotalAds,
                    lastAdTime: now
                });
                
                const adReferrerId = userData.referredBy;
                if (adReferrerId && adReferrerId !== telegramId) {
                    const adReferrerRef = ref(db, `users/${adReferrerId}`);
                    const adReferrerSnapshot = await get(adReferrerRef);
                    if (adReferrerSnapshot.exists()) {
                        const adReferrer = adReferrerSnapshot.val();
                        const adProfitAmount = adTonReward * 0.2;
                        await update(adReferrerRef, {
                            pendingProfits: (adReferrer.pendingProfits || 0) + adProfitAmount,
                            totalReferralEarnings: (adReferrer.totalReferralEarnings || 0) + adProfitAmount
                        });
                    }
                }
                
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
                
                await update(userRef, {
                    balance: adV2NewBalance,
                    star: adV2NewStar,
                    totalEarned: adV2NewTotalEarned,
                    totalAds: adV2NewTotalAds,
                    lastAdV2Time: nowV2
                });
                
                const adV2ReferrerId = userData.referredBy;
                if (adV2ReferrerId && adV2ReferrerId !== telegramId) {
                    const adV2ReferrerRef = ref(db, `users/${adV2ReferrerId}`);
                    const adV2ReferrerSnapshot = await get(adV2ReferrerRef);
                    if (adV2ReferrerSnapshot.exists()) {
                        const adV2Referrer = adV2ReferrerSnapshot.val();
                        const adV2ProfitAmount = adV2TonReward * 0.2;
                        await update(adV2ReferrerRef, {
                            pendingProfits: (adV2Referrer.pendingProfits || 0) + adV2ProfitAmount,
                            totalReferralEarnings: (adV2Referrer.totalReferralEarnings || 0) + adV2ProfitAmount
                        });
                    }
                }
                
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
                await update(userRef, {
                    balance: claimNewBalance,
                    pendingProfits: 0
                });
                
                return res.status(200).json({
                    success: true,
                    newBalance: claimNewBalance,
                    claimedAmount: pendingAmount
                });
            
            case 'getQuests':
                const questsData = {
                    currentQuestIndex: userData.currentQuestIndex || 0,
                    completedQuests: userData.completedQuests || {}
                };
                return res.status(200).json({ success: true, data: questsData });
            
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
                
                await update(userRef, {
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
                const userTasksRef = ref(db, `config/userTasks/${telegramId}`);
                const userTasksSnapshot = await get(userTasksRef);
                const userTasks = [];
                if (userTasksSnapshot.exists()) {
                    userTasksSnapshot.forEach(child => {
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
                
                await update(userRef, { star: newTaskStar });
                const newTaskRef = push(ref(db, `config/userTasks/${telegramId}`));
                await set(newTaskRef, taskData);
                
                return res.status(200).json({
                    success: true,
                    newStar: newTaskStar,
                    taskId: newTaskRef.key
                });
            
            case 'deleteTask':
                const { taskId: deleteTaskId } = data;
                const taskToDeleteRef = ref(db, `config/userTasks/${telegramId}/${deleteTaskId}`);
                const taskToDelete = await get(taskToDeleteRef);
                
                if (!taskToDelete.exists()) {
                    return res.status(200).json({ success: false, error: 'Task not found' });
                }
                
                const taskValue = taskToDelete.val();
                const currentCompletionsValue = taskValue.currentCompletions || 0;
                const pricePer100 = 100;
                const refundAmount = Math.ceil(currentCompletionsValue / 100) * pricePer100 * 0.5;
                
                await remove(taskToDeleteRef);
                const refundNewStar = (userData.star || 0) + refundAmount;
                await update(userRef, { star: refundNewStar });
                
                return res.status(200).json({
                    success: true,
                    newStar: refundNewStar,
                    refundAmount: refundAmount
                });
            
            case 'addCompletions':
                const { taskId: addTaskId, additionalCompletions, pricePer100: pricePer100Value } = data;
                const addTaskRef = ref(db, `config/userTasks/${telegramId}/${addTaskId}`);
                const addTaskSnapshot = await get(addTaskRef);
                
                if (!addTaskSnapshot.exists()) {
                    return res.status(200).json({ success: false, error: 'Task not found' });
                }
                
                const addTaskData = addTaskSnapshot.val();
                const addPrice = Math.ceil(additionalCompletions / 100) * pricePer100Value;
                
                if ((userData.star || 0) < addPrice) {
                    return res.status(200).json({ success: false, error: 'Insufficient STAR balance' });
                }
                
                const addNewMaxCompletions = (addTaskData.maxCompletions || 100) + additionalCompletions;
                const addNewStar = (userData.star || 0) - addPrice;
                
                await update(addTaskRef, { maxCompletions: addNewMaxCompletions });
                await update(userRef, { star: addNewStar });
                
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
                const rewardsRef = ref(db, 'config/more');
                const rewardsSnapshot = await get(rewardsRef);
                const rewards = [];
                if (rewardsSnapshot.exists()) {
                    rewardsSnapshot.forEach(child => {
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
                const rewardRef = ref(db, `config/more/${rewardId}`);
                const rewardSnapshot = await get(rewardRef);
                
                if (!rewardSnapshot.exists()) {
                    return res.status(200).json({ success: false, error: 'Reward not found' });
                }
                
                const rewardData = rewardSnapshot.val();
                const rewardTon = rewardData.rewardAmount || 0;
                const rewardStar = rewardData.popAmount || 0;
                
                const claimedRewardsRef = ref(db, `claimedRewards/${telegramId}/${rewardId}`);
                const alreadyClaimed = await get(claimedRewardsRef);
                
                if (alreadyClaimed.exists()) {
                    return res.status(200).json({ success: false, error: 'Reward already claimed' });
                }
                
                const claimNewBalance = (userData.balance || 0) + rewardTon;
                const claimNewStar = (userData.star || 0) + rewardStar;
                
                await update(userRef, {
                    balance: claimNewBalance,
                    star: claimNewStar,
                    totalEarned: (userData.totalEarned || 0) + rewardTon
                });
                await set(claimedRewardsRef, { claimedAt: Date.now() });
                
                return res.status(200).json({
                    success: true,
                    newBalance: claimNewBalance,
                    newStar: claimNewStar,
                    tonReward: rewardTon,
                    starReward: rewardStar
                });
            
            case 'registerDevice':
                const { deviceId, userAgent, screenResolution, timezone, language } = data;
                const deviceRef = ref(db, `devices/${deviceId}`);
                const deviceSnapshot = await get(deviceRef);
                
                if (deviceSnapshot.exists()) {
                    const deviceData = deviceSnapshot.val();
                    if (deviceData.ownerId && deviceData.ownerId !== telegramId) {
                        return res.status(200).json({ success: false, allowed: false, error: 'Device already registered with another account' });
                    }
                    await update(deviceRef, {
                        lastSeen: Date.now(),
                        lastUserId: telegramId
                    });
                } else {
                    await set(deviceRef, {
                        ownerId: telegramId,
                        firstSeen: Date.now(),
                        lastSeen: Date.now(),
                        userAgent: userAgent,
                        screenResolution: screenResolution,
                        timezone: timezone,
                        language: language
                    });
                }
                
                await update(userRef, { deviceId: deviceId });
                
                return res.status(200).json({ success: true, allowed: true });
            
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
