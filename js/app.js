import { APP_CONFIG, CORE_CONFIG } from './data.js';

let notificationStylesAdded = false;

class App {
    constructor() {
        this.tg = null;
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.tgUser = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.serverTimeOffset = 0;
        this.isDarkMode = false;
        this.deviceId = null;
        this.deviceOwnerId = null;
        
        this.miningBalance = 0;
        this.availableBalance = 0;
        this.referralEarnings = { ton: 0, egg: 0 };
        this.activePlans = [];
        this.userCompletedTasks = new Set();
        this.pendingEggs = {};
        
        this.miningPlans = APP_CONFIG.MINING_PLANS;
        this.miningInterval = null;
        
        this.icons = {
            egg: "https://cdn-icons-png.flaticon.com/512/8416/8416453.png",
            ton: "https://cdn-icons-png.flaticon.com/512/12114/12114247.png"
        };
        
        this.hourlyEarnings = 0;
        this.dailyEarnings = 0;
        this.notificationQueue = [];
        this.showingNotification = false;
    }
    
    vibrate(type = 'success') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            if (type === 'success') window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            else if (type === 'error') window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            else if (type === 'warning') window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
            else window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }
    
    addNotificationStyles() {
        if (notificationStylesAdded) return;
        notificationStylesAdded = true;
        const style = document.createElement('style');
        style.textContent = `
            .notif { position:fixed; top:80px; left:50%; transform:translateX(-50%); width:85%; max-width:340px; background:rgba(30,40,50,0.95); backdrop-filter:blur(12px); border-radius:16px; padding:14px; z-index:10000; animation:slideIn 0.3s; border-left:4px solid; display:flex; align-items:center; gap:12px; }
            .notif.success { border-left-color:#2ecc71; }
            .notif.error { border-left-color:#e74c3c; }
            .notif.warning { border-left-color:#f39c12; }
            .notif.info { border-left-color:#3498db; }
            @keyframes slideIn { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
            @keyframes slideOut { to { opacity:0; transform:translateX(-50%) translateY(20px); } }
        `;
        document.head.appendChild(style);
    }
    
    showNotification(title, message, type = 'info') {
        this.vibrate(type);
        this.addNotificationStyles();
        this.notificationQueue.push({ title, message, type });
        this.processNotificationQueue();
    }
    
    async processNotificationQueue() {
        if (this.showingNotification || this.notificationQueue.length === 0) return;
        this.showingNotification = true;
        const n = this.notificationQueue.shift();
        const el = document.createElement('div');
        el.className = `notif ${n.type}`;
        let icon = 'fa-info-circle';
        if (n.type === 'success') icon = 'fa-check-circle';
        if (n.type === 'error') icon = 'fa-exclamation-circle';
        if (n.type === 'warning') icon = 'fa-exclamation-triangle';
        el.innerHTML = `<div style="width:32px;height:32px;border-radius:12px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><i class="fas ${icon}"></i></div><div style="flex:1"><div style="font-weight:700;font-size:0.9rem">${n.title}</div><div style="font-size:0.75rem">${n.message}</div></div>`;
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 3000));
        el.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => el.remove(), 300);
        this.showingNotification = false;
        setTimeout(() => this.processNotificationQueue(), 500);
    }
    
    async showAd(block, actionName = '') {
        if (actionName) {
            const confirmed = confirm(`Watch an ad to ${actionName}?`);
            if (!confirmed) return false;
        }
        try {
            if (window[block]) await window[block].show();
            return true;
        } catch(e) { return true; }
    }
    
    async getDeviceFingerprint() {
        const userAgent = navigator.userAgent;
        const screenRes = `${window.screen.width}x${window.screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const deviceString = `${userAgent}|${screenRes}|${timezone}`;
        let hash = 0;
        for (let i = 0; i < deviceString.length; i++) {
            hash = ((hash << 5) - hash) + deviceString.charCodeAt(i);
            hash = hash & hash;
        }
        return 'dev_' + Math.abs(hash).toString(16);
    }
    
    async checkDeviceAndGetOwner() {
        try {
            if (!this.db) return null;
            this.deviceId = await this.getDeviceFingerprint();
            const savedId = localStorage.getItem('device_fingerprint');
            if (savedId && savedId !== this.deviceId) this.deviceId = savedId;
            else localStorage.setItem('device_fingerprint', this.deviceId);
            
            const deviceRef = await this.db.ref(`devices/${this.deviceId}`).once('value');
            if (deviceRef.exists()) {
                const deviceData = deviceRef.val();
                this.deviceOwnerId = deviceData.ownerId;
                await this.db.ref(`devices/${this.deviceId}`).update({ lastSeen: this.getServerTime(), lastUserId: this.tgUser.id });
                return this.deviceOwnerId;
            } else {
                await this.db.ref(`devices/${this.deviceId}`).set({
                    ownerId: this.tgUser.id,
                    firstSeen: this.getServerTime(),
                    lastSeen: this.getServerTime(),
                    userAgent: navigator.userAgent
                });
                this.deviceOwnerId = this.tgUser.id;
                return null;
            }
        } catch(e) { return null; }
    }
    
    async initialize() {
        if (this.isInitializing || this.isInitialized) return;
        this.isInitializing = true;
        
        try {
            if (!window.Telegram || !window.Telegram.WebApp) throw new Error('Open from Telegram');
            this.tg = window.Telegram.WebApp;
            if (!this.tg.initDataUnsafe?.user) throw new Error('No user data');
            this.tgUser = this.tg.initDataUnsafe.user;
            this.tg.ready();
            this.tg.expand();
            
            const savedTheme = localStorage.getItem('theme_mode');
            this.isDarkMode = savedTheme === 'night';
            this.applyTheme();
            
            document.getElementById('theme-toggle')?.addEventListener('click', () => {
                this.isDarkMode = !this.isDarkMode;
                this.applyTheme();
                localStorage.setItem('theme_mode', this.isDarkMode ? 'night' : 'day');
            });
            
            await this.initFirebase();
            await this.syncTime();
            
            const existingOwnerId = await this.checkDeviceAndGetOwner();
            
            if (existingOwnerId && existingOwnerId !== this.tgUser.id) {
                await this.loadUserById(existingOwnerId);
            } else {
                await this.loadUserData();
            }
            
            await this.loadActivePlans();
            this.startMiningLoop();
            await this.loadTasks();
            
            this.renderUI();
            this.setupNav();
            
            this.isInitialized = true;
            document.getElementById('app-loader').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            
        } catch (err) {
            console.error('Init error:', err);
            const loader = document.getElementById('app-loader');
            const errorDiv = document.getElementById('loader-error');
            if (errorDiv) {
                errorDiv.textContent = `Error: ${err.message}`;
                errorDiv.style.display = 'block';
            }
            this.isInitializing = false;
        }
    }
    
    async loadUserById(userId) {
        if (!this.db) throw new Error('No db');
        const ref = this.db.ref(`users/${userId}`);
        const snap = await ref.once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.miningBalance = this.safeNumber(d.miningBalance);
            this.availableBalance = this.safeNumber(d.availableBalance);
            this.referralEarnings = d.referralEarnings || { ton: 0, egg: 0 };
            this.userCompletedTasks = new Set(d.completedTasks || []);
            this.pendingEggs = d.pendingEggs || {};
            this.tgUser = { id: userId, first_name: d.firstName, username: d.username, photo_url: d.photoUrl };
            document.getElementById('user-name').innerText = d.firstName;
            const photo = document.getElementById('user-photo');
            if (photo) photo.src = d.photoUrl || APP_CONFIG.DEFAULT_USER_AVATAR;
        }
    }
    
    applyTheme() {
        const theme = this.isDarkMode ? 'dark-mode' : 'light-mode';
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(theme);
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.innerHTML = this.isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    async initFirebase() {
        try {
            const res = await fetch('/api/firebase-config', { method: 'POST' });
            const { encrypted } = await res.json();
            const config = JSON.parse(atob(encrypted));
            let app;
            try { app = firebase.initializeApp(config); } catch(e) { app = firebase.app(); }
            this.db = app.database();
            this.auth = app.auth();
            await this.auth.signInAnonymously();
            await new Promise((resolve, reject) => {
                const unsub = this.auth.onAuthStateChanged(u => { if(u) { unsub(); resolve(u); } });
                setTimeout(() => { unsub(); reject(new Error('Auth timeout')); }, 10000);
            });
        } catch(e) { throw new Error('Firebase failed: ' + e.message); }
    }
    
    async syncTime() {
        try {
            const res = await fetch('/api/time');
            const { serverTime } = await res.json();
            this.serverTimeOffset = serverTime - Date.now();
        } catch(e) { this.serverTimeOffset = 0; }
    }
    
    getServerTime() { return Date.now() + this.serverTimeOffset; }
    safeNumber(v) { return (v === null || v === undefined || isNaN(Number(v))) ? 0 : Number(v); }
    
    async loadUserData() {
        if (!this.db) throw new Error('No db');
        const ref = this.db.ref(`users/${this.tgUser.id}`);
        const snap = await ref.once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.miningBalance = this.safeNumber(d.miningBalance);
            this.availableBalance = this.safeNumber(d.availableBalance);
            this.referralEarnings = d.referralEarnings || { ton: 0, egg: 0 };
            this.userCompletedTasks = new Set(d.completedTasks || []);
            this.pendingEggs = d.pendingEggs || {};
        } else {
            const startParam = this.tg.initDataUnsafe?.start_param;
            let referredBy = null;
            if (startParam && !isNaN(startParam)) referredBy = parseInt(startParam);
            await ref.set({
                id: this.tgUser.id,
                username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
                firstName: this.tgUser.first_name || 'User',
                photoUrl: this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
                miningBalance: 0,
                availableBalance: 0,
                referralEarnings: { ton: 0, egg: 0 },
                totalReferrals: 0,
                referredBy: referredBy,
                createdAt: this.getServerTime(),
                completedTasks: [],
                pendingEggs: {}
            });
            if (referredBy) {
                await this.addReferralBonus(this.tgUser.id, referredBy);
            }
        }
        document.getElementById('user-name').innerText = this.tgUser.first_name || 'User';
        const photo = document.getElementById('user-photo');
        if (photo) photo.src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
    }
    
    async addReferralBonus(newUserId, referrerId) {
        try {
            const bonus = APP_CONFIG.REFERRAL_BONUS;
            const referrerRef = this.db.ref(`users/${referrerId}`);
            const snap = await referrerRef.once('value');
            if (snap.exists()) {
                const data = snap.val();
                const newBalance = this.safeNumber(data.availableBalance) + bonus;
                const newTotal = (data.totalReferrals || 0) + 1;
                await referrerRef.update({ availableBalance: newBalance, totalReferrals: newTotal });
            }
        } catch(e) {}
    }
    
    async loadActivePlans() {
        if (!this.db) return;
        const snap = await this.db.ref(`mining/plans/${this.tgUser.id}`).once('value');
        this.activePlans = [];
        if (snap.exists()) {
            snap.forEach(c => {
                const p = c.val();
                if (p.status !== 'finished') this.activePlans.push({ id: c.key, ...p });
            });
        }
        this.updateEarnings();
    }
    
    updateEarnings() {
        this.hourlyEarnings = 0;
        for (const p of this.activePlans) {
            if (p.status === 'active') this.hourlyEarnings += this.miningPlans[p.type].hourlyRate;
        }
        this.dailyEarnings = this.hourlyEarnings * 24;
    }
    
    startMiningLoop() {
        if (this.miningInterval) clearInterval(this.miningInterval);
        const process = async () => {
            let updated = false;
            const now = this.getServerTime();
            for (const p of this.activePlans) {
                if (p.status !== 'active') continue;
                const sessionEnd = p.sessionEnd || (p.startedAt + APP_CONFIG.MINING_SESSION_HOURS * 3600000);
                if (now >= sessionEnd) {
                    p.status = 'paused';
                    p.pausedAt = sessionEnd;
                    updated = true;
                    await this.sendMiningStop(p.type);
                    continue;
                }
                const last = p.lastMiningUpdate || p.startedAt;
                const elapsed = Math.min(now - last, sessionEnd - last);
                if (elapsed >= 3600000) {
                    const hours = Math.floor(elapsed / 3600000);
                    const earn = hours * this.miningPlans[p.type].hourlyRate;
                    if (!this.pendingEggs[p.id]) this.pendingEggs[p.id] = 0;
                    this.pendingEggs[p.id] += earn;
                    p.lastMiningUpdate = last + hours * 3600000;
                    updated = true;
                }
            }
            if (updated) {
                await this.saveMiningData();
                this.updateAll();
            }
        };
        process();
        this.miningInterval = setInterval(process, 60000);
    }
    
    async claimPlanEarnings(planId) {
        const amount = this.pendingEggs[planId] || 0;
        if (amount <= 0) {
            this.showNotification('No Earnings', 'Nothing to claim yet', 'warning');
            return;
        }
        this.miningBalance += amount;
        this.pendingEggs[planId] = 0;
        await this.saveMiningData();
        this.updateAll();
        this.showNotification('Claimed!', `+${amount.toFixed(2)} Eggs`, 'success');
        this.vibrate('success');
    }
    
    async saveMiningData() {
        if (!this.db) return;
        await this.db.ref(`users/${this.tgUser.id}`).update({
            miningBalance: this.miningBalance,
            availableBalance: this.availableBalance,
            referralEarnings: this.referralEarnings,
            pendingEggs: this.pendingEggs
        });
        for (const p of this.activePlans) {
            await this.db.ref(`mining/plans/${this.tgUser.id}/${p.id}`).update({
                status: p.status,
                lastMiningUpdate: p.lastMiningUpdate,
                sessionEnd: p.sessionEnd
            });
        }
    }
    
    async sendMiningStop(type) {
        try {
            await fetch('/api/bot-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mining_stopped', userId: this.tgUser.id, planType: type, firstName: this.tgUser.first_name })
            });
        } catch(e) {}
    }
    
    async buyPlan(type) {
        const plan = this.miningPlans[type];
        if (plan.price > 0 && this.availableBalance < plan.price) {
            this.showNotification('Insufficient', `Need ${plan.price} TON`, 'error');
            return false;
        }
        if (this.activePlans.find(p => p.type === type && p.status !== 'finished')) {
            this.showNotification('Already owned', 'You already have this plan', 'warning');
            return false;
        }
        const ad = await this.showAd('AdBlock1', 'buy this plan');
        if (!ad) { this.showNotification('Ad required', 'Watch ad to continue', 'info'); return false; }
        if (plan.price > 0) this.availableBalance -= plan.price;
        const now = this.getServerTime();
        const newPlan = {
            id: `${type}_${now}`,
            type: type,
            name: plan.name,
            price: plan.price,
            hourlyRate: plan.hourlyRate,
            startedAt: now,
            lastMiningUpdate: now,
            sessionEnd: now + APP_CONFIG.MINING_SESSION_HOURS * 3600000,
            planEnd: now + plan.durationDays * 86400000,
            status: 'active'
        };
        this.activePlans.push(newPlan);
        this.pendingEggs[newPlan.id] = 0;
        await this.saveMiningData();
        if (this.db) await this.db.ref(`mining/plans/${this.tgUser.id}/${newPlan.id}`).set(newPlan);
        this.updateAll();
        this.showNotification('Plan Active!', `${plan.name} started!`, 'success');
        return true;
    }
    
    async startPlan(planId) {
        const plan = this.activePlans.find(p => p.id === planId);
        if (!plan || plan.status !== 'paused') return;
        const ad = await this.showAd('AdBlock1', 'start mining');
        if (!ad) { this.showNotification('Ad required', 'Watch ad to start', 'info'); return; }
        plan.status = 'active';
        plan.sessionEnd = this.getServerTime() + APP_CONFIG.MINING_SESSION_HOURS * 3600000;
        plan.lastMiningUpdate = this.getServerTime();
        await this.saveMiningData();
        this.updateAll();
        this.showNotification('Mining Started!', 'Your session has begun', 'success');
    }
    
    getRemaining(plan) {
        const now = this.getServerTime();
        if (plan.status === 'active') return Math.max(0, plan.sessionEnd - now);
        const total = APP_CONFIG.MINING_SESSION_HOURS * 3600000;
        const elapsed = (plan.pausedAt || (plan.startedAt + total)) - (plan.sessionEnd - total);
        return Math.max(0, total - elapsed);
    }
    
    getPlanTimeRemaining(plan) {
        const now = this.getServerTime();
        const end = plan.planEnd;
        const remaining = Math.max(0, end - now);
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        return `${days}d ${hours}h ${minutes}m`;
    }
    
    formatTime(ms) {
        if (ms <= 0) return '00:00:00';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
    
    async exchange(amount) {
        const rate = APP_CONFIG.EXCHANGE_RATE;
        const tonAmount = amount / rate;
        if (amount <= 0 || amount > this.miningBalance) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const ad = await this.showAd('AdBlock2', 'exchange Eggs to TON');
        if (!ad) { this.showNotification('Ad required', 'Watch ad to exchange', 'info'); return false; }
        this.miningBalance -= amount;
        this.availableBalance += tonAmount;
        await this.saveMiningData();
        this.updateAll();
        this.showNotification('Exchanged!', `${amount} Eggs → ${tonAmount.toFixed(4)} TON`, 'success');
        return true;
    }
    
    async withdraw(amount, wallet) {
        const min = APP_CONFIG.MINIMUM_WITHDRAW;
        if (!wallet || wallet.length < 20) { this.showNotification('Error', 'Invalid wallet', 'error'); return false; }
        if (amount < min || amount > this.availableBalance) { this.showNotification('Error', 'Invalid amount', 'error'); return false; }
        const ad = await this.showAd('AdBlock2', 'withdraw TON');
        if (!ad) { this.showNotification('Ad required', 'Watch ad to withdraw', 'info'); return false; }
        this.availableBalance -= amount;
        await this.saveMiningData();
        const id = `WD_${Date.now()}`;
        if (this.db) await this.db.ref(`withdrawals/pending/${id}`).set({ userId: this.tgUser.id, amount, wallet, timestamp: this.getServerTime() });
        this.updateAll();
        this.showNotification('Withdrawn!', `${amount.toFixed(4)} TON requested`, 'success');
        return true;
    }
    
    async completeTask(taskId, reward) {
        if (this.userCompletedTasks.has(taskId)) return;
        this.userCompletedTasks.add(taskId);
        this.miningBalance += reward;
        await this.saveMiningData();
        if (this.db) await this.db.ref(`users/${this.tgUser.id}`).update({ completedTasks: Array.from(this.userCompletedTasks) });
        this.updateAll();
        this.showNotification('Task Done!', `+${reward.toFixed(2)} Eggs`, 'success');
    }
    
    async loadTasks() {
        const main = [
            { id: 't1', name: 'Join Telegram Channel', reward: 5, url: 'https://t.me/STARZ_NEW', img: APP_CONFIG.BOT_AVATAR },
            { id: 't2', name: 'Follow on Twitter', reward: 5, url: 'https://twitter.com', img: APP_CONFIG.BOT_AVATAR },
            { id: 't3', name: 'Subscribe on YouTube', reward: 10, url: 'https://youtube.com', img: APP_CONFIG.BOT_AVATAR }
        ];
        const partner = [
            { id: 'p1', name: 'Partner Task 1', reward: 3, url: 'https://t.me/partner', img: APP_CONFIG.BOT_AVATAR },
            { id: 'p2', name: 'Partner Task 2', reward: 4, url: 'https://t.me/partner2', img: APP_CONFIG.BOT_AVATAR }
        ];
        this.mainTasks = main;
        this.partnerTasks = partner;
    }
    
    updateAll() {
        this.updateEarnings();
        this.renderHome();
        this.renderPlans();
        this.renderTasks();
        this.renderTeam();
        this.renderProfile();
    }
    
    renderHome() {
        const el = document.getElementById('home-page');
        if (!el) return;
        el.innerHTML = `
            <div class="home-stats">
                <div class="stat-card"><div class="stat-icon"><img src="${this.icons.egg}"></div><div class="stat-content"><span class="stat-label">Mining Balance</span><span class="stat-value">${this.miningBalance.toFixed(2)} Egg</span></div></div>
                <div class="stat-card"><div class="stat-icon"><img src="${this.icons.ton}"></div><div class="stat-content"><span class="stat-label">Available Balance</span><span class="stat-value">${this.availableBalance.toFixed(4)} TON</span></div></div>
            </div>
            <div class="earnings-row">
                <div class="earning-card"><i class="fas fa-clock"></i><div class="earning-info"><span class="earning-label">Hourly Earnings</span><span class="earning-value">${this.hourlyEarnings.toFixed(2)} Egg/h</span></div></div>
                <div class="earning-card"><i class="fas fa-calendar-day"></i><div class="earning-info"><span class="earning-label">Daily Earnings</span><span class="earning-value">${this.dailyEarnings.toFixed(2)} Egg/day</span></div></div>
            </div>
        `;
    }
    
    renderPlans() {
        const el = document.getElementById('plans-page');
        if (!el) return;
        const plansHtml = Object.entries(this.miningPlans).map(([key, p]) => {
            const owned = this.activePlans.find(ap => ap.type === key);
            const isActive = owned?.status === 'active';
            const isPaused = owned?.status === 'paused';
            const pending = owned ? (this.pendingEggs[owned.id] || 0) : 0;
            let btns = '';
            if (!owned) {
                btns = `<div class="plan-buttons"><button class="plan-btn buy-btn" data-plan="${key}">Buy ${p.price > 0 ? p.price+' TON' : 'Free'}</button></div>`;
            } else {
                btns = `<div class="plan-buttons">
                    ${isPaused ? `<button class="plan-btn start-btn" data-plan-id="${owned.id}">Start</button>` : ''}
                    ${isActive ? `<button class="plan-btn timer-btn" disabled>⏱️ ${this.formatTime(this.getRemaining(owned))}</button>` : ''}
                    ${pending > 0 ? `<button class="plan-btn claim-btn" data-plan-claim="${owned.id}">Claim ${pending.toFixed(2)} Egg</button>` : ''}
                </div>`;
            }
            let status = 'Not owned';
            if (isActive) status = 'Active';
            else if (isPaused) status = 'Paused';
            else if (owned) status = 'Finished';
            const remainingTime = owned ? this.getPlanTimeRemaining(owned) : '';
            return `<div class="plan-card"><img class="plan-img" src="${p.image}"><div class="plan-info"><div class="plan-name">${p.name}</div><div class="plan-stats"><div class="plan-stat"><span class="label">Hourly</span><span class="value">${p.hourlyRate} Egg</span></div><div class="plan-stat"><span class="label">Daily</span><span class="value">${p.hourlyRate*24} Egg</span></div><div class="plan-stat"><span class="label">Status</span><span class="value ${status === 'Active' ? 'status-active' : status === 'Paused' ? 'status-paused' : 'status-finished'}">${status}</span></div></div>${owned ? `<div class="plan-remaining">Remaining: ${remainingTime}</div>` : ''}${btns}</div></div>`;
        }).join('');
        const activeHtml = this.activePlans.filter(p => p.status !== 'finished').map(p => {
            const cfg = this.miningPlans[p.type];
            const remain = this.getRemaining(p);
            return `<div class="active-plan-item"><div><div class="active-plan-name">${cfg.name}</div><div class="active-plan-rate">${cfg.hourlyRate} Egg/h</div></div><div class="active-plan-timer ${p.status}">${this.formatTime(remain)}</div></div>`;
        }).join('');
        el.innerHTML = `
            <div class="plans-tabs"><button class="plan-tab active" data-tab="plansList">Plans</button><button class="plan-tab" data-tab="activeList">Active Plans</button></div>
            <div id="plansList" class="plan-tab-content active"><div class="plans-grid">${plansHtml}</div></div>
            <div id="activeList" class="plan-tab-content">${activeHtml || '<div class="no-data">No active plans</div>'}</div>
        `;
        document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', (e) => this.buyPlan(btn.dataset.plan)));
        document.querySelectorAll('.start-btn').forEach(btn => btn.addEventListener('click', (e) => this.startPlan(btn.dataset.planId)));
        document.querySelectorAll('.claim-btn').forEach(btn => btn.addEventListener('click', (e) => this.claimPlanEarnings(btn.dataset.planClaim)));
        document.querySelectorAll('.plan-tab').forEach(tab => tab.addEventListener('click', () => {
            document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.plan-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        }));
    }
    
    renderTasks() {
        const el = document.getElementById('tasks-page');
        if (!el) return;
        const renderList = (tasks) => tasks.map(t => `<div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><img src="${this.icons.egg}"> ${t.reward} Eggs</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}">Start</button></div>`).join('');
        el.innerHTML = `
            <div class="tasks-header"><div class="balance-badge"><img src="${this.icons.egg}"><span>${this.miningBalance.toFixed(2)} Eggs</span><img src="${this.icons.ton}"><span>${this.availableBalance.toFixed(4)} TON</span></div></div>
            <div class="tasks-tabs"><button class="task-tab active" data-tab="mainTab">Main Tasks</button><button class="task-tab" data-tab="partnerTab">Partner Tasks</button></div>
            <div id="mainTab" class="task-tab-content active"><div class="tasks-list">${renderList(this.mainTasks)}</div></div>
            <div id="partnerTab" class="task-tab-content"><div class="tasks-list">${renderList(this.partnerTasks)}</div></div>
        `;
        document.querySelectorAll('.task-btn.start').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id, reward = parseFloat(btn.dataset.reward), url = btn.dataset.url;
                window.open(url, '_blank');
                btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                btn.disabled = true;
                await new Promise(r => setTimeout(r, 10000));
                await this.completeTask(id, reward);
                btn.innerHTML = 'Done';
                btn.classList.add('done');
            });
        });
        document.querySelectorAll('.task-tab').forEach(tab => tab.addEventListener('click', () => {
            document.querySelectorAll('.task-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.task-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        }));
    }
    
    renderTeam() {
        const el = document.getElementById('team-page');
        if (!el) return;
        const link = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        el.innerHTML = `
            <div class="referral-link-box"><div class="link-display">${link}</div><button class="copy-btn" id="copyLink">Copy Link</button></div>
            <div class="stats-grid"><div class="stat-mini"><i class="fas fa-users"></i><span class="stat-num">${this.userTotalReferrals || 0}</span><span class="stat-label">Referrals</span></div>
            <div class="stat-mini"><img src="${this.icons.egg}" style="width:24px"><span class="stat-num">${this.referralEarnings.egg?.toFixed(2) || 0}</span><span class="stat-label">Egg Earned</span></div>
            <div class="stat-mini"><img src="${this.icons.ton}" style="width:24px"><span class="stat-num">${this.referralEarnings.ton?.toFixed(4) || 0}</span><span class="stat-label">TON Earned</span></div></div>
            <div class="info-card"><i class="fas fa-gift"></i><div><strong>Referral Bonus</strong><p>10% of friend's earnings + ${APP_CONFIG.REFERRAL_BONUS} TON when they start Free plan</p></div></div>
        `;
        document.getElementById('copyLink')?.addEventListener('click', () => { navigator.clipboard.writeText(link); this.showNotification('Copied!', 'Link copied', 'success'); });
    }
    
    renderProfile() {
        const el = document.getElementById('profile-page');
        if (!el) return;
        el.innerHTML = `
            <div class="profile-tabs"><button class="profile-tab active" data-tab="exchangeTab">Exchange</button><button class="profile-tab" data-tab="withdrawTab">Withdraw</button></div>
            <div id="exchangeTab" class="profile-content active"><div class="exchange-card"><div class="balance-row"><div class="balance-pill"><img src="${this.icons.egg}"><span>${this.miningBalance.toFixed(2)} Eggs</span></div><div class="balance-pill"><img src="${this.icons.ton}"><span>${this.availableBalance.toFixed(4)} TON</span></div></div><div class="rate-badge">${APP_CONFIG.EXCHANGE_RATE} Eggs = 1 TON</div><div class="exchange-group"><input type="number" id="exAmount" class="form-input" placeholder="Eggs amount (multiple of 100)"><button id="exBtn" class="submit-btn">Exchange</button></div></div></div>
            <div id="withdrawTab" class="profile-content"><div class="withdraw-card"><div class="withdraw-balance"><img src="${this.icons.ton}"><span>Available: ${this.availableBalance.toFixed(4)} TON</span></div><div class="form-group"><input type="text" id="walletAddr" class="form-input" placeholder="TON Wallet (UQ...)"></div><div class="form-group"><input type="number" id="wdAmount" class="form-input" placeholder="Amount (Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON)"></div><button id="wdBtn" class="submit-btn">Withdraw</button><div class="withdraw-note">Processed within 24h</div></div></div>
        `;
        document.getElementById('exBtn')?.addEventListener('click', () => { const v = parseFloat(document.getElementById('exAmount').value); if(v>0 && v%100===0) this.exchange(v); else this.showNotification('Error','Multiple of 100 Eggs','error'); });
        document.getElementById('wdBtn')?.addEventListener('click', () => { const a = parseFloat(document.getElementById('wdAmount').value); const w = document.getElementById('walletAddr').value.trim(); this.withdraw(a,w); });
        document.querySelectorAll('.profile-tab').forEach(tab => tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        }));
    }
    
    renderUI() {
        this.renderHome();
        this.renderPlans();
        this.renderTasks();
        this.renderTeam();
        this.renderProfile();
    }
    
    setupNav() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.page;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                if (id === 'home-page') this.renderHome();
                else if (id === 'plans-page') this.renderPlans();
                else if (id === 'tasks-page') this.renderTasks();
                else if (id === 'team-page') this.renderTeam();
                else if (id === 'profile-page') this.renderProfile();
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Telegram?.WebApp) {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a1a0f;color:#2ecc71">Open from Telegram Mini App</div>';
        return;
    }
    window.app = new App();
    window.app.initialize();
});
