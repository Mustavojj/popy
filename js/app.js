import { APP_CONFIG, THEME_CONFIG, FEATURES_CONFIG } from './data.js';
import { CacheManager, NotificationManager, SecurityManager } from './modules/core.js';
import { TaskManager, ReferralManager } from './modules/features.js';

class App { 
    constructor() {
        this.darkMode = true;
        this.tg = null;
        this.db = null;
        this.auth = null;
        this.firebaseInitialized = false;
        
        this.currentUser = null;
        this.userState = {};
        this.appConfig = APP_CONFIG;
        this.themeConfig = THEME_CONFIG;
        
        this.userCompletedTasks = new Set();
        this.isInitialized = false;
        this.isInitializing = false;
        this.userWithdrawals = [];
        this.appStats = {
            totalUsers: 0,
            onlineUsers: 0,
            totalPayments: 0,
            totalWithdrawals: 0
        };
        
        this.pages = [
            { id: 'tasks-page', name: 'Earn', icon: 'fa-coins', color: '#FFD966' },
            { id: 'referrals-page', name: 'Invite', icon: 'fa-user-plus', color: '#FFD966' },
            { id: 'profile-page', name: 'Profile', icon: 'user-photo', color: '#FFD966' }
        ];
        
        this.cache = new CacheManager();
        this.notificationManager = null;
        this.securityManager = new SecurityManager();
        this.isProcessingTask = false;
        
        this.tgUser = null;
        
        this.taskManager = null;
        this.referralManager = null;
        
        this.currentTasksTab = 'main';
        this.isCopying = false;
        this.pendingReferral = null;
        
        this.referralBonusGiven = new Set();
        
        this.remoteConfig = null;
        this.configCache = null;
        this.configTimestamp = 0;
        
        this.pendingReferralAfterWelcome = null;
        this.rateLimiter = new (this.getRateLimiterClass())();
        
        this.inAppAdsInitialized = false;
        this.inAppAdsTimer = null;
        this.taskCompletionCount = 0;
        
        this.serverTimeOffset = 0;
        this.timeSyncInterval = null;
        
        this.telegramVerified = false;
        
        this.userSTAR = 0;
        this.userCreatedTasks = [];
        
        this.deviceId = null;
        this.deviceRegistered = false;
        this.deviceOwnerId = null;
        
        this.additionalRewards = [];
        this.depositHistory = [];
        
        this.loadingSteps = [
            { element: null, text: 'Loading App Data...', icon: 'fa-spinner fa-pulse', completedText: 'App Data Loaded', completedIcon: 'fa-check-circle' },
            { element: null, text: 'Loading User Data...', icon: 'fa-spinner fa-pulse', completedText: 'User Data Loaded', completedIcon: 'fa-check-circle' },
            { element: null, text: 'Checking User Status...', icon: 'fa-spinner fa-pulse', completedText: 'Status Verified', completedIcon: 'fa-check-circle' },
            { element: null, text: 'Loading Tasks...', icon: 'fa-spinner fa-pulse', completedText: 'Tasks Loaded', completedIcon: 'fa-check-circle' },
            { element: null, text: 'App Loading...', icon: 'fa-spinner fa-pulse', completedText: 'Ready!', completedIcon: 'fa-check-circle' }
        ];
        this.currentLoadingStep = 0;
        this.loadingComplete = false;
        
        this.quests = [
            { id: 'quest_1', required: 1, rewardTon: 0.001, rewardStar: 1, text: 'Invite 1 friend', completed: false },
            { id: 'quest_2', required: 3, rewardTon: 0.003, rewardStar: 2, text: 'Invite 3 friends', completed: false },
            { id: 'quest_3', required: 5, rewardTon: 0.005, rewardStar: 3, text: 'Invite 5 friends', completed: false },
            { id: 'quest_4', required: 10, rewardTon: 0.01, rewardStar: 4, text: 'Invite 10 friends', completed: false },
            { id: 'quest_5', required: 25, rewardTon: 0.02, rewardStar: 5, text: 'Invite 25 friends', completed: false },
            { id: 'quest_6', required: 50, rewardTon: 0.03, rewardStar: 6, text: 'Invite 50 friends', completed: false },
            { id: 'quest_7', required: 100, rewardTon: 0.04, rewardStar: 7, text: 'Invite 100 friends', completed: false },
            { id: 'quest_8', required: 250, rewardTon: 0.05, rewardStar: 8, text: 'Invite 250 friends', completed: false },
            { id: 'quest_9', required: 500, rewardTon: 0.06, rewardStar: 9, text: 'Invite 500 friends', completed: false },
            { id: 'quest_10', required: 1000, rewardTon: 0.07, rewardStar: 10, text: 'Invite 1000 friends', completed: false }
        ];
        this.currentQuestIndex = 0;
        this.pendingProfits = 0;
        this.totalReferralEarnings = 0;
    }

