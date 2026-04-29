import { APP_CONFIG } from './data.js';

class App {
    constructor() {
        this.tg = null;
        this.db = null;
        this.auth = null;
        this.tgUser = null;
        this.isInitialized = false;
        this.deviceId = null;
        this.deviceOwnerId = null;
        
        this.powerBalance = 0;
        this.hashBalance = 0;
        this.tonBalance = 0;
        this.pendingHash = 0;
        this.userLevel = 1;
        this.isVerified = false;
        this.hasClaimedWelcome = false;
        this.userCompletedTasks = new Set();
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        this.miningInterval = null;
        this.uiUpdateInterval = null;
        this.withdrawals = [];
        this.totalReferrals = 0;
        this.verifiedReferrals = 0;
        this.referralPower = 0;
        this.referralTon = 0;
        
        this.quests = [
            { id: 'level', name: 'Up To Level', target: 1, current: 1, reward: 50, completed: false },
            { id: 'invite', name: 'Invite a friend', target: 1, current: 0, reward: 50, completed: false }
        ];
        
        this.vibrationEnabled = true;
        this.loadSettings();
    }
    
    async getDeviceFingerprint() {
        const ua = navigator.userAgent;
        const screen = `${window.screen.width}x${window.screen.height}`;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let hash = 0;
        const str = `${ua}|${screen}|${tz}`;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return 'dev_' + Math.abs(hash).toString(16);
    }
    
    async checkDevice() {
        try {
            if (!this.db) return null;
            this.deviceId = await this.getDeviceFingerprint();
            const saved = localStorage.getItem('device_fingerprint');
            if (saved && saved !== this.deviceId) this.deviceId = saved;
            else localStorage.setItem('device_fingerprint', this.deviceId);
            
            const deviceRef = await this.db.ref(`devices/${this.deviceId}`).once('value');
            if (deviceRef.exists()) {
                const data = deviceRef.val();
                this.deviceOwnerId = data.ownerId;
                await this.db.ref(`devices/${this.deviceId}`).update({ lastSeen: await this.getServerTime(), lastUserId: this.tgUser.id });
                return this.deviceOwnerId;
            } else {
                await this.db.ref(`devices/${this.deviceId}`).set({
                    ownerId: this.tgUser.id,
                    firstSeen: await this.getServerTime(),
                    lastSeen: await this.getServerTime(),
                    userAgent: navigator.userAgent
                });
                this.deviceOwnerId = this.tgUser.id;
                return null;
            }
        } catch(e) { return null; }
    }
    
    async getServerTime() {
        try {
            const res = await fetch('/api/time');
            const data = await res.json();
            return data.serverTime;
        } catch(e) {
            return Date.now();
        }
    }
    
    vibrate(type) {
        if (!this.vibrationEnabled) return;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            if (type === 'success') window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            else if (type === 'error') window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            else window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }
    
