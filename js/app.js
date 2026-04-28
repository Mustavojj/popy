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
        this.lastHashUpdate = null;
        this.miningInterval = null;
        this.uiUpdateInterval = null;
        this.withdrawals = [];
        this.totalReferrals = 0;
        this.verifiedReferrals = 0;
        this.referralPower = 0;
        this.referralTon = 0;
        
        this.soundEnabled = true;
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
        const confirmed = confirm(`📺 Watch an ad to ${action}?`);
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
        }
        this.userLevel = newLevel;
    }
    
    getMiningRate() {
        return this.powerBalance * APP_CONFIG.POWER_PER_HASH_RATE;
    }
    
    async calculatePendingHash() {
        if (!this.miningActive || !this.miningStartTime) return 0;
        const now = await this.getServerTime();
        const elapsedSeconds = Math.floor((now - this.miningStartTime) / 1000);
        const ratePerSecond = this.getMiningRate();
        return elapsedSeconds * ratePerSecond;
    }
    
    async updateMiningDisplay() {
        const pending = await this.calculatePendingHash();
        const pendingEl = document.getElementById('pending-hash-amount');
        if (pendingEl) pendingEl.innerText = pending.toFixed(4);
    }
    
    async startMining() {
        const ad = await this.showAd('AdBlock1', 'start mining');
        if (!ad) return;
        
        const now = await this.getServerTime();
        this.miningActive = true;
        this.miningStartTime = now;
        this.miningEndTime = now + (APP_CONFIG.MINING_SESSION_HOURS * 3600000);
        this.lastHashUpdate = now;
        
        await this.saveMiningState();
        this.renderHome();
        this.startMiningLoop();
        this.showNotification('Mining Started!', 'Your rig is now mining HASH', 'success');
    }
    
    async stopMining() {
        if (!this.miningActive) return;
        
        const earned = await this.calculatePendingHash();
        if (earned > 0) {
            this.pendingHash += earned;
        }
        
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
            }
        }, 60000);
        
        this.uiUpdateInterval = setInterval(() => {
            this.updateMiningDisplay();
        }, 1000);
    }
    
    async claimHash() {
        if (this.pendingHash <= 0) {
            this.showNotification('No Earnings', 'Nothing to claim yet', 'warning');
            return;
        }
        this.hashBalance += this.pendingHash;
        this.pendingHash = 0;
        await this.saveUserData();
        this.renderHome();
        this.showNotification('Claimed!', `${this.hashBalance.toFixed(2)} HASH total`, 'success');
        this.vibrate('success');
    }
    
    async exchangeHash(amount) {
        if (amount <= 0 || amount > this.hashBalance) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const tonAmount = amount / APP_CONFIG.HASH_PER_TON;
        const ad = await this.showAd('AdBlock2', `exchange ${amount.toFixed(0)} HASH to ${tonAmount.toFixed(6)} TON`);
        if (!ad) return false;
        
        this.hashBalance -= amount;
        this.tonBalance += tonAmount;
        await this.saveUserData();
        
        if (this.db && this.tgUser.id) {
            await this.addReferralEarnings(this.tgUser.id, tonAmount);
        }
        
        this.renderHome();
        this.showNotification('Exchanged!', `${amount.toFixed(0)} HASH → ${tonAmount.toFixed(6)} TON`, 'success');
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
        code = code.toUpperCase();
        const promoCodes = {
            'POWER100': { power: 100 },
            'POWER500': { power: 500 },
            'START10': { power: 10 },
            'FARMER': { power: 200 }
        };
        const promo = promoCodes[code];
        if (!promo) {
            this.showNotification('Invalid Code', 'Promo code not found', 'error');
            return false;
        }
        
        const usedRef = this.db.ref(`usedPromoCodes/${this.tgUser.id}/${code}`);
        const usedSnap = await usedRef.once('value');
        if (usedSnap.exists()) {
            this.showNotification('Already Used', 'Code already redeemed', 'warning');
            return false;
        }
        
        await usedRef.set(true);
        
        if (promo.power) {
            this.powerBalance += promo.power;
            await this.updateLevelFromPower();
        }
        
        await this.saveUserData();
        this.renderHome();
        this.showNotification('Code Applied!', `+${promo.power} Power`, 'success');
        return true;
    }
    
    async claimWelcomeBonus() {
        if (this.hasClaimedWelcome) return;
        const ad = await this.showAd('AdBlock1', 'claim welcome bonus');
        if (!ad) return;
        
        this.powerBalance += APP_CONFIG.WELCOME_BONUS_POWER;
        this.isVerified = true;
        this.hasClaimedWelcome = true;
        await this.updateLevelFromPower();
        await this.saveUserData();
        
        if (this.db) {
            await this.db.ref(`users/${this.tgUser.id}`).update({ isVerified: true, hasClaimedWelcome: true });
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
        
        document.getElementById('welcome-bonus-modal').style.display = 'none';
        this.renderHome();
        this.showNotification('Welcome Bonus!', `+${APP_CONFIG.WELCOME_BONUS_POWER} Power`, 'success');
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
            
            if (this.miningActive && this.miningEndTime) {
                const now = await this.getServerTime();
                if (now >= this.miningEndTime) {
                    this.miningActive = false;
                    this.miningStartTime = null;
                    this.miningEndTime = null;
                    await this.saveMiningState();
                } else {
                    this.startMiningLoop();
                }
            }
            
            this.setupEventListeners();
            this.renderUI();
            this.setupNavigation();
            
            if (!this.hasClaimedWelcome && !this.isVerified) {
                document.getElementById('welcome-bonus-modal').style.display = 'flex';
                document.getElementById('claim-welcome-btn').onclick = () => this.claimWelcomeBonus();
            }
            
            document.getElementById('app-loader').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            this.isInitialized = true;
            
            setInterval(async () => {
                if (this.miningActive) {
                    const earned = await this.calculatePendingHash();
                    if (earned > 0) {
                        this.pendingHash = earned;
                        await this.saveMiningState();
                        this.updateMiningDisplay();
                    }
                }
            }, 30000);
            
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
        }
    }
    
    renderHome() {
        const el = document.getElementById('home-page');
        if (!el) return;
        const requiredPower = this.getRequiredPowerForLevel(this.userLevel + 1);
        const progress = Math.min((this.powerBalance / requiredPower) * 100, 100);
        const ratePerHour = this.getMiningRate() * 3600;
        const remainingTime = this.miningEndTime ? Math.max(0, (this.miningEndTime - Date.now()) / 1000) : 0;
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = Math.floor(remainingTime % 60);
        
        el.innerHTML = `
            <div class="balance-cards">
                <div class="balance-card"><div class="icon power"><i class="fas fa-bolt"></i></div><span class="label">Power</span><span class="value">${this.powerBalance.toFixed(0)}</span></div>
                <div class="balance-card"><div class="icon hash"><i class="fas fa-microchip"></i></div><span class="label">HASH</span><span class="value">${this.hashBalance.toFixed(2)}</span></div>
                <div class="balance-card"><div class="icon ton"><i class="fas fa-coins"></i></div><span class="label">TON</span><span class="value">${this.tonBalance.toFixed(6)}</span></div>
            </div>
            <div class="mining-card">
                <div class="mining-icon"><i class="fas fa-microchip"></i></div>
                <h3>Mining Rig Lv.${this.userLevel}</h3>
                <div class="mining-rate">⚡ Rate: <span>${ratePerHour.toFixed(2)} HASH/hour</span></div>
                <div class="mining-status ${this.miningActive ? 'active' : 'stopped'}">${this.miningActive ? '● ACTIVE' : '● STOPPED'}</div>
                ${this.miningActive ? `<div class="mining-timer"><i class="fas fa-hourglass-half"></i> ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}</div>` : ''}
                ${!this.miningActive ? `<button id="start-mining-btn" class="mining-action-btn"><i class="fas fa-play"></i> Start Mining</button>` : ''}
            </div>
            <div class="hash-row"><div><i class="fas fa-microchip"></i> Pending HASH</div><div class="hash-amount" id="pending-hash-amount">${this.pendingHash.toFixed(4)} HASH</div><button id="claim-hash-btn" class="claim-btn">Claim</button></div>
            <div class="level-progress"><div class="progress-header"><span>Level ${this.userLevel}</span><span>${this.powerBalance.toFixed(0)} / ${requiredPower.toFixed(0)} Power</span></div><div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div></div>
            <div class="exchange-card"><div class="exchange-header"><h3><i class="fas fa-exchange-alt"></i> Exchange to TON</h3><div class="exchange-balance"><i class="fas fa-microchip"></i> ${this.hashBalance.toFixed(2)} HASH</div></div><div class="exchange-group"><input type="number" id="exchange-amount" class="form-input" placeholder="HASH amount"><button id="exchange-btn" class="submit-btn">Exchange</button></div><div class="rate-info" style="margin-top:12px;font-size:0.7rem;color:#888"><i class="fas fa-info-circle"></i> ${APP_CONFIG.HASH_PER_TON.toLocaleString()} HASH = 1 TON</div></div>
        `;
        
        document.getElementById('start-mining-btn')?.addEventListener('click', () => this.startMining());
        document.getElementById('claim-hash-btn')?.addEventListener('click', () => this.claimHash());
        document.getElementById('exchange-btn')?.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('exchange-amount').value);
            if (amount > 0) this.exchangeHash(amount);
        });
    }
    
    renderEarn() {
        const el = document.getElementById('earn-page');
        if (!el) return;
        const tasks = [
            { id: 'main_1', name: 'Join Telegram Channel', reward: 50, url: 'https://t.me/STARZ_NEW', verify: true, img: APP_CONFIG.BOT_AVATAR },
            { id: 'main_2', name: 'Follow on Twitter', reward: 30, url: 'https://twitter.com', verify: false, img: APP_CONFIG.BOT_AVATAR },
            { id: 'main_3', name: 'Subscribe on YouTube', reward: 40, url: 'https://youtube.com', verify: false, img: APP_CONFIG.BOT_AVATAR },
            { id: 'partner_1', name: 'Partner Task 1', reward: 25, url: 'https://t.me/partner', verify: true, img: APP_CONFIG.BOT_AVATAR },
            { id: 'partner_2', name: 'Partner Task 2', reward: 25, url: 'https://t.me/partner2', verify: true, img: APP_CONFIG.BOT_AVATAR }
        ];
        const renderTask = (t) => {
            const completed = this.userCompletedTasks.has(t.id);
            return `<div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> +${t.reward} Power</div></div>${!completed ? `<button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button>` : `<button class="task-btn done" disabled>Done</button>`}</div>`;
        };
        el.innerHTML = `
            <div class="promo-card"><div class="promo-title"><i class="fas fa-gift"></i> Promo Code</div><div class="exchange-group"><input type="text" id="promo-input" class="form-input" placeholder="Enter code" autocomplete="off"><button id="promo-submit" class="submit-btn">Claim</button></div></div>
            <div class="tasks-header"><h3><i class="fas fa-star"></i> Main Tasks</h3></div>
            <div class="tasks-list">${tasks.filter(t => t.id.startsWith('main')).map(renderTask).join('')}</div>
            <div class="tasks-header"><h3><i class="fas fa-handshake"></i> Partner Tasks</h3><button id="tasks-info-btn" class="info-icon-btn"><i class="fas fa-question"></i></button></div>
            <div class="tasks-list">${tasks.filter(t => t.id.startsWith('partner')).map(renderTask).join('')}</div>
        `;
        document.getElementById('promo-submit')?.addEventListener('click', () => {
            const code = document.getElementById('promo-input').value.trim();
            if (code) this.applyPromoCode(code);
            document.getElementById('promo-input').value = '';
        });
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
    }
    
    renderTeam() {
        const el = document.getElementById('team-page');
        if (!el) return;
        const link = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Star Farmer and start mining HASH!')}`;
        el.innerHTML = `
            <div class="team-benefits"><h3><i class="fas fa-gift"></i> Team Benefits</h3><p><i class="fas fa-coins"></i> Earn 10% of your team members TON earnings</p><p><i class="fas fa-bolt"></i> Get ${APP_CONFIG.REFERRAL_POWER_BONUS} Power per verified member</p></div>
            <div class="referral-link-box"><div class="link-display">${link}</div><button class="copy-btn" id="copyLink"><i class="fas fa-copy"></i> Copy Link</button><button class="share-btn" id="shareLink"><i class="fab fa-telegram"></i> Share on Telegram</button></div>
            <div class="stats-grid"><div class="stat-mini"><i class="fas fa-users"></i><span class="stat-num">${this.totalReferrals}</span><span class="stat-label">Total Members</span></div><div class="stat-mini"><i class="fas fa-check-circle"></i><span class="stat-num">${this.verifiedReferrals}</span><span class="stat-label">Verified</span></div><div class="stat-mini"><i class="fas fa-bolt"></i><span class="stat-num">${this.referralPower}</span><span class="stat-label">Power</span></div><div class="stat-mini"><i class="fas fa-coins"></i><span class="stat-num">${this.referralTon.toFixed(6)}</span><span class="stat-label">TON</span></div></div>
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
        const historyHtml = this.withdrawals.map(w => `<div class="history-item"><div><small>${new Date(w.timestamp).toLocaleDateString()}</small><br><small>${w.wallet?.slice(0,6)}...${w.wallet?.slice(-4)}</small></div><div class="history-amount">${w.amount.toFixed(4)} TON</div><div class="history-status ${w.status}">${w.status}</div></div>`).join('');
        el.innerHTML = `
            <div class="withdraw-card"><div class="withdraw-balance"><i class="fas fa-coins" style="color:#0088CC"></i><span>Available: ${this.tonBalance.toFixed(6)} TON</span></div><div class="form-group"><input type="text" id="wallet-addr" class="form-input" placeholder="TON Wallet (UQ...)"></div><div class="form-group"><input type="number" id="withdraw-amount" class="form-input" placeholder="Amount (Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON)"></div><button id="withdraw-btn" class="submit-btn">Withdraw</button></div>
            <div class="history-list"><h3><i class="fas fa-history"></i> Withdrawal History</h3>${historyHtml || '<div class="no-data">No withdrawals yet</div>'}</div>
        `;
        document.getElementById('withdraw-btn')?.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('withdraw-amount').value);
            const wallet = document.getElementById('wallet-addr').value.trim();
            this.withdraw(amount, wallet);
        });
    }
    
    setupEventListeners() {
        document.getElementById('support-btn').onclick = () => window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        document.getElementById('settings-btn').onclick = () => document.getElementById('settings-modal').style.display = 'flex';
        document.getElementById('close-settings').onclick = () => document.getElementById('settings-modal').style.display = 'none';
        document.getElementById('close-tasks-info').onclick = () => document.getElementById('tasks-info-modal').style.display = 'none';
        document.getElementById('contact-support-modal-btn').onclick = () => window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        document.getElementById('sound-toggle').onchange = (e) => { this.soundEnabled = e.target.checked; this.saveSettings(); };
        document.getElementById('vibration-toggle').onchange = (e) => { this.vibrationEnabled = e.target.checked; this.saveSettings(); };
        window.addEventListener('beforeunload', () => {
            if (this.miningActive) this.saveMiningState();
        });
    }
    
    saveSettings() {
        localStorage.setItem('star_farmer_settings', JSON.stringify({ sound: this.soundEnabled, vibration: this.vibrationEnabled }));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('star_farmer_settings');
        if (saved) {
            const s = JSON.parse(saved);
            this.soundEnabled = s.sound !== false;
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
