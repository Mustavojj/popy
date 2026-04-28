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
        
        this.powerBalance = 0;
        this.hashBalance = 0;
        this.tonBalance = 0;
        this.userLevel = 1;
        this.userXp = 0;
        this.userCompletedTasks = new Set();
        this.referralEarnings = { ton: 0, hash: 0 };
        
        this.miningRate = 0;
        this.miningInterval = null;
        
        this.icons = {
            power: "fas fa-bolt",
            hash: "fas fa-microchip",
            ton: "fas fa-coins"
        };
        
        this.notificationQueue = [];
        this.showingNotification = false;
        
        this.soundEnabled = true;
        this.vibrationEnabled = true;
        
        this.loadSettings();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('star_farmer_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.soundEnabled = settings.sound !== false;
            this.vibrationEnabled = settings.vibration !== false;
        }
        document.getElementById('sound-toggle').checked = this.soundEnabled;
        document.getElementById('vibration-toggle').checked = this.vibrationEnabled;
    }
    
    saveSettings() {
        localStorage.setItem('star_farmer_settings', JSON.stringify({
            sound: this.soundEnabled,
            vibration: this.vibrationEnabled
        }));
    }
    
    vibrate(type = 'success') {
        if (!this.vibrationEnabled) return;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            if (type === 'success') window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            else if (type === 'error') window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            else window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }
    
    showNotification(title, message, type = 'info') {
        if (!notificationStylesAdded) {
            notificationStylesAdded = true;
            const style = document.createElement('style');
            style.textContent = `
                .notif { position:fixed; top:80px; left:50%; transform:translateX(-50%); width:85%; max-width:340px; background:#1a1a1a; border-radius:16px; padding:14px; z-index:10000; animation:slideIn 0.3s; border-left:4px solid; display:flex; align-items:center; gap:12px; }
                .notif.success { border-left-color:#2ecc71; }
                .notif.error { border-left-color:#e74c3c; }
                .notif.warning { border-left-color:#f39c12; }
                .notif.info { border-left-color:#6C63FF; }
                @keyframes slideIn { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
                @keyframes slideOut { to { opacity:0; transform:translateX(-50%) translateY(20px); } }
            `;
            document.head.appendChild(style);
        }
        
        this.vibrate(type);
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
        el.innerHTML = `<div style="width:32px;height:32px;border-radius:12px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;"><i class="fas ${icon}"></i></div><div style="flex:1"><div style="font-weight:700;font-size:0.9rem">${n.title}</div><div style="font-size:0.75rem;color:#888">${n.message}</div></div>`;
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 3000));
        el.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => el.remove(), 300);
        this.showingNotification = false;
        setTimeout(() => this.processNotificationQueue(), 500);
    }
    
    async showAd(block, actionName = '') {
        if (actionName) {
            const confirmed = confirm(`📺 Watch an ad to ${actionName}?`);
            if (!confirmed) return false;
        }
        try {
            if (window[block]) await window[block].show();
            return true;
        } catch(e) { return true; }
    }
    
    getRequiredXpForLevel(level) {
        return Math.floor(APP_CONFIG.LEVEL_FORMULA.base * Math.pow(APP_CONFIG.LEVEL_FORMULA.multiplier, level - 1));
    }
    
    async updateLevel() {
        let newLevel = this.userLevel;
        let currentXp = this.userXp;
        while (currentXp >= this.getRequiredXpForLevel(newLevel)) {
            currentXp -= this.getRequiredXpForLevel(newLevel);
            newLevel++;
        }
        if (newLevel > this.userLevel) {
            this.userLevel = newLevel;
            this.userXp = currentXp;
            await this.saveUserData();
            this.showNotification('Level Up!', `Congratulations! You reached level ${this.userLevel}!`, 'success');
        }
        this.updateMiningRate();
    }
    
    updateMiningRate() {
        this.miningRate = Math.floor(5 + (this.userLevel - 1) * 0.5);
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
            
            document.getElementById('support-btn').addEventListener('click', () => {
                window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
            });
            
            document.getElementById('settings-btn').addEventListener('click', () => {
                document.getElementById('settings-modal').style.display = 'flex';
            });
            
            document.getElementById('close-settings').addEventListener('click', () => {
                document.getElementById('settings-modal').style.display = 'none';
            });
            
            document.getElementById('sound-toggle').addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                this.saveSettings();
            });
            
            document.getElementById('vibration-toggle').addEventListener('change', (e) => {
                this.vibrationEnabled = e.target.checked;
                this.saveSettings();
            });
            
            document.getElementById('close-tasks-info').addEventListener('click', () => {
                document.getElementById('tasks-info-modal').style.display = 'none';
            });
            
            document.getElementById('contact-support-btn').addEventListener('click', () => {
                window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
            });
            
            await this.initFirebase();
            await this.syncTime();
            await this.loadUserData();
            await this.loadCompletedTasks();
            this.startMiningLoop();
            
            this.renderUI();
            this.setupNav();
            
            this.isInitialized = true;
            document.getElementById('app-loader').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            
        } catch (err) {
            const errorDiv = document.getElementById('loader-error');
            if (errorDiv) {
                errorDiv.textContent = `Error: ${err.message}`;
                errorDiv.style.display = 'block';
            }
            this.isInitializing = false;
        }
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
            this.powerBalance = this.safeNumber(d.powerBalance);
            this.hashBalance = this.safeNumber(d.hashBalance);
            this.tonBalance = this.safeNumber(d.tonBalance);
            this.userLevel = this.safeNumber(d.level) || 1;
            this.userXp = this.safeNumber(d.xp);
            this.referralEarnings = d.referralEarnings || { ton: 0, hash: 0 };
        } else {
            const startParam = this.tg.initDataUnsafe?.start_param;
            let referredBy = null;
            if (startParam && !isNaN(startParam)) referredBy = parseInt(startParam);
            await ref.set({
                id: this.tgUser.id,
                username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
                firstName: this.tgUser.first_name || 'User',
                photoUrl: this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
                powerBalance: 0,
                hashBalance: 0,
                tonBalance: 0,
                level: 1,
                xp: 0,
                referralEarnings: { ton: 0, hash: 0 },
                totalReferrals: 0,
                referredBy: referredBy,
                createdAt: this.getServerTime(),
                completedTasks: []
            });
            if (referredBy) {
                await this.addReferralBonus(this.tgUser.id, referredBy);
            }
        }
        this.updateMiningRate();
        document.getElementById('user-name').innerText = this.tgUser.first_name || 'User';
        document.getElementById('user-level').innerText = this.userLevel;
        const photo = document.getElementById('user-photo');
        if (photo) photo.src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
    }
    
    async saveUserData() {
        if (!this.db) return;
        await this.db.ref(`users/${this.tgUser.id}`).update({
            powerBalance: this.powerBalance,
            hashBalance: this.hashBalance,
            tonBalance: this.tonBalance,
            level: this.userLevel,
            xp: this.userXp,
            referralEarnings: this.referralEarnings
        });
    }
    
    async addReferralBonus(newUserId, referrerId) {
        try {
            const ref = this.db.ref(`users/${referrerId}`);
            const snap = await ref.once('value');
            if (snap.exists()) {
                const data = snap.val();
                const newPower = this.safeNumber(data.powerBalance) + APP_CONFIG.REFERRAL_BONUS;
                const newTotal = (data.totalReferrals || 0) + 1;
                await ref.update({ powerBalance: newPower, totalReferrals: newTotal });
            }
        } catch(e) {}
    }
    
    async loadCompletedTasks() {
        if (!this.db) return;
        const snap = await this.db.ref(`users/${this.tgUser.id}/completedTasks`).once('value');
        if (snap.exists()) {
            this.userCompletedTasks = new Set(snap.val());
        }
    }
    
    async addXp(amount) {
        this.userXp += amount;
        await this.updateLevel();
        await this.saveUserData();
        this.updateAll();
    }
    
    startMiningLoop() {
        if (this.miningInterval) clearInterval(this.miningInterval);
        const process = async () => {
            this.hashBalance += this.miningRate / 3600;
            await this.saveUserData();
            this.updateAll();
        };
        setInterval(process, 1000);
    }
    
    async buyPlan() {
        const price = 100;
        if (this.powerBalance < price) {
            this.showNotification('Insufficient', `Need ${price} Power`, 'error');
            return false;
        }
        const ad = await this.showAd('AdBlock1', 'upgrade your mining rig');
        if (!ad) return false;
        this.powerBalance -= price;
        this.userLevel++;
        this.updateMiningRate();
        await this.saveUserData();
        this.updateAll();
        this.showNotification('Upgrade Complete!', `Mining rate increased!`, 'success');
        return true;
    }
    
    async exchangeHashToTon(amount) {
        const rate = APP_CONFIG.HASH_PER_TON;
        const tonAmount = amount / rate;
        if (amount <= 0 || amount > this.hashBalance) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const ad = await this.showAd('AdBlock2', 'exchange HASH to TON');
        if (!ad) return false;
        this.hashBalance -= amount;
        this.tonBalance += tonAmount;
        await this.saveUserData();
        this.updateAll();
        this.showNotification('Exchanged!', `${amount.toFixed(0)} HASH → ${tonAmount.toFixed(4)} TON`, 'success');
        return true;
    }
    
    async withdraw(amount, wallet) {
        const min = APP_CONFIG.MINIMUM_WITHDRAW;
        if (!wallet || wallet.length < 20) {
            this.showNotification('Error', 'Invalid wallet', 'error');
            return false;
        }
        if (amount < min || amount > this.tonBalance) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const ad = await this.showAd('AdBlock2', 'withdraw TON');
        if (!ad) return false;
        this.tonBalance -= amount;
        await this.saveUserData();
        const id = `WD_${Date.now()}`;
        if (this.db) {
            await this.db.ref(`withdrawals/pending/${id}`).set({
                userId: this.tgUser.id,
                amount,
                wallet,
                timestamp: this.getServerTime()
            });
        }
        this.updateAll();
        this.showNotification('Withdrawn!', `${amount.toFixed(4)} TON requested`, 'success');
        return true;
    }
    
    async applyPromoCode(code) {
        code = code.toUpperCase();
        const promoCodes = {
            'POWER100': { power: 100 },
            'HASH5000': { hash: 5000 },
            'TON1': { ton: 1 }
        };
        const promo = promoCodes[code];
        if (!promo) {
            this.showNotification('Invalid Code', 'Promo code not found', 'error');
            return false;
        }
        const usedRef = this.db.ref(`usedPromoCodes/${this.tgUser.id}/${code}`);
        const usedSnap = await usedRef.once('value');
        if (usedSnap.exists()) {
            this.showNotification('Already Used', 'You have already used this code', 'warning');
            return false;
        }
        if (promo.power) this.powerBalance += promo.power;
        if (promo.hash) this.hashBalance += promo.hash;
        if (promo.ton) this.tonBalance += promo.ton;
        await usedRef.set(true);
        await this.saveUserData();
        this.updateAll();
        this.showNotification('Code Applied!', `You received ${promo.power ? promo.power + ' Power' : promo.hash ? promo.hash + ' HASH' : promo.ton + ' TON'}`, 'success');
        return true;
    }
    
    async completeTask(taskId, rewardPower, rewardXp, url, verification = false) {
        if (this.userCompletedTasks.has(taskId)) return;
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
        await this.addXp(rewardXp);
        await this.saveUserData();
        if (this.db) {
            await this.db.ref(`users/${this.tgUser.id}/completedTasks`).set(Array.from(this.userCompletedTasks));
        }
        this.updateAll();
        this.showNotification('Task Completed!', `+${rewardPower} Power, +${rewardXp} XP`, 'success');
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
            return data.isMember;
        } catch(e) { return false; }
    }
    
    updateAll() {
        this.renderHome();
        this.renderTasks();
        this.renderTeam();
        this.renderProfile();
    }
    
    renderHome() {
        const el = document.getElementById('home-page');
        if (!el) return;
        const currentXp = this.userXp;
        const requiredXp = this.getRequiredXpForLevel(this.userLevel);
        const progress = (currentXp / requiredXp) * 100;
        el.innerHTML = `
            <div class="balance-cards">
                <div class="balance-card"><div class="icon power"><i class="fas fa-bolt"></i></div><span class="label">Power</span><span class="value">${this.powerBalance.toFixed(0)}</span></div>
                <div class="balance-card"><div class="icon hash"><i class="fas fa-microchip"></i></div><span class="label">HASH</span><span class="value">${this.hashBalance.toFixed(2)}</span></div>
                <div class="balance-card"><div class="icon ton"><i class="fas fa-coins"></i></div><span class="label">TON</span><span class="value">${this.tonBalance.toFixed(4)}</span></div>
            </div>
            <div class="mining-card">
                <div class="mining-icon"><i class="fas fa-microchip"></i></div>
                <h3>Mining Rig Lv.${this.userLevel}</h3>
                <div class="mining-rate">⚡ Mining Rate: <span>${this.miningRate.toFixed(2)} HASH/s</span></div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><i class="fas fa-chart-line"></i><div class="stat-label">Total Earned</div><div class="stat-value">${(this.referralEarnings.hash || 0).toFixed(2)} HASH</div></div>
                <div class="stat-card"><i class="fas fa-users"></i><div class="stat-label">Referrals</div><div class="stat-value">${this.totalReferrals || 0}</div></div>
            </div>
            <div class="level-progress">
                <div class="progress-header"><span>Level ${this.userLevel}</span><span>${currentXp} / ${requiredXp} XP</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
            </div>
            <button id="upgrade-mining-btn" class="submit-btn" style="width:100%;margin-top:16px"><i class="fas fa-arrow-up"></i> Upgrade Mining Rig (${100} Power)</button>
        `;
        document.getElementById('upgrade-mining-btn')?.addEventListener('click', () => this.buyPlan());
    }
    
    renderTasks() {
        const el = document.getElementById('tasks-page');
        if (!el) return;
        const tasks = [
            { id: 'main_1', name: 'Join Telegram Channel', rewardPower: 10, rewardXp: 5, url: 'https://t.me/STARZ_NEW', verification: true },
            { id: 'main_2', name: 'Follow on Twitter', rewardPower: 10, rewardXp: 5, url: 'https://twitter.com', verification: false },
            { id: 'main_3', name: 'Subscribe on YouTube', rewardPower: 20, rewardXp: 10, url: 'https://youtube.com', verification: false },
            { id: 'partner_1', name: 'Partner Task 1', rewardPower: 5, rewardXp: 3, url: 'https://t.me/partner', verification: true }
        ];
        const renderTask = (t) => {
            const completed = this.userCompletedTasks.has(t.id);
            return `<div class="task-item" data-task-id="${t.id}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> ${t.rewardPower} Power | <i class="fas fa-star"></i> ${t.rewardXp} XP</div></div>${!completed ? `<button class="task-btn start" data-id="${t.id}" data-url="${t.url}" data-reward="${t.rewardPower}" data-xp="${t.rewardXp}" data-verify="${t.verification}">Start</button>` : `<button class="task-btn done" disabled>Done</button>`}</div>`;
        };
        el.innerHTML = `
            <div class="tasks-header"><h3><i class="fas fa-tasks"></i> Main Tasks</h3><button id="tasks-info-btn" class="info-icon-btn"><i class="fas fa-question"></i></button></div>
            <div class="tasks-list">${tasks.filter(t => t.id.startsWith('main')).map(renderTask).join('')}</div>
            <h3 style="margin-top:24px"><i class="fas fa-handshake"></i> Partner Tasks</h3>
            <div class="tasks-list">${tasks.filter(t => t.id.startsWith('partner')).map(renderTask).join('')}</div>
            <div class="promo-section" style="margin-top:24px;background:#1a1a1a;border-radius:20px;padding:20px">
                <h4><i class="fas fa-gift"></i> Promo Code</h4>
                <div class="exchange-group" style="margin-top:12px"><input type="text" id="promo-input" class="form-input" placeholder="Enter code"><button id="promo-submit" class="submit-btn">Apply</button></div>
            </div>
        `;
        document.getElementById('tasks-info-btn')?.addEventListener('click', () => {
            document.getElementById('tasks-info-modal').style.display = 'flex';
        });
        document.querySelectorAll('.task-btn.start').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id, reward = parseInt(btn.dataset.reward), xp = parseInt(btn.dataset.xp), url = btn.dataset.url, verify = btn.dataset.verify === 'true';
                window.open(url, '_blank');
                btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                btn.disabled = true;
                let seconds = APP_CONFIG.TASK_VERIFICATION_DELAY;
                const interval = setInterval(() => {
                    seconds--;
                    if (seconds <= 0) {
                        clearInterval(interval);
                        btn.innerHTML = 'Check';
                        btn.classList.remove('start');
                        btn.classList.add('check');
                        btn.disabled = false;
                        const newBtn = btn.cloneNode(true);
                        btn.parentNode.replaceChild(newBtn, btn);
                        newBtn.addEventListener('click', async () => {
                            newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                            newBtn.disabled = true;
                            await this.completeTask(id, reward, xp, url, verify);
                            newBtn.innerHTML = 'Done';
                            newBtn.classList.remove('check');
                            newBtn.classList.add('done');
                        });
                    } else {
                        btn.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${seconds}s`;
                    }
                }, 1000);
                setTimeout(() => {
                    if (seconds > 0) {
                        clearInterval(interval);
                        btn.innerHTML = 'Start';
                        btn.disabled = false;
                    }
                }, (APP_CONFIG.TASK_VERIFICATION_DELAY + 1) * 1000);
            });
        });
        document.getElementById('promo-submit')?.addEventListener('click', () => {
            const code = document.getElementById('promo-input').value.trim();
            if (code) this.applyPromoCode(code);
        });
    }
    
    renderTeam() {
        const el = document.getElementById('team-page');
        if (!el) return;
        const link = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        el.innerHTML = `
            <div class="referral-link-box"><div class="link-display">${link}</div><button class="copy-btn" id="copyLink"><i class="fas fa-copy"></i> Copy Link</button></div>
            <div class="stats-grid"><div class="stat-mini"><i class="fas fa-users"></i><span class="stat-num">${this.totalReferrals || 0}</span><span class="stat-label">Referrals</span></div>
            <div class="stat-mini"><i class="fas fa-microchip"></i><span class="stat-num">${(this.referralEarnings.hash || 0).toFixed(2)}</span><span class="stat-label">HASH Earned</span></div>
            <div class="stat-mini"><i class="fas fa-coins"></i><span class="stat-num">${(this.referralEarnings.ton || 0).toFixed(4)}</span><span class="stat-label">TON Earned</span></div></div>
            <div class="info-card"><i class="fas fa-gift"></i><div><strong>Referral Bonus</strong><p>10% of friend's earnings + ${APP_CONFIG.REFERRAL_BONUS} Power when they join</p></div></div>
        `;
        document.getElementById('copyLink')?.addEventListener('click', () => {
            navigator.clipboard.writeText(link);
            this.showNotification('Copied!', 'Link copied to clipboard', 'success');
        });
    }
    
    renderProfile() {
        const el = document.getElementById('profile-page');
        if (!el) return;
        el.innerHTML = `
            <div class="profile-tabs"><button class="profile-tab active" data-tab="exchangeTab">Exchange</button><button class="profile-tab" data-tab="withdrawTab">Withdraw</button></div>
            <div id="exchangeTab" class="profile-content active"><div class="exchange-card"><div class="balance-row"><div class="balance-pill"><i class="fas fa-microchip"></i><span>${this.hashBalance.toFixed(2)} HASH</span></div><div class="balance-pill"><i class="fas fa-coins"></i><span>${this.tonBalance.toFixed(4)} TON</span></div></div><div class="rate-badge">${APP_CONFIG.HASH_PER_TON.toLocaleString()} HASH = 1 TON</div><div class="exchange-group"><input type="number" id="exAmount" class="form-input" placeholder="HASH amount"><button id="exBtn" class="submit-btn">Exchange to TON</button></div></div></div>
            <div id="withdrawTab" class="profile-content"><div class="withdraw-card"><div class="withdraw-balance" style="display:flex;align-items:center;gap:10px;background:#0a0a0a;padding:10px;border-radius:40px;margin-bottom:20px"><i class="fas fa-coins"></i><span>Available: ${this.tonBalance.toFixed(4)} TON</span></div><div class="form-group"><input type="text" id="walletAddr" class="form-input" placeholder="TON Wallet (UQ...)"></div><div class="form-group"><input type="number" id="wdAmount" class="form-input" placeholder="Amount (Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON)"></div><button id="wdBtn" class="submit-btn">Withdraw</button><div class="withdraw-note" style="margin-top:15px;font-size:0.7rem;color:#888;text-align:center">Processed within 24h</div></div></div>
        `;
        document.getElementById('exBtn')?.addEventListener('click', () => {
            const v = parseFloat(document.getElementById('exAmount').value);
            if (v > 0) this.exchangeHashToTon(v);
        });
        document.getElementById('wdBtn')?.addEventListener('click', () => {
            const a = parseFloat(document.getElementById('wdAmount').value);
            const w = document.getElementById('walletAddr').value.trim();
            this.withdraw(a, w);
        });
        document.querySelectorAll('.profile-tab').forEach(tab => tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        }));
    }
    
    renderUI() {
        this.renderHome();
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
                else if (id === 'tasks-page') this.renderTasks();
                else if (id === 'team-page') this.renderTeam();
                else if (id === 'profile-page') this.renderProfile();
            });
        });
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