    showNotification(title, message, type) {
        this.vibrate(type);
        const el = document.createElement('div');
        el.className = `notif ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
        el.innerHTML = `<i class="fas ${icon}"></i><div><strong>${title}</strong><br><small>${message}</small></div>`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
    
    async showAd(block, action) {
        const confirmed = confirm(`Watch an ad to ${action}?`);
        if (!confirmed) return false;
        try {
            if (window[block]) await window[block].show();
            return true;
        } catch(e) { return true; }
    }
    
    getRequiredPowerForLevel(level) {
        return Math.floor(APP_CONFIG.LEVEL_FORMULA.base * Math.pow(APP_CONFIG.LEVEL_FORMULA.multiplier, level - 1));
    }
    
    updateLevelFromPower() {
        let newLevel = 1;
        while (this.powerBalance >= this.getRequiredPowerForLevel(newLevel + 1)) {
            newLevel++;
        }
        if (newLevel > this.userLevel) {
            this.userLevel = newLevel;
            this.showNotification('Level Up!', `Reached level ${this.userLevel}!`, 'success');
            this.vibrate('success');
            this.updateQuestProgress('level', this.userLevel);
        }
        this.userLevel = newLevel;
        document.getElementById('user-level').innerText = this.userLevel;
    }
    
    getMiningRate() {
        return this.powerBalance * APP_CONFIG.POWER_PER_HASH_RATE;
    }
    
    async calculateAndUpdateHash() {
        if (!this.miningActive || !this.miningStartTime) return;
        const now = await this.getServerTime();
        const elapsedSeconds = Math.floor((now - this.miningStartTime) / 1000);
        const ratePerSecond = this.getMiningRate();
        const newPendingHash = elapsedSeconds * ratePerSecond;
        if (newPendingHash !== this.pendingHash) {
            this.pendingHash = newPendingHash;
            await this.saveMiningState();
            this.updateHomeHashDisplay();
        }
    }
    
    updateHomeHashDisplay() {
        const hashValueEl = document.querySelector('#home-page .balance-card .value');
        if (hashValueEl && document.querySelector('#home-page .balance-card .icon.hash')) {
            const balanceCards = document.querySelectorAll('#home-page .balance-card');
            if (balanceCards[1]) {
                balanceCards[1].querySelector('.value').innerText = Math.floor(this.hashBalance + this.pendingHash).toLocaleString();
            }
        }
    }
    
    async startMining() {
        const ad = await this.showAd('AdBlock1', 'start mining');
        if (!ad) return;
        
        const now = await this.getServerTime();
        this.miningActive = true;
        this.miningStartTime = now;
        this.miningEndTime = now + (APP_CONFIG.MINING_SESSION_HOURS * 3600000);
        this.pendingHash = 0;
        
        await this.saveMiningState();
        await this.saveUserData();
        this.renderHome();
        this.startMiningLoop();
        this.showNotification('Mining Started!', 'Your rig is now mining HASH', 'success');
    }
    
    async stopMining() {
        if (!this.miningActive) return;
        
        await this.calculateAndUpdateHash();
        this.hashBalance += this.pendingHash;
        this.pendingHash = 0;
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        
        await this.saveMiningState();
        await this.saveUserData();
        this.renderHome();
        if (this.miningInterval) clearInterval(this.miningInterval);
        if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
        this.showNotification('Mining Stopped', 'Your rig has stopped mining', 'warning');
    }
    
    async saveMiningState() {
        if (!this.db) return;
        await this.db.ref(`users/${this.tgUser.id}`).update({
            miningActive: this.miningActive,
            miningStartTime: this.miningStartTime,
            miningEndTime: this.miningEndTime,
            pendingHash: this.pendingHash
        });
    }
    
    startMiningLoop() {
        if (this.miningInterval) clearInterval(this.miningInterval);
        if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
        
        this.miningInterval = setInterval(async () => {
            if (!this.miningActive) return;
            const now = await this.getServerTime();
            if (this.miningEndTime && now >= this.miningEndTime) {
                await this.stopMining();
            } else {
                await this.calculateAndUpdateHash();
            }
        }, 60000);
        
        this.uiUpdateInterval = setInterval(() => {
            if (this.miningActive) {
                this.updateHomeHashDisplay();
                this.updateMiningTimerDisplay();
            }
        }, 1000);
    }
    
    updateMiningTimerDisplay() {
        if (!this.miningEndTime) return;
        const remaining = Math.max(0, (this.miningEndTime - Date.now()) / 1000);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const timerEl = document.querySelector('.mining-timer');
        if (timerEl) {
            timerEl.innerHTML = `<i class="fas fa-hourglass-half"></i> ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    async exchangeHash(amount) {
        if (amount <= 0 || amount > Math.floor(this.hashBalance + this.pendingHash)) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const tonAmount = amount / APP_CONFIG.HASH_PER_TON;
        const ad = await this.showAd('AdBlock2', `exchange ${amount.toLocaleString()} HASH to ${tonAmount.toFixed(6)} TON`);
        if (!ad) return false;
        
        await this.calculateAndUpdateHash();
        let totalHash = this.hashBalance + this.pendingHash;
        if (amount > totalHash) {
            this.showNotification('Error', 'Insufficient balance', 'error');
            return false;
        }
        
        if (amount <= this.hashBalance) {
            this.hashBalance -= amount;
        } else {
            const fromPending = amount - this.hashBalance;
            this.hashBalance = 0;
            this.pendingHash -= fromPending;
        }
        
        this.tonBalance += tonAmount;
        await this.saveUserData();
        await this.saveMiningState();
        this.renderHome();
        this.showNotification('Exchanged!', `${amount.toLocaleString()} HASH → ${tonAmount.toFixed(6)} TON`, 'success');
        return true;
    }
    
    async addReferralEarnings(userId, tonAmount) {
        const userSnap = await this.db.ref(`users/${userId}`).once('value');
        const referredBy = userSnap.val()?.referredBy;
        if (referredBy && referredBy !== userId) {
            const commission = tonAmount * (APP_CONFIG.REFERRAL_PERCENTAGE / 100);
            const referrerRef = this.db.ref(`users/${referredBy}`);
            const referrerSnap = await referrerRef.once('value');
            if (referrerSnap.exists()) {
                const currentTon = referrerSnap.val().tonBalance || 0;
                await referrerRef.update({ tonBalance: currentTon + commission });
                if (referredBy == this.tgUser.id) {
                    this.referralTon += commission;
                }
            }
        }
    }
    
    async completeTask(taskId, rewardPower, url, verification) {
        if (this.userCompletedTasks.has(taskId)) return false;
        
        if (verification) {
            const chatId = this.extractChatId(url);
            if (chatId) {
                const isMember = await this.checkMembership(chatId);
                if (!isMember) {
                    this.showNotification('Join Required', 'Please join the channel first', 'warning');
                    return false;
                }
            }
        }
        
        this.userCompletedTasks.add(taskId);
        this.powerBalance += rewardPower;
        await this.updateLevelFromPower();
        await this.saveUserData();
        if (this.db) {
            await this.db.ref(`users/${this.tgUser.id}/completedTasks`).set(Array.from(this.userCompletedTasks));
        }
        this.renderHome();
        this.renderEarn();
        this.showNotification('Task Completed!', `+${rewardPower} Power`, 'success');
        this.vibrate('success');
        return true;
    }
    
    async applyPromoCode(code) {
        if (!this.db) return false;
        const codeSnap = await this.db.ref(`promoCodes/${code}`).once('value');
        if (!codeSnap.exists()) {
            this.showNotification('Invalid Code', 'Promo code not found', 'error');
            return false;
        }
        const promoData = codeSnap.val();
        const usedRef = this.db.ref(`usedPromoCodes/${this.tgUser.id}/${code}`);
        const usedSnap = await usedRef.once('value');
        if (usedSnap.exists()) {
            this.showNotification('Already Used', 'Code already redeemed', 'warning');
            return false;
        }
        
        await usedRef.set(true);
        
        if (promoData.power) {
            this.powerBalance += promoData.power;
            await this.updateLevelFromPower();
        }
        if (promoData.hash) {
            this.hashBalance += promoData.hash;
        }
        if (promoData.ton) {
            this.tonBalance += promoData.ton;
        }
        
        await this.saveUserData();
        this.renderHome();
        this.showNotification('Code Applied!', `You received ${promoData.power ? promoData.power + ' Power' : promoData.hash ? promoData.hash.toLocaleString() + ' HASH' : promoData.ton + ' TON'}`, 'success');
        return true;
    }
    
    updateQuestProgress(questId, value) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest || quest.completed) return;
        
