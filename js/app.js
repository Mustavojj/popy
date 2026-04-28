import { APP_CONFIG } from './data.js';

class App {
    constructor() {
        this.tg = null;
        this.db = null;
        this.auth = null;
        this.tgUser = null;
        this.isInitialized = false;
        this.serverTimeOffset = 0;
        
        this.powerBalance = 0;
        this.hashBalance = 0;
        this.tonBalance = 0;
        this.pendingHash = 0;
        this.userLevel = 1;
        this.isVerified = false;
        this.hasClaimedWelcome = false;
        this.userCompletedTasks = new Set();
        this.lastMiningUpdate = null;
        this.miningInterval = null;
        this.withdrawals = [];
        
        this.soundEnabled = true;
        this.vibrationEnabled = true;
        
        this.loadSettings();
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
            else window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }
    
    showNotification(title, message, type) {
        this.vibrate(type);
        const el = document.createElement('div');
        el.className = `notif ${type}`;
        el.innerHTML = `<div><i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i></div><div><strong>${title}</strong><br><small>${message}</small></div>`;
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
        let required = this.getRequiredPowerForLevel(1);
        while (this.powerBalance >= required) {
            newLevel++;
            required = this.getRequiredPowerForLevel(newLevel);
        }
        if (newLevel > this.userLevel) {
            this.userLevel = newLevel;
            this.showNotification('Level Up!', `Reached level ${this.userLevel}!`, 'success');
        }
        this.userLevel = newLevel;
    }
    
    getMiningRate() {
        return this.powerBalance * APP_CONFIG.POWER_PER_HASH_RATE;
    }
    
    async startMining() {
        if (this.miningInterval) clearInterval(this.miningInterval);
        const now = await this.getServerTime();
        if (!this.lastMiningUpdate) this.lastMiningUpdate = now;
        
        const processMining = async () => {
            const currentTime = await this.getServerTime();
            const elapsed = Math.min(currentTime - this.lastMiningUpdate, APP_CONFIG.MINING_SESSION_HOURS * 3600000);
            if (elapsed >= 60000) {
                const minutes = Math.floor(elapsed / 60000);
                const rate = this.getMiningRate();
                const earned = rate * minutes;
                this.pendingHash += earned;
                this.lastMiningUpdate = currentTime - (elapsed % 60000);
                await this.saveMiningData();
                this.updateUI();
            }
        };
        
        this.miningInterval = setInterval(processMining, 60000);
        processMining();
    }
    
    async claimHash() {
        if (this.pendingHash <= 0) {
            this.showNotification('No Earnings', 'Nothing to claim yet', 'warning');
            return;
        }
        this.hashBalance += this.pendingHash;
        this.pendingHash = 0;
        await this.saveUserData();
        this.updateUI();
        this.showNotification('Claimed!', `${this.hashBalance.toFixed(2)} HASH total`, 'success');
    }
    
    async exchangeHash(amount) {
        if (amount <= 0 || amount > this.hashBalance) {
            this.showNotification('Error', 'Invalid amount', 'error');
            return false;
        }
        const tonAmount = amount / APP_CONFIG.HASH_PER_TON;
        const confirmed = await this.showAd('AdBlock2', `exchange ${amount.toFixed(0)} HASH to ${tonAmount.toFixed(6)} TON`);
        if (!confirmed) return false;
        
        this.hashBalance -= amount;
        this.tonBalance += tonAmount;
        await this.saveUserData();
        this.updateUI();
        this.showNotification('Exchanged!', `${amount.toFixed(0)} HASH → ${tonAmount.toFixed(6)} TON`, 'success');
        return true;
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
        this.updateUI();
        this.showNotification('Task Completed!', `+${rewardPower} Power`, 'success');
        return true;
    }
    
    async applyPromoCode(code) {
        code = code.toUpperCase();
        const promoCodes = {
            'POWER100': { power: 100 },
            'POWER500': { power: 500 },
            'START10': { power: 10 }
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
        
        if (promo.power) this.powerBalance += promo.power;
        await usedRef.set(true);
        await this.updateLevelFromPower();
        await this.saveUserData();
        this.updateUI();
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
            if (referredBy) {
                const referrerRef = this.db.ref(`users/${referredBy}`);
                const referrerSnap = await referrerRef.once('value');
                if (referrerSnap.exists()) {
                    const currentPower = referrerSnap.val().powerBalance || 0;
                    await referrerRef.update({ powerBalance: currentPower + APP_CONFIG.REFERRAL_POWER_BONUS });
                }
            }
        }
        document.getElementById('welcome-bonus-modal').style.display = 'none';
        this.updateUI();
        this.showNotification('Welcome Bonus!', `+${APP_CONFIG.WELCOME_BONUS_POWER} Power`, 'success');
    }
    