    getRateLimiterClass() {
        return class RateLimiter {
            constructor() {
                this.requests = new Map();
                this.limits = {
                    'task_start': { limit: 1, window: 3000 },
                    'withdrawal': { limit: APP_CONFIG.WITHDRAWAL_LIMIT_PER_DAY, window: 86400000 },
                    'promo_code': { limit: 5, window: 300000 },
                    'exchange': { limit: 3, window: 3600000 }
                };
                
                this.loadRequests();
            }

            loadRequests() {
                try {
                    const saved = localStorage.getItem('rateLimiter_requests');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        Object.keys(parsed).forEach(key => {
                            this.requests.set(key, parsed[key]);
                        });
                    }
                } catch (error) {}
            }

            saveRequests() {
                try {
                    const obj = {};
                    this.requests.forEach((value, key) => {
                        obj[key] = value;
                    });
                    localStorage.setItem('rateLimiter_requests', JSON.stringify(obj));
                } catch (error) {}
            }

            checkLimit(userId, action) {
                const key = `${userId}_${action}`;
                const now = this.getServerTime();
                const limitConfig = this.limits[action] || { limit: 5, window: 60000 };
                
                if (!this.requests.has(key)) this.requests.set(key, []);
                
                const userRequests = this.requests.get(key);
                const windowStart = now - limitConfig.window;
                const recentRequests = userRequests.filter(time => time > windowStart);
                this.requests.set(key, recentRequests);
                
                if (recentRequests.length >= limitConfig.limit) {
                    return {
                        allowed: false,
                        remaining: Math.ceil((recentRequests[0] + limitConfig.window - now) / 1000)
                    };
                }
                
                return { allowed: true };
            }

            addRequest(userId, action) {
                const key = `${userId}_${action}`;
                const now = this.getServerTime();
                
                if (!this.requests.has(key)) this.requests.set(key, []);
                
                const userRequests = this.requests.get(key);
                userRequests.push(now);
                this.requests.set(key, userRequests);
                
                this.saveRequests();
            }

            getServerTime() {
                return Date.now() + (window.app?.serverTimeOffset || 0);
            }
        };
    }

    getServerTime() {
        return Date.now() + this.serverTimeOffset;
    }

    vibrate(type = 'success') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            if (type === 'success') {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            } else if (type === 'error') {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            } else if (type === 'warning') {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
            } else {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        }
    }

    async syncServerTime() {
        try {
            const startTime = Date.now();
            const serverTime = await this.getFirebaseServerTime();
            const endTime = Date.now();
            const rtt = endTime - startTime;
            this.serverTimeOffset = serverTime - endTime + (rtt / 2);
            return true;
        } catch (error) {
            this.serverTimeOffset = 0;
            return false;
        }
    }

    async getFirebaseServerTime() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const ref = this.db.ref('.info/serverTimeOffset');
            ref.once('value')
                .then(snapshot => {
                    const offset = snapshot.val() || 0;
                    resolve(Date.now() + offset);
                })
                .catch(reject);
        });
    }

    updateLoadingStep(step, text, icon = 'fa-spinner fa-pulse', success = false) {
        if (step >= this.loadingSteps.length) return;
        
        const stepData = this.loadingSteps[step];
        if (!stepData.element) return;
        
        const finalIcon = success ? (stepData.completedIcon || 'fa-check-circle') : icon;
        const finalText = success ? (stepData.completedText || text) : text;
        const iconColor = success ? '#58d68d' : '#2ecc71';
        const textColor = success ? '#2ecc71' : '#58d68d';
        const borderColor = success ? '#2ecc71' : '#58d68d';
        
        stepData.element.innerHTML = `<i class="fas ${finalIcon}" style="color: ${iconColor}; margin-right: 12px; width: 20px; text-align: center;"></i><span style="color: ${textColor};">${finalText}</span>`;
        stepData.element.style.borderLeftColor = borderColor;
        stepData.element.style.backgroundColor = success ? 'rgba(46, 204, 113, 0.1)' : 'rgba(0, 0, 0, 0.3)';
        
        if (success && step === this.currentLoadingStep && step < this.loadingSteps.length - 1) {
            this.currentLoadingStep++;
            this.updateLoadingStep(this.currentLoadingStep, this.loadingSteps[this.currentLoadingStep].text, 'fa-spinner fa-pulse', false);
        }
        
        if (success && step === this.loadingSteps.length - 1) {
            this.loadingComplete = true;
            this.showLaunchButton();
        }
    }

    shakeElement(element, type = 'error') {
        if (!element) return;
        
        element.classList.remove('shake', 'shake-success', 'shake-error');
        
        setTimeout(() => {
            if (type === 'success') {
                element.classList.add('shake-success');
            } else if (type === 'error') {
                element.classList.add('shake-error');
            } else {
                element.classList.add('shake');
            }
            
            setTimeout(() => {
                element.classList.remove('shake', 'shake-success', 'shake-error');
            }, 400);
        }, 10);
    }

    showShake(type = 'error') {
        this.vibrate(type);
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            this.shakeElement(mainContent, type);
        }
    }

    async callApi(action, data = {}) {
        const response = await fetch('/api/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-telegram-init-data': this.tg?.initData || ''
            },
            body: JSON.stringify({ action, data })
        });
        return await response.json();
    }

    async initialize() {
        if (this.isInitializing || this.isInitialized) return;
        
        this.isInitializing = true;
        
        try {
            if (APP_CONFIG.MAINTENANCE_MODE) {
                this.showMaintenancePage();
                return;
            }
            
            this.initLoadingElements();
            
            this.updateLoadingStep(0, "Loading App Data...", 'fa-spinner fa-pulse', false);
            
            if (!window.Telegram || !window.Telegram.WebApp) {
                this.showError("Please open from Telegram Mini App");
                return;
            }
            
            this.tg = window.Telegram.WebApp;
            
            if (!this.tg.initDataUnsafe || !this.tg.initDataUnsafe.user) {
                this.showError("User data not available");
                return;
            }
            
            this.tgUser = this.tg.initDataUnsafe.user;
            
            this.updateLoadingStep(0, "App Data Loaded", 'fa-check-circle', true);
            
            this.updateLoadingStep(1, "Loading User Data...", 'fa-spinner fa-pulse', false);
            
            this.telegramVerified = await this.verifyTelegramUser();
            
            this.tg.ready();
            this.tg.expand();
            
            this.setupTelegramTheme();
            
            this.notificationManager = new NotificationManager();
            
            this.firebaseInitialized = true;
            
            await this.syncServerTime();
            
            if (this.timeSyncInterval) {
                clearInterval(this.timeSyncInterval);
            }
            this.timeSyncInterval = setInterval(() => this.syncServerTime(), 300000);
            
            await this.loadUserData();
            
            this.updateLoadingStep(1, "User Data Loaded", 'fa-check-circle', true);
            
            this.updateLoadingStep(2, "Checking User Status...", 'fa-spinner fa-pulse', false);
            
            if (this.userState.status === 'ban') {
                this.showBannedPage();
                return;
            }
            
            const deviceCheck = await this.checkDeviceAndRegister();
            if (!deviceCheck.allowed) {
                this.showDeviceBanPage();
                return;
            }
            
            this.updateLoadingStep(2, "Status Verified", 'fa-check-circle', true);
            
            this.updateLoadingStep(3, "Loading Tasks...", 'fa-spinner fa-pulse', false);
            
            this.taskManager = new TaskManager(this);
            this.referralManager = new ReferralManager(this);
            
            this.startReferralMonitor();
            
            try {
                await this.loadTasksData();
                await this.loadUserCreatedTasks();
                await this.loadAdditionalRewards();
                await this.loadQuestsProgress();
                await this.loadPendingProfits();
                await this.loadDepositHistory();
                await this.loadTotalReferralEarnings();
                this.updateLoadingStep(3, "Tasks Loaded", 'fa-check-circle', true);
            } catch (taskError) {
                this.updateLoadingStep(3, "Tasks Loaded (partial)", 'fa-exclamation-triangle', false);
            }
            
            this.updateLoadingStep(4, "App Loading...", 'fa-spinner fa-pulse', false);
            
            try {
                await this.loadHistoryData();
            } catch (historyError) {}
            
            this.renderUI();
            
            this.darkMode = true;
            this.applyTheme();
            
            this.isInitialized = true;
            
            const hasSeenStartAd = localStorage.getItem('has_seen_start_ad');
            if (!hasSeenStartAd) {
                setTimeout(async () => {
                    await this.showInAppAd('AdBlock1');
                    localStorage.setItem('has_seen_start_ad', 'true');
                }, 60000);
            }
            
            this.isInitializing = false;
            
            this.updateLoadingStep(4, "Ready!", 'fa-check-circle', true);
            
        } catch (error) {
            this.showNotification("Error", "Initialization failed: " + error.message, "error");
            
            try {
                this.userState = this.getDefaultUserState();
                this.renderUI();
                
                const appLoader = document.getElementById('app-loader');
                const app = document.getElementById('app');
                
                if (appLoader) appLoader.style.display = 'none';
                if (app) app.style.display = 'block';
                
            } catch (renderError) {
                this.showError("Failed to initialize app: " + error.message);
            }
            
            this.isInitializing = false;
        }
    }

    async loadTotalReferralEarnings() {
        try {
            const result = await this.callApi('getUser');
            if (result.success && result.data) {
                this.totalReferralEarnings = this.safeNumber(result.data.totalReferralEarnings || 0);
            } else {
                this.totalReferralEarnings = 0;
            }
        } catch (error) {
            this.totalReferralEarnings = 0;
        }
    }

    async loadDepositHistory() {
        try {
            const result = await this.callApi('getDeposits');
            if (result.success) {
                this.depositHistory = result.data;
            } else {
                this.depositHistory = [];
            }
        } catch (error) {
            this.depositHistory = [];
        }
    }

    async loadQuestsProgress() {
        try {
            const result = await this.callApi('getQuests');
            if (result.success) {
                this.currentQuestIndex = result.data.currentQuestIndex || 0;
                const completedQuests = result.data.completedQuests || {};
                for (let i = 0; i < this.quests.length; i++) {
                    if (i < this.currentQuestIndex) {
                        this.quests[i].completed = true;
                    } else {
                        this.quests[i].completed = false;
                    }
                }
            } else {
                this.currentQuestIndex = 0;
                for (let i = 0; i < this.quests.length; i++) {
                    this.quests[i].completed = false;
                }
            }
        } catch (error) {
            this.currentQuestIndex = 0;
        }
    }

    async loadPendingProfits() {
        try {
            const result = await this.callApi('getUser');
            if (result.success && result.data) {
                this.pendingProfits = this.safeNumber(result.data.pendingProfits || 0);
            } else {
                this.pendingProfits = 0;
            }
        } catch (error) {
            this.pendingProfits = 0;
        }
    }

    async claimPendingProfits() {
        if (this.pendingProfits <= 0.00001) {
            this.showNotification("Claim", "No pending profits to claim", "warning");
            return;
        }
        
        const adShown = await this.showInAppAd('AdBlock1');
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to claim profits", "info");
            return;
        }
        
        const result = await this.callApi('claimPendingProfits');
        
        if (result.success) {
            this.userState.balance = result.newBalance;
            this.showNotification("Claimed", `${result.claimedAmount.toFixed(4)} TON added to balance`, "success");
            this.pendingProfits = 0;
            this.updateHeader();
            this.renderReferralsPage();
            this.showShake('success');
        } else {
            this.showNotification("Error", result.error || "Failed to claim profits", "error");
        }
    }

    showMaintenancePage() {
        document.body.innerHTML = `
            <div class="maintenance-container">
                <div class="maintenance-content">
                    <div class="maintenance-icon">
                        <i class="fas fa-tools"></i>
                    </div>
                    <h2>Under Maintenance</h2>
                    <p>We're currently updating our system to serve you better.</p>
                    <p>Please check back soon!</p>
                    <a href="${APP_CONFIG.NEWS_CHANNEL_LINK}" target="_blank" class="news-channel-btn">
                        <i class="fab fa-telegram"></i> Follow News Channel
                    </a>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .maintenance-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0a1428;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .maintenance-content {
                text-align: center;
                padding: 30px;
                background: rgba(26, 38, 58, 0.95);
                border-radius: 24px;
                margin: 20px;
                max-width: 320px;
                border: 1px solid rgba(255, 217, 102, 0.2);
            }
            .maintenance-icon {
                font-size: 64px;
                color: #2ecc71;
                margin-bottom: 20px;
            }
            .maintenance-content h2 {
                color: #2ecc71;
                margin-bottom: 15px;
                font-size: 24px;
            }
            .maintenance-content p {
                color: #e0e0e0;
                margin: 10px 0;
                line-height: 1.5;
            }
            .news-channel-btn {
                display: inline-block;
                margin-top: 25px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #2ecc71, #1e8449);
                color: #0a1428;
                text-decoration: none;
                border-radius: 50px;
                font-weight: bold;
                transition: transform 0.3s;
            }
            .news-channel-btn:hover {
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(style);
    }

    showBannedPage() {
        document.body.innerHTML = `
            <div class="banned-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0a1428; display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div class="banned-card" style="background: linear-gradient(135deg, #1a263a 0%, #0f172a 100%); border-radius: 24px; padding: 32px 24px; text-align: center; border: 1px solid rgba(244, 67, 54, 0.3); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); max-width: 320px; margin: 20px;">
                    <div class="banned-icon" style="font-size: 64px; color: #f44336; margin-bottom: 20px;">
                        <i class="fas fa-ban"></i>
                    </div>
                    <h2 style="color: #f44336; font-size: 24px; margin-bottom: 12px;">Access Denied</h2>
                    <p style="color: #e0e0e0; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">This account has been blocked for security reasons. This block is permanent and cannot be reversed.</p>
                    <button onclick="if(window.Telegram?.WebApp) window.Telegram.WebApp.close()" class="close-app-btn" style="background: linear-gradient(135deg, #f44336, #d32f2f); border: none; border-radius: 50px; padding: 12px 24px; color: white; font-weight: bold; font-size: 16px; cursor: pointer; transition: transform 0.3s; display: inline-flex; align-items: center; gap: 8px;">
                        <i class="fas fa-times-circle"></i> Close App
                    </button>
                </div>
            </div>
        `;
    }

    showDeviceBanPage() {
        document.body.innerHTML = `
            <div class="banned-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0a1428; display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div class="banned-card" style="background: linear-gradient(135deg, #1a263a 0%, #0f172a 100%); border-radius: 24px; padding: 32px 24px; text-align: center; border: 1px solid rgba(244, 67, 54, 0.3); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); max-width: 320px; margin: 20px;">
                    <div class="banned-icon" style="font-size: 64px; color: #f44336; margin-bottom: 20px;">
                        <i class="fas fa-ban"></i>
                    </div>
                    <h2 style="color: #f44336; font-size: 24px; margin-bottom: 12px;">Device Restricted</h2>
                    <p style="color: #e0e0e0; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">This device is already registered with another account. Multiple accounts per device are not allowed.</p>
                    <button onclick="if(window.Telegram?.WebApp) window.Telegram.WebApp.close()" class="close-app-btn" style="background: linear-gradient(135deg, #f44336, #d32f2f); border: none; border-radius: 50px; padding: 12px 24px; color: white; font-weight: bold; font-size: 16px; cursor: pointer; transition: transform 0.3s; display: inline-flex; align-items: center; gap: 8px;">
                        <i class="fas fa-times-circle"></i> Close App
                    </button>
                </div>
            </div>
        `;
    }

    initLoadingElements() {
        const stepElements = document.querySelectorAll('.loading-step');
        for (let i = 0; i < stepElements.length && i < this.loadingSteps.length; i++) {
            this.loadingSteps[i].element = stepElements[i];
        }
    }

    showLaunchButton() {
        if (!this.loadingComplete) return;
        
        const loader = document.getElementById('app-loader');
        if (!loader) return;
        
        const existingLaunchBtn = loader.querySelector('.launch-btn');
        if (existingLaunchBtn) return;
        
        const steps = loader.querySelector('.loading-steps');
        if (steps) {
            steps.style.opacity = '0.9';
        }
        
        const launchBtn = document.createElement('button');
        launchBtn.className = 'launch-btn';
        launchBtn.innerHTML = '<i class="fas fa-rocket" style="margin-right: 8px;"></i> Let\'s Go!';
        launchBtn.onclick = () => {
            const appLoader = document.getElementById('app-loader');
            const app = document.getElementById('app');
            
            if (appLoader) {
                appLoader.style.opacity = '0';
                appLoader.style.transition = 'opacity 0.5s ease';
                
                setTimeout(() => {
                    appLoader.style.display = 'none';
                }, 500);
            }
            
            if (app) {
                app.style.display = 'block';
                setTimeout(() => {
                    app.style.opacity = '1';
                    app.style.transition = 'opacity 0.3s ease';
                }, 50);
            }
            
            this.showPage('tasks-page');
        };
        
        const container = loader.querySelector('.loading-container');
        if (container) {
            container.appendChild(launchBtn);
        }
    }

    generateUniqueComment() {
        return this.tgUser.id.toString();
    }

    async checkDeviceAndRegister() {
        const result = await this.registerDevice();
        return { allowed: result.allowed !== false };
    }

    async registerDevice() {
        try {
            const userAgent = navigator.userAgent;
            const screenRes = `${window.screen.width}x${window.screen.height}`;
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const language = navigator.language;
            
            const deviceComponents = [userAgent, screenRes, timezone, language];
            let deviceString = deviceComponents.join('|');
            let deviceHash = 0;
            for (let i = 0; i < deviceString.length; i++) {
                const char = deviceString.charCodeAt(i);
                deviceHash = ((deviceHash << 5) - deviceHash) + char;
                deviceHash = deviceHash & deviceHash;
            }
            
            const deviceId = 'dev_' + Math.abs(deviceHash).toString(16);
            const savedDeviceId = localStorage.getItem('device_fingerprint');
            
            const finalDeviceId = savedDeviceId || deviceId;
            if (!savedDeviceId) {
                localStorage.setItem('device_fingerprint', finalDeviceId);
            }
            
            const result = await this.callApi('registerDevice', {
                deviceId: finalDeviceId,
                userAgent: userAgent,
                screenResolution: screenRes,
                timezone: timezone,
                language: language
            });
            
            return result;
        } catch (error) {
            return { success: true, allowed: true };
        }
    }

    async verifyTelegramUser() {
        try {
            if (!this.tg?.initData) {
                return false;
            }

            const params = new URLSearchParams(this.tg.initData);
            const hash = params.get('hash');
            
            if (!hash || hash.length < 10) {
                return false;
            }

            const user = this.tg.initDataUnsafe.user;
            if (!user || !user.id || user.id <= 0) {
                return false;
            }

            return true;
            
        } catch (error) {
            this.showNotification("Error", "Telegram verification failed", "error");
            return false;
        }
    }

    async sendWelcomeMessage() {
        try {
            const response = await fetch('/api/send-welcome', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.tgUser.id,
                    firstName: this.tgUser.first_name,
                    username: this.tgUser.username
                })
            });
            
            const result = await response.json();
            
            return result.success;
        } catch (error) {
            return false;
        }
    }

    async sendWithdrawalNotification(walletAddress, amount, timestamp) {
        try {
            const formattedTime = this.formatDateTime(timestamp);
            const truncatedWallet = this.truncateAddress(walletAddress);
            
            const response = await fetch('/api/send-withdrawal-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.tgUser.id,
                    amount: amount.toFixed(4),
                    wallet: truncatedWallet,
                    time: formattedTime,
                    firstName: this.tgUser.first_name,
                    username: this.tgUser.username
                })
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            return false;
        }
    }

    async loadUserCreatedTasks() {
        try {
            const result = await this.callApi('getUserCreatedTasks');
            if (result.success) {
                this.userCreatedTasks = result.data;
            } else {
                this.userCreatedTasks = [];
            }
        } catch (error) {
            this.userCreatedTasks = [];
        }
    }

    async loadAdditionalRewards() {
        try {
            const result = await this.callApi('getAdditionalRewards');
            if (result.success) {
                this.additionalRewards = result.data;
            } else {
                this.additionalRewards = [];
            }
        } catch (error) {
            this.additionalRewards = [];
        }
    }

    async sendTelegramMessage(chatId, message, buttons = null) {
        return false;
    }

    async showAddTaskModal() {
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        
        const completionsOptions = [100, 250, 500, 1000, 5000, 10000];
        
        modal.innerHTML = `
            <div class="task-modal-content">
                <button class="task-modal-close" id="task-modal-close">
                    <i class="fas fa-times"></i>
                </button>
                
                <div style="margin-top: 15px;"></div>
                
                <div class="task-modal-tabs-container">
                    <div class="task-modal-tabs">
                        <button class="task-modal-tab active" data-tab="add">Add Task</button>
                        <button class="task-modal-tab" data-tab="mytasks">My Tasks</button>
                    </div>
                </div>
                
                <div id="add-task-tab" class="task-modal-body" style="display: block;">
                    <form class="add-task-form" id="add-task-form">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-tag"></i> Task Name
                            </label>
                            <input type="text" id="task-name" class="form-input" placeholder="Enter your task name *" maxlength="15" required>
                            <small style="color: #9da5b4; font-size: 11px;">Only English letters allowed</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-link"></i> Task Link
                            </label>
                            <input type="url" id="task-link" class="form-input" placeholder="https://t.me/..." required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-globe"></i> Task Type
                            </label>
                            <div class="category-selector" id="task-type-selector">
                                <div class="category-option active" data-type="telegram">Telegram</div>
                                <div class="category-option" data-type="other">Other</div>
                            </div>
                        </div>
                        
                        <div class="form-group" id="verification-group">
                            <label class="form-label">
                                <i class="fas fa-shield-alt"></i> Verification Required
                            </label>
                            <div class="category-selector" id="verification-selector">
                                <div class="category-option active" data-verification="NO">NO</div>
                                <div class="category-option" data-verification="YES">YES</div>
                            </div>
                        </div>
                        
                        <div id="upgrade-admin-container" style="display: none;">
                            <button type="button" class="upgrade-admin-btn" id="upgrade-admin-btn">
                                <i class="fab fa-telegram"></i> Add @${this.appConfig.BOT_USERNAME} as admin
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-chart-line"></i> Completions
                            </label>
                            <div class="completions-selector">
                                ${completionsOptions.map(opt => {
                                    let price = Math.floor(opt / 100) * APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS;
                                    if (opt === 250) price = 250;
                                    return `
                                        <div class="completion-option ${opt === 100 ? 'active' : ''}" data-completions="${opt}" data-price="${price}">${opt}</div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <div class="price-info">
                            <span class="price-label">Total Price:</span>
                            <span class="price-value" id="total-price">${APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS} STAR</span>
                        </div>
                        
                        <div class="task-message" id="task-message" style="display: none;"></div>
                        
                        <button type="button" class="pay-task-btn" id="pay-task-btn" disabled>
                            <i class="fas fa-coins"></i> Pay ${APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS} STAR
                        </button>
                    </form>
                </div>
                
                <div id="mytasks-tab" class="task-modal-body" style="display: none;">
                    <div class="my-tasks-list" id="my-tasks-list">
                        ${this.renderMyTasks()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = document.getElementById('task-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        this.setupTaskModalEvents(modal, completionsOptions);
    }

    renderMyTasks() {
        if (!this.userCreatedTasks || this.userCreatedTasks.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-tasks"></i>
                    <p>No tasks created yet</p>
                    <p class="hint">Create your first task to earn STAR!</p>
                </div>
            `;
        }
        
        return this.userCreatedTasks.map(task => {
            const currentCompletions = task.currentCompletions || 0;
            const maxCompletions = task.maxCompletions || 100;
            const progress = (currentCompletions / maxCompletions) * 100;
            const verification = task.verification === 'YES' ? '🔒' : '🔓';
            const isCompleted = currentCompletions >= maxCompletions;
            
            return `
                <div class="my-task-item" data-task-id="${task.id}">
                    <div class="my-task-header">
                        <div class="my-task-avatar">
                            <img src="${this.appConfig.BOT_AVATAR}" alt="Task">
                        </div>
                        <div class="my-task-info">
                            <div class="my-task-name">${task.name} ${verification}</div>
                            <div class="my-task-category">Verification: ${task.verification || 'NO'}</div>
                        </div>
                        <div class="my-task-actions">
                            <button class="my-task-add-btn" data-task-id="${task.id}" title="Add more completions">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="my-task-delete-btn" data-task-id="${task.id}" title="Delete task">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="my-task-progress">
                        <div class="progress-header">
                            <span>Progress</span>
                            <span>${currentCompletions}/${maxCompletions}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                    </div>
                    ${isCompleted ? '<div class="task-completed-badge">Completed ✓</div>' : ''}
                </div>
            `;
        }).join('');
    }

    renderMyTasksInModal() {
        const myTasksList = document.querySelector('#my-tasks-list');
        if (myTasksList) {
            myTasksList.innerHTML = this.renderMyTasks();
            this.setupMyTaskButtons(document.querySelector('.task-modal'));
        }
    }

    setupMyTaskButtons(modal) {
        const addBtns = modal.querySelectorAll('.my-task-add-btn');
        const deleteBtns = modal.querySelectorAll('.my-task-delete-btn');
        
        addBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = btn.getAttribute('data-task-id');
                const task = this.userCreatedTasks.find(t => t.id === taskId);
                if (task) {
                    await this.showAddCompletionsModal(task);
                }
            });
        });
        
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = btn.getAttribute('data-task-id');
                const task = this.userCreatedTasks.find(t => t.id === taskId);
                if (task) {
                    await this.showDeleteTaskConfirmation(task);
                }
            });
        });
    }

    async showAddCompletionsModal(task) {
        const currentCompletions = task.currentCompletions || 0;
        const maxCompletions = task.maxCompletions || 100;
        const remaining = maxCompletions - currentCompletions;
        const pricePer100 = APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS;
        
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.innerHTML = `
            <div class="task-modal-content" style="max-width: 350px;">
                <button class="task-modal-close" id="add-completions-close">
                    <i class="fas fa-times"></i>
                </button>
                <h3 style="text-align: center; margin-bottom: 20px; color: var(--primary-light);">Add More Completions</h3>
                
                <div class="form-group">
                    <label class="form-label">Current Completions: ${currentCompletions} / ${maxCompletions}</label>
                    <label class="form-label">Remaining: ${remaining}</label>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Your STAR Balance: ${Math.floor(this.userSTAR)}</label>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Additional Completions</label>
                    <div class="amount-input-container">
                        <input type="number" id="additional-completions" class="form-input" 
                               placeholder="Enter number of completions" min="1" step="1">
                        <button type="button" class="max-btn" id="max-completions-btn">MAX</button>
                    </div>
                </div>
                
                <div class="price-info" id="price-preview">
                    <span class="price-label">Total Price:</span>
                    <span class="price-value" id="additional-price">0 STAR</span>
                </div>
                
                <div class="task-message" id="add-completions-message" style="display: none;"></div>
                
                <button type="button" class="pay-task-btn" id="confirm-add-completions-btn" disabled>
                    <i class="fas fa-coins"></i> CONFIRM & PAY
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = document.getElementById('add-completions-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        const completionsInput = document.getElementById('additional-completions');
        const maxBtn = document.getElementById('max-completions-btn');
        const priceSpan = document.getElementById('additional-price');
        const confirmBtn = document.getElementById('confirm-add-completions-btn');
        const messageDiv = document.getElementById('add-completions-message');
        
        const updatePrice = () => {
            let additional = parseInt(completionsInput.value) || 0;
            if (additional > remaining) {
                additional = remaining;
                completionsInput.value = remaining;
            }
            const price = Math.ceil(additional / 100) * pricePer100;
            priceSpan.textContent = `${price} STAR`;
            
            const hasEnoughStars = this.userSTAR >= price;
            confirmBtn.disabled = !(additional > 0 && additional <= remaining && hasEnoughStars);
            
            if (!hasEnoughStars && additional > 0) {
                messageDiv.textContent = 'Insufficient STAR balance!';
                messageDiv.className = 'task-message error';
                messageDiv.style.display = 'block';
            } else {
                messageDiv.style.display = 'none';
            }
        };
        
        const updateMaxFromStars = async () => {
            const maxStarsResult = await this.callApi('getMaxCompletionsFromStar', {
                starAmount: this.userSTAR,
                pricePer100: pricePer100
            });
            
            if (maxStarsResult.success) {
                let maxAdditional = maxStarsResult.maxCompletions;
                if (maxAdditional > remaining) {
                    maxAdditional = remaining;
                }
                completionsInput.value = maxAdditional;
                updatePrice();
            }
        };
        
        if (completionsInput) {
            completionsInput.addEventListener('input', updatePrice);
        }
        
        if (maxBtn) {
            maxBtn.addEventListener('click', updateMaxFromStars);
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const additional = parseInt(completionsInput.value) || 0;
                if (additional <= 0 || additional > remaining) {
                    this.showMessage(modal, 'Invalid number of completions', 'error');
                    return;
                }
                
                const price = Math.ceil(additional / 100) * pricePer100;
                
                if (this.userSTAR < price) {
                    this.showMessage(modal, 'Insufficient STAR balance', 'error');
                    return;
                }
                
                const originalText = confirmBtn.innerHTML;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Processing...';
                confirmBtn.disabled = true;
                
                const result = await this.callApi('addCompletions', {
                    taskId: task.id,
                    additionalCompletions: additional,
                    pricePer100: pricePer100
                });
                
                if (result.success) {
                    this.userSTAR = result.newStar;
                    this.userState.star = result.newStar;
                    task.maxCompletions = result.newMaxCompletions;
                    await this.loadUserCreatedTasks();
                    this.updateHeader();
                    
                    this.showMessage(modal, `Added ${additional} completions! Cost: ${price} STAR`, 'success');
                    
                    setTimeout(() => {
                        modal.remove();
                        const taskModal = document.querySelector('.task-modal');
                        if (taskModal) {
                            this.renderMyTasksInModal();
                        }
                    }, 1500);
                } else {
                    this.showMessage(modal, result.error || 'Failed to add completions', 'error');
                    confirmBtn.innerHTML = originalText;
                    confirmBtn.disabled = false;
                }
            });
        }
        
        updatePrice();
    }

    async showDeleteTaskConfirmation(task) {
        const currentCompletions = task.currentCompletions || 0;
        const pricePer100 = APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS;
        const refundAmount = Math.ceil(currentCompletions / 100) * pricePer100 * 0.5;
        
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.innerHTML = `
            <div class="task-modal-content" style="max-width: 350px;">
                <button class="task-modal-close" id="delete-task-close">
                    <i class="fas fa-times"></i>
                </button>
                <h3 style="text-align: center; margin-bottom: 20px; color: #e74c3c;">Delete Task</h3>
                
                <div class="form-group">
                    <label class="form-label">Task: ${task.name}</label>
                    <label class="form-label">Progress: ${currentCompletions}/${task.maxCompletions || 100}</label>
                </div>
                
                <div class="price-info" style="background: rgba(231, 76, 60, 0.2);">
                    <span class="price-label">Refund (50% of current completions):</span>
                    <span class="price-value" style="color: #e74c3c;">${refundAmount.toFixed(0)} STAR</span>
                </div>
                
                <div class="task-message" id="delete-task-message" style="display: none;"></div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" class="cancel-delete-btn" style="flex: 1; padding: 12px; background: rgba(0,0,0,0.4); border: none; border-radius: 50px; color: var(--text-secondary); cursor: pointer;">Cancel</button>
                    <button type="button" class="confirm-delete-btn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #e74c3c, #c0392b); border: none; border-radius: 50px; color: white; cursor: pointer; font-weight: bold;">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = document.getElementById('delete-task-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        const cancelBtn = modal.querySelector('.cancel-delete-btn');
        const confirmBtn = modal.querySelector('.confirm-delete-btn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => modal.remove());
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const originalText = confirmBtn.innerHTML;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Deleting...';
                confirmBtn.disabled = true;
                
                const result = await this.callApi('deleteTask', { taskId: task.id });
                
                if (result.success) {
                    this.userSTAR = result.newStar;
                    this.userState.star = result.newStar;
                    await this.loadUserCreatedTasks();
                    this.updateHeader();
                    
                    const messageDiv = document.getElementById('delete-task-message');
                    if (messageDiv) {
                        messageDiv.textContent = `Task deleted! Refunded ${result.refundAmount.toFixed(0)} STAR`;
                        messageDiv.className = 'task-message success';
                        messageDiv.style.display = 'block';
                    }
                    
                    setTimeout(() => {
                        modal.remove();
                        const taskModal = document.querySelector('.task-modal');
                        if (taskModal) {
                            this.renderMyTasksInModal();
                        }
                    }, 1500);
                } else {
                    const messageDiv = document.getElementById('delete-task-message');
                    if (messageDiv) {
                        messageDiv.textContent = result.error || 'Failed to delete task';
                        messageDiv.className = 'task-message error';
                        messageDiv.style.display = 'block';
                    }
                    confirmBtn.innerHTML = originalText;
                    confirmBtn.disabled = false;
                }
            });
        }
    }

    checkTaskFormComplete(modal) {
        const taskName = modal.querySelector('#task-name')?.value.trim();
        const taskLink = modal.querySelector('#task-link')?.value.trim();
        const payBtn = modal.querySelector('#pay-task-btn');
        const activeCompletion = modal.querySelector('.completion-option.active');
        const taskType = modal.querySelector('#task-type-selector .category-option.active')?.dataset.type;
        
        let isValidLink = false;
        if (taskType === 'telegram') {
            isValidLink = taskLink && taskLink.startsWith('https://t.me/');
        } else {
            isValidLink = taskLink && taskLink.startsWith('https://');
        }
        
        const isComplete = taskName && taskName.length > 0 && taskName.length <= 15 && 
                          /^[a-zA-Z0-9\s]*$/.test(taskName) &&
                          isValidLink &&
                          activeCompletion;
        
        if (payBtn) {
            payBtn.disabled = !isComplete;
        }
    }

    setupTaskModalEvents(modal, completionsOptions) {
        const tabs = modal.querySelectorAll('.task-modal-tab');
        const addTab = modal.querySelector('#add-task-tab');
        const myTasksTab = modal.querySelector('#mytasks-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                if (tab.dataset.tab === 'add') {
                    addTab.style.display = 'block';
                    myTasksTab.style.display = 'none';
                } else {
                    addTab.style.display = 'none';
                    myTasksTab.style.display = 'block';
                    this.renderMyTasksInModal();
                }
            });
        });
        
        const taskTypeOptions = modal.querySelectorAll('#task-type-selector .category-option');
        const verificationGroup = modal.querySelector('#verification-group');
        const verificationOptions = modal.querySelectorAll('#verification-selector .category-option');
        const upgradeContainer = modal.querySelector('#upgrade-admin-container');
        const upgradeBtn = modal.querySelector('#upgrade-admin-btn');
        const taskLinkInput = modal.querySelector('#task-link');
        
        taskTypeOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                taskTypeOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const taskType = opt.dataset.type;
                if (taskType === 'telegram') {
                    verificationGroup.style.display = 'block';
                    if (taskLinkInput) {
                        taskLinkInput.placeholder = 'https://t.me/...';
                    }
                } else {
                    verificationGroup.style.display = 'none';
                    if (taskLinkInput) {
                        taskLinkInput.placeholder = 'https://...';
                    }
                }
                this.checkTaskFormComplete(modal);
            });
        });
        
        verificationOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                verificationOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                if (opt.dataset.verification === 'YES') {
                    upgradeContainer.style.display = 'block';
                } else {
                    upgradeContainer.style.display = 'none';
                }
                this.checkTaskFormComplete(modal);
            });
        });
        
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                const url = `https://t.me/${this.appConfig.BOT_USERNAME}?startchannel=Commands&admin=invite_users`;
                window.open(url, '_blank');
            });
        }
        
        const completionOptions = modal.querySelectorAll('.completion-option');
        const totalPriceSpan = modal.querySelector('#total-price');
        const payBtn = modal.querySelector('#pay-task-btn');
        const messageDiv = modal.querySelector('#task-message');
        
        completionOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                completionOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const price = parseInt(opt.dataset.price);
                totalPriceSpan.textContent = `${price} STAR`;
                payBtn.innerHTML = `<i class="fas fa-coins"></i> Pay ${price} STAR`;
                
                this.checkTaskFormComplete(modal);
            });
        });
        
        payBtn.addEventListener('click', async () => {
            await this.handleCreateTask(modal);
        });
        
        if (taskLinkInput) {
            taskLinkInput.addEventListener('input', () => {
                const taskType = modal.querySelector('#task-type-selector .category-option.active')?.dataset.type;
                const value = taskLinkInput.value.trim();
                
                if (taskType === 'telegram') {
                    if (value && !value.startsWith('https://t.me/')) {
                        this.showMessage(modal, 'Task link must start with https://t.me/', 'error');
                        this.showShake('error');
                    } else {
                        messageDiv.style.display = 'none';
                    }
                } else {
                    if (value && !value.startsWith('https://')) {
                        this.showMessage(modal, 'Task link must start with https://', 'error');
                        this.showShake('error');
                    } else {
                        messageDiv.style.display = 'none';
                    }
                }
                this.checkTaskFormComplete(modal);
            });
        }
        
        const taskNameInput = modal.querySelector('#task-name');
        if (taskNameInput) {
            taskNameInput.addEventListener('input', () => {
                const value = taskNameInput.value.trim();
                const englishOnly = /^[a-zA-Z0-9\s]*$/;
                if (value && !englishOnly.test(value)) {
                    this.showMessage(modal, 'Task name must contain only English letters and numbers', 'error');
                    this.showShake('error');
                } else {
                    messageDiv.style.display = 'none';
                }
                this.checkTaskFormComplete(modal);
            });
        }
        
        this.checkTaskFormComplete(modal);
        this.setupMyTaskButtons(modal);
    }

    showMessage(modal, text, type) {
        const messageDiv = modal.querySelector('.task-message');
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = `task-message ${type}`;
            messageDiv.style.display = 'block';
            this.showShake(type === 'success' ? 'success' : 'error');
            
            if (type === 'success') {
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 3000);
            }
        }
    }

    async handleCreateTask(modal) {
        try {
            const taskName = modal.querySelector('#task-name').value.trim();
            const taskLink = modal.querySelector('#task-link').value.trim();
            const taskType = modal.querySelector('#task-type-selector .category-option.active').dataset.type;
            let verification = 'NO';
            
            if (taskType === 'telegram') {
                verification = modal.querySelector('#verification-selector .category-option.active').dataset.verification;
            }
            
            const completions = parseInt(modal.querySelector('.completion-option.active').dataset.completions);
            
            if (!taskName || !taskLink) {
                this.showMessage(modal, 'Please fill all fields', 'error');
                return;
            }
            
            if (taskName.length > 15) {
                this.showMessage(modal, 'Task name must be 15 characters or less', 'error');
                return;
            }
            
            const englishOnly = /^[a-zA-Z0-9\s]*$/;
            if (!englishOnly.test(taskName)) {
                this.showMessage(modal, 'Task name must contain only English letters and numbers', 'error');
                return;
            }
            
            if (taskType === 'telegram') {
                if (!taskLink.startsWith('https://t.me/')) {
                    this.showMessage(modal, 'Task link must start with https://t.me/', 'error');
                    return;
                }
            } else {
                if (!taskLink.startsWith('https://')) {
                    this.showMessage(modal, 'Task link must start with https://', 'error');
                    return;
                }
            }
            
            let price = Math.floor(completions / 100) * APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS;
            if (completions === 250) price = 500;
            
            const payBtn = modal.querySelector('#pay-task-btn');
            const originalText = payBtn.innerHTML;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Creating...';
            payBtn.disabled = true;
            
            const result = await this.callApi('createTask', {
                taskName: taskName,
                taskLink: taskLink,
                taskType: taskType,
                verification: verification,
                completions: completions,
                price: price
            });
            
            if (result.success) {
                this.userState.star = result.newStar;
                this.userSTAR = result.newStar;
                await this.loadUserCreatedTasks();
                
                this.showMessage(modal, `Task created! Cost: ${price} STAR`, 'success');
                this.updateHeader();
                
                setTimeout(() => {
                    modal.remove();
                }, 2000);
            } else {
                this.showMessage(modal, result.error || 'Failed to create task', 'error');
                payBtn.innerHTML = originalText;
                payBtn.disabled = false;
            }
        } catch (error) {
            this.showMessage(modal, 'Failed to create task', 'error');
        }
    }

    async checkBotAdminStatus(chatId) {
        try {
            const res = await fetch('/api/check-bot-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId })
            });
            const { isAdmin } = await res.json();
            return isAdmin;
        } catch (error) {
            return false;
        }
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
            return false;
        } catch (error) {
            return false;
        }
    }

    async initializeFirebase() {
        this.firebaseInitialized = true;
        return true;
    }

    setupFirebaseAuth() {}

    async syncUserWithFirebase() {}

    async loadUserData(forceRefresh = false) {
        const cacheKey = `user_${this.tgUser.id}`;
        
        if (!forceRefresh) {
            const cachedData = this.cache.get(cacheKey);
            if (cachedData) {
                this.userState = cachedData;
                this.userSTAR = this.safeNumber(cachedData.star);
                this.userCompletedTasks = new Set(cachedData.completedTasks || []);
                this.pendingProfits = this.safeNumber(cachedData.pendingProfits || 0);
                this.totalReferralEarnings = this.safeNumber(cachedData.totalReferralEarnings || 0);
                this.updateHeader();
                return;
            }
        }
        
        try {
            const result = await this.callApi('getUser');
            if (result.success && result.data) {
                this.userState = result.data;
                this.userSTAR = this.safeNumber(this.userState.star);
                this.userCompletedTasks = new Set(this.userState.completedTasks || []);
                this.pendingProfits = this.safeNumber(this.userState.pendingProfits || 0);
                this.totalReferralEarnings = this.safeNumber(this.userState.totalReferralEarnings || 0);
                this.userState.friendsCount = this.userState.friendsCount || 0;
                
                this.cache.set(cacheKey, this.userState, 60000);
                this.updateHeader();
            } else {
                this.userState = this.getDefaultUserState();
                this.userSTAR = 0;
                this.updateHeader();
            }
        } catch (error) {
            this.showNotification("Errr", result.error || "Using local data", "error");
            this.userState = this.getDefaultUserState();
            this.userSTAR = 0;
            this.updateHeader();
        }
    }

    getDefaultUserState() {
        return {
            id: this.tgUser.id,
            username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
            firstName: this.getShortName(this.tgUser.first_name || 'User'),
            photoUrl: this.tgUser.photo_url || this.appConfig.DEFAULT_USER_AVATAR,
            status: 'free',
            lastUpdated: this.getServerTime(),
            deviceId: this.deviceId,
            pendingProfits: 0,
            friends: {},
            friendsCount: 0,
            completedQuests: {},
            totalReferralEarnings: 0,
            totalAds: 0,
            balance: 0,
            star: 0,
            completedTasks: [],
            totalTasksCompleted: 0
        };
    }

    async createNewUser(userRef) {
        let referralId = null;
        const startParam = this.tg?.initDataUnsafe?.start_param;
        
        if (startParam) {
            referralId = this.extractReferralId(startParam);
            
            if (referralId && referralId > 0 && referralId !== this.tgUser.id) {
                const referrerCheck = await this.callApi('getUser');
                if (referrerCheck.success && referrerCheck.data) {
                    this.pendingReferralAfterWelcome = referralId;
                } else {
                    referralId = null;
                }
            } else {
                referralId = null;
            }
        }
        
        const currentTime = this.getServerTime();
        
        const userData = {
            id: this.tgUser.id,
            username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
            firstName: this.getShortName(this.tgUser.first_name || ''),
            photoUrl: this.tgUser.photo_url || this.appConfig.DEFAULT_USER_AVATAR,
            referredBy: referralId,
            createdAt: currentTime,
            lastActive: currentTime,
            status: 'free',
            balance: 0,
            star: 0,
            completedTasks: [],
            friendsCount: 0,
            totalReferralEarnings: 0
        };
        
        await this.callApi('updateUser', { updates: userData });
        
        await this.sendWelcomeMessage();
        
        try {
            await this.updateAppStats('totalUsers', 1);
        } catch (statsError) {}
        
        if (referralId) {
            await this.callApi('addReferral', { referrerId: referralId });
        }
        
        return userData;
    }

    async addFriend(referrerId, newUserId) {
        await this.callApi('addReferral', { referrerId: referrerId });
    }

    async addPendingProfitToReferrer(userId, amount) {}

    async updateExistingUser(userRef, userData) {
        return userData;
    }

    async loadTasksData() {
        try {
            if (this.taskManager) {
                await this.taskManager.loadTasksData();
                this.taskManager.userCompletedTasks = this.userCompletedTasks;
            }
        } catch (error) {
            this.showNotification("Warning", "Failed to load tasks", "warning");
        }
    }

    async loadHistoryData() {
        try {
            const result = await this.callApi('getWithdrawals');
            if (result.success) {
                this.userWithdrawals = result.data;
            } else {
                this.userWithdrawals = [];
            }
        } catch (error) {
            this.userWithdrawals = [];
        }
    }

    async loadAppStats() {
        try {
            const result = await this.callApi('getAppStats');
            if (result.success) {
                const stats = result.data;
                const totalUsers = this.safeNumber(stats.totalUsers || 0);
                const minOnline = Math.floor(totalUsers * 0.05);
                const maxOnline = Math.floor(totalUsers * 0.20);
                const onlineUsers = Math.floor(Math.random() * (maxOnline - minOnline + 1)) + minOnline;
                
                this.appStats = {
                    totalUsers: totalUsers,
                    onlineUsers: Math.max(onlineUsers, Math.floor(totalUsers * 0.05)),
                    totalPayments: this.safeNumber(stats.totalPayments || 0),
                    totalWithdrawals: this.safeNumber(stats.totalWithdrawals || 0)
                };
            } else {
                this.appStats = {
                    totalUsers: 0,
                    onlineUsers: 0,
                    totalPayments: 0,
                    totalWithdrawals: 0
                };
            }
        } catch (error) {
            this.appStats = {
                totalUsers: 0,
                onlineUsers: 0,
                totalPayments: 0,
                totalWithdrawals: 0
            };
        }
    }

    async updateAppStats(stat, value = 1) {
        try {
            await this.callApi('updateAppStats', { stat: stat, value: value });
            this.appStats[stat] = (this.appStats[stat] || 0) + value;
            
            if (stat === 'totalUsers') {
                await this.loadAppStats();
            }
        } catch (error) {}
    }

    startReferralMonitor() {
        if (this.referralMonitorInterval) {
            clearInterval(this.referralMonitorInterval);
        }
        
        this.referralMonitorInterval = setInterval(async () => {
            if (this.referralManager) {
                await this.referralManager.checkReferralsVerification();
            }
        }, 30000);
    }

    setupTelegramTheme() {
        if (!this.tg) return;
        
        this.darkMode = true;
        this.applyTheme();
    }

    applyTheme() {
        const theme = this.themeConfig.GOLDEN_THEME;
        
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
        document.documentElement.style.setProperty('--star-color', theme.popColor);
        
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    }

    showError(message) {
        document.body.innerHTML = `
            <div class="error-container">
                <div class="error-content">
                    <div class="error-header">
                        <div class="error-icon">
                            <i class="fab fa-telegram"></i>
                        </div>
                        <h2>STAR BUZZ</h2>
                    </div>
                    
                    <div class="error-message">
                        <div class="error-icon-wrapper">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>Error</h3>
                        <p>${message}</p>
                    </div>
                    
                    <button onclick="window.location.reload()" class="reload-btn">
                        <i class="fas fa-redo"></i> Reload App
                    </button>
                </div>
            </div>
        `;
    }

    updateHeader() {
        const userPhoto = document.getElementById('user-photo');
        const userName = document.getElementById('user-name');
        const balanceCardsContainer = document.getElementById('header-balance-cards');
        
        if (userPhoto) {
            userPhoto.src = this.userState.photoUrl || this.appConfig.DEFAULT_USER_AVATAR;
            userPhoto.style.width = '100%';
            userPhoto.style.height = '100%';
            userPhoto.style.borderRadius = '50%';
            userPhoto.style.objectFit = 'cover';
            userPhoto.style.border = `2px solid #2ecc71`;
            userPhoto.oncontextmenu = (e) => e.preventDefault();
            userPhoto.ondragstart = () => false;
        }
        
        if (userName) {
            const fullName = this.tgUser.first_name || 'User';
            userName.textContent = this.truncateName(fullName, 20);
            userName.style.fontSize = '1rem';
            userName.style.fontWeight = '700';
            userName.style.color = '#2ecc71';
            userName.style.margin = '0';
            userName.style.whiteSpace = 'nowrap';
            userName.style.overflow = 'hidden';
            userName.style.textOverflow = 'ellipsis';
            userName.style.lineHeight = '1.2';
        }
        
        if (balanceCardsContainer) {
            const tonBalance = this.safeNumber(this.userState.balance);
            const starBalance = this.safeNumber(this.userState.star);
            
            balanceCardsContainer.innerHTML = `
                <div class="balance-card">
                    <img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="balance-icon" alt="TON">
                    <span class="balance-ton">${tonBalance.toFixed(4)}</span>
                </div>
                <div class="balance-card">
                    <img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="balance-icon" alt="STAR">
                    <span class="balance-star">${Math.floor(starBalance)}</span>
                </div>
            `;
        }
        
        const bottomNavPhoto = document.getElementById('bottom-nav-user-photo');
        if (bottomNavPhoto && this.tgUser.photo_url) {
            bottomNavPhoto.src = this.tgUser.photo_url;
        }
    }

    renderUI() {
        this.updateHeader();
        this.renderTasksPage();
        this.renderReferralsPage();
        this.renderProfilePage();
        this.setupNavigation();
        this.setupEventListeners();
        
        document.body.addEventListener('copy', (e) => {
            e.preventDefault();
            return false;
        });
        
        document.body.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return false;
            }
        });
    }

    setupNavigation() {
        const bottomNav = document.querySelector('.bottom-nav');
        if (!bottomNav) return;
        
        const navButtons = bottomNav.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pageId = btn.getAttribute('data-page');
                if (pageId) {
                    this.showPage(pageId);
                }
            });
        });
    }

    showPage(pageId) {
        const pages = document.querySelectorAll('.page');
        const navButtons = document.querySelectorAll('.nav-btn');
        
        pages.forEach(page => page.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        const targetPage = document.getElementById(pageId);
        const targetButton = document.querySelector(`[data-page="${pageId}"]`);
        
        if (targetPage) {
            targetPage.classList.add('active');
            
            if (targetButton) targetButton.classList.add('active');
            
            if (pageId === 'tasks-page') {
                this.renderTasksPage();
            } else if (pageId === 'referrals-page') {
                this.renderReferralsPage();
            } else if (pageId === 'profile-page') {
                this.renderProfilePage();
            }
        }
    }

    renderTasksPage() {
        const tasksPage = document.getElementById('tasks-page');
        if (!tasksPage) return;
        
        tasksPage.innerHTML = `
            <div id="tasks-content">
                <div class="tasks-tabs">
                    <button class="tab-btn active" data-tab="tasks-tab">
                        <i class="fas fa-tasks"></i> Tasks
                    </button>
                    <button class="tab-btn" data-tab="rewards-tab">
                        <i class="fas fa-gift"></i> Rewards
                    </button>
                </div>
                
                <div id="tasks-tab" class="tasks-tab-content active">
                    <div class="tasks-subtabs">
                        <button class="tab-btn active" data-subtab="main-tasks-sub">
                            <i class="fas fa-star"></i> Main
                        </button>
                        <button class="tab-btn" data-subtab="partner-tasks-sub">
                            <i class="fas fa-handshake"></i> Partner
                        </button>
                        <button class="tab-btn" data-subtab="social-tasks-sub">
                            <i class="fas fa-users"></i> Social
                        </button>
                    </div>
                    
                    <div id="main-tasks-sub" class="task-subtab active">
                        <div class="task-category">
                            <div class="task-category-header">
                                <h3 class="task-category-title">
                                    <i class="fas fa-star"></i> Main Tasks
                                </h3>
                            </div>
                            <div id="main-tasks-list" class="referrals-list"></div>
                        </div>
                    </div>
                    
                    <div id="partner-tasks-sub" class="task-subtab">
                        <div class="task-category">
                            <div class="task-category-header">
                                <h3 class="task-category-title">
                                    <i class="fas fa-handshake"></i> Partner Tasks
                                </h3>
                            </div>
                            <div id="partner-tasks-list" class="referrals-list"></div>
                        </div>
                    </div>
                    
                    <div id="social-tasks-sub" class="task-subtab">
                        <div class="task-category">
                            <div class="task-category-header">
                                <h3 class="task-category-title">
                                    <i class="fas fa-users"></i> Social Tasks
                                </h3>
                                <button class="add-task-btn" id="add-task-btn">
                                    <i class="fas fa-plus"></i> Add Task
                                </button>
                            </div>
                            <div id="social-tasks-list" class="referrals-list"></div>
                        </div>
                    </div>
                </div>
                
                <div id="rewards-tab" class="tasks-tab-content">
                    <div class="rewards-grid">
                        <div class="square-card">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-gift"></i>
                                </div>
                                <h3 class="card-title">Promo Codes</h3>
                            </div>
                            <div class="card-divider"></div>
                            <input type="text" id="promo-input" class="promo-input" 
                                   placeholder="Enter promo code" maxlength="20">
                            <button id="promo-btn" class="promo-btn">
                                <i class="fas fa-gift"></i> APPLY
                            </button>
                        </div>
                        
                        <div class="square-card" id="watch-ad-card">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-play-circle"></i>
                                </div>
                                <h3 class="card-title">WATCH AD #1</h3>
                            </div>
                            <div class="card-divider"></div>
                            <div class="ad-rewards-preview">
                                <span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="reward-icon">0.001 TON</span>
                                <span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="reward-icon">1 STAR</span>
                            </div>
                            <button id="watch-ad-btn" class="promo-btn watch-ad-btn">
                                <i class="fas fa-eye"></i> WATCH AD #1
                            </button>
                        </div>
                        
                        <div class="square-card" id="watch-ad-v2-card">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-play-circle"></i>
                                </div>
                                <h3 class="card-title">WATCH AD #2</h3>
                            </div>
                            <div class="card-divider"></div>
                            <div class="ad-rewards-preview">
                                <span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="reward-icon">0.002 TON</span>
                                <span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="reward-icon">2 STAR</span>
                            </div>
                            <button id="watch-ad-v2-btn" class="promo-btn watch-ad-btn">
                                <i class="fas fa-eye"></i> WATCH AD #2
                            </button>
                        </div>
                        
                        <div id="additional-rewards-list"></div>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.setupTasksTabs();
            this.loadMainTasks();
            this.loadPartnerTasks();
            this.loadSocialTasks();
            this.loadAdditionalRewardsContent();
            this.setupPromoCodeEvents();
            this.setupWatchAdEvents();
            
            const addTaskBtn = document.getElementById('add-task-btn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', () => {
                    this.showAddTaskModal();
                });
            }
        }, 100);
    }

    setupTasksTabs() {
        const tabButtons = document.querySelectorAll('.tasks-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.tasks-tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                const targetTab = document.getElementById(tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            });
        });
        
        const subtabButtons = document.querySelectorAll('.tasks-subtabs .tab-btn');
        const subtabContents = document.querySelectorAll('.task-subtab');
        
        subtabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const subtabId = button.getAttribute('data-subtab');
                
                subtabButtons.forEach(btn => btn.classList.remove('active'));
                subtabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                const targetSubtab = document.getElementById(subtabId);
                if (targetSubtab) {
                    targetSubtab.classList.add('active');
                }
            });
        });
    }

    async loadMainTasks() {
        const mainTasksList = document.getElementById('main-tasks-list');
        if (!mainTasksList) return;
        
        try {
            let mainTasks = [];
            if (this.taskManager) {
                await this.taskManager.loadTasksData();
                mainTasks = this.taskManager.mainTasks || [];
            }
            
            const filteredTasks = mainTasks.filter(task => {
                const currentCompletions = task.currentCompletions || 0;
                const maxCompletions = task.maxCompletions || 100;
                if (currentCompletions >= maxCompletions) return false;
                if (maxCompletions - currentCompletions <= 0) return false;
                return true;
            });
            
            if (filteredTasks.length > 0) {
                const tasksHTML = filteredTasks.map(task => this.renderTaskCard(task)).join('');
                mainTasksList.innerHTML = tasksHTML;
                this.setupTaskButtons();
            } else {
                mainTasksList.innerHTML = `
                    <div class="no-tasks">
                        <i class="fas fa-star"></i>
                        <p>No main tasks available now</p>
                    </div>
                `;
            }
        } catch (error) {
            mainTasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading main tasks</p>
                </div>
            `;
        }
    }

    async loadPartnerTasks() {
        const partnerTasksList = document.getElementById('partner-tasks-list');
        if (!partnerTasksList) return;
        
        try {
            let partnerTasks = [];
            if (this.taskManager) {
                await this.taskManager.loadTasksData();
                partnerTasks = this.taskManager.partnerTasks || [];
            }
            
            const filteredTasks = partnerTasks.filter(task => {
                const currentCompletions = task.currentCompletions || 0;
                const maxCompletions = task.maxCompletions || 100;
                if (currentCompletions >= maxCompletions) return false;
                if (maxCompletions - currentCompletions <= 0) return false;
                return true;
            });
            
            if (filteredTasks.length > 0) {
                const tasksHTML = filteredTasks.map(task => this.renderTaskCard(task)).join('');
                partnerTasksList.innerHTML = tasksHTML;
                this.setupTaskButtons();
            } else {
                partnerTasksList.innerHTML = `
                    <div class="no-tasks">
                        <i class="fas fa-handshake"></i>
                        <p>No partner tasks available now</p>
                    </div>
                `;
            }
        } catch (error) {
            partnerTasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading partner tasks</p>
                </div>
            `;
        }
    }

    async loadSocialTasks() {
        const socialTasksList = document.getElementById('social-tasks-list');
        if (!socialTasksList) return;
        
        try {
            let socialTasks = [];
            if (this.taskManager) {
                await this.taskManager.loadTasksData();
                socialTasks = this.taskManager.socialTasks || [];
            }
            
            socialTasks = socialTasks.filter(task => task.status !== 'stopped');
            
            const filteredTasks = socialTasks.filter(task => {
                const currentCompletions = task.currentCompletions || 0;
                const maxCompletions = task.maxCompletions || 100;
                if (currentCompletions >= maxCompletions) return false;
                if (maxCompletions - currentCompletions <= 0) return false;
                return true;
            });
            
            if (filteredTasks.length > 0) {
                const tasksHTML = filteredTasks.map(task => this.renderTaskCard(task)).join('');
                socialTasksList.innerHTML = tasksHTML;
                this.setupTaskButtons();
            } else {
                socialTasksList.innerHTML = `
                    <div class="no-tasks">
                        <i class="fas fa-users"></i>
                        <p>No social tasks available now</p>
                    </div>
                `;
            }
        } catch (error) {
            socialTasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading social tasks</p>
                </div>
            `;
        }
    }

    async loadAdditionalRewardsContent() {
        const rewardsContainer = document.getElementById('additional-rewards-list');
        if (!rewardsContainer) return;
        
        await this.loadAdditionalRewards();
        
        if (this.additionalRewards.length > 0) {
            const rewardsHTML = this.additionalRewards.map(reward => `
                <div class="square-card">
                    <div class="card-header">
                        <div class="card-icon">
                            <i class="fas ${reward.icon}"></i>
                        </div>
                        <h3 class="card-title">${reward.name}</h3>
                    </div>
                    <div class="card-divider"></div>
                    <p class="reward-description" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">${reward.description}</p>
                    <div class="reward-rewards" style="display: flex; gap: 10px; margin-bottom: 12px;">
                        ${reward.rewardAmount > 0 ? `<span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="reward-icon">${reward.rewardAmount.toFixed(4)} TON</span>` : ''}
                        ${reward.starAmount > 0 ? `<span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="reward-icon">${reward.starAmount} STAR</span>` : ''}
                    </div>
                    <button class="reward-btn promo-btn" data-reward-id="${reward.id}" data-reward-action="${reward.action}" data-reward-url="${reward.actionUrl}">
                        <i class="fas fa-arrow-right"></i> Claim
                    </button>
                </div>
            `).join('');
            rewardsContainer.innerHTML = rewardsHTML;
            this.setupRewardButtons();
        }
    }

    setupRewardButtons() {
        const rewardBtns = document.querySelectorAll('.reward-btn');
        rewardBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const rewardId = btn.getAttribute('data-reward-id');
                const action = btn.getAttribute('data-reward-action');
                const actionUrl = btn.getAttribute('data-reward-url');
                
                const reward = this.additionalRewards.find(r => r.id === rewardId);
                if (!reward) return;
                
                if (action === 'url' && actionUrl) {
                    window.open(actionUrl, '_blank');
                    
                    const result = await this.callApi('claimAdditionalReward', { rewardId: rewardId });
                    
                    if (result.success) {
                        this.userState.balance = result.newBalance;
                        this.userState.star = result.newStar;
                        this.userState.totalEarned = this.safeNumber(this.userState.totalEarned) + reward.rewardAmount;
                        this.updateHeader();
                        
                        btn.innerHTML = '<i class="fas fa-check"></i> Claimed';
                        btn.disabled = true;
                        
                        this.showNotification("Reward Claimed", `${result.tonReward > 0 ? result.tonReward.toFixed(4) + ' TON ' : ''}${result.starReward > 0 ? result.starReward + ' STAR' : ''}`, "success");
                        this.showShake('success');
                    } else {
                        this.showNotification("Error", result.error || "Failed to claim reward", "error");
                    }
                }
            });
        });
    }

    async setupWatchAdEvents() {
        const watchAdBtn = document.getElementById('watch-ad-btn');
        const watchAdV2Btn = document.getElementById('watch-ad-v2-btn');
        
        const checkAdCooldown = async () => {
            const result = await this.callApi('getUser');
            if (result.success && result.data) {
                const lastAdTime = result.data.lastAdTime || 0;
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                const nextAvailableTime = lastAdTime + oneHour;
                
                if (now < nextAvailableTime) {
                    const remainingSeconds = Math.floor((nextAvailableTime - now) / 1000);
                    if (watchAdBtn) {
                        watchAdBtn.disabled = true;
                        watchAdBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> ' + this.formatCountdown(remainingSeconds);
                        watchAdBtn.classList.add('cooldown');
                    }
                    
                    if (this.adCountdownInterval) clearInterval(this.adCountdownInterval);
                    this.adCountdownInterval = setInterval(async () => {
                        const currentResult = await this.callApi('getUser');
                        if (currentResult.success && currentResult.data) {
                            const currentLastAdTime = currentResult.data.lastAdTime || 0;
                            const currentNow = Date.now();
                            const remaining = Math.floor((currentLastAdTime + oneHour - currentNow) / 1000);
                            
                            if (remaining <= 0) {
                                clearInterval(this.adCountdownInterval);
                                if (watchAdBtn) {
                                    watchAdBtn.disabled = false;
                                    watchAdBtn.innerHTML = '<i class="fas fa-eye"></i> WATCH AD #1';
                                    watchAdBtn.classList.remove('cooldown');
                                }
                            } else {
                                if (watchAdBtn) {
                                    watchAdBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> ' + this.formatCountdown(remaining);
                                }
                            }
                        }
                    }, 1000);
                } else {
                    if (watchAdBtn) {
                        watchAdBtn.disabled = false;
                        watchAdBtn.innerHTML = '<i class="fas fa-eye"></i> WATCH AD #1';
                        watchAdBtn.classList.remove('cooldown');
                    }
                    if (this.adCountdownInterval) clearInterval(this.adCountdownInterval);
                }
            }
        };
        
        const checkAdV2Cooldown = async () => {
            const result = await this.callApi('getUser');
            if (result.success && result.data) {
                const lastAdV2Time = result.data.lastAdV2Time || 0;
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                const nextAvailableTime = lastAdV2Time + oneHour;
                
                if (now < nextAvailableTime) {
                    const remainingSeconds = Math.floor((nextAvailableTime - now) / 1000);
                    if (watchAdV2Btn) {
                        watchAdV2Btn.disabled = true;
                        watchAdV2Btn.innerHTML = '<i class="fas fa-hourglass-half"></i> ' + this.formatCountdown(remainingSeconds);
                        watchAdV2Btn.classList.add('cooldown');
                    }
                } else {
                    if (watchAdV2Btn) {
                        watchAdV2Btn.disabled = false;
                        watchAdV2Btn.innerHTML = '<i class="fas fa-eye"></i> WATCH AD #2';
                        watchAdV2Btn.classList.remove('cooldown');
                    }
                }
            }
        };
        
        await checkAdCooldown();
        await checkAdV2Cooldown();
        
        if (watchAdBtn) {
            watchAdBtn.addEventListener('click', async () => {
                if (watchAdBtn.disabled) return;
                
                const adShown = await this.showInAppAd('AdBlock2');
                
                if (adShown) {
                    const result = await this.callApi('watchAd');
                    
                    if (result.success) {
                        this.userState.balance = result.balance;
                        this.userState.star = result.star;
                        this.updateHeader();
                        
                        this.showNotification("Ad Reward", `${result.tonReward.toFixed(4)} TON, ${result.starReward} STAR`, "success");
                        this.showShake('success');
                        await checkAdCooldown();
                    } else if (result.error === 'Cooldown') {
                        this.showNotification("Cooldown", `Please wait ${result.remainingSeconds} seconds`, "warning");
                        await checkAdCooldown();
                    } else {
                        this.showNotification("Error", "Failed to process ad reward", "error");
                    }
                } else {
                    this.showNotification("Ad Error", "Failed to load advertisement", "error");
                }
            });
        }
        
        if (watchAdV2Btn) {
            watchAdV2Btn.addEventListener('click', async () => {
                if (watchAdV2Btn.disabled) return;
                
                if (typeof window.showadsbitvex !== 'undefined') {
                    try {
                        await window.showadsbitvex();
                        
                        const result = await this.callApi('watchAdV2');
                        
                        if (result.success) {
                            this.userState.balance = result.balance;
                            this.userState.star = result.star;
                            this.updateHeader();
                            
                            this.showNotification("Ad Reward", `${result.tonReward.toFixed(4)} TON, ${result.starReward} STAR`, "success");
                            this.showShake('success');
                            await checkAdV2Cooldown();
                        } else if (result.error === 'Cooldown') {
                            this.showNotification("Cooldown", `Please wait ${result.remainingSeconds} seconds`, "warning");
                            await checkAdV2Cooldown();
                        } else {
                            this.showNotification("Error", "Failed to process ad reward", "error");
                        }
                    } catch (e) {
                        console.error("Ad error:", e);
                        this.showNotification("Ad Error", "Failed to load advertisement", "error");
                    }
                } else {
                    this.showNotification("Ad Error", "Ad service not available", "error");
                }
            });
        }
    }

    formatCountdown(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    renderTaskCard(task) {
        const isCompleted = this.userCompletedTasks.has(task.id);
        const defaultIcon = this.appConfig.BOT_AVATAR;
        
        let buttonText = 'Start';
        let buttonClass = 'start';
        let isDisabled = isCompleted || this.isProcessingTask;
        
        if (isCompleted) {
            buttonText = 'Done';
            buttonClass = 'done';
            isDisabled = true;
        }
        
        return `
            <div class="referral-row ${isCompleted ? 'task-completed' : ''}" id="task-${task.id}">
                <div class="referral-row-avatar">
                    <img src="${task.picture || defaultIcon}" alt="Task" 
                         oncontextmenu="return false;" 
                         ondragstart="return false">
                </div>
                <div class="referral-row-info">
                    <p class="referral-row-username">${task.name}</p>
                    <div class="task-rewards">
                        <span class="reward-badge">
                            <img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="reward-icon" alt="TON">
                            ${task.reward.toFixed(4)}
                        </span>
                        <span class="reward-badge">
                            <img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="reward-icon" alt="STAR">
                            ${task.popReward || 1}
                        </span>
                    </div>
                </div>
                <div class="referral-row-status">
                    <button class="task-btn ${buttonClass}" 
                            data-task-id="${task.id}"
                            data-task-url="${task.url}"
                            data-task-verification="${task.verification || 'NO'}"
                            data-task-reward="${task.reward}"
                            data-task-pop="${task.popReward || 1}"
                            ${isDisabled ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }

    setupPromoCodeEvents() {
        const promoBtn = document.getElementById('promo-btn');
        const promoInput = document.getElementById('promo-input');
        
        if (promoBtn) {
            promoBtn.addEventListener('click', () => {
                this.handlePromoCode();
            });
        }
        
        if (promoInput) {
            promoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handlePromoCode();
                }
            });
        }
    }

    async handlePromoCode() {
        const promoInput = document.getElementById('promo-input');
        const promoBtn = document.getElementById('promo-btn');
        
        if (!promoInput || !promoBtn) return;
        
        const code = promoInput.value.trim().toUpperCase();
        if (!code) {
            this.showNotification("Promo Code", "Please enter a promo code", "warning");
            this.showShake('error');
            return;
        }
        
        const rateLimitCheck = this.rateLimiter.checkLimit(this.tgUser.id, 'promo_code');
        if (!rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", `Please wait ${rateLimitCheck.remaining} seconds`, "warning");
            this.showShake('error');
            return;
        }
        
        const adShown = await this.showInAppAd('AdBlock2');
        
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to apply promo code", "info");
            this.showShake('warning');
            return;
        }
        
        const originalText = promoBtn.innerHTML;
        promoBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Checking...';
        promoBtn.disabled = true;
        
        const result = await this.callApi('usePromoCode', { code: code });
        
        if (result.success) {
            this.rateLimiter.addRequest(this.tgUser.id, 'promo_code');
            
            if (result.rewardType === 'ton') {
                this.userState.balance = result.newBalance;
                this.userState.totalEarned = this.safeNumber(this.userState.totalEarned) + result.rewardAmount;
            } else {
                this.userState.star = result.newStar;
            }
            this.userState.totalPromoCodes = this.safeNumber(this.userState.totalPromoCodes) + 1;
            
            this.cache.delete(`user_${this.tgUser.id}`);
            this.updateHeader();
            promoInput.value = '';
            
            const rewardSymbol = result.rewardType === 'ton' ? 'TON' : 'STAR';
            this.showNotification("Success", `Promo code applied! ${result.rewardAmount.toFixed(4)} ${rewardSymbol}`, "success");
            this.showShake('success');
        } else {
            this.showNotification("Error", result.error || "Failed to apply promo code", "error");
            this.showShake('error');
        }
        
        promoBtn.innerHTML = originalText;
        promoBtn.disabled = false;
    }

    async checkChannelMembership(channelUsername) {
        try {
            const res = await fetch('/api/check-channel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: channelUsername, userId: this.tgUser.id })
            });
            const { isMember } = await res.json();
            return isMember;
        } catch (error) {
            return false;
        }
    }

    showJoinRequiredModal(channelUsername) {
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        
        modal.innerHTML = `
            <div class="task-modal-content" style="text-align: center;">
                <button class="task-modal-close" id="modal-close">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="join-icon" style="font-size: 50px; color: #2ecc71; margin-bottom: 15px;">
                    <i class="fab fa-telegram"></i>
                </div>
                <h3 style="color: var(--text-primary); margin-bottom: 10px;">Join Required</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">You need to join the channel to use this promo code:</p>
                
                <a href="https://t.me/${channelUsername.replace('@', '')}" target="_blank" class="join-channel-btn" style="display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, #2ecc71, #1e8449); border-radius: 50px; padding: 14px; color: white; text-decoration: none; font-weight: bold; margin-bottom: 15px;">
                    <i class="fab fa-telegram"></i> Join ${channelUsername}
                </a>
                
                <button class="check-join-btn" id="check-join-btn" style="width: 100%; padding: 14px; background: rgba(46, 204, 113, 0.2); border: 1px solid #2ecc71; border-radius: 50px; color: #2ecc71; font-weight: bold; cursor: pointer;">
                    <i class="fas fa-check-circle"></i> I've Joined
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        const checkJoinBtn = document.getElementById('check-join-btn');
        if (checkJoinBtn) {
            checkJoinBtn.addEventListener('click', async () => {
                checkJoinBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Checking...';
                checkJoinBtn.disabled = true;
                
                const isMember = await this.checkChannelMembership(channelUsername);
                
                if (isMember) {
                    modal.remove();
                    await this.handlePromoCode();
                } else {
                    this.showNotification("Not Joined", "Please join the channel first", "error");
                    checkJoinBtn.innerHTML = '<i class="fas fa-check-circle"></i> I\'ve Joined';
                    checkJoinBtn.disabled = false;
                }
            });
        }
    }

    setupTaskButtons() {
        const startButtons = document.querySelectorAll('.task-btn.start:not(:disabled)');
        startButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (this.isProcessingTask) return;
                
                const rateLimitCheck = this.rateLimiter.checkLimit(this.tgUser.id, 'task_start');
                if (!rateLimitCheck.allowed) {
                    this.showNotification("Rate Limit", `Please wait ${rateLimitCheck.remaining} seconds`, "warning");
                    this.showShake('error');
                    return;
                }
                
                const taskId = btn.getAttribute('data-task-id');
                const taskUrl = btn.getAttribute('data-task-url');
                const taskVerification = btn.getAttribute('data-task-verification') || 'NO';
                const taskReward = parseFloat(btn.getAttribute('data-task-reward')) || 0;
                const taskPop = parseInt(btn.getAttribute('data-task-pop')) || 1;
                
                if (taskId && taskUrl) {
                    e.preventDefault();
                    await this.handleTask(taskId, taskUrl, taskVerification, taskReward, taskPop, btn);
                }
            });
        });
    }

    async handleTask(taskId, url, verification, reward, popReward, button) {
        if (this.userCompletedTasks.has(taskId)) {
            this.showNotification("Already Completed", "You have already completed this task", "info");
            this.showShake('warning');
            return;
        }
        
        if (this.isProcessingTask) {
            this.showNotification("Busy", "Please complete current task first", "warning");
            this.showShake('error');
            return;
        }
        
        const rateLimitCheck = this.rateLimiter.checkLimit(this.tgUser.id, 'task_start');
        if (!rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", `Please wait ${rateLimitCheck.remaining} seconds`, "warning");
            this.showShake('error');
            return;
        }
        
        this.rateLimiter.addRequest(this.tgUser.id, 'task_start');
        
        window.open(url, '_blank');
        
        this.disableAllTaskButtons();
        this.isProcessingTask = true;
        
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        button.disabled = true;
        button.classList.remove('start');
        button.classList.add('counting');
        
        let secondsLeft = 10;
        const countdown = setInterval(() => {
            secondsLeft--;
            if (secondsLeft > 0) {
                button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
            } else {
                clearInterval(countdown);
                button.innerHTML = 'Check';
                button.disabled = false;
                button.classList.remove('counting');
                button.classList.add('check');
                
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.completeTask(taskId, url, verification, reward, popReward, newButton);
                });
            }
        }, 1000);
        
        setTimeout(() => {
            if (secondsLeft > 0) {
                clearInterval(countdown);
                button.innerHTML = 'Start';
                button.disabled = false;
                button.classList.remove('counting');
                button.classList.add('start');
                this.enableAllTaskButtons();
                this.isProcessingTask = false;
            }
        }, 11000);
    }

    async completeTask(taskId, url, verification, reward, popReward, button) {
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
            button.disabled = true;
        }
        
        this.disableAllTaskButtons();
        this.isProcessingTask = true;
        
        try {
            let task = null;
            if (this.taskManager) {
                const allTasks = [...(this.taskManager.mainTasks || []), ...(this.taskManager.partnerTasks || []), ...(this.taskManager.socialTasks || [])];
                for (const t of allTasks) {
                    if (t.id === taskId) {
                        task = t;
                        break;
                    }
                }
            }
            
            if (!task) {
                throw new Error("Task not found");
            }
            
            const currentCompletions = task.currentCompletions || 0;
            const maxCompletions = task.maxCompletions || 100;
            
            if (currentCompletions >= maxCompletions) {
                this.showNotification("Task Full", "This task has reached its completion limit", "error");
                this.enableAllTaskButtons();
                this.isProcessingTask = false;
                if (button) {
                    button.innerHTML = 'Start';
                    button.disabled = false;
                    button.classList.remove('check');
                    button.classList.add('start');
                }
                return;
            }
            
            if (verification === 'YES') {
                const chatId = this.taskManager.extractChatIdFromUrl(url);
                
                let shouldVerify = false;
                
                if (chatId) {
                    try {
                        const isBotAdmin = await this.checkBotAdminStatus(chatId);
                        if (isBotAdmin) {
                            shouldVerify = true;
                        }
                    } catch (error) {}
                }
                
                if (shouldVerify) {
                    const verificationResult = await this.verifyTaskMembership(chatId, this.tgUser.id);
                    
                    if (!verificationResult.success) {
                        this.showNotification("Verification Failed", verificationResult.message || "Please join the channel first!", "error");
                        this.showShake('error');
                        
                        this.enableAllTaskButtons();
                        this.isProcessingTask = false;
                        
                        if (button) {
                            button.innerHTML = 'Start';
                            button.disabled = false;
                            button.classList.remove('check');
                            button.classList.add('start');
                            
                            const newButton = button.cloneNode(true);
                            button.parentNode.replaceChild(newButton, button);
                            
                            newButton.addEventListener('click', async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await this.handleTask(taskId, url, verification, reward, popReward, newButton);
                            });
                        }
                        return;
                    }
                }
            }
            
            await this.processTaskCompletion(taskId, task, button);
            
        } catch (error) {
            this.enableAllTaskButtons();
            this.isProcessingTask = false;
            
            this.showNotification("Error", "Failed to verify task", "error");
            this.showShake('error');
            
            if (button) {
                button.innerHTML = 'Start';
                button.disabled = false;
                button.classList.remove('check');
                button.classList.add('start');
                
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.handleTask(taskId, url, verification, reward, popReward, newButton);
                });
            }
        }
    }

    async verifyTaskMembership(chatId, userId) {
        try {
            const res = await fetch('/api/verify-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, userId })
            });
            const { isMember } = await res.json();
            return { success: isMember, message: isMember ? "OK" : "Not joined" };
        } catch (error) {
            return { success: false, message: "Verification error" };
        }
    }

    async processTaskCompletion(taskId, task, button) {
        try {
            const result = await this.callApi('completeTask', {
                taskId: taskId,
                reward: task.reward,
                starReward: task.popReward || 1
            });
            
            if (result.success) {
                this.userState.balance = result.balance;
                this.userState.star = result.star;
                this.userState.totalEarned = result.totalEarned;
                this.userState.completedTasks = result.completedTasks;
                this.userCompletedTasks = new Set(result.completedTasks);
                
                this.updateHeader();
                
                if (button) {
                    const taskCard = document.getElementById(`task-${taskId}`);
                    if (taskCard) {
                        const taskBtn = taskCard.querySelector('.task-btn');
                        if (taskBtn) {
                            taskBtn.innerHTML = 'Done';
                            taskBtn.className = 'task-btn done';
                            taskBtn.disabled = true;
                            taskCard.classList.add('task-completed');
                        }
                    }
                }
                
                this.taskCompletionCount++;
                
                if (this.taskCompletionCount >= 5) {
                    this.taskCompletionCount = 0;
                    await this.showInAppAd('AdBlock1');
                }
                
                this.enableAllTaskButtons();
                this.isProcessingTask = false;
                
                this.showNotification("Task Completed!", `${task.reward.toFixed(4)} TON, ${task.popReward || 1} STAR`, "success");
                this.showShake('success');
                
                return true;
            } else {
                this.showNotification("Error", result.error || "Failed to complete task", "error");
                this.enableAllTaskButtons();
                this.isProcessingTask = false;
                return false;
            }
        } catch (error) {
            this.showNotification("Error", "Failed to complete task", "error");
            this.enableAllTaskButtons();
            this.isProcessingTask = false;
            return false;
        }
    }

    disableAllTaskButtons() {
        document.querySelectorAll('.task-btn:not(.done):not(.counting):not(:disabled)').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
    }

    enableAllTaskButtons() {
        document.querySelectorAll('.task-btn:not(.done):not(.counting)').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    }

    async renderReferralsPage() {
        const referralsPage = document.getElementById('referrals-page');
        if (!referralsPage) return;
        
        const referralLink = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        const friendsCount = this.userState.friendsCount || 0;
        const canClaim = this.pendingProfits > 0.00001;
        
        let currentQuest = this.quests[this.currentQuestIndex];
        if (!currentQuest) {
            currentQuest = this.quests[this.quests.length - 1];
        }
        
        const questCompleted = friendsCount >= currentQuest.required;
        const questClaimed = currentQuest.completed;
        
        referralsPage.innerHTML = `
            <div class="referrals-container">
                <div class="referral-link-section">
                    <div class="referral-link-box">
                        <p class="link-label">
                            <i class="fas fa-link"></i> Referral Link:
                        </p>
                        <div class="link-display" id="referral-link-text">${referralLink}</div>
                        <button class="copy-btn" id="copy-referral-link-btn">
                            <i class="far fa-copy"></i> Copy Link
                        </button>
                    </div>
                    
                    <div class="referral-info">
                        <div class="info-card">
                            <div class="info-icon">
                                <i class="fas fa-percent"></i>
                            </div>
                            <div class="info-content">
                                <h4>Earn 20% Commission</h4>
                                <p>20% of your friends earnings</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-grid-two">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h4>Total Referrals</h4>
                                <p class="stat-value">${friendsCount}</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-coins"></i>
                            </div>
                            <div class="stat-info">
                                <h4>Total Earnings</h4>
                                <p class="stat-value">${this.totalReferralEarnings.toFixed(4)} TON</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pending-profits-card">
                        <div class="pending-header">
                            <span><i class="fas fa-clock"></i> Pending Profits</span>
                            <span class="pending-amount">${this.pendingProfits.toFixed(6)} TON</span>
                        </div>
                        <button class="claim-profits-btn ${canClaim ? '' : 'disabled'}" id="claim-profits-btn" ${!canClaim ? 'disabled' : ''}>
                            <i class="fas fa-arrow-down"></i> CLAIM
                        </button>
                    </div>
                </div>
                
                <div class="quest-section">
                    <h3><i class="fas fa-trophy"></i> Quests</h3>
                    <div class="quest-card">
                        <div class="quest-info">
                            <div class="quest-title">${currentQuest.text}</div>
                            <div class="quest-rewards">
                                <span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="reward-icon">${currentQuest.rewardTon.toFixed(4)} TON</span>
                                <span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="reward-icon">${currentQuest.rewardStar} STAR</span>
                            </div>
                        </div>
                        <div class="quest-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((friendsCount / currentQuest.required) * 100, 100)}%"></div>
                            </div>
                            <div class="quest-count">${friendsCount}/${currentQuest.required}</div>
                        </div>
                        ${!questClaimed && questCompleted ? 
                            `<button class="quest-claim-btn" id="quest-claim-btn"><i class="fas fa-gift"></i> CLAIM</button>` : 
                            questClaimed ? 
                            `<button class="quest-claimed-btn" disabled><i class="fas fa-check"></i> CLAIMED</button>` :
                            `<button class="quest-btn-disabled" disabled><i class="fas fa-lock"></i> ${friendsCount}/${currentQuest.required}</button>`
                        }
                    </div>
                </div>
            </div>
        `;
        
        this.setupReferralsPageEvents();
        
        const claimBtn = document.getElementById('claim-profits-btn');
        if (claimBtn && canClaim) {
            claimBtn.addEventListener('click', () => this.claimPendingProfits());
        }
        
        const questClaimBtn = document.getElementById('quest-claim-btn');
        if (questClaimBtn && questCompleted && !questClaimed) {
            questClaimBtn.addEventListener('click', () => this.claimQuestReward(currentQuest));
        }
    }

    async claimQuestReward(quest) {
        const adShown = await this.showInAppAd('AdBlock1');
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to claim reward", "info");
            return;
        }
        
        const result = await this.callApi('claimQuest', {
            questId: quest.id,
            rewardTon: quest.rewardTon,
            rewardStar: quest.rewardStar,
            questIndex: this.currentQuestIndex
        });
        
        if (result.success) {
            this.userState.balance = result.newBalance;
            this.userState.star = result.newStar;
            this.currentQuestIndex = result.newQuestIndex;
            
            for (let i = 0; i < this.quests.length; i++) {
                if (i < this.currentQuestIndex) {
                    this.quests[i].completed = true;
                } else {
                    this.quests[i].completed = false;
                }
            }
            
            this.updateHeader();
            this.renderReferralsPage();
            
            this.showNotification("Quest Completed!", `${quest.rewardTon.toFixed(4)} TON, ${quest.rewardStar} STAR`, "success");
            this.showShake('success');
        } else {
            this.showNotification("Error", result.error || "Failed to claim quest reward", "error");
        }
    }

    setupReferralsPageEvents() {
        const copyBtn = document.getElementById('copy-referral-link-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const referralLink = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
                this.copyToClipboard(referralLink);
                
                copyBtn.classList.add('copied');
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Referral Link Copied!';
                
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = originalText;
                }, 2000);
            });
        }
    }

    async renderProfilePage() {
        const profilePage = document.getElementById('profile-page');
        if (!profilePage) return;
        
        const joinDate = new Date(this.userState.createdAt || this.getServerTime());
        const formattedDate = this.formatDate(joinDate);
        
        const totalTasksCompleted = this.safeNumber(this.userState.totalTasksCompleted || 0);
        const totalReferrals = this.userState.friendsCount || 0;
        const totalSTAR = this.safeNumber(this.userState.star || 0);
        
        const tasksRequired = this.appConfig.REQUIRED_TASKS_FOR_WITHDRAWAL;
        const referralsRequired = this.appConfig.REQUIRED_REFERRALS_FOR_WITHDRAWAL;
        const starRequired = this.appConfig.REQUIRED_POP_FOR_WITHDRAWAL;
        
        const tasksProgress = Math.min(totalTasksCompleted, tasksRequired);
        const referralsProgress = Math.min(totalReferrals, referralsRequired);
        const starProgress = Math.min(totalSTAR, starRequired);
        
        const tasksCompleted = totalTasksCompleted >= tasksRequired;
        const referralsCompleted = totalReferrals >= referralsRequired;
        const starCompleted = totalSTAR >= starRequired;
        
        const canWithdraw = tasksCompleted && referralsCompleted && starCompleted;
        
        const maxBalance = this.safeNumber(this.userState.balance);
        
        const depositComment = this.tgUser.id.toString(); 
        const directPayUrl = `https://app.tonkeeper.com/transfer/${this.appConfig.BOT_WALLET}?text=${depositComment}`;
        
        profilePage.innerHTML = `
            <div class="profile-container">
                <div class="profile-tabs">
                    <button class="profile-tab active" data-profile-tab="deposit-tab">
                        <i class="fas fa-arrow-down"></i> Deposit
                    </button>
                    <button class="profile-tab" data-profile-tab="exchange-tab">
                        <i class="fas fa-exchange-alt"></i> Exchange
                    </button>
                    <button class="profile-tab" data-profile-tab="withdraw-tab">
                        <i class="fas fa-wallet"></i> Withdraw
                    </button>
                </div>
                
                <div id="deposit-tab" class="profile-tab-content active">
                    <div class="deposit-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-arrow-down"></i>
                            </div>
                            <div class="card-title">Deposit TON</div>
                        </div>
                        <div class="card-divider"></div>
                        
                        <div class="deposit-info">
                            <div class="deposit-row">
                                <span class="deposit-label">Wallet:</span>
                                <span class="deposit-value" id="deposit-wallet">${this.truncateAddress(this.appConfig.DEPOSIT_WALLET)}</span>
                                <button class="deposit-copy-btn" data-copy="wallet">
                                    <i class="far fa-copy"></i>
                                </button>
                            </div>
                            <div class="deposit-row">
                                <span class="deposit-label">Comment:</span>
                                <span class="deposit-value" id="deposit-comment">${depositComment}</span>
                                <button class="deposit-copy-btn" data-copy="comment">
                                    <i class="far fa-copy"></i>
                                </button>
                            </div>
                            <div class="deposit-actions">
                                <a href="${directPayUrl}" target="_blank" class="direct-pay-btn" id="direct-pay-btn">
                                    <i class="fas fa-bolt"></i> Direct Pay
                                </a>
                            </div>
                            <div class="deposit-note">
                                <i class="fas fa-info-circle"></i>
                                <span>Deposits processed within 1-24 hour</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="history-section">
                        <h3 style="font-size: 1rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-history"></i> Deposit History
                        </h3>
                        <div class="history-list" id="deposits-list">
                            ${this.renderDepositsHistory()}
                        </div>
                    </div>
                </div>
                
                <div id="exchange-tab" class="profile-tab-content">
                    <div class="exchange-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <div class="card-title">Exchange TON to STAR</div>
                        </div>
                        <div class="card-divider"></div>
                        
                        <div class="exchange-mini-balance">
                            <div class="mini-balance-item">
                                <img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" alt="TON">
                                <span>${this.safeNumber(this.userState.balance).toFixed(4)} TON</span>
                            </div>
                            <div class="mini-balance-item">
                                <img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" alt="STAR">
                                <span>${Math.floor(this.safeNumber(this.userState.star))} STAR</span>
                            </div>
                        </div>
                        
                        <div class="exchange-input-group">
                            <div class="amount-input-container">
                                <input type="number" id="exchange-input" class="form-input" 
                                       placeholder="TON amount" step="0.01" min="${this.appConfig.MIN_EXCHANGE_TON}">
                                <span class="exchange-preview" id="exchange-preview">≈ 0 STAR</span>
                                <button type="button" class="max-btn" id="exchange-max-btn">MAX</button>
                            </div>
                            <button class="exchange-btn" id="exchange-btn">
                                <i class="fas fa-coins"></i> Exchange
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="withdraw-tab" class="profile-tab-content">
                    <div class="withdraw-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-wallet"></i>
                            </div>
                            <div class="card-title">Withdraw TON</div>
                        </div>
                        <div class="card-divider"></div>
                        
                        <div class="requirements-wrapper">
                            ${!tasksCompleted ? `
                            <div class="requirement-item">
                                <div class="req-info">
                                    <span><i class="fas fa-tasks"></i> Complete Tasks</span>
                                    <span class="req-count">${tasksProgress}/${tasksRequired}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(tasksProgress/tasksRequired)*100}%"></div>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${referralsRequired > 0 && !referralsCompleted ? `
                            <div class="requirement-item">
                                <div class="req-info">
                                    <span><i class="fas fa-users"></i> Invite Friends</span>
                                    <span class="req-count">${referralsProgress}/${referralsRequired}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(referralsProgress/referralsRequired)*100}%"></div>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${!starCompleted ? `
                            <div class="requirement-item">
                                <div class="req-info">
                                    <span><i class="fas fa-star"></i> Earn STAR</span>
                                    <span class="req-count">${starProgress}/${starRequired}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(starProgress/starRequired)*100}%"></div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="profile-wallet-input">
                                <i class="fas fa-wallet"></i> TON Wallet Address
                            </label>
                            <input type="text" id="profile-wallet-input" class="form-input" 
                                   placeholder="Enter your TON wallet address (UQ...)"
                                   required>
                        </div>
                        
                        <div class="form-group amount-group">
                            <label class="form-label" for="profile-amount-input">
                                <i class="fas fa-gem"></i> Withdrawal Amount
                            </label>
                            <div class="amount-input-container">
                                <input type="number" id="profile-amount-input" class="form-input" 
                                       step="0.00001" min="${this.appConfig.MINIMUM_WITHDRAW}" 
                                       max="${maxBalance}"
                                       placeholder="Min: ${this.appConfig.MINIMUM_WITHDRAW.toFixed(4)} TON"
                                       required>
                                <button type="button" class="max-btn" id="max-btn">MAX</button>
                            </div>
                        </div>
                        
                        <button id="profile-withdraw-btn" class="withdraw-btn" 
                                ${!canWithdraw || maxBalance < this.appConfig.MINIMUM_WITHDRAW ? 'disabled' : ''}>
                            <i class="fas fa-paper-plane"></i> 
                            ${canWithdraw ? 'WITHDRAW NOW' : this.getWithdrawButtonText(tasksCompleted, referralsCompleted, starCompleted)}
                        </button>
                    </div>
                    
                    <div class="history-section">
                        <h3 style="font-size: 1rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-history"></i> Withdrawal History
                        </h3>
                        <div class="history-list" id="withdrawals-list">
                            ${this.renderWithdrawalsHistory()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupProfilePageEvents();
        
        const profileTabs = document.querySelectorAll('.profile-tab');
        const profileTabContents = document.querySelectorAll('.profile-tab-content');
        
        profileTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-profile-tab');
                
                profileTabs.forEach(t => t.classList.remove('active'));
                profileTabContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetTab = document.getElementById(tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            });
        });
    }
    
    renderDepositsHistory() {
        if (!this.depositHistory || this.depositHistory.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-history"></i>
                    <p>No deposit history</p>
                    <p class="hint">Your deposits will appear here</p>
                </div>
            `;
        }
        
        return this.depositHistory.map(deposit => {
            const amount = this.safeNumber(deposit.amount);
            const timestamp = deposit.timestamp;
            
            return `
                <div class="history-item-detailed">
                    <div class="history-left">
                        <div class="history-amount">${amount.toFixed(4)} TON</div>
                        <div class="history-time"><i class="fas fa-clock"></i> ${this.formatDateTime(timestamp)}</div>
                    </div>
                    <div class="history-status completed">COMPLETED</div>
                </div>
            `;
        }).join('');
    }
      
    renderWithdrawalsHistory() {
        if (!this.userWithdrawals || this.userWithdrawals.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-history"></i>
                    <p>No withdrawal history</p>
                    <p class="hint">Your withdrawals will appear here</p>
                </div>
            `;
        }
        
        return this.userWithdrawals.map(withdrawal => {
            const statusClass = withdrawal.status || 'pending';
            const statusText = (withdrawal.status || 'pending').toUpperCase();
            const amount = this.safeNumber(withdrawal.amount);
            const timestamp = withdrawal.timestamp || withdrawal.createdAt || Date.now();
            const wallet = withdrawal.walletAddress || 'Unknown';
            const truncatedWallet = this.truncateAddress(wallet);
            
            return `
                <div class="history-item-detailed">
                    <div class="history-left">
                        <div class="history-amount">${amount.toFixed(4)} TON</div>
                        <div class="history-time"><i class="fas fa-clock"></i> ${this.formatDateTime(timestamp)}</div>
                        <div class="history-wallet"><i class="fas fa-wallet"></i> ${truncatedWallet}</div>
                    </div>
                    <div class="history-status ${statusClass}">${statusText}</div>
                </div>
            `;
        }).join('');
    }
    
    truncateString(str, length) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    getWithdrawButtonText(tasksCompleted, referralsCompleted, starCompleted) {
        if (!tasksCompleted) {
            return `COMPLETE ${this.appConfig.REQUIRED_TASKS_FOR_WITHDRAWAL} TASKS`;
        }
        if (!referralsCompleted) {
            return `INVITE ${this.appConfig.REQUIRED_REFERRALS_FOR_WITHDRAWAL} FRIEND`;
        }
        if (!starCompleted) {
            return `EARN ${this.appConfig.REQUIRED_POP_FOR_WITHDRAWAL} STAR`;
        }
        return 'WITHDRAW NOW';
    }

    truncateAddress(address) {
        if (!address) return 'N/A';
        if (address.length <= 15) return address;
        return address.substring(0, 5) + '....' + address.substring(address.length - 5);
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    setupProfilePageEvents() {
        const withdrawBtn = document.getElementById('profile-withdraw-btn');
        const walletInput = document.getElementById('profile-wallet-input');
        const amountInput = document.getElementById('profile-amount-input');
        const maxBtn = document.getElementById('max-btn');
        
        const copyButtons = document.querySelectorAll('[data-copy]');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const type = btn.dataset.copy;
                let text = '';
                
                if (type === 'wallet') {
                    text = this.appConfig.DEPOSIT_WALLET;
                } else if (type === 'comment') {
                    text = this.tgUser.id.toString();
                }
                
                if (text) {
                    this.copyToClipboard(text);
                    
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                    }, 2000);
                }
            });
        });
        
        const exchangeBtn = document.getElementById('exchange-btn');
        if (exchangeBtn) {
            exchangeBtn.addEventListener('click', () => this.exchangeTonToStar());
        }
        
        const exchangeInput = document.getElementById('exchange-input');
        const exchangePreview = document.getElementById('exchange-preview');
        const exchangeMaxBtn = document.getElementById('exchange-max-btn');
        
        if (exchangeInput && exchangePreview) {
            exchangeInput.addEventListener('input', () => {
                const value = parseFloat(exchangeInput.value) || 0;
                const starAmount = Math.floor(value * this.appConfig.POP_PER_TON);
                exchangePreview.textContent = `≈ ${starAmount} STAR`;
                
                if (value > 0) {
                    exchangePreview.style.opacity = '1';
                } else {
                    exchangePreview.style.opacity = '0.7';
                }
            });
        }
        
        if (exchangeMaxBtn && exchangeInput) {
            exchangeMaxBtn.addEventListener('click', () => {
                const max = this.safeNumber(this.userState.balance);
                exchangeInput.value = max.toFixed(4);
                const starAmount = Math.floor(max * this.appConfig.POP_PER_TON);
                if (exchangePreview) {
                    exchangePreview.textContent = `≈ ${starAmount} STAR`;
                }
            });
        }
        
        if (maxBtn && amountInput) {
            maxBtn.addEventListener('click', () => {
                const max = this.safeNumber(this.userState.balance);
                amountInput.value = max.toFixed(4);
            });
        }
        
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', async () => {
                await this.handleProfileWithdrawal(walletInput, amountInput, withdrawBtn);
            });
        }
        
        if (amountInput) {
            amountInput.addEventListener('input', () => {
                const max = this.safeNumber(this.userState.balance);
                const value = parseFloat(amountInput.value) || 0;
                
                if (value > max) {
                    amountInput.value = max.toFixed(4);
                }
            });
        }
    }
    
    async exchangeTonToStar() {
        const exchangeBtn = document.getElementById('exchange-btn');
        const exchangeInput = document.getElementById('exchange-input');
        const exchangePreview = document.getElementById('exchange-preview');
        
        if (!exchangeInput || !exchangeBtn) return;
        
        const tonAmount = parseFloat(exchangeInput.value);
        
        if (!tonAmount || tonAmount < this.appConfig.MIN_EXCHANGE_TON) {
            this.showNotification("Error", `Minimum exchange is ${this.appConfig.MIN_EXCHANGE_TON} TON`, "error");
            this.showShake('error');
            return;
        }
        
        const tonBalance = this.safeNumber(this.userState.balance);
        
        if (tonAmount > tonBalance) {
            this.showNotification("Error", "Insufficient TON balance", "error");
            this.showShake('error');
            return;
        }
        
        const rateLimitCheck = this.rateLimiter.checkLimit(this.tgUser.id, 'exchange');
        if (!rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", `Please wait ${rateLimitCheck.remaining} seconds`, "warning");
            this.showShake('error');
            return;
        }
        
        const adShown = await this.showInAppAd('AdBlock1');
        
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to complete exchange", "info");
            this.showShake('warning');
            return;
        }
        
        this.rateLimiter.addRequest(this.tgUser.id, 'exchange');
        
        const originalText = exchangeBtn.innerHTML;
        exchangeBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Processing...';
        exchangeBtn.disabled = true;
        
        const result = await this.callApi('exchangeTonToStar', {
            tonAmount: tonAmount,
            popPerTon: this.appConfig.POP_PER_TON
        });
        
        if (result.success) {
            this.userState.balance = result.newBalance;
            this.userState.star = result.newStar;
            
            exchangeInput.value = '';
            if (exchangePreview) {
                exchangePreview.textContent = '≈ 0 STAR';
            }
            this.updateHeader();
            
            const miniBalanceItems = document.querySelectorAll('.mini-balance-item');
            if (miniBalanceItems.length >= 2) {
                miniBalanceItems[0].querySelector('span').textContent = `${result.newBalance.toFixed(4)} TON`;
                miniBalanceItems[1].querySelector('span').textContent = `${Math.floor(result.newStar)} STAR`;
            }
            
            this.showNotification("Success", `Exchanged ${tonAmount.toFixed(4)} TON to ${result.starAmount} STAR`, "success");
            this.showShake('success');
        } else {
            this.showNotification("Error", result.error || "Failed to exchange", "error");
            this.showShake('error');
        }
        
        exchangeBtn.innerHTML = originalText;
        exchangeBtn.disabled = false;
    }
    
    async handleProfileWithdrawal(walletInput, amountInput, withdrawBtn) {
        if (!walletInput || !amountInput || !withdrawBtn) return;
        
        const walletAddress = walletInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const userBalance = this.safeNumber(this.userState.balance);
        const minimumWithdraw = this.appConfig.MINIMUM_WITHDRAW;
        
        const totalTasksCompleted = this.safeNumber(this.userState.totalTasksCompleted || 0);
        const requiredTasks = this.appConfig.REQUIRED_TASKS_FOR_WITHDRAWAL;
        const totalReferrals = this.userState.friendsCount || 0;
        const requiredReferrals = this.appConfig.REQUIRED_REFERRALS_FOR_WITHDRAWAL;
        const totalSTAR = this.safeNumber(this.userState.star || 0);
        const requiredSTAR = this.appConfig.REQUIRED_POP_FOR_WITHDRAWAL;
        
        if (!walletAddress || walletAddress.length < 20) {
            this.showNotification("Error", "Please enter a valid TON wallet address", "error");
            this.showShake('error');
            return;
        }
        
        if (!amount || amount < minimumWithdraw) {
            this.showNotification("Error", `Minimum withdrawal is ${minimumWithdraw.toFixed(4)} TON`, "error");
            this.showShake('error');
            return;
        }
        
        if (amount > userBalance) {
            this.showNotification("Error", "Insufficient balance", "error");
            this.showShake('error');
            return;
        }
        
        if (totalTasksCompleted < requiredTasks) {
            const tasksNeeded = requiredTasks - totalTasksCompleted;
            this.showNotification("Tasks Required", `You need to complete ${tasksNeeded} more tasks to withdraw`, "error");
            this.showShake('error');
            return;
        }
        
        if (totalReferrals < requiredReferrals) {
            const referralsNeeded = requiredReferrals - totalReferrals;
            this.showNotification("Referrals Required", `You need to invite ${referralsNeeded} more friend${referralsNeeded > 1 ? 's' : ''} to withdraw`, "error");
            this.showShake('error');
            return;
        }
        
        if (totalSTAR < requiredSTAR) {
            const starNeeded = requiredSTAR - totalSTAR;
            this.showNotification("STAR Required", `You need to earn ${starNeeded} more STAR to withdraw`, "error");
            this.showShake('error');
            return;
        }
        
        const rateLimitCheck = this.rateLimiter.checkLimit(this.tgUser.id, 'withdrawal');
        if (!rateLimitCheck.allowed) {
            this.showNotification("Rate Limit", "You can only withdraw once per day. Please try again tomorrow.", "warning");
            this.showShake('error');
            return;
        }
        
        const adShown = await this.showInAppAd('AdBlock2');
        
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to process withdrawal", "info");
            this.showShake('warning');
            return;
        }
        
        this.rateLimiter.addRequest(this.tgUser.id, 'withdrawal');
        
        const originalText = withdrawBtn.innerHTML;
        withdrawBtn.disabled = true;
        withdrawBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Processing...';
        
        const result = await this.callApi('createWithdrawal', {
            walletAddress: walletAddress,
            amount: amount,
            minimumWithdraw: minimumWithdraw,
            requiredTasks: requiredTasks,
            requiredReferrals: requiredReferrals,
            requiredStar: requiredSTAR
        });
        
        if (result.success) {
            this.userState.balance = result.newBalance;
            
            const tasksToRemove = [];
            for (const taskId of this.userCompletedTasks) {
                if (tasksToRemove.length < requiredTasks) {
                    tasksToRemove.push(taskId);
                } else {
                    break;
                }
            }
            
            for (const taskId of tasksToRemove) {
                this.userCompletedTasks.delete(taskId);
            }
            
            this.updateHeader();
            walletInput.value = '';
            amountInput.value = '';
            
            await this.sendWithdrawalNotification(walletAddress, amount, Date.now());
            
            this.showNotification("Success", "Withdrawal request submitted!", "success");
            this.showShake('success');
            this.renderProfilePage();
        } else {
            this.showNotification("Error", result.error || "Failed to process withdrawal. No changes were made to your balance.", "error");
            this.showShake('error');
            
            withdrawBtn.disabled = false;
            withdrawBtn.innerHTML = originalText;
        }
    }

    copyToClipboard(text) {
        if (!text || this.isCopying) return;
        
        this.isCopying = true;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification("Copied", "Text copied to clipboard", "success");
            setTimeout(() => {
                this.isCopying = false;
            }, 1000);
        }).catch(() => {
            this.showNotification("Error", "Failed to copy text", "error");
            setTimeout(() => {
                this.isCopying = false;
            }, 1000);
        });
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    setupEventListeners() {
        const telegramIdElement = document.getElementById('user-telegram-id');
        if (telegramIdElement) {
            telegramIdElement.addEventListener('click', () => {
                if (this.tgUser?.id) {
                    this.copyToClipboard(this.tgUser.id.toString());
                }
            });
        }
    }

    safeNumber(value) {
        if (value === null || value === undefined) return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    getShortName(name) {
        if (!name) return 'User';
        return name;
    }

    truncateName(name, maxLength = 20) {
        if (!name) return 'User';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength) + '...';
    }

    showNotification(title, message, type = 'info') {
        this.vibrate(type);
        if (this.notificationManager) {
            this.notificationManager.showNotification(title, message, type);
        }
    }

    extractReferralId(startParam) {
        if (!startParam) return null;
        
        if (!isNaN(startParam)) {
            return parseInt(startParam);
        } else if (startParam.includes('startapp=')) {
            const match = startParam.match(/startapp=(\d+)/);
            if (match && match[1]) {
                return parseInt(match[1]);
            }
        } else if (startParam.includes('=')) {
            const parts = startParam.split('=');
            if (parts.length > 1 && !isNaN(parts[1])) {
                return parseInt(parts[1]);
            }
        }
        
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Telegram || !window.Telegram.WebApp) {
        document.body.innerHTML = `
            <div class="error-container">
                <div class="error-content">
                    <div class="error-icon">
                        <i class="fab fa-telegram"></i>
                    </div>
                    <h2>STAR BUZZ</h2>
                    <p>Please open from Telegram Mini App</p>
                </div>
            </div>
        `;
        return;
    }
    
    window.app = new App();
    
    setTimeout(() => {
        if (window.app && typeof window.app.initialize === 'function') {
            window.app.initialize();
        }
    }, 300);
});
