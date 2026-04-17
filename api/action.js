// api/action.js
import { verifyTelegramAuth } from './_verify.js';

const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG);
const DATABASE_URL = FIREBASE_CONFIG.databaseURL;
const API_KEY = FIREBASE_CONFIG.apiKey;

async function firebaseRequest(path, method = 'GET', data = null) {
    const url = `${DATABASE_URL}${path}.json?auth=${API_KEY}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(url, options);
    return res.json();
}

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
        switch (action) {
            case 'getUser': {
                const userData = await firebaseRequest(`/users/${telegramId}`);
                return res.status(200).json({ success: true, data: userData || { id: telegramId, balance: 0, star: 0, completedTasks: [], friendsCount: 0 } });
            }
            
            case 'updateUser': {
                const { updates } = data;
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', updates);
                return res.status(200).json({ success: true });
            }
            
            case 'getTasks': {
                const tasks = await firebaseRequest('/config/tasks');
                const userTasks = await firebaseRequest('/config/userTasks');
                const allTasks = [];
                
                if (tasks) {
                    for (const id in tasks) {
                        const task = tasks[id];
                        if (task.status === 'active') {
                            allTasks.push({
                                id: id,
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
                    }
                }
                
                if (userTasks) {
                    for (const ownerId in userTasks) {
                        for (const taskId in userTasks[ownerId]) {
                            const task = userTasks[ownerId][taskId];
                            if (task.status === 'active' && task.category === 'social') {
                                allTasks.push({
                                    id: taskId,
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
                                    owner: ownerId
                                });
                            }
                        }
                    }
                }
                
                return res.status(200).json({ success: true, data: allTasks });
            }
            
            case 'completeTask': {
                const { taskId, reward, starReward } = data;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const completedTasks = userData?.completedTasks || [];
                
                if (completedTasks.includes(taskId)) {
                    return res.status(200).json({ success: false, error: 'Task already completed' });
                }
                
                completedTasks.push(taskId);
                const newBalance = (userData?.balance || 0) + reward;
                const newStar = (userData?.star || 0) + starReward;
                const newTotalEarned = (userData?.totalEarned || 0) + reward;
                const newTotalTasks = (userData?.totalTasksCompleted || 0) + 1;
                const newCompletedCount = (userData?.completedTasksCount || 0) + 1;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', {
                    balance: newBalance,
                    star: newStar,
                    totalEarned: newTotalEarned,
                    totalTasksCompleted: newTotalTasks,
                    completedTasksCount: newCompletedCount,
                    completedTasks: completedTasks,
                    lastActive: Date.now()
                });
                
                const taskCurrent = await firebaseRequest(`/config/tasks/${taskId}/currentCompletions`);
                await firebaseRequest(`/config/tasks/${taskId}`, 'PATCH', {
                    currentCompletions: (taskCurrent?.currentCompletions || 0) + 1
                });
                
                const referrerId = userData?.referredBy;
                if (referrerId && referrerId !== telegramId) {
                    const referrer = await firebaseRequest(`/users/${referrerId}`);
                    if (referrer) {
                        const profitAmount = reward * 0.2;
                        await firebaseRequest(`/users/${referrerId}`, 'PATCH', {
                            pendingProfits: (referrer.pendingProfits || 0) + profitAmount,
                            totalReferralEarnings: (referrer.totalReferralEarnings || 0) + profitAmount
                        });
                    }
                }
                
                return res.status(200).json({ success: true, balance: newBalance, star: newStar, totalEarned: newTotalEarned, completedTasks: completedTasks });
            }
            
            case 'addReferral': {
                const { referrerId } = data;
                if (referrerId && referrerId !== telegramId) {
                    const referrer = await firebaseRequest(`/users/${referrerId}`);
                    if (referrer) {
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
                            await firebaseRequest(`/users/${referrerId}`, 'PATCH', {
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
                                await firebaseRequest(`/users/${referrerId}`, 'PATCH', { currentQuestIndex: newQuestIndex });
                            }
                        }
                    }
                }
                return res.status(200).json({ success: true });
            }
            
            case 'getReferrals': {
                const friends = await firebaseRequest(`/friends/${telegramId}`);
                const friendsList = [];
                if (friends) {
                    for (const id in friends) {
                        friendsList.push({ id: id, ...friends[id] });
                    }
                }
                return res.status(200).json({ success: true, data: friendsList });
            }
            
            case 'getWithdrawals': {
                const withdrawals = [];
                const pending = await firebaseRequest('/withdrawals/pending');
                const completed = await firebaseRequest('/withdrawals/completed');
                const rejected = await firebaseRequest('/withdrawals/rejected');
                
                if (pending) {
                    for (const id in pending) {
                        if (pending[id].userId === telegramId) {
                            withdrawals.push({ id: id, ...pending[id], status: 'pending' });
                        }
                    }
                }
                if (completed) {
                    for (const id in completed) {
                        if (completed[id].userId === telegramId) {
                            withdrawals.push({ id: id, ...completed[id], status: 'completed' });
                        }
                    }
                }
                if (rejected) {
                    for (const id in rejected) {
                        if (rejected[id].userId === telegramId) {
                            withdrawals.push({ id: id, ...rejected[id], status: 'rejected' });
                        }
                    }
                }
                withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                return res.status(200).json({ success: true, data: withdrawals });
            }
            
            case 'createWithdrawal': {
                const { walletAddress, amount, minimumWithdraw, requiredTasks, requiredReferrals, requiredStar } = data;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                
                if ((userData?.balance || 0) < amount) {
                    return res.status(200).json({ success: false, error: 'Insufficient balance' });
                }
                if (amount < minimumWithdraw) {
                    return res.status(200).json({ success: false, error: 'Amount too low' });
                }
                if ((userData?.totalTasksCompleted || 0) < requiredTasks) {
                    return res.status(200).json({ success: false, error: 'Complete required tasks first' });
                }
                if ((userData?.friendsCount || 0) < requiredReferrals) {
                    return res.status(200).json({ success: false, error: 'Invite required friends first' });
                }
                if ((userData?.star || 0) < requiredStar) {
                    return res.status(200).json({ success: false, error: 'Earn required STAR first' });
                }
                
                const newBalanceAfter = (userData?.balance || 0) - amount;
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', {
                    balance: newBalanceAfter,
                    totalWithdrawnAmount: (userData?.totalWithdrawnAmount || 0) + amount,
                    totalWithdrawals: (userData?.totalWithdrawals || 0) + 1,
                    lastWithdrawalDate: Date.now()
                });
                
                const withdrawalId = `wd_${Date.now()}_${telegramId}`;
                await firebaseRequest(`/withdrawals/pending/${withdrawalId}`, 'PUT', {
                    id: withdrawalId,
                    userId: telegramId,
                    walletAddress: walletAddress,
                    amount: amount,
                    timestamp: Date.now(),
                    status: 'pending',
                    userName: userData?.firstName,
                    telegramId: telegramId
                });
                
                return res.status(200).json({ success: true, newBalance: newBalanceAfter });
            }
            
            case 'getDeposits': {
                const deposits = await firebaseRequest(`/deposits/${telegramId}`);
                const depositsList = [];
                if (deposits) {
                    for (const id in deposits) {
                        depositsList.push({ id: id, ...deposits[id] });
                    }
                    depositsList.sort((a, b) => b.timestamp - a.timestamp);
                }
                return res.status(200).json({ success: true, data: depositsList });
            }
            
            case 'getAppStats': {
                const stats = await firebaseRequest('/appStats');
                return res.status(200).json({ success: true, data: stats || { totalUsers: 0, totalWithdrawals: 0, totalPayments: 0 } });
            }
            
            case 'updateAppStats': {
                const { stat, value } = data;
                const current = await firebaseRequest(`/appStats/${stat}`);
                await firebaseRequest(`/appStats/${stat}`, 'PUT', (current || 0) + value);
                return res.status(200).json({ success: true });
            }
            
            case 'usePromoCode': {
                const { code } = data;
                const promos = await firebaseRequest('/config/promoCodes');
                let promoData = null;
                let promoId = null;
                
                for (const id in promos) {
                    if (promos[id].code === code.toUpperCase()) {
                        promoData = promos[id];
                        promoId = id;
                        break;
                    }
                }
                
                if (!promoData) {
                    return res.status(200).json({ success: false, error: 'Invalid promo code' });
                }
                
                const used = await firebaseRequest(`/usedPromoCodes/${telegramId}/${promoId}`);
                if (used) {
                    return res.status(200).json({ success: false, error: 'Code already used' });
                }
                
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const rewardAmount = promoData.reward || 0.01;
                const rewardType = promoData.rewardType || 'ton';
                const promoUpdates = {};
                
                if (rewardType === 'ton') {
                    promoUpdates.balance = (userData?.balance || 0) + rewardAmount;
                    promoUpdates.totalEarned = (userData?.totalEarned || 0) + rewardAmount;
                } else {
                    promoUpdates.star = (userData?.star || 0) + rewardAmount;
                }
                promoUpdates.totalPromoCodes = (userData?.totalPromoCodes || 0) + 1;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', promoUpdates);
                await firebaseRequest(`/usedPromoCodes/${telegramId}/${promoId}`, 'PUT', {
                    code: code,
                    reward: rewardAmount,
                    rewardType: rewardType,
                    claimedAt: Date.now()
                });
                
                const usedCount = await firebaseRequest(`/config/promoCodes/${promoId}/usedCount`);
                await firebaseRequest(`/config/promoCodes/${promoId}`, 'PATCH', { usedCount: (usedCount || 0) + 1 });
                
                return res.status(200).json({
                    success: true,
                    rewardType: rewardType,
                    rewardAmount: rewardAmount,
                    newBalance: promoUpdates.balance || userData?.balance,
                    newStar: promoUpdates.star || userData?.star
                });
            }
            
            case 'exchangeTonToStar': {
                const { tonAmount, popPerTon } = data;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                
                if ((userData?.balance || 0) < tonAmount) {
                    return res.status(200).json({ success: false, error: 'Insufficient TON balance' });
                }
                
                const starAmount = Math.floor(tonAmount * popPerTon);
                const newBalance = (userData?.balance || 0) - tonAmount;
                const newStar = (userData?.star || 0) + starAmount;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', { balance: newBalance, star: newStar });
                
                return res.status(200).json({ success: true, newBalance: newBalance, newStar: newStar, starAmount: starAmount });
            }
            
            case 'watchAd': {
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const lastAdTime = userData?.lastAdTime || 0;
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                
                if (now - lastAdTime < oneHour) {
                    const remainingSeconds = Math.ceil((oneHour - (now - lastAdTime)) / 1000);
                    return res.status(200).json({ success: false, error: 'Cooldown', remainingSeconds: remainingSeconds });
                }
                
                const adTonReward = 0.001;
                const adStarReward = 1;
                const newBalance = (userData?.balance || 0) + adTonReward;
                const newStar = (userData?.star || 0) + adStarReward;
                const newTotalEarned = (userData?.totalEarned || 0) + adTonReward;
                const newTotalAds = (userData?.totalAds || 0) + 1;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', {
                    balance: newBalance,
                    star: newStar,
                    totalEarned: newTotalEarned,
                    totalAds: newTotalAds,
                    lastAdTime: now
                });
                
                return res.status(200).json({ success: true, balance: newBalance, star: newStar, tonReward: adTonReward, starReward: adStarReward });
            }
            
            case 'watchAdV2': {
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const lastAdV2Time = userData?.lastAdV2Time || 0;
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                
                if (now - lastAdV2Time < oneHour) {
                    const remainingSeconds = Math.ceil((oneHour - (now - lastAdV2Time)) / 1000);
                    return res.status(200).json({ success: false, error: 'Cooldown', remainingSeconds: remainingSeconds });
                }
                
                const adV2TonReward = 0.002;
                const adV2StarReward = 2;
                const newBalance = (userData?.balance || 0) + adV2TonReward;
                const newStar = (userData?.star || 0) + adV2StarReward;
                const newTotalEarned = (userData?.totalEarned || 0) + adV2TonReward;
                const newTotalAds = (userData?.totalAds || 0) + 1;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', {
                    balance: newBalance,
                    star: newStar,
                    totalEarned: newTotalEarned,
                    totalAds: newTotalAds,
                    lastAdV2Time: now
                });
                
                return res.status(200).json({ success: true, balance: newBalance, star: newStar, tonReward: adV2TonReward, starReward: adV2StarReward });
            }
            
            case 'claimPendingProfits': {
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const pendingAmount = userData?.pendingProfits || 0;
                
                if (pendingAmount <= 0) {
                    return res.status(200).json({ success: false, error: 'No pending profits' });
                }
                
                const newBalance = (userData?.balance || 0) + pendingAmount;
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', { balance: newBalance, pendingProfits: 0 });
                
                return res.status(200).json({ success: true, newBalance: newBalance, claimedAmount: pendingAmount });
            }
            
            case 'getQuests': {
                const userData = await firebaseRequest(`/users/${telegramId}`);
                return res.status(200).json({
                    success: true,
                    data: {
                        currentQuestIndex: userData?.currentQuestIndex || 0,
                        completedQuests: userData?.completedQuests || {}
                    }
                });
            }
            
            case 'claimQuest': {
                const { questId, rewardTon, rewardStar, questIndex } = data;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const completedQuests = userData?.completedQuests || {};
                
                if (completedQuests[questId]) {
                    return res.status(200).json({ success: false, error: 'Quest already claimed' });
                }
                
                completedQuests[questId] = true;
                const newBalance = (userData?.balance || 0) + rewardTon;
                const newStar = (userData?.star || 0) + rewardStar;
                const newQuestIndex = questIndex + 1;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', {
                    balance: newBalance,
                    star: newStar,
                    completedQuests: completedQuests,
                    currentQuestIndex: newQuestIndex
                });
                
                return res.status(200).json({ success: true, newBalance: newBalance, newStar: newStar, newQuestIndex: newQuestIndex });
            }
            
            case 'getUserCreatedTasks': {
                const userTasks = await firebaseRequest(`/config/userTasks/${telegramId}`);
                const tasksList = [];
                if (userTasks) {
                    for (const id in userTasks) {
                        tasksList.push({ id: id, ...userTasks[id] });
                    }
                }
                return res.status(200).json({ success: true, data: tasksList });
            }
            
            case 'createTask': {
                const { taskName, taskLink, taskType, verification, completions, price } = data;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                
                if ((userData?.star || 0) < price) {
                    return res.status(200).json({ success: false, error: 'Insufficient STAR balance' });
                }
                
                const newStar = (userData?.star || 0) - price;
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
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', { star: newStar });
                const newTaskRef = await firebaseRequest(`/config/userTasks/${telegramId}`, 'POST', taskData);
                
                return res.status(200).json({ success: true, newStar: newStar, taskId: newTaskRef.name });
            }
            
            case 'deleteTask': {
                const { taskId: deleteTaskId } = data;
                const taskToDelete = await firebaseRequest(`/config/userTasks/${telegramId}/${deleteTaskId}`);
                
                if (!taskToDelete) {
                    return res.status(200).json({ success: false, error: 'Task not found' });
                }
                
                const currentCompletionsValue = taskToDelete.currentCompletions || 0;
                const pricePer100 = 100;
                const refundAmount = Math.ceil(currentCompletionsValue / 100) * pricePer100 * 0.5;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const newStar = (userData?.star || 0) + refundAmount;
                
                await firebaseRequest(`/config/userTasks/${telegramId}/${deleteTaskId}`, 'DELETE');
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', { star: newStar });
                
                return res.status(200).json({ success: true, newStar: newStar, refundAmount: refundAmount });
            }
            
            case 'addCompletions': {
                const { taskId: addTaskId, additionalCompletions, pricePer100 } = data;
                const task = await firebaseRequest(`/config/userTasks/${telegramId}/${addTaskId}`);
                
                if (!task) {
                    return res.status(200).json({ success: false, error: 'Task not found' });
                }
                
                const price = Math.ceil(additionalCompletions / 100) * pricePer100;
                const userData = await firebaseRequest(`/users/${telegramId}`);
                
                if ((userData?.star || 0) < price) {
                    return res.status(200).json({ success: false, error: 'Insufficient STAR balance' });
                }
                
                const newMaxCompletions = (task.maxCompletions || 100) + additionalCompletions;
                const newStar = (userData?.star || 0) - price;
                
                await firebaseRequest(`/config/userTasks/${telegramId}/${addTaskId}`, 'PATCH', { maxCompletions: newMaxCompletions });
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', { star: newStar });
                
                return res.status(200).json({ success: true, newStar: newStar, newMaxCompletions: newMaxCompletions });
            }
            
            case 'getMaxCompletionsFromStar': {
                const { starAmount, pricePer100 } = data;
                const maxPossibleCompletions = Math.floor((starAmount / pricePer100) * 100);
                return res.status(200).json({ success: true, maxCompletions: maxPossibleCompletions });
            }
            
            case 'getAdditionalRewards': {
                const rewards = await firebaseRequest('/config/more');
                const rewardsList = [];
                if (rewards) {
                    for (const id in rewards) {
                        if (rewards[id].status === 'active') {
                            rewardsList.push({
                                id: id,
                                name: rewards[id].name || 'Reward',
                                description: rewards[id].description || '',
                                rewardType: rewards[id].rewardType || 'ton',
                                rewardAmount: rewards[id].rewardAmount || 0,
                                starAmount: rewards[id].popAmount || 0,
                                icon: rewards[id].icon || 'fa-gift',
                                action: rewards[id].action || 'none',
                                actionUrl: rewards[id].actionUrl || ''
                            });
                        }
                    }
                }
                return res.status(200).json({ success: true, data: rewardsList });
            }
            
            case 'claimAdditionalReward': {
                const { rewardId } = data;
                const reward = await firebaseRequest(`/config/more/${rewardId}`);
                
                if (!reward) {
                    return res.status(200).json({ success: false, error: 'Reward not found' });
                }
                
                const alreadyClaimed = await firebaseRequest(`/claimedRewards/${telegramId}/${rewardId}`);
                if (alreadyClaimed) {
                    return res.status(200).json({ success: false, error: 'Reward already claimed' });
                }
                
                const userData = await firebaseRequest(`/users/${telegramId}`);
                const rewardTon = reward.rewardAmount || 0;
                const rewardStar = reward.popAmount || 0;
                const newBalance = (userData?.balance || 0) + rewardTon;
                const newStar = (userData?.star || 0) + rewardStar;
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', {
                    balance: newBalance,
                    star: newStar,
                    totalEarned: (userData?.totalEarned || 0) + rewardTon
                });
                await firebaseRequest(`/claimedRewards/${telegramId}/${rewardId}`, 'PUT', { claimedAt: Date.now() });
                
                return res.status(200).json({ success: true, newBalance: newBalance, newStar: newStar, tonReward: rewardTon, starReward: rewardStar });
            }
            
            case 'registerDevice': {
                const { deviceId, userAgent, screenResolution, timezone, language } = data;
                const device = await firebaseRequest(`/devices/${deviceId}`);
                
                if (device) {
                    if (device.ownerId && device.ownerId !== telegramId) {
                        return res.status(200).json({ success: false, allowed: false, error: 'Device already registered with another account' });
                    }
                    await firebaseRequest(`/devices/${deviceId}`, 'PATCH', {
                        lastSeen: Date.now(),
                        lastUserId: telegramId
                    });
                } else {
                    await firebaseRequest(`/devices/${deviceId}`, 'PUT', {
                        ownerId: telegramId,
                        firstSeen: Date.now(),
                        lastSeen: Date.now(),
                        userAgent: userAgent,
                        screenResolution: screenResolution,
                        timezone: timezone,
                        language: language
                    });
                }
                
                await firebaseRequest(`/users/${telegramId}`, 'PATCH', { deviceId: deviceId });
                
                return res.status(200).json({ success: true, allowed: true });
            }
            
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