    async addReferralEarnings(userId, tonAmount) {
        const userSnap = await this.db.ref(`users/${userId}`).once('value');
        const referredBy = userSnap.val()?.referredBy;
        if (referredBy) {
            const commission = tonAmount * (APP_CONFIG.REFERRAL_PERCENTAGE / 100);
            const referrerRef = this.db.ref(`users/${referredBy}`);
            const referrerSnap = await referrerRef.once('value');
            if (referrerSnap.exists()) {
                const currentTon = referrerSnap.val().tonBalance || 0;
                await referrerRef.update({ tonBalance: currentTon + commission });
            }
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
            await this.loadUserData();
            await this.loadCompletedTasks();
            await this.loadWithdrawals();
            await this.startMining();
            
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
        } catch(err) {
            document.getElementById('loader-error').textContent = err.message;
            document.getElementById('loader-error').style.display = 'block';
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
            this.lastMiningUpdate = d.lastMiningUpdate || null;
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
            lastMiningUpdate: this.lastMiningUpdate
        });
    }
    
    async saveMiningData() {
        if (!this.db) return;
        await this.db.ref(`users/${this.tgUser.id}`).update({
            pendingHash: this.pendingHash,
            lastMiningUpdate: this.lastMiningUpdate
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
    
    async withdraw(amount, wallet) {
        if (!wallet || wallet.length < 20) {
            this.showNotification('Error', 'Invalid wallet', 'error');
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
        const withdrawal = { id: Date.now(), amount, wallet, status: 'pending', timestamp: await this.getServerTime() };
        await this.db.ref(`withdrawals/${this.tgUser.id}/${withdrawal.id}`).set(withdrawal);
        this.withdrawals.unshift(withdrawal);
        this.updateUI();
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
            return data.isMember;
        } catch(e) { return false; }
    }
    
    updateUI() {
        this.renderHome();
        this.renderMining();
        this.renderEarn();
        this.renderTeam();
        this.renderWithdraw();
    }
    
    renderHome() {
        const el = document.getElementById('home-page');
        if (!el) return;
        const requiredPower = this.getRequiredPowerForLevel(this.userLevel + 1);
        const nextLevelPower = requiredPower;
        const currentPower = this.powerBalance;
        const progress = Math.min((currentPower / nextLevelPower) * 100, 100);
        
        el.innerHTML = `
            <div class="balance-cards">
                <div class="balance-card"><div class="icon power"><i class="fas fa-bolt"></i></div><span class="label">Power</span><span class="value">${this.powerBalance.toFixed(0)}</span></div>
                <div class="balance-card"><div class="icon hash"><i class="fas fa-microchip"></i></div><span class="label">HASH</span><span class="value">${this.hashBalance.toFixed(2)}</span></div>
                <div class="balance-card"><div class="icon ton"><i class="fas fa-coins"></i></div><span class="label">TON</span><span class="value">${this.tonBalance.toFixed(6)}</span></div>
            </div>
            <div class="level-progress">
                <div class="progress-header"><span>Level ${this.userLevel}</span><span>${currentPower.toFixed(0)} / ${nextLevelPower.toFixed(0)} Power</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
            </div>
            <div class="earnings-card"><i class="fas fa-chart-line"></i><div>Mining Rate: <strong>${(this.getMiningRate() * 3600).toFixed(2)} HASH/hour</strong></div></div>
        `;
    }
    
    renderMining() {
        const el = document.getElementById('mining-page');
        if (!el) return;
        el.innerHTML = `
            <div class="mining-card">
                <div class="mining-icon"><i class="fas fa-microchip"></i></div>
                <h3>Mining Rig Lv.${this.userLevel}</h3>
                <div class="mining-rate">⚡ Rate: <span>${(this.getMiningRate() * 3600).toFixed(2)} HASH/hour</span></div>
            </div>
            <div class="hash-row"><div><i class="fas fa-microchip"></i> Pending HASH</div><div class="hash-amount">${this.pendingHash.toFixed(4)} HASH</div><button id="claim-hash-btn" class="claim-btn">Claim</button></div>
            <div class="exchange-card"><div class="exchange-header"><h3><i class="fas fa-exchange-alt"></i> Exchange to TON</h3><div class="exchange-balance"><i class="fas fa-microchip"></i> ${this.hashBalance.toFixed(2)} HASH</div></div><div class="exchange-group"><input type="number" id="exchange-amount" class="form-input" placeholder="HASH amount"><button id="exchange-btn" class="submit-btn">Exchange</button></div></div>
        `;
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
            { id: 'main_1', name: 'Join Telegram Channel', reward: 50, url: 'https://t.me/STARZ_NEW', verify: true },
            { id: 'main_2', name: 'Follow on Twitter', reward: 30, url: 'https://twitter.com', verify: false },
            { id: 'main_3', name: 'Subscribe on YouTube', reward: 40, url: 'https://youtube.com', verify: false },
            { id: 'partner_1', name: 'Partner Task 1', reward: 25, url: 'https://t.me/partner', verify: true },
            { id: 'partner_2', name: 'Partner Task 2', reward: 25, url: 'https://t.me/partner2', verify: true }
        ];
        const renderTask = (t) => {
            const completed = this.userCompletedTasks.has(t.id);
            return `<div class="task-item"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> +${t.reward} Power</div></div>${!completed ? `<button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button>` : `<button class="task-btn done" disabled>Done</button></div>`}`;
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
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Star Farmer and start mining!')}`;
        el.innerHTML = `
            <div class="team-benefits"><h3><i class="fas fa-gift"></i> Team Benefits</h3><p><i class="fas fa-coins"></i> Earn 10% of your team members TON earnings</p><p><i class="fas fa-bolt"></i> Get free ${APP_CONFIG.REFERRAL_POWER_BONUS} Power per verified member</p></div>
            <div class="referral-link-box"><div class="link-display">${link}</div><button class="copy-btn" id="copyLink"><i class="fas fa-copy"></i> Copy Link</button><button class="share-btn" id="shareLink"><i class="fab fa-telegram"></i> Share on Telegram</button></div>
            <div class="stats-grid"><div class="stat-mini"><i class="fas fa-users"></i><span class="stat-num">${this.totalMembers || 0}</span><span class="stat-label">Total Members</span></div><div class="stat-mini"><i class="fas fa-check-circle"></i><span class="stat-num">${this.verifiedMembers || 0}</span><span class="stat-label">Verified</span></div><div class="stat-mini"><i class="fas fa-bolt"></i><span class="stat-num">${this.powerEarnings || 0}</span><span class="stat-label">Power</span></div><div class="stat-mini"><i class="fas fa-coins"></i><span class="stat-num">${(this.tonEarnings || 0).toFixed(6)}</span><span class="stat-label">TON</span></div></div>
        `;
        document.getElementById('copyLink')?.addEventListener('click', () => {
            navigator.clipboard.writeText(link);
            this.showNotification('Copied!', 'Link copied', 'success');
        });
        document.getElementById('shareLink')?.addEventListener('click', () => {
            window.open(shareUrl, '_blank');
        });
    }
    
    renderWithdraw() {
        const el = document.getElementById('withdraw-page');
        if (!el) return;
        const historyHtml = this.withdrawals.map(w => `<div class="history-item"><div><small>${new Date(w.timestamp).toLocaleDateString()}</small><br>${w.wallet?.slice(0,6)}...${w.wallet?.slice(-4)}</div><div class="history-amount">${w.amount.toFixed(4)} TON</div><div class="history-status ${w.status}">${w.status}</div></div>`).join('');
        el.innerHTML = `
            <div class="withdraw-card"><div class="withdraw-balance"><i class="fas fa-coins" style="color:#0088CC"></i><span>Available: ${this.tonBalance.toFixed(6)} TON</span></div><div class="form-group"><input type="text" id="wallet-addr" class="form-input" placeholder="TON Wallet (UQ...)"></div><div class="form-group"><input type="number" id="withdraw-amount" class="form-input" placeholder="Amount (Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON)"></div><button id="withdraw-btn" class="submit-btn">Withdraw</button></div>
            <div class="history-list"><h3>Withdrawal History</h3>${historyHtml || '<div class="no-data">No withdrawals yet</div>'}</div>
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
        document.getElementById('close-exchange').onclick = () => document.getElementById('exchange-confirm-modal').style.display = 'none';
        document.getElementById('contact-support-modal-btn').onclick = () => window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        document.getElementById('sound-toggle').onchange = (e) => { this.soundEnabled = e.target.checked; this.saveSettings(); };
        document.getElementById('vibration-toggle').onchange = (e) => { this.vibrationEnabled = e.target.checked; this.saveSettings(); };
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
                else if (id === 'mining-page') this.renderMining();
                else if (id === 'earn-page') this.renderEarn();
                else if (id === 'team-page') this.renderTeam();
                else if (id === 'withdraw-page') this.renderWithdraw();
            });
        });
    }
    
    renderUI() {
        this.renderHome();
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
