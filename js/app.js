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
        this.tonBalance = 0;
        this.userLevel = 1;
        this.isVerified = false;
        this.hasClaimedWelcome = false;
        this.hasStartedMining = false;
        this.userCompletedTasks = new Set();
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        this.miningInterval = null;
        this.uiUpdateInterval = null;
        this.pendingTonReward = 0;
        this.withdrawals = [];
        this.totalReferrals = 0;
        this.verifiedReferrals = 0;
        this.referralPower = 0;
        this.referralTon = 0;
        this.isTaskRunning = false;
        this.mainTasks = [];
        this.partnerTasks = [];
        
        this.lastRewardAdTime = 0;
        this.lastAdexoraAdTime = 0;
        
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
    
    async showInterstitialAd() {
        try {
            const AdController = window.Adsgram.init({ blockId: APP_CONFIG.INTERSTITIAL_AD_BLOCK_ID });
            await AdController.show();
            return true;
        } catch(e) {
            return true;
        }
    }
    
    async showRewardAd() {
        try {
            const AdController = window.Adsgram.init({ blockId: APP_CONFIG.REWARD_AD_BLOCK_ID });
            await AdController.show();
            return true;
        } catch(e) {
            return true;
        }
    }
    
    async showAdexoraAd() {
        try {
            if (typeof window.showAdexora === 'function') {
                await window.showAdexora();
                return true;
            }
            return true;
        } catch(e) {
            return true;
        }
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
        }
        this.userLevel = newLevel;
        const levelSpan = document.getElementById('user-level');
        const levelBadge = document.getElementById('user-level-badge');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        if (levelBadge) levelBadge.innerText = this.userLevel;
    }
    
    getDailyTonRate() {
        return this.powerBalance * APP_CONFIG.POWER_PER_TON_RATE * 24;
    }
    
    async startMining() {
        const adWatched = await this.showInterstitialAd();
        if (!adWatched) return;
        
        const serverTime = await this.getServerTime();
        
        this.miningActive = true;
        this.miningStartTime = serverTime;
        this.miningEndTime = serverTime + (APP_CONFIG.MINING_SESSION_HOURS * 3600000);
        this.pendingTonReward = 0;
        
        if (!this.hasStartedMining && this.db && this.tgUser) {
            this.hasStartedMining = true;
            await this.db.ref(`users/${this.tgUser.id}`).update({ hasStartedMining: true });
            
            const userSnap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
            const referredBy = userSnap.val()?.referredBy;
            if (referredBy && referredBy !== this.tgUser.id && referredBy !== this.deviceOwnerId) {
                const referrerRef = this.db.ref(`users/${referredBy}`);
                const referrerSnap = await referrerRef.once('value');
                if (referrerSnap.exists()) {
                    const currentPower = referrerSnap.val().powerBalance ?? 0;
                    const currentVerified = referrerSnap.val().verifiedReferrals ?? 0;
                    const currentReferralPower = referrerSnap.val().referralPower ?? 0;
                    await referrerRef.update({ 
                        powerBalance: currentPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                        verifiedReferrals: currentVerified + 1,
                        referralPower: currentReferralPower + APP_CONFIG.REFERRAL_POWER_BONUS
                    });
                    
                    await this.db.ref(`referrals/${referredBy}/${this.tgUser.id}`).update({
                        userId: this.tgUser.id,
                        userName: this.tgUser.first_name,
                        userPhoto: this.tgUser.photo_url,
                        state: 'Verified',
                        verifiedAt: serverTime
                    });
                }
            }
        }
        
        await this.saveUserData();
        this.renderMining();
        this.startMiningLoop();
        this.showNotification('Mining Started!', 'Your rig is now mining TON', 'success');
    }
    
    async stopMining() {
        if (!this.miningActive) return;
        
        this.pendingTonReward = this.getDailyTonRate();
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        
        await this.saveUserData();
        this.renderMining();
        if (this.miningInterval) clearInterval(this.miningInterval);
        if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
        this.showNotification('Mining Stopped', 'Claim your rewards!', 'success');
    }
    
    async claimMiningRewards() {
        if (this.miningActive) {
            this.showNotification('Error', 'Mining still active!', 'error');
            return;
        }
        if (this.pendingTonReward <= 0) {
            this.showNotification('Error', 'No rewards to claim', 'error');
            return;
        }
        
        const modal = document.getElementById('claim-modal');
        const rewardEl = document.getElementById('claim-reward-amount');
        rewardEl.innerText = this.pendingTonReward.toFixed(8) + ' TON';
        modal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('confirm-claim-btn');
        const closeBtn = document.getElementById('close-claim-modal');
        
        const handleClaim = async () => {
            modal.style.display = 'none';
            cleanup();
            
            this.tonBalance += this.pendingTonReward;
            this.pendingTonReward = 0;
            
            await this.saveUserData();
            
            if (this.db && this.tgUser.id) {
                await this.addReferralEarnings(this.tgUser.id, this.pendingTonReward);
            }
            
            this.renderMining();
            this.showNotification('Rewards Claimed!', `${this.pendingTonReward.toFixed(8)} TON added to balance`, 'success');
        };
        
        const handleClose = () => {
            modal.style.display = 'none';
            cleanup();
        };
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleClaim);
            closeBtn.removeEventListener('click', handleClose);
        };
        
        confirmBtn.addEventListener('click', handleClaim);
        closeBtn.addEventListener('click', handleClose);
    }
    
    startMiningLoop() {
        if (this.miningInterval) clearInterval(this.miningInterval);
        if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
        
        this.miningInterval = setInterval(async () => {
            if (!this.miningActive) return;
            const serverTime = await this.getServerTime();
            if (this.miningEndTime && serverTime >= this.miningEndTime) {
                await this.stopMining();
            }
        }, 10000);
        
        this.uiUpdateInterval = setInterval(async () => {
            if (this.miningActive) {
                await this.updateMiningTimerDisplay();
            }
        }, 1000);
    }
    
    async updateMiningTimerDisplay() {
        if (!this.miningEndTime) return;
        
        const currentServerTime = await this.getServerTime();
        const remaining = Math.max(0, (this.miningEndTime - currentServerTime) / 1000);
        
        if (remaining <= 0 && this.miningActive) {
            await this.stopMining();
            this.renderMining();
            return;
        }
        
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const timerEl = document.querySelector('.mining-timer');
        if (timerEl) {
            timerEl.innerHTML = `<i class="fas fa-hourglass-half"></i> ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    async addReferralEarnings(userId, tonAmount) {
        const userSnap = await this.db.ref(`users/${userId}`).once('value');
        const referredBy = userSnap.val()?.referredBy;
        if (referredBy && referredBy !== userId && referredBy !== this.tgUser.id) {
            const commission = tonAmount * (APP_CONFIG.REFERRAL_PERCENTAGE / 100);
            const referrerRef = this.db.ref(`users/${referredBy}`);
            const referrerSnap = await referrerRef.once('value');
            if (referrerSnap.exists()) {
                const currentTon = referrerSnap.val().tonBalance ?? 0;
                const currentReferralTon = referrerSnap.val().referralTon ?? 0;
                await referrerRef.update({ 
                    tonBalance: currentTon + commission,
                    referralTon: currentReferralTon + commission
                });
            }
        }
    }
    
    async watchRewardAd() {
        const now = Date.now();
        const cooldown = APP_CONFIG.AD_COOLDOWN_REWARD * 1000;
        if (now - this.lastRewardAdTime < cooldown) {
            const remaining = Math.ceil((cooldown - (now - this.lastRewardAdTime)) / 1000);
            this.showNotification('Cooldown', `Please wait ${remaining} seconds`, 'warning');
            return;
        }
        
        try {
            const adController = window.Adsgram.init({ blockId: APP_CONFIG.REWARD_AD_BLOCK_ID });
            await adController.show();
            this.lastRewardAdTime = now;
            this.powerBalance += 50;
            await this.updateLevelFromPower();
            await this.saveUserData();
            this.renderMining();
            this.renderEarn();
            this.showNotification('Reward Claimed!', '+50 Power', 'success');
        } catch(e) {
            this.showNotification('Error', 'Failed to load ad', 'error');
        }
    }
    
    async watchAdexoraAd() {
        const now = Date.now();
        const cooldown = APP_CONFIG.AD_COOLDOWN_ADEXORA * 1000;
        if (now - this.lastAdexoraAdTime < cooldown) {
            const remaining = Math.ceil((cooldown - (now - this.lastAdexoraAdTime)) / 1000);
            this.showNotification('Cooldown', `Please wait ${remaining} seconds`, 'warning');
            return;
        }
        
        try {
            if (typeof window.showAdexora === 'function') {
                await window.showAdexora();
                this.lastAdexoraAdTime = now;
                this.powerBalance += 50;
                await this.updateLevelFromPower();
                await this.saveUserData();
                this.renderMining();
                this.renderEarn();
                this.showNotification('Reward Claimed!', '+50 Power', 'success');
            } else {
                this.showNotification('Error', 'Ad service unavailable', 'error');
            }
        } catch(e) {
            this.showNotification('Error', 'Failed to load ad', 'error');
        }
    }
    
    async completeTask(taskId, rewardPower, url, verification, btnElement) {
        if (this.userCompletedTasks.has(taskId)) return false;
        if (verification) {
            const chatId = this.extractChatId(url);
            if (chatId) {
                const isMember = await this.checkMembership(chatId);
                if (!isMember) {
                    this.showNotification('Join Required', 'Please join the channel first', 'warning');
                    if (btnElement) {
                        btnElement.disabled = false;
                        btnElement.innerHTML = 'Start';
                        btnElement.classList.remove('check');
                        btnElement.classList.add('start');
                    }
                    this.isTaskRunning = false;
                    this.enableAllTaskButtons();
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
        this.renderMining();
        this.renderEarn();
        this.showNotification('Task Completed!', `+${rewardPower} Power`, 'success');
        this.vibrate('success');
        this.isTaskRunning = false;
        this.enableAllTaskButtons();
        return true;
    }
    
    disableAllTaskButtons() {
        document.querySelectorAll('.task-btn.start, .task-btn.check').forEach(btn => {
            if (!btn.classList.contains('done')) {
                btn.disabled = true;
                btn.classList.add('disabled-btn');
            }
        });
    }
    
    enableAllTaskButtons() {
        document.querySelectorAll('.task-btn.start, .task-btn.check').forEach(btn => {
            if (!btn.classList.contains('done')) {
                btn.disabled = false;
                btn.classList.remove('disabled-btn');
            }
        });
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
        if (promoData.ton) {
            this.tonBalance += promoData.ton;
        }
        
        await this.saveUserData();
        this.renderMining();
        this.showNotification('Code Applied!', `You received ${promoData.power ? promoData.power + ' Power' : promoData.ton + ' TON'}`, 'success');
        return true;
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
        
        const adWatched = await this.showInterstitialAd();
        if (!adWatched) return false;
        
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
        this.showNotification('Withdrawn!', `${amount.toFixed(5)} TON requested`, 'success');
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
        const progressBar = document.getElementById('loader-progress-bar');
        const loaderText = document.getElementById('loader-text');
        
        const updateProgress = (percent) => {
            if (progressBar) progressBar.style.width = percent + '%';
            if (loaderText) loaderText.innerText = Math.floor(percent) + '%';
        };
        
        try {
            updateProgress(5);
            if (!window.Telegram?.WebApp) throw new Error('Open from Telegram');
            this.tg = window.Telegram.WebApp;
            this.tgUser = this.tg.initDataUnsafe.user;
            if (!this.tgUser) throw new Error('No user data');
            this.tg.ready();
            this.tg.expand();
            
            updateProgress(15);
            await this.initFirebase();
            
            updateProgress(35);
            const existingOwner = await this.checkDevice();
            
            updateProgress(50);
            if (existingOwner && existingOwner !== this.tgUser.id) {
                await this.loadUserById(existingOwner);
            } else {
                await this.loadUserData();
            }
            
            updateProgress(65);
            await this.loadCompletedTasks();
            await this.loadWithdrawals();
            await this.loadReferralStats();
            await this.loadPromoCodes();
            await this.loadTasks();
            
            updateProgress(80);
            if (this.miningActive && this.miningEndTime) {
                const serverTime = await this.getServerTime();
                if (serverTime >= this.miningEndTime) {
                    this.miningActive = false;
                    this.miningStartTime = null;
                    this.miningEndTime = null;
                    this.pendingTonReward = this.getDailyTonRate();
                    await this.saveUserData();
                    this.renderMining();
                } else {
                    this.startMiningLoop();
                }
            }
            
            updateProgress(90);
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
                    if (referredBy && referredBy !== this.tgUser.id && referredBy !== this.deviceOwnerId) {
                        const referrerRef = this.db.ref(`users/${referredBy}`);
                        const referrerSnap = await referrerRef.once('value');
                        if (referrerSnap.exists()) {
                            const currentPower = referrerSnap.val().powerBalance ?? 0;
                            const currentVerified = referrerSnap.val().verifiedReferrals ?? 0;
                            const currentReferralPower = referrerSnap.val().referralPower ?? 0;
                            const currentTotalReferrals = referrerSnap.val().totalReferrals ?? 0;
                            await referrerRef.update({ 
                                powerBalance: currentPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                                verifiedReferrals: currentVerified + 1,
                                referralPower: currentReferralPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                                totalReferrals: currentTotalReferrals + 1
                            });
                            
                            await this.db.ref(`referrals/${referredBy}/${this.tgUser.id}`).update({
                                userId: this.tgUser.id,
                                userName: this.tgUser.first_name,
                                userPhoto: this.tgUser.photo_url,
                                state: 'Not Verified',
                                joinedAt: await this.getServerTime()
                            });
                        }
                    }
                }
            }
            
            updateProgress(95);
            await this.loadReferralStats();
            
            this.setupEventListeners();
            this.renderUI();
            this.setupNavigation();
            
            updateProgress(100);
            
            setTimeout(() => {
                const loader = document.getElementById('app-loader');
                if (loader) {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                        document.getElementById('app').style.display = 'block';
                    }, 500);
                } else {
                    document.getElementById('app').style.display = 'block';
                }
            }, 500);
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
            this.powerBalance = d.powerBalance ?? 0;
            this.tonBalance = d.tonBalance ?? 0;
            this.userLevel = d.level ?? 1;
            this.isVerified = d.isVerified ?? false;
            this.hasClaimedWelcome = d.hasClaimedWelcome ?? false;
            this.hasStartedMining = d.hasStartedMining ?? false;
            this.miningActive = d.miningActive ?? false;
            this.miningStartTime = d.miningStartTime ?? null;
            this.miningEndTime = d.miningEndTime ?? null;
            this.pendingTonReward = d.pendingTonReward ?? 0;
            this.tgUser = { id: userId, first_name: d.firstName, username: d.username, photo_url: d.photoUrl };
            const nameSpan = document.getElementById('user-name');
            if (nameSpan) nameSpan.innerText = d.firstName;
            const photoImg = document.getElementById('user-photo');
            if (photoImg) photoImg.src = d.photoUrl || APP_CONFIG.DEFAULT_USER_AVATAR;
            const levelSpan = document.getElementById('user-level');
            if (levelSpan) levelSpan.innerText = this.userLevel;
            const levelBadge = document.getElementById('user-level-badge');
            if (levelBadge) levelBadge.innerText = this.userLevel;
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
            this.powerBalance = d.powerBalance ?? 0;
            this.tonBalance = d.tonBalance ?? 0;
            this.userLevel = d.level ?? 1;
            this.isVerified = d.isVerified ?? false;
            this.hasClaimedWelcome = d.hasClaimedWelcome ?? false;
            this.hasStartedMining = d.hasStartedMining ?? false;
            this.miningActive = d.miningActive ?? false;
            this.miningStartTime = d.miningStartTime ?? null;
            this.miningEndTime = d.miningEndTime ?? null;
            this.pendingTonReward = d.pendingTonReward ?? 0;
        } else {
            const startParam = this.tg.initDataUnsafe?.start_param;
            let referredBy = (startParam && !isNaN(startParam)) ? parseInt(startParam) : null;
            if (referredBy === this.tgUser.id || referredBy === this.deviceOwnerId) referredBy = null;
            await ref.set({
                id: this.tgUser.id,
                username: this.tgUser.username || '',
                firstName: this.tgUser.first_name || 'User',
                photoUrl: this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
                referredBy: referredBy,
                createdAt: await this.getServerTime()
            });
            
            if (referredBy && referredBy !== this.tgUser.id) {
                const referrerRef = this.db.ref(`users/${referredBy}`);
                const referrerSnap = await referrerRef.once('value');
                if (referrerSnap.exists()) {
                    const currentTotal = referrerSnap.val().totalReferrals ?? 0;
                    await referrerRef.update({ totalReferrals: currentTotal + 1 });
                    
                    await this.db.ref(`referrals/${referredBy}/${this.tgUser.id}`).set({
                        userId: this.tgUser.id,
                        userName: this.tgUser.first_name,
                        userPhoto: this.tgUser.photo_url,
                        state: 'Not Verified',
                        joinedAt: await this.getServerTime()
                    });
                }
            }
        }
        const nameSpan = document.getElementById('user-name');
        if (nameSpan) nameSpan.innerText = this.tgUser.first_name || 'User';
        const levelSpan = document.getElementById('user-level');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        const levelBadge = document.getElementById('user-level-badge');
        if (levelBadge) levelBadge.innerText = this.userLevel;
        const photoImg = document.getElementById('user-photo');
        if (photoImg) photoImg.src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
    }
    
    async saveUserData() {
        if (!this.db) return;
        const updates = {};
        if (this.powerBalance !== undefined) updates.powerBalance = this.powerBalance;
        if (this.tonBalance !== undefined) updates.tonBalance = this.tonBalance;
        if (this.userLevel !== undefined) updates.level = this.userLevel;
        if (this.isVerified !== undefined) updates.isVerified = this.isVerified;
        if (this.hasClaimedWelcome !== undefined) updates.hasClaimedWelcome = this.hasClaimedWelcome;
        if (this.hasStartedMining !== undefined) updates.hasStartedMining = this.hasStartedMining;
        if (this.miningActive !== undefined) updates.miningActive = this.miningActive;
        if (this.miningStartTime !== undefined) updates.miningStartTime = this.miningStartTime;
        if (this.miningEndTime !== undefined) updates.miningEndTime = this.miningEndTime;
        if (this.pendingTonReward !== undefined) updates.pendingTonReward = this.pendingTonReward;
        await this.db.ref(`users/${this.tgUser.id}`).update(updates);
    }
    
    async loadCompletedTasks() {
        if (!this.db) {
            this.userCompletedTasks = new Set();
            return;
        }
        const snap = await this.db.ref(`users/${this.tgUser.id}/completedTasks`).once('value');
        this.userCompletedTasks = snap.exists() ? new Set(snap.val()) : new Set();
    }
    
    async loadWithdrawals() {
        if (!this.db) {
            this.withdrawals = [];
            return;
        }
        const snap = await this.db.ref(`withdrawals/${this.tgUser.id}`).once('value');
        this.withdrawals = [];
        if (snap.exists()) {
            snap.forEach(c => {
                this.withdrawals.push({ id: c.key, ...c.val() });
            });
            this.withdrawals.sort((a,b) => b.timestamp - a.timestamp);
        }
    }
    
    async loadReferralStats() {
        if (!this.db) {
            this.totalReferrals = 0;
            this.verifiedReferrals = 0;
            this.referralPower = 0;
            this.referralTon = 0;
            return;
        }
        const snap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.totalReferrals = d.totalReferrals ?? 0;
            this.verifiedReferrals = d.verifiedReferrals ?? 0;
            this.referralPower = d.referralPower ?? 0;
            this.referralTon = d.referralTon ?? 0;
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
        if (!this.db) {
            this.mainTasks = [];
            this.partnerTasks = [];
            return;
        }
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
        if (!this.mainTasks.length) {
            this.mainTasks = [
                { id: 'main_1', name: 'Join Telegram Channel', reward: 50, url: 'https://t.me/STARZ_NEW', verify: true, img: APP_CONFIG.BOT_AVATAR },
                { id: 'main_2', name: 'Follow on Twitter', reward: 30, url: 'https://twitter.com', verify: false, img: APP_CONFIG.BOT_AVATAR }
            ];
        }
        if (!this.partnerTasks.length) {
            this.partnerTasks = [
                { id: 'partner_1', name: 'Partner Task 1', reward: 25, url: 'https://t.me/partner', verify: true, img: APP_CONFIG.BOT_AVATAR }
            ];
        }
    }
    
    renderMining() {
        const el = document.getElementById('mining-page');
        if (!el) return;
        const requiredPower = this.getRequiredPowerForLevel(this.userLevel + 1);
        const progress = Math.min((this.powerBalance / requiredPower) * 100, 100);
        const dailyRate = this.getDailyTonRate();
        
        el.innerHTML = `
            <div class="balance-cards">
                <div class="balance-card"><div class="icon power"><i class="fas fa-bolt"></i></div><span class="label">Power</span><span class="value">${Math.floor(this.powerBalance).toLocaleString()}</span></div>
                <div class="balance-card"><div class="icon ton"><i class="fas fa-coins"></i></div><span class="label">TON</span><span class="value">${this.tonBalance.toFixed(6)}</span></div>
            </div>
            <div class="mining-card">
                <div class="mining-icon"><i class="fas fa-microchip"></i></div>
                <h3>Mining Rig Lv.${this.userLevel}</h3>
                <div class="mining-rate"><i class="fas fa-chart-line"></i> Daily Rate: <span>${dailyRate.toFixed(6)} TON/day</span></div>
                ${this.miningActive ? `<div class="mining-timer"><i class="fas fa-hourglass-half"></i> 00:00:00</div>` : ''}
                ${!this.miningActive ? `<button id="start-mining-btn" class="mining-action-btn"><i class="fas fa-play"></i> START MINING</button>` : ''}
                ${!this.miningActive && this.pendingTonReward > 0 ? `<button id="claim-mining-btn" class="mining-claim-btn"><i class="fas fa-gift"></i> CLAIM REWARD</button>` : ''}
            </div>
            <div class="level-progress"><div class="progress-header"><span>Level ${this.userLevel}</span><span>${Math.floor(this.powerBalance).toLocaleString()} / ${requiredPower.toLocaleString()} Power</span></div><div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div></div>
        `;
        
        document.getElementById('start-mining-btn')?.addEventListener('click', () => this.startMining());
        document.getElementById('claim-mining-btn')?.addEventListener('click', () => this.claimMiningRewards());
        if (this.miningActive) this.updateMiningTimerDisplay();
    }
    
    renderEarn() {
        const el = document.getElementById('earn-page');
        if (!el) return;
        
        const rewardAdCooldown = Math.max(0, APP_CONFIG.AD_COOLDOWN_REWARD - Math.floor((Date.now() - this.lastRewardAdTime) / 1000));
        const adexoraCooldown = Math.max(0, APP_CONFIG.AD_COOLDOWN_ADEXORA - Math.floor((Date.now() - this.lastAdexoraAdTime) / 1000));
        
        const mainTasksHtml = this.mainTasks && this.mainTasks.length ? this.mainTasks.filter(t => !this.userCompletedTasks.has(t.id)).map(t => `
            <div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> +${t.reward} Power</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button></div>
        `).join('') : '<div class="no-data">No tasks available</div>';
        
        const partnerTasksHtml = this.partnerTasks && this.partnerTasks.length ? this.partnerTasks.filter(t => !this.userCompletedTasks.has(t.id)).map(t => `
            <div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> +${t.reward} Power</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button></div>
        `).join('') : '<div class="no-data">No tasks available</div>';
        
        el.innerHTML = `
            <div class="promo-card"><div class="promo-title"><i class="fas fa-gift"></i> Promo Code</div><div class="promo-input-group"><input type="text" id="promo-input" class="form-input" placeholder="Enter code" autocomplete="off"><button id="promo-submit" class="promo-submit-btn" disabled>Claim</button></div></div>
            <div class="section-title"><i class="fas fa-star"></i> Main Tasks</div>
            <div class="tasks-list">${mainTasksHtml}</div>
            <div class="section-title"><i class="fas fa-handshake"></i> Partner Tasks<button id="tasks-info-btn" class="info-icon-btn" style="margin-left:auto;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer"><i class="fas fa-question"></i></button></div>
            <div class="tasks-list">${partnerTasksHtml}</div>
            <div class="section-title"><i class="fas fa-video"></i> Watch Ads</div>
            <div class="ads-section">
                <div class="ad-card"><div class="ad-info"><h4>Watch Reward AD</h4><div class="ad-reward"><i class="fas fa-bolt"></i> +50 Power</div>${rewardAdCooldown > 0 ? `<div class="ad-timer">Available in ${rewardAdCooldown}s</div>` : ''}</div><button class="watch-ad-btn" id="watch-reward-ad" ${rewardAdCooldown > 0 ? 'disabled' : ''}>Watch</button></div>
                <div class="ad-card"><div class="ad-info"><h4>Watch Adexora AD</h4><div class="ad-reward"><i class="fas fa-bolt"></i> +50 Power</div>${adexoraCooldown > 0 ? `<div class="ad-timer">Available in ${adexoraCooldown}s</div>` : ''}</div><button class="watch-ad-btn" id="watch-adexora-ad" ${adexoraCooldown > 0 ? 'disabled' : ''}>Watch</button></div>
            </div>
        `;
        
        const promoInput = document.getElementById('promo-input');
        const promoSubmit = document.getElementById('promo-submit');
        if (promoInput && promoSubmit) {
            promoInput.addEventListener('input', () => {
                promoSubmit.disabled = promoInput.value.trim() === '';
                promoSubmit.classList.toggle('active', !promoSubmit.disabled);
            });
            promoSubmit.addEventListener('click', () => {
                const code = promoInput.value.trim();
                if (code) this.applyPromoCode(code);
                promoInput.value = '';
                promoSubmit.disabled = true;
                promoSubmit.classList.remove('active');
            });
        }
        
        document.getElementById('tasks-info-btn')?.addEventListener('click', () => {
            document.getElementById('tasks-info-modal').style.display = 'flex';
        });
        
        document.getElementById('watch-reward-ad')?.addEventListener('click', () => this.watchRewardAd());
        document.getElementById('watch-adexora-ad')?.addEventListener('click', () => this.watchAdexoraAd());
        
        document.querySelectorAll('.task-btn.start').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (this.isTaskRunning) {
                    this.showNotification('Busy', 'Complete current task first', 'warning');
                    return;
                }
                const id = btn.dataset.id, reward = parseInt(btn.dataset.reward), url = btn.dataset.url, verify = btn.dataset.verify === 'true';
                window.open(url, '_blank');
                this.isTaskRunning = true;
                this.disableAllTaskButtons();
                btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                btn.disabled = true;
                let seconds = APP_CONFIG.TASK_VERIFICATION_DELAY;
                const interval = setInterval(() => {
                    seconds--;
                    if (seconds <= 0) {
                        clearInterval(interval);
                        btn.innerHTML = 'Claim';
                        btn.disabled = false;
                        btn.classList.remove('start');
                        btn.classList.add('check');
                        const newBtn = btn.cloneNode(true);
                        btn.parentNode.replaceChild(newBtn, btn);
                        newBtn.addEventListener('click', async () => {
                            newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                            newBtn.disabled = true;
                            await this.completeTask(id, reward, url, verify, newBtn);
                            newBtn.innerHTML = 'Done';
                            newBtn.classList.remove('check');
                            newBtn.classList.add('done');
                            newBtn.disabled = true;
                            newBtn.style.display = 'none';
                            this.isTaskRunning = false;
                            this.enableAllTaskButtons();
                            this.renderEarn();
                        });
                    }
                }, 1000);
            });
        });
    }
    
    renderTeam() {
        const el = document.getElementById('team-page');
        if (!el) return;
        const link = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Star Farmer and start mining TON!')}`;
        el.innerHTML = `
            <div class="team-benefits"><h3><i class="fas fa-gift"></i> Team Benefits</h3><div class="benefits-list"><div class="benefit-item"><i class="fas fa-coins"></i><div class="benefit-text">Earn 10% of your team members TON earnings</div></div><div class="benefit-item"><i class="fas fa-bolt"></i><div class="benefit-text">Get ${APP_CONFIG.REFERRAL_POWER_BONUS} Power per verified member</div></div></div></div>
            <div class="referral-card"><h4><i class="fas fa-share-alt"></i> SHARE & EARN</h4><div class="link-display">${link}</div><div class="referral-buttons"><button id="copyLink"><i class="fas fa-copy"></i> Copy</button><button id="shareLink"><i class="fab fa-telegram"></i> Share</button></div></div>
            <div class="stats-grid"><div class="stat-mini"><span class="stat-label">Total Members</span><span class="stat-number">${this.totalReferrals}</span></div><div class="stat-mini"><span class="stat-label">Verified Members</span><span class="stat-number">${this.verifiedReferrals}</span></div><div class="stat-mini"><span class="stat-label">Power Earnings</span><span class="stat-number">${Math.floor(this.referralPower).toLocaleString()}</span></div><div class="stat-mini"><span class="stat-label">TON Earnings</span><span class="stat-number">${this.referralTon.toFixed(6)}</span></div></div>
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
        const historyHtml = this.withdrawals && this.withdrawals.length ? this.withdrawals.map(w => `<div class="history-item"><div><small>${new Date(w.timestamp).toLocaleDateString()}</small><br><small>${w.wallet?.slice(0,6)}...${w.wallet?.slice(-4)}</small></div><div class="history-amount">💰 ${w.amount.toFixed(5)} TON</div><div class="history-status ${w.status}">${w.status}</div></div>`).join('') : '<div class="no-data">No withdrawals yet</div>';
        
        el.innerHTML = `
            <div class="withdraw-card"><h3><i class="fas fa-wallet"></i> Withdraw TON</h3><div class="withdraw-balance">💰 Available: ${this.tonBalance.toFixed(6)} TON</div>
            <div class="form-group"><label class="form-label">TON Wallet</label><div class="input-wrapper"><input type="text" id="wallet-addr" class="form-input" placeholder="UQ..."></div></div>
            <div class="form-group"><label class="form-label">Amount</label><div class="input-wrapper"><input type="number" id="withdraw-amount" class="form-input" placeholder="Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON" step="0.00001"><button id="max-amount" class="action-btn">MAX</button></div></div>
            <div class="withdraw-note"><i class="fas fa-info-circle"></i> Minimum withdrawal: ${APP_CONFIG.MINIMUM_WITHDRAW} TON</div>
            <button id="withdraw-btn" class="withdraw-confirm-btn disabled">Confirm Withdrawal</button></div>
            <div class="history-list"><h4><i class="fas fa-history"></i> Withdrawal History</h4>${historyHtml}</div>
        `;
        
        const walletInput = document.getElementById('wallet-addr');
        const amountInput = document.getElementById('withdraw-amount');
        const withdrawBtn = document.getElementById('withdraw-btn');
        const maxBtn = document.getElementById('max-amount');
        
        const checkWithdrawReady = () => {
            const wallet = walletInput?.value.trim();
            const amount = parseFloat(amountInput?.value);
            const isValid = wallet && wallet.length >= 20 && amount >= APP_CONFIG.MINIMUM_WITHDRAW && amount <= this.tonBalance;
            if (withdrawBtn) {
                if (isValid) withdrawBtn.classList.remove('disabled');
                else withdrawBtn.classList.add('disabled');
            }
        };
        
        maxBtn?.addEventListener('click', () => {
            if (amountInput) {
                amountInput.value = this.tonBalance.toFixed(6);
                checkWithdrawReady();
            }
        });
        
        walletInput?.addEventListener('input', checkWithdrawReady);
        amountInput?.addEventListener('input', checkWithdrawReady);
        
        withdrawBtn?.addEventListener('click', () => {
            if (withdrawBtn.classList.contains('disabled')) return;
            const amount = parseFloat(amountInput.value);
            const wallet = walletInput.value.trim();
            this.withdraw(amount, wallet);
        });
    }
    
    setupEventListeners() {
        document.getElementById('support-btn').onclick = () => window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        document.getElementById('close-tasks-info')?.addEventListener('click', () => {
            document.getElementById('tasks-info-modal').style.display = 'none';
        });
        document.getElementById('contact-support-modal')?.addEventListener('click', () => {
            window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        });
        window.addEventListener('beforeunload', () => {
            if (this.miningActive) this.saveUserData();
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
                if (id === 'mining-page') this.renderMining();
                else if (id === 'earn-page') this.renderEarn();
                else if (id === 'team-page') this.renderTeam();
                else if (id === 'withdraw-page') this.renderWithdraw();
            });
        });
    }
    
    renderUI() {
        this.renderMining();
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