        if (questId === 'level') {
            quest.current = value;
            if (quest.current >= quest.target) {
                quest.completed = true;
            }
        } else if (questId === 'invite') {
            quest.current = value;
            if (quest.current >= quest.target) {
                quest.completed = true;
            }
        }
        
        if (quest.completed) {
            this.showNotification('Quest Complete!', `+${quest.reward} Power`, 'success');
            this.renderEarn();
        }
    }
    
    async claimQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest || !quest.completed) return;
        
        this.powerBalance += quest.reward;
        quest.completed = false;
        if (questId === 'level') {
            quest.target++;
            quest.reward *= 2;
            quest.current = this.userLevel;
            if (quest.current >= quest.target) quest.completed = true;
        } else if (questId === 'invite') {
            quest.target++;
            quest.reward *= 2;
            if (quest.current >= quest.target) quest.completed = true;
        }
        
        await this.updateLevelFromPower();
        await this.saveUserData();
        this.renderEarn();
        this.showNotification('Quest Reward Claimed!', `+${quest.reward} Power`, 'success');
    }
    
    async withdraw(amount, wallet) {
        if (!wallet || wallet.length < 20) {
            this.showNotification('Error', 'Invalid wallet address', 'error');
            return false;
        }
        if (amount < APP_CONFIG.MINIMUM_WITHDRAW || amount > this.tonBalance) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const ad = await this.showAd('AdBlock2', 'withdraw TON');
        if (!ad) return false;
        
        this.tonBalance -= amount;
        await this.saveUserData();
        
        const withdrawal = {
            id: Date.now(),
            amount: amount,
            wallet: wallet,
            status: 'pending',
            timestamp: await this.getServerTime()
        };
        
        if (this.db) {
            await this.db.ref(`withdrawals/${this.tgUser.id}/${withdrawal.id}`).set(withdrawal);
        }
        
        this.withdrawals.unshift(withdrawal);
        this.renderWithdraw();
        this.showNotification('Withdrawn!', `${amount.toFixed(4)} TON requested`, 'success');
        return true;
    }
    
    extractChatId(url) {
        const match = url.match(/t\.me\/([^\/\?]+)/);
        return match ? match[1] : null;
    }
    
    async checkMembership(channel) {
        try {
            const res = await fetch('/api/bot-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_channel', channel: `@${channel}`, userId: this.tgUser.id })
            });
            const data = await res.json();
            return data.isMember === true;
        } catch(e) {
            return false;
        }
    }
    
    async initialize() {
        try {
            if (!window.Telegram?.WebApp) throw new Error('Open from Telegram');
            this.tg = window.Telegram.WebApp;
            this.tgUser = this.tg.initDataUnsafe.user;
            if (!this.tgUser) throw new Error('No user data');
            this.tg.ready();
            this.tg.expand();
            
            await this.initFirebase();
            
            const existingOwner = await this.checkDevice();
            if (existingOwner && existingOwner !== this.tgUser.id) {
                await this.loadUserById(existingOwner);
            } else {
                await this.loadUserData();
            }
            
            await this.loadCompletedTasks();
            await this.loadWithdrawals();
            await this.loadReferralStats();
            await this.loadPromoCodes();
            await this.loadTasks();
            
            if (this.miningActive && this.miningEndTime) {
                const now = await this.getServerTime();
                if (now >= this.miningEndTime) {
                    this.miningActive = false;
                    this.miningStartTime = null;
                    this.miningEndTime = null;
                    await this.saveMiningState();
                } else {
                    this.pendingHash = 0;
                    this.miningStartTime = now - (now - this.miningStartTime);
                    await this.saveMiningState();
                    this.startMiningLoop();
                }
            }
            
            if (!this.hasClaimedWelcome) {
                this.powerBalance += APP_CONFIG.WELCOME_BONUS_POWER;
                this.hasClaimedWelcome = true;
                this.isVerified = true;
                await this.updateLevelFromPower();
                await this.saveUserData();
                if (this.db) {
                    await this.db.ref(`users/${this.tgUser.id}`).update({ hasClaimedWelcome: true, isVerified: true });
                    const userSnap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
                    const referredBy = userSnap.val()?.referredBy;
                    if (referredBy && referredBy !== this.tgUser.id) {
                        const referrerRef = this.db.ref(`users/${referredBy}`);
                        const referrerSnap = await referrerRef.once('value');
                        if (referrerSnap.exists()) {
                            const currentPower = referrerSnap.val().powerBalance || 0;
                            const currentVerified = referrerSnap.val().verifiedReferrals || 0;
                            await referrerRef.update({ 
                                powerBalance: currentPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                                verifiedReferrals: currentVerified + 1
                            });
                        }
                    }
                }
            }
            
            this.setupEventListeners();
            this.renderUI();
            this.setupNavigation();
            
            document.getElementById('app-loader').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            this.isInitialized = true;
            
        } catch(err) {
            document.getElementById('loader-error').textContent = err.message;
            document.getElementById('loader-error').style.display = 'block';
        }
    }
    
    async loadUserById(userId) {
        const ref = this.db.ref(`users/${userId}`);
        const snap = await ref.once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.powerBalance = d.powerBalance || 0;
            this.hashBalance = d.hashBalance || 0;
            this.tonBalance = d.tonBalance || 0;
            this.pendingHash = d.pendingHash || 0;
            this.userLevel = d.level || 1;
            this.isVerified = d.isVerified || false;
            this.hasClaimedWelcome = d.hasClaimedWelcome || false;
            this.miningActive = d.miningActive || false;
            this.miningStartTime = d.miningStartTime || null;
            this.miningEndTime = d.miningEndTime || null;
            this.tgUser = { id: userId, first_name: d.firstName, username: d.username, photo_url: d.photoUrl };
            document.getElementById('user-name').innerText = d.firstName;
            document.getElementById('user-photo').src = d.photoUrl || APP_CONFIG.DEFAULT_USER_AVATAR;
            document.getElementById('user-level').innerText = this.userLevel;
        }
    }
    
    async initFirebase() {
        const res = await fetch('/api/firebase-config', { method: 'POST' });
        const { encrypted } = await res.json();
        const config = JSON.parse(atob(encrypted));
        let app;
        try { app = firebase.initializeApp(config); } catch(e) { app = firebase.app(); }
        this.db = app.database();
        this.auth = app.auth();
        await this.auth.signInAnonymously();
    }
    
    async loadUserData() {
        const ref = this.db.ref(`users/${this.tgUser.id}`);
        const snap = await ref.once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.powerBalance = d.powerBalance || 0;
            this.hashBalance = d.hashBalance || 0;
            this.tonBalance = d.tonBalance || 0;
            this.pendingHash = d.pendingHash || 0;
            this.userLevel = d.level || 1;
            this.isVerified = d.isVerified || false;
            this.hasClaimedWelcome = d.hasClaimedWelcome || false;
            this.miningActive = d.miningActive || false;
            this.miningStartTime = d.miningStartTime || null;
            this.miningEndTime = d.miningEndTime || null;
        } else {
            const startParam = this.tg.initDataUnsafe?.start_param;
            const referredBy = (startParam && !isNaN(startParam)) ? parseInt(startParam) : null;
            await ref.set({
                id: this.tgUser.id,
                username: this.tgUser.username || '',
                firstName: this.tgUser.first_name || 'User',
                photoUrl: this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
                powerBalance: 0,
                hashBalance: 0,
                tonBalance: 0,
                pendingHash: 0,
                level: 1,
                isVerified: false,
                hasClaimedWelcome: false,
                miningActive: false,
                miningStartTime: null,
                miningEndTime: null,
                referredBy: referredBy,
                createdAt: await this.getServerTime(),
                completedTasks: []
            });
        }
        document.getElementById('user-name').innerText = this.tgUser.first_name || 'User';
        document.getElementById('user-level').innerText = this.userLevel;
        document.getElementById('user-photo').src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
    }
    
    async saveUserData() {
        if (!this.db) return;
        await this.db.ref(`users/${this.tgUser.id}`).update({
            powerBalance: this.powerBalance,
            hashBalance: this.hashBalance,
            tonBalance: this.tonBalance,
            pendingHash: this.pendingHash,
            level: this.userLevel,
            isVerified: this.isVerified,
            hasClaimedWelcome: this.hasClaimedWelcome,
            miningActive: this.miningActive,
            miningStartTime: this.miningStartTime,
            miningEndTime: this.miningEndTime
        });
    }
    
    async loadCompletedTasks() {
        const snap = await this.db.ref(`users/${this.tgUser.id}/completedTasks`).once('value');
        if (snap.exists()) this.userCompletedTasks = new Set(snap.val());
    }
    
    async loadWithdrawals() {
        const snap = await this.db.ref(`withdrawals/${this.tgUser.id}`).once('value');
        if (snap.exists()) {
            this.withdrawals = [];
            snap.forEach(c => this.withdrawals.push({ id: c.key, ...c.val() }));
            this.withdrawals.sort((a,b) => b.timestamp - a.timestamp);
        }
    }
    
    async loadReferralStats() {
        if (!this.db) return;
        const snap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.totalReferrals = d.totalReferrals || 0;
            this.verifiedReferrals = d.verifiedReferrals || 0;
            this.referralPower = d.referralPower || 0;
            this.referralTon = d.referralTon || 0;
            this.updateQuestProgress('invite', this.totalReferrals);
        }
    }
    
    async loadPromoCodes() {
        if (!this.db) return;
        const snap = await this.db.ref('promoCodes').once('value');
        this.promoCodes = [];
        if (snap.exists()) {
            snap.forEach(c => {
                this.promoCodes.push({ code: c.key, ...c.val() });
            });
        }
    }
    
    async loadTasks() {
        if (!this.db) return;
        const snap = await this.db.ref('tasks').once('value');
        this.mainTasks = [];
        this.partnerTasks = [];
        if (snap.exists()) {
            snap.forEach(c => {
                const task = { id: c.key, ...c.val() };
                if (task.category === 'main') this.mainTasks.push(task);
                else if (task.category === 'partner') this.partnerTasks.push(task);
            });
        }
        if (this.mainTasks.length === 0) {
            this.mainTasks = [
                { id: 'main_1', name: 'Join Telegram Channel', reward: 50, url: 'https://t.me/STARZ_NEW', verify: true, img: APP_CONFIG.BOT_AVATAR },
                { id: 'main_2', name: 'Follow on Twitter', reward: 30, url: 'https://twitter.com', verify: false, img: APP_CONFIG.BOT_AVATAR }
            ];
        }
        if (this.partnerTasks.length === 0) {
            this.partnerTasks = [
                { id: 'partner_1', name: 'Partner Task 1', reward: 25, url: 'https://t.me/partner', verify: true, img: APP_CONFIG.BOT_AVATAR }
            ];
        }
    }
    
    renderHome() {
        const el = document.getElementById('home-page');
        if (!el) return;
        const requiredPower = this.getRequiredPowerForLevel(this.userLevel + 1);
        const progress = Math.min((this.powerBalance / requiredPower) * 100, 100);
        const ratePerSecond = this.getMiningRate();
        const totalHash = Math.floor(this.hashBalance + this.pendingHash);
        
        el.innerHTML = `
            <div class="balance-cards">
                <div class="balance-card"><div class="icon power"><i class="fas fa-bolt"></i></div><span class="label">Power</span><span class="value">${this.powerBalance.toFixed(0)}</span></div>
                <div class="balance-card"><div class="icon hash"><i class="fas fa-microchip"></i></div><span class="label">HASH</span><span class="value">${totalHash.toLocaleString()}</span></div>
            </div>
            <div class="mining-card">
                <div class="mining-icon"><i class="fas fa-microchip"></i></div>
                <h3>Mining Rig Lv.${this.userLevel}</h3>
                <div class="mining-rate"><i class="fas fa-star"></i> Rate: <span>${ratePerSecond.toFixed(4)} HASH/s</span></div>
                <div class="mining-status ${this.miningActive ? 'active' : 'stopped'}">${this.miningActive ? '● ACTIVE' : '● STOPPED'}</div>
                ${this.miningActive ? `<div class="mining-timer"><i class="fas fa-hourglass-half"></i> 00:00:00</div>` : ''}
                ${!this.miningActive ? `<button id="start-mining-btn" class="mining-action-btn"><i class="fas fa-play"></i> Start Mining</button>` : ''}
            </div>
            <div class="level-progress"><div class="progress-header"><span>Level ${this.userLevel}</span><span>${this.powerBalance.toFixed(0)} / ${requiredPower.toFixed(0)} Power</span></div><div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div></div>
            <div class="exchange-card"><h3><i class="fas fa-exchange-alt"></i> Exchange</h3><div class="exchange-balance"><i class="fas fa-microchip"></i> ${totalHash.toLocaleString()} HASH</div><div class="exchange-group"><input type="number" id="exchange-amount" class="form-input" placeholder="HASH amount"><button id="exchange-btn" class="submit-btn">Exchange</button></div><div class="rate-info"><i class="fas fa-info-circle"></i> ${APP_CONFIG.HASH_PER_TON.toLocaleString()} HASH = 1 TON</div></div>
        `;
        
        document.getElementById('start-mining-btn')?.addEventListener('click', () => this.startMining());
        document.getElementById('exchange-btn')?.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('exchange-amount').value);
            if (amount > 0) this.exchangeHash(amount);
        });
        
        if (this.miningActive) this.updateMiningTimerDisplay();
    }
    
    renderEarn() {
        const el = document.getElementById('earn-page');
        if (!el) return;
        
        const mainTasksHtml = this.mainTasks.filter(t => !this.userCompletedTasks.has(t.id)).map(t => `
            <div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> +${t.reward} Power</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button></div>
        `).join('');
        
        const partnerTasksHtml = this.partnerTasks.filter(t => !this.userCompletedTasks.has(t.id)).map(t => `
            <div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> +${t.reward} Power</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button></div>
        `).join('');
        
        const questsHtml = this.quests.map(q => {
            const progress = Math.min((q.current / q.target) * 100, 100);
            return `<div class="quest-card"><div class="quest-header"><span class="quest-title">${q.name}</span><span class="quest-reward"><i class="fas fa-bolt"></i> ${q.reward} Power</span></div><div class="quest-progress-bar"><div class="quest-progress-fill" style="width: ${progress}%"></div></div><div class="quest-stats"><span>${q.current}/${q.target}</span>${q.completed ? '<button class="quest-claim-btn" data-quest="'+q.id+'">Claim</button>' : '<span>Not yet</span>'}</div></div>`;
        }).join('');
        
        el.innerHTML = `
            <div class="promo-card"><div class="promo-title"><i class="fas fa-gift"></i> Promo Code</div><div class="promo-input-group"><input type="text" id="promo-input" class="form-input" placeholder="Enter code" autocomplete="off"><button id="promo-submit" class="promo-submit-btn" disabled>Claim</button></div></div>
            <div class="section-title"><i class="fas fa-star"></i> Main Tasks</div>
            <div class="tasks-list">${mainTasksHtml || '<div class="no-data">No tasks available</div>'}</div>
            <div class="section-title"><i class="fas fa-handshake"></i> Partner Tasks<button id="tasks-info-btn" class="info-icon-btn" style="margin-left:auto"><i class="fas fa-question"></i></button></div>
            <div class="tasks-list">${partnerTasksHtml || '<div class="no-data">No tasks available</div>'}</div>
            <div class="section-title"><i class="fas fa-trophy"></i> Quests</div>
            <div class="quests-section">${questsHtml}</div>
        `;
        
        const promoInput = document.getElementById('promo-input');
        const promoSubmit = document.getElementById('promo-submit');
        if (promoInput && promoSubmit) {
            promoInput.addEventListener('input', () => {
                promoSubmit.disabled = promoInput.value.trim() === '';
                if (promoSubmit.disabled) promoSubmit.style.opacity = '0.5';
                else promoSubmit.style.opacity = '1';
            });
            promoSubmit.addEventListener('click', () => {
                const code = promoInput.value.trim();
                if (code) this.applyPromoCode(code);
                promoInput.value = '';
                promoSubmit.disabled = true;
                promoSubmit.style.opacity = '0.5';
            });
        }
        
        document.getElementById('tasks-info-btn')?.addEventListener('click', () => {
            document.getElementById('tasks-info-modal').style.display = 'flex';
        });
        
        document.querySelectorAll('.task-btn.start').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id, reward = parseInt(btn.dataset.reward), url = btn.dataset.url, verify = btn.dataset.verify === 'true';
                window.open(url, '_blank');
                btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                btn.disabled = true;
                let seconds = APP_CONFIG.TASK_VERIFICATION_DELAY;
                const interval = setInterval(() => {
                    seconds--;
                    if (seconds <= 0) {
                        clearInterval(interval);
                        btn.innerHTML = 'Claim';
                        btn.disabled = false;
                        const newBtn = btn.cloneNode(true);
                        btn.parentNode.replaceChild(newBtn, btn);
                        newBtn.addEventListener('click', async () => {
                            newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                            newBtn.disabled = true;
                            await this.completeTask(id, reward, url, verify);
                            newBtn.innerHTML = 'Done';
                            newBtn.classList.add('done');
                            newBtn.disabled = true;
                        });
                    }
                }, 1000);
            });
        });
        
        document.querySelectorAll('.quest-claim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.claimQuest(btn.dataset.quest);
            });
        });
    }
    
    renderTeam() {
        const el = document.getElementById('team-page');
        if (!el) return;
        const link = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Star Farmer and start mining HASH!')}`;
        el.innerHTML = `
            <div class="team-benefits"><h3><i class="fas fa-gift"></i> Team Benefits</h3><div class="benefits-list"><div class="benefit-item"><i class="fas fa-coins"></i><div class="benefit-text">Earn 10% of your team members TON earnings</div></div><div class="benefit-item"><i class="fas fa-bolt"></i><div class="benefit-text">Get ${APP_CONFIG.REFERRAL_POWER_BONUS} Power per verified member</div></div></div></div>
            <div class="referral-card"><h4><i class="fas fa-share-alt"></i> SHARE & EARN</h4><div class="link-display">${link}</div><div class="referral-buttons"><button id="copyLink"><i class="fas fa-copy"></i> Copy</button><button id="shareLink"><i class="fab fa-telegram"></i> Share</button></div></div>
            <div class="stats-grid"><div class="stat-mini"><span class="stat-label">Total Members</span><span class="stat-number">${this.totalReferrals}</span></div><div class="stat-mini"><span class="stat-label">Verified Members</span><span class="stat-number">${this.verifiedReferrals}</span></div><div class="stat-mini"><span class="stat-label">Power Earnings</span><span class="stat-number">${this.referralPower}</span></div><div class="stat-mini"><span class="stat-label">TON Earnings</span><span class="stat-number">${this.referralTon.toFixed(6)}</span></div></div>
        `;
        document.getElementById('copyLink')?.addEventListener('click', () => {
            navigator.clipboard.writeText(link);
            this.showNotification('Copied!', 'Link copied to clipboard', 'success');
        });
        document.getElementById('shareLink')?.addEventListener('click', () => {
            window.open(shareUrl, '_blank');
        });
    }
    
    renderWithdraw() {
        const el = document.getElementById('withdraw-page');
        if (!el) return;
        const historyHtml = this.withdrawals.map(w => `<div class="history-item"><div><small>${new Date(w.timestamp).toLocaleDateString()}</small><br><small>${w.wallet?.slice(0,6)}...${w.wallet?.slice(-4)}</small></div><div class="history-amount"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" style="width:16px"> ${w.amount.toFixed(4)}</div><div class="history-status ${w.status}">${w.status}</div></div>`).join('');
        el.innerHTML = `
            <div class="withdraw-card"><h3><i class="fas fa-wallet"></i> Withdraw TON</h3><div class="withdraw-balance"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png"><span>Available: ${this.tonBalance.toFixed(6)} TON</span></div>
            <div class="form-group"><label class="form-label">TON Wallet</label><div class="input-wrapper"><input type="text" id="wallet-addr" class="form-input" placeholder="UQ..."><button id="paste-wallet" class="action-btn">Paste</button></div></div>
            <div class="form-group"><label class="form-label">Amount</label><div class="input-wrapper"><input type="number" id="withdraw-amount" class="form-input" placeholder="Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON"><button id="max-amount" class="action-btn">MAX</button></div></div>
            <div class="withdraw-note"><i class="fas fa-info-circle"></i> Minimum withdrawal: ${APP_CONFIG.MINIMUM_WITHDRAW} TON</div>
            <button id="withdraw-btn" class="withdraw-confirm-btn">Confirm Withdrawal</button></div>
            <div class="history-list"><h4><i class="fas fa-history"></i> Withdrawal History</h4>${historyHtml || '<div class="no-data">No withdrawals yet</div>'}</div>
        `;
        
        document.getElementById('paste-wallet')?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                document.getElementById('wallet-addr').value = text;
            } catch(e) {}
        });
        document.getElementById('max-amount')?.addEventListener('click', () => {
            document.getElementById('withdraw-amount').value = this.tonBalance;
        });
        document.getElementById('withdraw-btn')?.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('withdraw-amount').value);
            const wallet = document.getElementById('wallet-addr').value.trim();
            this.withdraw(amount, wallet);
        });
    }
    
    setupEventListeners() {
        document.getElementById('support-btn').onclick = () => window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        const vibrationBtn = document.getElementById('vibration-toggle-btn');
        if (vibrationBtn) {
            vibrationBtn.onclick = () => {
                this.vibrationEnabled = !this.vibrationEnabled;
                vibrationBtn.style.opacity = this.vibrationEnabled ? '1' : '0.5';
                this.saveSettings();
                this.showNotification('Settings', `Vibration ${this.vibrationEnabled ? 'ON' : 'OFF'}`, 'info');
            };
            vibrationBtn.style.opacity = this.vibrationEnabled ? '1' : '0.5';
        }
        document.getElementById('close-tasks-info')?.addEventListener('click', () => {
            document.getElementById('tasks-info-modal').style.display = 'none';
        });
        document.getElementById('contact-support-modal')?.addEventListener('click', () => {
            window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        });
        window.addEventListener('beforeunload', () => {
            if (this.miningActive) this.saveMiningState();
        });
    }
    
    saveSettings() {
        localStorage.setItem('star_farmer_settings', JSON.stringify({ vibration: this.vibrationEnabled }));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('star_farmer_settings');
        if (saved) {
            const s = JSON.parse(saved);
            this.vibrationEnabled = s.vibration !== false;
        }
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.page;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                if (id === 'home-page') this.renderHome();
                else if (id === 'earn-page') this.renderEarn();
                else if (id === 'team-page') this.renderTeam();
                else if (id === 'withdraw-page') this.renderWithdraw();
            });
        });
    }
    
    renderUI() {
        this.renderHome();
        this.renderEarn();
        this.renderTeam();
        this.renderWithdraw();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Telegram?.WebApp) {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#6C63FF">Open from Telegram Mini App</div>';
        return;
    }
    window.app = new App();
    window.app.initialize();
});
