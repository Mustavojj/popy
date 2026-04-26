import { APP_CONFIG, CORE_CONFIG, THEME_CONFIG } from './data.js';
import { CacheManager, NotificationManager, SecurityManager } from './modules/core.js';
import { TaskManager, ReferralManager } from './modules/features.js';

class App {
    constructor() {
        // إعدادات الوضع
        this.isDarkMode = false;
        this.tg = null;
        this.db = null;
        this.auth = null;
        
        // بيانات المستخدم
        this.currentUser = null;
        this.userState = {};
        this.appConfig = APP_CONFIG;
        
        // أرصدة المستخدم
        this.miningBalance = 0;    // رصيد التعدين (Eggs)
        this.availableBalance = 0; // رصيد TON القابل للسحب
        
        // خطط التعدين
        this.activePlans = [];      // الخطط النشطة
        this.miningPlans = APP_CONFIG.MINING_PLANS;
        this.miningInterval = null;  // مؤقت التعدين
        
        // المهام والإحالات
        this.userCompletedTasks = new Set();
        this.referralEarnings = { ton: 0, egg: 0 };
        
        // Firebase
        this.firebaseInitialized = false;
        
        // إدارة ذاكرة التخزين المؤقت
        this.cache = new CacheManager();
        this.notificationManager = null;
        this.securityManager = new SecurityManager();
        
        // بيانات إضافية
        this.isInitialized = false;
        this.isInitializing = false;
        this.serverTimeOffset = 0;
        this.deviceId = null;
        
        // مرجع المستخدم في Telegram
        this.tgUser = null;
        
        // مديري المهام والإحالات
        this.taskManager = null;
        this.referralManager = null;
        
        // الأقسام الجديدة
        this.pages = [
            { id: 'home-page', name: 'Home', icon: 'fa-home' },
            { id: 'plans-page', name: 'Plans', icon: 'fa-chart-line' },
            { id: 'tasks-page', name: 'Earn', icon: 'fa-coins' },
            { id: 'team-page', name: 'Team', icon: 'fa-users' },
            { id: 'profile-page', name: 'Me', icon: 'fa-user' }
        ];
        
        // روابط الصور
        this.icons = {
            egg: "https://cdn-icons-png.flaticon.com/512/8416/8416453.png",
            ton: "https://cdn-icons-png.flaticon.com/512/12114/12114247.png"
        };
        
        // موقت التحديث
        this.countdownIntervals = {};
        
        // الأرباح اليومية/الساعية
        this.dailyEarnings = 0;
        this.hourlyEarnings = 0;
    }
    
    async initialize() {
        if (this.isInitializing || this.isInitialized) return;
        this.isInitializing = true;
        
        try {
            if (APP_CONFIG.MAINTENANCE_MODE) {
                this.showMaintenancePage();
                return;
            }
            
            if (!window.Telegram || !window.Telegram.WebApp) {
                this.showError("Please open from Telegram Mini App");
                return;
            }
            
            this.tg = window.Telegram.WebApp;
            this.tgUser = this.tg.initDataUnsafe.user;
            
            this.tg.ready();
            this.tg.expand();
            
            this.setupThemeToggle();
            
            this.notificationManager = new NotificationManager();
            
            await this.initializeFirebase();
            await this.syncServerTime();
            await this.loadUserData();
            await this.loadActivePlans();
            await this.startMiningLoop();
            
            if (this.timeSyncInterval) clearInterval(this.timeSyncInterval);
            this.timeSyncInterval = setInterval(() => this.syncServerTime(), 300000);
            
            this.taskManager = new TaskManager(this);
            this.referralManager = new ReferralManager(this);
            
            await this.loadTasksData();
            
            this.renderUI();
            this.setupNavigation();
            this.updateAllBalances();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
        } catch (error) {
            console.error("Initialization error:", error);
            this.showError("Failed to initialize app");
            this.isInitializing = false;
        }
    }
    
    setupThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isDarkMode = !this.isDarkMode;
                this.applyTheme();
                localStorage.setItem('theme_mode', this.isDarkMode ? 'night' : 'day');
            });
        }
        
        const savedTheme = localStorage.getItem('theme_mode');
        if (savedTheme === 'night') {
            this.isDarkMode = true;
        } else if (savedTheme === 'day') {
            this.isDarkMode = false;
        }
        this.applyTheme();
    }
    
    applyTheme() {
        const theme = this.isDarkMode ? THEME_CONFIG.NIGHT_MODE : THEME_CONFIG.DAY_MODE;
        
        document.documentElement.style.setProperty('--background-color', theme.background);
        document.documentElement.style.setProperty('--card-bg', theme.cardBg);
        document.documentElement.style.setProperty('--card-bg-solid', theme.cardBgSolid);
        document.documentElement.style.setProperty('--text-primary', theme.textPrimary);
        document.documentElement.style.setProperty('--text-secondary', theme.textSecondary);
        document.documentElement.style.setProperty('--text-light', theme.textLight);
        document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', theme.accentColor);
        document.documentElement.style.setProperty('--ton-color', theme.tonColor);
        document.documentElement.style.setProperty('--egg-color', theme.popColor);
        document.documentElement.style.setProperty('--sky-gradient', theme.skyGradient);
        
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        document.body.classList.toggle('light-mode', !this.isDarkMode);
        
        const skyElement = document.querySelector('.sky-overlay');
        if (skyElement) {
            skyElement.style.background = theme.skyGradient;
        }
    }
    
    async loadUserData() {
        try {
            if (!this.db || !this.tgUser) {
                this.userState = this.getDefaultUserState();
                return;
            }
            
            const userRef = this.db.ref(`users/${this.tgUser.id}`);
            const snapshot = await userRef.once('value');
            
            if (snapshot.exists()) {
                this.userState = snapshot.val();
            } else {
                this.userState = this.getDefaultUserState();
                await userRef.set(this.userState);
            }
            
            this.miningBalance = this.safeNumber(this.userState.miningBalance || 0);
            this.availableBalance = this.safeNumber(this.userState.availableBalance || 0);
            this.referralEarnings = this.userState.referralEarnings || { ton: 0, egg: 0 };
            
        } catch (error) {
            this.userState = this.getDefaultUserState();
        }
    }
    
    getDefaultUserState() {
        return {
            id: this.tgUser?.id,
            username: this.tgUser?.username ? `@${this.tgUser.username}` : 'No Username',
            firstName: this.tgUser?.first_name || 'User',
            photoUrl: this.tgUser?.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
            miningBalance: 0,
            availableBalance: 0,
            referralEarnings: { ton: 0, egg: 0 },
            totalReferrals: 0,
            activePlans: [],
            completedTasks: [],
            createdAt: this.getServerTime(),
            lastActive: this.getServerTime()
        };
    }
    
    async loadActivePlans() {
        try {
            if (!this.db || !this.tgUser) return;
            
            const plansRef = this.db.ref(`mining/plans/${this.tgUser.id}`);
            const snapshot = await plansRef.once('value');
            
            if (snapshot.exists()) {
                this.activePlans = [];
                snapshot.forEach(child => {
                    const plan = child.val();
                    if (plan.status !== 'finished') {
                        this.activePlans.push({
                            id: child.key,
                            ...plan
                        });
                    }
                });
            } else {
                this.activePlans = [];
            }
            
            this.updateHourlyDailyEarnings();
            
        } catch (error) {
            this.activePlans = [];
        }
    }
    
    updateHourlyDailyEarnings() {
        this.hourlyEarnings = 0;
        for (const plan of this.activePlans) {
            if (plan.status === 'active') {
                const planConfig = this.miningPlans[plan.type];
                if (planConfig) {
                    this.hourlyEarnings += planConfig.hourlyRate;
                }
            }
        }
        this.dailyEarnings = this.hourlyEarnings * 24;
    }
    
    async startMiningLoop() {
        if (this.miningInterval) {
            clearInterval(this.miningInterval);
        }
        
        const processMining = async () => {
            const now = this.getServerTime();
            let updated = false;
            
            for (const plan of this.activePlans) {
                if (plan.status !== 'active') continue;
                
                const lastUpdate = plan.lastMiningUpdate || plan.startedAt;
                const sessionEnd = plan.sessionEnd || (plan.startedAt + (APP_CONFIG.MINING_SESSION_HOURS * 3600000));
                
                if (now >= sessionEnd) {
                    // انتهت الجلسة، تغيير الحالة إلى paused
                    plan.status = 'paused';
                    plan.pausedAt = sessionEnd;
                    updated = true;
                    
                    // إرسال إشعار للمستخدم
                    await this.sendMiningStoppedNotification(plan.type);
                    continue;
                }
                
                const elapsed = Math.min(now - lastUpdate, sessionEnd - lastUpdate);
                if (elapsed >= 3600000) { // ساعة على الأقل
                    const hoursToAdd = Math.floor(elapsed / 3600000);
                    const planConfig = this.miningPlans[plan.type];
                    const earnings = hoursToAdd * planConfig.hourlyRate;
                    
                    this.miningBalance += earnings;
                    plan.lastMiningUpdate = lastUpdate + (hoursToAdd * 3600000);
                    updated = true;
                }
            }
            
            if (updated) {
                await this.saveMiningData();
                this.updateAllBalances();
                this.renderPlansPage();
                this.renderHomePage();
            }
        };
        
        processMining();
        this.miningInterval = setInterval(processMining, 60000);
    }
    
    async saveMiningData() {
        if (!this.db || !this.tgUser) return;
        
        const userRef = this.db.ref(`users/${this.tgUser.id}`);
        await userRef.update({
            miningBalance: this.miningBalance,
            availableBalance: this.availableBalance,
            referralEarnings: this.referralEarnings,
            lastActive: this.getServerTime()
        });
        
        for (const plan of this.activePlans) {
            await this.db.ref(`mining/plans/${this.tgUser.id}/${plan.id}`).update({
                status: plan.status,
                lastMiningUpdate: plan.lastMiningUpdate,
                sessionEnd: plan.sessionEnd,
                pausedAt: plan.pausedAt
            });
        }
    }
    
    async sendMiningStoppedNotification(planType) {
        try {
            const response = await fetch('/api/bot-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mining_stopped',
                    userId: this.tgUser.id,
                    planType: planType,
                    firstName: this.tgUser.first_name
                })
            });
        } catch (error) {}
    }
    
    async buyPlan(planType) {
        const plan = this.miningPlans[planType];
        if (!plan) {
            this.showNotification("Error", "Plan not found", "error");
            return false;
        }
        
        // التحقق من السعر
        if (plan.price > 0 && this.availableBalance < plan.price) {
            this.showNotification("Insufficient Balance", `Need ${plan.price} TON`, "error");
            return false;
        }
        
        // التحقق من عدم امتلاك الخطة بالفعل
        const existingPlan = this.activePlans.find(p => p.type === planType);
        if (existingPlan && existingPlan.status !== 'finished') {
            this.showNotification("Plan Active", "You already own this plan", "warning");
            return false;
        }
        
        const rateLimitCheck = this.rateLimiter?.checkLimit(this.tgUser.id, 'plan_buy');
        if (rateLimitCheck && !rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", "Please wait before buying again", "warning");
            return false;
        }
        
        // عرض الإعلان
        const adShown = await this.showInAppAd('AdBlock1');
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to buy this plan", "info");
            return false;
        }
        
        if (this.rateLimiter) {
            this.rateLimiter.addRequest(this.tgUser.id, 'plan_buy');
        }
        
        // خصم السعر
        if (plan.price > 0) {
            this.availableBalance -= plan.price;
        }
        
        const now = this.getServerTime();
        const sessionEnd = now + (APP_CONFIG.MINING_SESSION_HOURS * 3600000);
        const planEnd = now + (plan.durationDays * 86400000);
        
        const newPlan = {
            type: planType,
            name: plan.name,
            price: plan.price,
            hourlyRate: plan.hourlyRate,
            startedAt: now,
            lastMiningUpdate: now,
            sessionEnd: sessionEnd,
            planEnd: planEnd,
            status: 'active'
        };
        
        const planId = `${planType}_${now}`;
        newPlan.id = planId;
        
        // إزالة الخطة القديمة إذا وجدت
        const oldIndex = this.activePlans.findIndex(p => p.type === planType);
        if (oldIndex !== -1) {
            this.activePlans.splice(oldIndex, 1);
        }
        
        this.activePlans.push(newPlan);
        
        await this.saveMiningData();
        
        if (this.db) {
            await this.db.ref(`mining/plans/${this.tgUser.id}/${planId}`).set(newPlan);
        }
        
        this.updateAllBalances();
        this.renderPlansPage();
        this.renderHomePage();
        
        this.showNotification("Plan Purchased!", `${plan.name} plan activated successfully!`, "success");
        return true;
    }
    
    async startPlan(planId) {
        const plan = this.activePlans.find(p => p.id === planId);
        if (!plan) return;
        
        if (plan.status !== 'paused') {
            this.showNotification("Already Active", "Mining is already running", "warning");
            return;
        }
        
        const adShown = await this.showInAppAd('AdBlock1');
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to start mining", "info");
            return;
        }
        
        const now = this.getServerTime();
        const sessionEnd = now + (APP_CONFIG.MINING_SESSION_HOURS * 3600000);
        
        plan.status = 'active';
        plan.sessionEnd = sessionEnd;
        plan.lastMiningUpdate = now;
        
        await this.saveMiningData();
        
        this.updateAllBalances();
        this.renderPlansPage();
        
        this.showNotification("Mining Started!", "Your mining session has begun", "success");
    }
    
    getPlanTimeRemaining(plan) {
        const now = this.getServerTime();
        
        if (plan.status === 'active') {
            const remaining = Math.max(0, plan.sessionEnd - now);
            return { remaining, isActive: true };
        } else if (plan.status === 'paused') {
            const totalSession = APP_CONFIG.MINING_SESSION_HOURS * 3600000;
            const elapsed = (plan.pausedAt || (plan.startedAt + totalSession)) - (plan.sessionEnd - totalSession);
            const remaining = Math.max(0, totalSession - elapsed);
            return { remaining, isActive: false };
        }
        
        return { remaining: 0, isActive: false };
    }
    
    formatTime(ms) {
        if (ms <= 0) return "00:00:00";
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    async exchangeEggsToTon(amount) {
        const rate = APP_CONFIG.EXCHANGE_RATE;
        const tonAmount = amount / rate;
        
        if (amount <= 0) {
            this.showNotification("Error", "Invalid amount", "error");
            return false;
        }
        
        if (amount > this.miningBalance) {
            this.showNotification("Error", "Insufficient Egg balance", "error");
            return false;
        }
        
        const rateLimitCheck = this.rateLimiter?.checkLimit(this.tgUser.id, 'exchange');
        if (rateLimitCheck && !rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", "Please wait before exchanging again", "warning");
            return false;
        }
        
        const adShown = await this.showInAppAd('AdBlock2');
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to exchange", "info");
            return false;
        }
        
        if (this.rateLimiter) {
            this.rateLimiter.addRequest(this.tgUser.id, 'exchange');
        }
        
        this.miningBalance -= amount;
        this.availableBalance += tonAmount;
        
        await this.saveMiningData();
        
        this.updateAllBalances();
        
        this.showNotification("Exchange Successful", `${amount} Eggs → ${tonAmount.toFixed(4)} TON`, "success");
        return true;
    }
    
    async withdraw(amount, walletAddress) {
        const minWithdraw = APP_CONFIG.MINIMUM_WITHDRAW;
        
        if (!walletAddress || walletAddress.length < 20) {
            this.showNotification("Error", "Invalid wallet address", "error");
            return false;
        }
        
        if (amount < minWithdraw) {
            this.showNotification("Error", `Minimum withdrawal is ${minWithdraw} TON`, "error");
            return false;
        }
        
        if (amount > this.availableBalance) {
            this.showNotification("Error", "Insufficient balance", "error");
            return false;
        }
        
        const rateLimitCheck = this.rateLimiter?.checkLimit(this.tgUser.id, 'withdrawal');
        if (rateLimitCheck && !rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", "You can only withdraw once per day", "warning");
            return false;
        }
        
        const adShown = await this.showInAppAd('AdBlock2');
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to withdraw", "info");
            return false;
        }
        
        if (this.rateLimiter) {
            this.rateLimiter.addRequest(this.tgUser.id, 'withdrawal');
        }
        
        this.availableBalance -= amount;
        
        const withdrawalId = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const withdrawalData = {
            id: withdrawalId,
            userId: this.tgUser.id,
            walletAddress: walletAddress,
            amount: amount,
            status: 'pending',
            timestamp: this.getServerTime()
        };
        
        if (this.db) {
            await this.db.ref(`withdrawals/pending/${withdrawalId}`).set(withdrawalData);
            await this.saveMiningData();
        }
        
        this.updateAllBalances();
        
        this.showNotification("Withdrawal Requested", `${amount.toFixed(4)} TON will be processed within 24h`, "success");
        return true;
    }
    
    async addReferralBonus(newUserId, referrerId) {
        if (!referrerId || referrerId === newUserId) return;
        
        try {
            // مكافأة تفعيل الخطة المجانية
            const bonus = APP_CONFIG.REFERRAL_BONUS;
            
            const referrerRef = this.db.ref(`users/${referrerId}`);
            const referrerSnapshot = await referrerRef.once('value');
            
            if (referrerSnapshot.exists()) {
                const referrerData = referrerSnapshot.val();
                const newBalance = this.safeNumber(referrerData.availableBalance) + bonus;
                const newReferrals = (referrerData.totalReferrals || 0) + 1;
                
                await referrerRef.update({
                    availableBalance: newBalance,
                    totalReferrals: newReferrals
                });
                
                if (referrerId == this.tgUser.id) {
                    this.availableBalance = newBalance;
                    this.userState.totalReferrals = newReferrals;
                    this.updateAllBalances();
                }
            }
        } catch (error) {}
    }
    
    updateAllBalances() {
        this.updateHeader();
        this.renderHomePage();
        this.renderPlansPage();
        this.renderTeamPage();
        this.renderProfilePage();
    }
    
    // ================ طرق العرض (Rendering) ================
    
    renderUI() {
        this.renderHomePage();
        this.renderPlansPage();
        this.renderTasksPage();
        this.renderTeamPage();
        this.renderProfilePage();
        this.setupEventListeners();
    }
    
    renderHomePage() {
        const homePage = document.getElementById('home-page');
        if (!homePage) return;
        
        const hourlyEarnings = this.hourlyEarnings;
        const dailyEarnings = this.dailyEarnings;
        
        homePage.innerHTML = `
            <div class="home-stats">
                <div class="stat-card-large">
                    <div class="stat-icon-large">
                        <img src="${this.icons.egg}" alt="Egg">
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Mining Balance</span>
                        <span class="stat-value">${this.miningBalance.toFixed(2)} Egg</span>
                    </div>
                </div>
                
                <div class="stat-card-large">
                    <div class="stat-icon-large">
                        <img src="${this.icons.ton}" alt="TON">
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Available Balance</span>
                        <span class="stat-value">${this.availableBalance.toFixed(4)} TON</span>
                    </div>
                </div>
                
                <div class="stat-card-large">
                    <div class="stat-icon-large">
                        <img src="${this.icons.egg}" alt="Egg">
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Eggs Balance</span>
                        <span class="stat-value">${this.miningBalance.toFixed(2)} Egg</span>
                    </div>
                </div>
            </div>
            
            <div class="earnings-summary">
                <div class="summary-card">
                    <i class="fas fa-clock"></i>
                    <div class="summary-info">
                        <span class="summary-label">Hourly Earnings</span>
                        <span class="summary-value">${hourlyEarnings.toFixed(2)} Egg/h</span>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-calendar-day"></i>
                    <div class="summary-info">
                        <span class="summary-label">Daily Earnings</span>
                        <span class="summary-value">${dailyEarnings.toFixed(2)} Egg/day</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPlansPage() {
        const plansPage = document.getElementById('plans-page');
        if (!plansPage) return;
        
        const plans = this.miningPlans;
        const plansHtml = Object.entries(plans).map(([key, plan]) => {
            const existingPlan = this.activePlans.find(p => p.type === key);
            const isOwned = existingPlan && existingPlan.status !== 'finished';
            const isActive = existingPlan?.status === 'active';
            const isPaused = existingPlan?.status === 'paused';
            const timeRemaining = existingPlan ? this.getPlanTimeRemaining(existingPlan) : null;
            
            let actionButton = '';
            if (!isOwned) {
                actionButton = `<button class="plan-action-btn buy-btn" data-plan="${key}"><i class="fas fa-shopping-cart"></i> Buy ${plan.price > 0 ? `${plan.price} TON` : 'Free'}</button>`;
            } else if (isPaused) {
                actionButton = `<button class="plan-action-btn start-btn" data-plan-id="${existingPlan.id}"><i class="fas fa-play"></i> Start</button>`;
            } else if (isActive) {
                actionButton = `<button class="plan-action-btn timer-btn" disabled>⏱️ ${this.formatTime(timeRemaining.remaining)}</button>`;
            } else {
                actionButton = `<button class="plan-action-btn finished-btn" disabled><i class="fas fa-check-circle"></i> Finished</button>`;
            }
            
            let statusText = '';
            let statusClass = '';
            if (isActive) {
                statusText = 'Active';
                statusClass = 'status-active';
            } else if (isPaused) {
                statusText = 'Paused';
                statusClass = 'status-paused';
            } else if (isOwned) {
                statusText = 'Finished';
                statusClass = 'status-finished';
            } else {
                statusText = 'Not Owned';
                statusClass = 'status-not-owned';
            }
            
            return `
                <div class="plan-card" data-plan-type="${key}">
                    <div class="plan-card-image">
                        <img src="${plan.image}" alt="${plan.name}">
                    </div>
                    <div class="plan-card-content">
                        <h3 class="plan-name">${plan.name}</h3>
                        <div class="plan-stats">
                            <div class="plan-stat">
                                <span class="stat-label">Hourly</span>
                                <span class="stat-value">${plan.hourlyRate} Egg</span>
                            </div>
                            <div class="plan-stat">
                                <span class="stat-label">Daily</span>
                                <span class="stat-value">${plan.hourlyRate * 24} Egg</span>
                            </div>
                            <div class="plan-stat">
                                <span class="stat-label">Status</span>
                                <span class="stat-value ${statusClass}">${statusText}</span>
                            </div>
                        </div>
                        <div class="plan-actions">
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        const activePlansHtml = this.activePlans.filter(p => p.status !== 'finished').map(plan => {
            const planConfig = this.miningPlans[plan.type];
            const timeRemaining = this.getPlanTimeRemaining(plan);
            
            return `
                <div class="active-plan-item">
                    <div class="active-plan-info">
                        <span class="active-plan-name">${planConfig.name}</span>
                        <span class="active-plan-rate">${planConfig.hourlyRate} Egg/h</span>
                    </div>
                    <div class="active-plan-timer ${plan.status === 'active' ? 'active' : 'paused'}">
                        <i class="fas ${plan.status === 'active' ? 'fa-play' : 'fa-pause'}"></i>
                        ${this.formatTime(timeRemaining.remaining)}
                    </div>
                </div>
            `;
        }).join('');
        
        plansPage.innerHTML = `
            <div class="plans-tabs">
                <button class="plan-tab-btn active" data-tab="plans-tab"><i class="fas fa-gem"></i> Plans</button>
                <button class="plan-tab-btn" data-tab="active-plans-tab"><i class="fas fa-play-circle"></i> Active Plans</button>
            </div>
            
            <div id="plans-tab" class="plan-tab-content active">
                <div class="plans-grid">
                    ${plansHtml}
                </div>
            </div>
            
            <div id="active-plans-tab" class="plan-tab-content">
                <div class="active-plans-list">
                    ${activePlansHtml || '<div class="no-data"><i class="fas fa-box-open"></i><p>No active plans</p></div>'}
                </div>
            </div>
            
            <div class="mining-info">
                <div class="info-row">
                    <i class="fas fa-info-circle"></i>
                    <span>Mining sessions run for ${APP_CONFIG.MINING_SESSION_HOURS} hours</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-hourglass-half"></i>
                    <span>After ${APP_CONFIG.MINING_SESSION_HOURS}h, mining pauses</span>
                </div>
            </div>
        `;
        
        // إضافة مستمعي الأحداث
        const buyBtns = plansPage.querySelectorAll('.buy-btn');
        buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const planType = btn.getAttribute('data-plan');
                this.buyPlan(planType);
            });
        });
        
        const startBtns = plansPage.querySelectorAll('.start-btn');
        startBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const planId = btn.getAttribute('data-plan-id');
                this.startPlan(planId);
            });
        });
        
        // التبويبات
        const tabBtns = plansPage.querySelectorAll('.plan-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.plan-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    renderTasksPage() {
        const tasksPage = document.getElementById('tasks-page');
        if (!tasksPage) return;
        
        tasksPage.innerHTML = `
            <div class="tasks-header">
                <div class="balance-mini">
                    <img src="${this.icons.egg}" alt="Egg">
                    <span>${this.miningBalance.toFixed(2)} Egg</span>
                    <img src="${this.icons.ton}" alt="TON">
                    <span>${this.availableBalance.toFixed(4)} TON</span>
                </div>
                <h2><i class="fas fa-coins"></i> Complete Tasks</h2>
            </div>
            
            <div class="tasks-tabs">
                <button class="tab-btn active" data-tab="main-tab">Main Tasks</button>
                <button class="tab-btn" data-tab="partner-tab">Partner Tasks</button>
            </div>
            
            <div id="main-tab" class="tasks-tab-content active">
                <div id="main-tasks-list" class="tasks-list"></div>
            </div>
            
            <div id="partner-tab" class="tasks-tab-content">
                <div id="partner-tasks-list" class="tasks-list"></div>
            </div>
        `;
        
        // تحميل المهام
        if (this.taskManager) {
            this.loadMainTasks();
            this.loadPartnerTasks();
        }
        
        // إعداد التبويبات
        const tabBtns = tasksPage.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.tasks-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    async loadMainTasks() {
        const container = document.getElementById('main-tasks-list');
        if (!container) return;
        
        if (this.taskManager) {
            await this.taskManager.loadTasksData();
            const tasks = this.taskManager.mainTasks || [];
            container.innerHTML = tasks.map(task => this.renderTaskCard(task)).join('');
            this.setupTaskButtons();
        }
    }
    
    async loadPartnerTasks() {
        const container = document.getElementById('partner-tasks-list');
        if (!container) return;
        
        if (this.taskManager) {
            await this.taskManager.loadTasksData();
            const tasks = this.taskManager.partnerTasks || [];
            container.innerHTML = tasks.map(task => this.renderTaskCard(task)).join('');
            this.setupTaskButtons();
        }
    }
    
    renderTaskCard(task) {
        const isCompleted = this.userCompletedTasks.has(task.id);
        
        return `
            <div class="task-card ${isCompleted ? 'completed' : ''}">
                <div class="task-image">
                    <img src="${task.picture || APP_CONFIG.BOT_AVATAR}" alt="Task">
                </div>
                <div class="task-info">
                    <h4>${task.name}</h4>
                    <div class="task-rewards">
                        <span><img src="${this.icons.egg}" class="reward-icon"> ${task.reward.toFixed(4)} Egg</span>
                    </div>
                </div>
                <button class="task-action-btn ${isCompleted ? 'done' : 'start'}" 
                        data-task-id="${task.id}"
                        data-task-url="${task.url}"
                        data-task-reward="${task.reward}"
                        ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? 'Done' : 'Start'}
                </button>
            </div>
        `;
    }
    
    setupTaskButtons() {
        const startButtons = document.querySelectorAll('.task-action-btn.start:not(:disabled)');
        startButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = btn.getAttribute('data-task-id');
                const taskUrl = btn.getAttribute('data-task-url');
                const taskReward = parseFloat(btn.getAttribute('data-task-reward'));
                
                if (taskId && taskUrl) {
                    await this.handleTask(taskId, taskUrl, taskReward, btn);
                }
            });
        });
    }
    
    async handleTask(taskId, url, reward, button) {
        if (this.userCompletedTasks.has(taskId)) {
            this.showNotification("Already Completed", "Task already done", "info");
            return;
        }
        
        window.open(url, '_blank');
        
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        button.disabled = true;
        
        let secondsLeft = 10;
        const countdown = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(countdown);
                button.innerHTML = 'Check';
                button.classList.remove('start');
                button.classList.add('check');
                button.disabled = false;
                
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', async () => {
                    await this.completeTask(taskId, reward, newButton);
                });
            }
        }, 1000);
        
        setTimeout(() => {
            if (secondsLeft > 0) {
                clearInterval(countdown);
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }, 11000);
    }
    
    async completeTask(taskId, reward, button) {
        button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        button.disabled = true;
        
        try {
            this.userCompletedTasks.add(taskId);
            this.miningBalance += reward;
            
            await this.saveMiningData();
            
            if (this.db) {
                const userRef = this.db.ref(`users/${this.tgUser.id}`);
                const completedTasks = Array.from(this.userCompletedTasks);
                await userRef.update({
                    completedTasks: completedTasks,
                    miningBalance: this.miningBalance
                });
            }
            
            button.innerHTML = 'Done';
            button.classList.add('done');
            button.classList.remove('check');
            
            this.updateAllBalances();
            
            this.showNotification("Task Completed!", `+${reward.toFixed(4)} Egg`, "success");
            
        } catch (error) {
            button.innerHTML = 'Start';
            button.classList.add('start');
            button.classList.remove('check');
            button.disabled = false;
            this.showNotification("Error", "Failed to complete task", "error");
        }
    }
    
    renderTeamPage() {
        const teamPage = document.getElementById('team-page');
        if (!teamPage) return;
        
        const referralLink = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        const totalReferrals = this.userState.totalReferrals || 0;
        const referralEarnings = this.referralEarnings;
        
        teamPage.innerHTML = `
            <div class="team-header">
                <div class="balance-mini">
                    <img src="${this.icons.egg}" alt="Egg">
                    <span>${this.miningBalance.toFixed(2)} Egg</span>
                    <img src="${this.icons.ton}" alt="TON">
                    <span>${this.availableBalance.toFixed(4)} TON</span>
                </div>
            </div>
            
            <div class="referral-link-section">
                <div class="link-display" id="referral-link-text">${referralLink}</div>
                <button class="copy-btn" id="copy-referral-link">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
            </div>
            
            <div class="referral-stats">
                <div class="stat-card-small">
                    <i class="fas fa-users"></i>
                    <div class="stat-info">
                        <span>Total Referrals</span>
                        <strong>${totalReferrals}</strong>
                    </div>
                </div>
                <div class="stat-card-small">
                    <img src="${this.icons.egg}" style="width:20px">
                    <div class="stat-info">
                        <span>Egg Earnings</span>
                        <strong>${referralEarnings.egg?.toFixed(2) || 0} Egg</strong>
                    </div>
                </div>
                <div class="stat-card-small">
                    <img src="${this.icons.ton}" style="width:20px">
                    <div class="stat-info">
                        <span>TON Earnings</span>
                        <strong>${referralEarnings.ton?.toFixed(4) || 0} TON</strong>
                    </div>
                </div>
            </div>
            
            <div class="info-card-team">
                <i class="fas fa-gift"></i>
                <div class="info-content">
                    <strong>Referral Bonus</strong>
                    <p>Invite friends to earn 10% of their mining earnings + ${APP_CONFIG.REFERRAL_BONUS} TON bonus when they start the Free plan!</p>
                </div>
            </div>
        `;
        
        const copyBtn = document.getElementById('copy-referral-link');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyToClipboard(referralLink);
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
                }, 2000);
            });
        }
    }
    
    renderProfilePage() {
        const profilePage = document.getElementById('profile-page');
        if (!profilePage) return;
        
        profilePage.innerHTML = `
            <div class="profile-tabs">
                <button class="profile-tab active" data-tab="exchange-tab"><i class="fas fa-exchange-alt"></i> Exchange</button>
                <button class="profile-tab" data-tab="withdraw-tab"><i class="fas fa-wallet"></i> Withdraw</button>
            </div>
            
            <div id="exchange-tab" class="profile-tab-content active">
                <div class="exchange-card">
                    <div class="exchange-balance">
                        <div class="balance-item">
                            <img src="${this.icons.egg}" alt="Egg">
                            <span>${this.miningBalance.toFixed(2)} Eggs</span>
                        </div>
                        <div class="balance-item">
                            <img src="${this.icons.ton}" alt="TON">
                            <span>${this.availableBalance.toFixed(4)} TON</span>
                        </div>
                    </div>
                    <div class="exchange-rate">
                        <i class="fas fa-chart-line"></i>
                        Rate: ${APP_CONFIG.EXCHANGE_RATE} Eggs = 1 TON
                    </div>
                    <div class="exchange-input-group">
                        <input type="number" id="exchange-amount" class="form-input" placeholder="Enter Eggs amount" step="100">
                        <button id="exchange-submit" class="exchange-submit-btn">Exchange to TON</button>
                    </div>
                </div>
            </div>
            
            <div id="withdraw-tab" class="profile-tab-content">
                <div class="withdraw-card">
                    <div class="withdraw-balance">
                        <img src="${this.icons.ton}" alt="TON">
                        <span>Available: ${this.availableBalance.toFixed(4)} TON</span>
                    </div>
                    <div class="form-group">
                        <input type="text" id="withdraw-wallet" class="form-input" placeholder="TON Wallet Address (UQ...)" required>
                    </div>
                    <div class="form-group">
                        <input type="number" id="withdraw-amount" class="form-input" placeholder="Amount (Min: ${APP_CONFIG.MINIMUM_WITHDRAW} TON)" step="0.01">
                    </div>
                    <button id="withdraw-submit" class="withdraw-submit-btn">Withdraw</button>
                    <div class="withdraw-info">
                        <i class="fas fa-info-circle"></i>
                        Withdrawals are processed within 24 hours
                    </div>
                </div>
            </div>
        `;
        
        // إعداد التبويبات
        const tabBtns = profilePage.querySelectorAll('.profile-tab');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.profile-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Exchange
        const exchangeBtn = document.getElementById('exchange-submit');
        const exchangeAmount = document.getElementById('exchange-amount');
        if (exchangeBtn && exchangeAmount) {
            exchangeBtn.addEventListener('click', () => {
                const amount = parseFloat(exchangeAmount.value);
                if (amount > 0 && amount % 100 === 0) {
                    this.exchangeEggsToTon(amount);
                } else {
                    this.showNotification("Error", "Amount must be multiple of 100 Eggs", "error");
                }
            });
        }
        
        // Withdraw
        const withdrawBtn = document.getElementById('withdraw-submit');
        const withdrawWallet = document.getElementById('withdraw-wallet');
        const withdrawAmount = document.getElementById('withdraw-amount');
        if (withdrawBtn && withdrawWallet && withdrawAmount) {
            withdrawBtn.addEventListener('click', () => {
                const amount = parseFloat(withdrawAmount.value);
                const wallet = withdrawWallet.value.trim();
                this.withdraw(amount, wallet);
            });
        }
    }
    
    updateHeader() {
        const userPhoto = document.getElementById('user-photo');
        const userName = document.getElementById('user-name');
        
        if (userPhoto && this.userState?.photoUrl) {
            userPhoto.src = this.userState.photoUrl;
        }
        if (userName && this.tgUser?.first_name) {
            userName.textContent = this.tgUser.first_name;
        }
    }
    
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const pages = document.querySelectorAll('.page');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const pageId = btn.getAttribute('data-page');
                
                navButtons.forEach(b => b.classList.remove('active'));
                pages.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                const targetPage = document.getElementById(pageId);
                if (targetPage) targetPage.classList.add('active');
                
                if (pageId === 'home-page') this.renderHomePage();
                else if (pageId === 'plans-page') this.renderPlansPage();
                else if (pageId === 'tasks-page') this.renderTasksPage();
                else if (pageId === 'team-page') this.renderTeamPage();
                else if (pageId === 'profile-page') this.renderProfilePage();
            });
        });
    }
    
    setupEventListeners() {
        document.body.addEventListener('copy', (e) => e.preventDefault());
        document.body.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IMG') e.preventDefault();
        });
    }
    
    // ================ توابع مساعدة ================
    
    async initializeFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }
            
            const response = await fetch('/api/firebase-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            const decoded = atob(result.encrypted);
            const firebaseConfig = JSON.parse(decoded);
            
            let firebaseApp;
            try {
                firebaseApp = firebase.initializeApp(firebaseConfig);
            } catch (error) {
                if (error.code === 'app/duplicate-app') {
                    firebaseApp = firebase.app();
                } else {
                    throw error;
                }
            }
            
            this.db = firebaseApp.database();
            this.auth = firebaseApp.auth();
            
            await this.auth.signInAnonymously();
            await new Promise((resolve, reject) => {
                const unsubscribe = this.auth.onAuthStateChanged((user) => {
                    if (user) {
                        unsubscribe();
                        this.currentUser = user;
                        resolve(user);
                    }
                });
                setTimeout(() => {
                    unsubscribe();
                    reject(new Error('Authentication timeout'));
                }, 10000);
            });
            
            this.firebaseInitialized = true;
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async syncServerTime() {
        try {
            const response = await fetch('/api/time');
            const data = await response.json();
            const serverTime = data.serverTime;
            this.serverTimeOffset = serverTime - Date.now();
            return true;
        } catch (error) {
            this.serverTimeOffset = 0;
            return false;
        }
    }
    
    getServerTime() {
        return Date.now() + this.serverTimeOffset;
    }
    
    async showInAppAd(adType) {
        try {
            if (adType === 'AdBlock1' && typeof window.AdBlock1 !== 'undefined') {
                await window.AdBlock1.show();
                return true;
            } else if (adType === 'AdBlock2' && typeof window.AdBlock2 !== 'undefined') {
                await window.AdBlock2.show();
                return true;
            }
            return true;
        } catch (error) {
            return true;
        }
    }
    
    showNotification(title, message, type = 'info') {
        if (this.notificationManager) {
            this.notificationManager.showNotification(title, message, type);
        }
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification("Copied", "Text copied to clipboard", "success");
        }).catch(() => {
            this.showNotification("Error", "Failed to copy", "error");
        });
    }
    
    safeNumber(value) {
        if (value === null || value === undefined) return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }
    
    showError(message) {
        document.body.innerHTML = `
            <div class="error-container">
                <div class="error-content">
                    <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="reload-btn">Reload</button>
                </div>
            </div>
        `;
    }
    
    showMaintenancePage() {
        document.body.innerHTML = `
            <div class="maintenance-container">
                <div class="maintenance-content">
                    <i class="fas fa-tools"></i>
                    <h2>Under Maintenance</h2>
                    <p>Please check back soon!</p>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Telegram || !window.Telegram.WebApp) {
        document.body.innerHTML = `<div class="error-container"><div class="error-content"><h2>Error</h2><p>Please open from Telegram Mini App</p></div></div>`;
        return;
    }
    window.app = new App();
    setTimeout(() => window.app.initialize(), 300);
});
