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
        
        this.loadingSteps = [
            { element: null, text: 'Loading App Data...', icon: 'fa-spinner fa-pulse', completedText: 'App Data Loaded', completedIcon: 'fa-check-circle' },
            { element: null, text: 'Loading User Data...', icon: 'fa-spinner fa-pulse', completedText: 'User Data Loaded', completedIcon: 'fa-check-circle' },
            { element: null, text: 'Checking User Status...', icon: 'fa-spinner fa-pulse', completedText: 'Status Verified', completedIcon: 'fa-check-circle' },
            { element: null, text: 'Loading Tasks...', icon: 'fa-spinner fa-pulse', completedText: 'Tasks Loaded', completedIcon: 'fa-check-circle' },
            { element: null, text: 'App Loading...', icon: 'fa-spinner fa-pulse', completedText: 'Ready!', completedIcon: 'fa-check-circle' }
        ];
        this.currentLoadingStep = 0;
        this.loadingComplete = false;
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
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            this.shakeElement(mainContent, type);
        }
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
            
            const firebaseSuccess = await this.initializeFirebase();
            
            if (firebaseSuccess) {
                this.setupFirebaseAuth();
            }
            
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
        try {
            if (!this.db) {
                return { allowed: true };
            }
            
            const userAgent = navigator.userAgent;
            const screenRes = `${window.screen.width}x${window.screen.height}`;
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const language = navigator.language;
            
            const deviceComponents = [
                userAgent,
                screenRes,
                timezone,
                language
            ];
            
            const deviceString = deviceComponents.join('|');
            let deviceHash = 0;
            for (let i = 0; i < deviceString.length; i++) {
                const char = deviceString.charCodeAt(i);
                deviceHash = ((deviceHash << 5) - deviceHash) + char;
                deviceHash = deviceHash & deviceHash;
            }
            
            this.deviceId = 'dev_' + Math.abs(deviceHash).toString(16);
            
            const savedDeviceId = localStorage.getItem('device_fingerprint');
            if (savedDeviceId && savedDeviceId !== this.deviceId) {
                this.deviceId = savedDeviceId;
            } else {
                localStorage.setItem('device_fingerprint', this.deviceId);
            }
            
            const deviceRef = await this.db.ref(`devices/${this.deviceId}`).once('value');
            
            if (deviceRef.exists()) {
                const deviceData = deviceRef.val();
                this.deviceOwnerId = deviceData.ownerId;
                
                if (deviceData.ownerId && deviceData.ownerId !== this.tgUser.id) {
                    return {
                        allowed: false,
                        message: "This device is already registered with another account."
                    };
                }
                
                await this.db.ref(`devices/${this.deviceId}`).update({
                    lastSeen: this.getServerTime(),
                    lastUserId: this.tgUser.id
                });
            } else {
                await this.db.ref(`devices/${this.deviceId}`).set({
                    ownerId: this.tgUser.id,
                    firstSeen: this.getServerTime(),
                    lastSeen: this.getServerTime(),
                    userAgent: navigator.userAgent,
                    screenResolution: screenRes,
                    timezone: timezone,
                    language: language
                });
                this.deviceOwnerId = this.tgUser.id;
            }
            
            return { allowed: true };
            
        } catch (error) {
            return { allowed: true };
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
    

    async loadUserCreatedTasks() {
        try {
            if (!this.db) return;
            
            const tasksRef = await this.db.ref(`config/userTasks/${this.tgUser.id}`).once('value');
            if (tasksRef.exists()) {
                const tasks = [];
                tasksRef.forEach(child => {
                    tasks.push({
                        id: child.key,
                        ...child.val()
                    });
                });
                this.userCreatedTasks = tasks;
            } else {
                this.userCreatedTasks = [];
            }
        } catch (error) {
            this.showNotification("Warning", "Failed to load your tasks", "warning");
            this.userCreatedTasks = [];
        }
    }

    async loadAdditionalRewards() {
        try {
            if (!this.db) return;
            
            const rewardsRef = await this.db.ref('config/more').once('value');
            if (rewardsRef.exists()) {
                const rewards = [];
                rewardsRef.forEach(child => {
                    const rewardData = child.val();
                    if (rewardData.status === 'active') {
                        rewards.push({
                            id: child.key,
                            name: rewardData.name || 'Reward',
                            description: rewardData.description || '',
                            rewardType: rewardData.rewardType || 'ton',
                            rewardAmount: this.safeNumber(rewardData.rewardAmount || 0),
                            starAmount: this.safeNumber(rewardData.popAmount || 0),
                            icon: rewardData.icon || 'fa-gift',
                            action: rewardData.action || 'none',
                            actionUrl: rewardData.actionUrl || ''
                        });
                    }
                });
                this.additionalRewards = rewards;
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
                                    if (opt === 250) price = 500;
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
                    </div>
                    
                    <div class="my-task-progress">
                        <div class="progress-header">
                            <span>Progress</span>
                            <span>${currentCompletions}/${maxCompletions}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    checkTaskFormComplete(modal) {
        const taskName = modal.querySelector('#task-name')?.value.trim();
        const taskLink = modal.querySelector('#task-link')?.value.trim();
        const payBtn = modal.querySelector('#pay-task-btn');
        const activeCompletion = modal.querySelector('.completion-option.active');
        
        const isComplete = taskName && taskName.length > 0 && taskName.length <= 15 && 
                          /^[a-zA-Z0-9\s]*$/.test(taskName) &&
                          taskLink && taskLink.startsWith('https://t.me/') &&
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
                }
            });
        });
        
        const verificationOptions = modal.querySelectorAll('#verification-selector .category-option');
        const upgradeContainer = modal.querySelector('#upgrade-admin-container');
        const upgradeBtn = modal.querySelector('#upgrade-admin-btn');
        
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
        
        const taskLinkInput = modal.querySelector('#task-link');
        if (taskLinkInput) {
            taskLinkInput.addEventListener('input', () => {
                const value = taskLinkInput.value.trim();
                if (value && !value.startsWith('https://t.me/')) {
                    this.showMessage(modal, 'Task link must start with https://t.me/', 'error');
                    this.showShake('error');
                } else {
                    messageDiv.style.display = 'none';
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
    }

    showMessage(modal, text, type) {
        const messageDiv = modal.querySelector('#task-message');
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
            const verification = modal.querySelector('#verification-selector .category-option.active').dataset.verification;
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
            
            if (!taskLink.startsWith('https://t.me/')) {
                this.showMessage(modal, 'Task link must start with https://t.me/', 'error');
                return;
            }
            
            let price = Math.floor(completions / 100) * APP_CONFIG.TASK_PRICE_PER_100_COMPLETIONS;
            if (completions === 250) price = 500;
            
            const userSTAR = this.safeNumber(this.userState.star);
            
            if (userSTAR < price) {
                this.showMessage(modal, 'Insufficient STAR balance', 'error');
                return;
            }
            
            const payBtn = modal.querySelector('#pay-task-btn');
            const originalText = payBtn.innerHTML;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Creating...';
            payBtn.disabled = true;
            
            try {
                if (verification === 'YES') {
                    const chatId = this.taskManager.extractChatIdFromUrl(taskLink);
                    if (chatId) {
                        const isBotAdmin = await this.checkBotAdminStatus(chatId);
                        if (!isBotAdmin) {
                            this.showMessage(modal, 'Please add the bot as an admin first!', 'error');
                            payBtn.innerHTML = originalText;
                            payBtn.disabled = false;
                            return;
                        }
                    }
                }
                
                const currentTime = this.getServerTime();
                const taskData = {
                    name: taskName,
                    url: taskLink,
                    category: 'social',
                    type: 'channel',
                    verification: verification,
                    maxCompletions: completions,
                    currentCompletions: 0,
                    status: 'active',
                    reward: 0.001,
                    starReward: 1,
                    owner: this.tgUser.id,
                    createdAt: currentTime,
                    picture: this.appConfig.BOT_AVATAR
                };
                
                if (this.db) {
                    const taskRef = await this.db.ref(`config/userTasks/${this.tgUser.id}`).push(taskData);
                    const taskId = taskRef.key;
                    
                    const newSTAR = userSTAR - price;
                    await this.db.ref(`users/${this.tgUser.id}`).update({
                        star: newSTAR
                    });
                    
                    this.userState.star = newSTAR;
                    
                    await this.loadUserCreatedTasks();
                    
                    const myTasksList = modal.querySelector('#my-tasks-list');
                    if (myTasksList) {
                        myTasksList.innerHTML = this.renderMyTasks();
                    }
                    
                    this.showMessage(modal, `Task created! Cost: ${price} STAR`, 'success');
                    
                    setTimeout(() => {
                        const messageDiv = modal.querySelector('#task-message');
                        if (messageDiv) {
                            messageDiv.style.display = 'none';
                        }
                    }, 3000);
                    
                    this.updateHeader();
                }
                
            } catch (error) {
                this.showMessage(modal, 'Failed to create task', 'error');
            } finally {
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
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }
            
            const response = await fetch('/api/firebase-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-telegram-user': this.tgUser?.id?.toString() || '',
                    'x-telegram-auth': this.tg?.initData || ''
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch Firebase config');
            }
            
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
            
            try {
                await this.auth.signInAnonymously();
            } catch (authError) {
                const randomEmail = `user_${this.tgUser.id}_${Date.now()}@popbuzz.app`;
                const randomPassword = Math.random().toString(36).slice(-10) + Date.now().toString(36);
                
                await this.auth.createUserWithEmailAndPassword(randomEmail, randomPassword);
            }
            
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
            this.showNotification("Error", "Failed to connect to database", "error");
            return false;
        }
    }

    setupFirebaseAuth() {
        if (!this.auth) return;
        
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                
                if (this.userState.firebaseUid !== user.uid) {
                    this.userState.firebaseUid = user.uid;
                    await this.syncUserWithFirebase();
                }
            } else {
                try {
                    await this.auth.signInAnonymously();
                } catch (error) {}
            }
        });
    }

    async syncUserWithFirebase() {
        try {
            if (!this.db || !this.auth.currentUser) {
                return;
            }
            
            const firebaseUid = this.auth.currentUser.uid;
            const telegramId = this.tgUser.id;
            
            const userRef = this.db.ref(`users/${telegramId}`);
            const userSnapshot = await userRef.once('value');
            
            if (!userSnapshot.exists()) {
                const userData = {
                    ...this.getDefaultUserState(),
                    firebaseUid: firebaseUid,
                    deviceId: this.deviceId,
                    createdAt: this.getServerTime(),
                    lastSynced: this.getServerTime()
                };
                
                await userRef.set(userData);
            } else {
                await userRef.update({
                    firebaseUid: firebaseUid,
                    deviceId: this.deviceId,
                    lastSynced: this.getServerTime()
                });
            }
            
        } catch (error) {}
    }

    async loadUserData(forceRefresh = false) {
        const cacheKey = `user_${this.tgUser.id}`;
        
        if (!forceRefresh) {
            const cachedData = this.cache.get(cacheKey);
            if (cachedData) {
                this.userState = cachedData;
                this.userSTAR = this.safeNumber(cachedData.star);
                this.updateHeader();
                return;
            }
        }
        
        try {
            if (!this.db || !this.firebaseInitialized || !this.auth?.currentUser) {
                this.userState = this.getDefaultUserState();
                this.userSTAR = 0;
                this.updateHeader();
                
                if (this.auth && !this.auth.currentUser) {
                    setTimeout(() => {
                        this.initializeFirebase();
                    }, 2000);
                }
                
                return;
            }
            
            const telegramId = this.tgUser.id;
            
            const userRef = this.db.ref(`users/${telegramId}`);
            const userSnapshot = await userRef.once('value');
            
            let userData;
            
            if (userSnapshot.exists()) {
                userData = userSnapshot.val();
                userData = await this.updateExistingUser(userRef, userData);
            } else {
                userData = await this.createNewUser(userRef);
            }
            
            if (userData.firebaseUid !== this.auth.currentUser.uid) {
                await userRef.update({
                    firebaseUid: this.auth.currentUser.uid,
                    lastUpdated: this.getServerTime()
                });
                userData.firebaseUid = this.auth.currentUser.uid;
            }
            
            this.userState = userData;
            this.userSTAR = this.safeNumber(userData.star);
            this.userCompletedTasks = new Set(userData.completedTasks || []);
            
            this.cache.set(cacheKey, userData, 60000);
            this.updateHeader();
            
        } catch (error) {
            this.showNotification("Warning", "Using local data", "warning");
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
            firebaseUid: this.auth?.currentUser?.uid || 'pending',
            deviceId: this.deviceId,
        };
    }

    async createNewUser(userRef) {
        if (this.deviceOwnerId && this.deviceOwnerId !== this.tgUser.id) {
            const banData = {
                status: 'ban',
                banReason: 'Multiple accounts per device are not allowed',
                bannedAt: this.getServerTime()
            };
            await userRef.set(banData);
            throw new Error('Device already registered with another account');
        }
        
        let referralId = null;
        const startParam = this.tg?.initDataUnsafe?.start_param;
        
        if (startParam) {
            referralId = this.extractReferralId(startParam);
            
            if (referralId && referralId > 0 && referralId !== this.tgUser.id) {
                const referrerRef = this.db.ref(`users/${referralId}`);
                const referrerSnapshot = await referrerRef.once('value');
                if (referrerSnapshot.exists()) {
                    this.pendingReferralAfterWelcome = referralId;
                } else {
                    referralId = null;
                }
            } else {
                referralId = null;
            }
        }
        
        const currentTime = this.getServerTime();
        const firebaseUid = this.auth?.currentUser?.uid || 'pending';
        
        const userData = {
            id: this.tgUser.id,
            username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
            firstName: this.getShortName(this.tgUser.first_name || ''),
            photoUrl: this.tgUser.photo_url || this.appConfig.DEFAULT_USER_AVATAR,
            referredBy: referralId,
            createdAt: currentTime,
            lastActive: currentTime,
            status: 'free',
            firebaseUid: firebaseUid,
            deviceId: this.deviceId
        };
        
        await userRef.set(userData);
        
        await this.sendWelcomeMessage();
        
        try {
            await this.updateAppStats('totalUsers', 1);
        } catch (statsError) {}
        
        if (referralId) {
            await this.addReferralWithPendingBonus(referralId, this.tgUser.id, firebaseUid);
        }
        
        return userData;
    }


async addReferralWithPendingBonus(referrerId, newUserId, firebaseUid) {
    try {
        if (!this.db) return;
        
        const currentTime = this.getServerTime();
        
        const existingRef = await this.db.ref(`referrals/${referrerId}/${newUserId}`).once('value');
        if (existingRef.exists()) {
            return;
        }
        
        await this.db.ref(`referrals/${referrerId}/${newUserId}`).set({
            userId: newUserId,
            username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
            firstName: this.getShortName(this.tgUser.first_name || ''),
            photoUrl: this.tgUser.photo_url || this.appConfig.DEFAULT_USER_AVATAR,
            joinedAt: currentTime
        });
        
    } catch (error) {
        console.error("Error adding pending referral:", error);
    }
}

async processPendingReferralsForReferrer(referrerId) {
    try {
        if (!this.db) return;
        
        const referralsRef = await this.db.ref(`referrals/${referrerId}`).once('value');
        if (!referralsRef.exists()) return;
        
        const referrals = referralsRef.val();
        let updated = false;
        const requiredTasks = APP_CONFIG.REFERRAL_REQUIRED_TASKS || 1;
        
        for (const referralId in referrals) {
            const referral = referrals[referralId];
            
            const userRef = await this.db.ref(`users/${referralId}`).once('value');
            if (!userRef.exists()) continue;
            
            const userData = userRef.val();
            const completedTasks = userData.completedTasksCount || 0;
            const referralState = userData.referralState;
            
            if (referralState === 'verified') continue;
            
            if (userData && userData.status !== 'ban' && completedTasks >= requiredTasks) {
                await this.db.ref(`users/${referralId}`).update({
                    referralState: 'verified'
                });
                
                await this.giveReferralBonus(referrerId, referralId);
                updated = true;
            }
        }
        
        if (updated) {
            this.cache.delete(`user_${referrerId}`);
            this.cache.delete(`referrals_${referrerId}`);
            
            if (this.tgUser && referrerId == this.tgUser.id) {
                await this.loadUserData(true);
                if (document.getElementById('referrals-page')?.classList.contains('active')) {
                    this.renderReferralsPage();
                }
                this.updateHeader();
            }
        }
        
    } catch (error) {}
}

async giveReferralBonus(referrerId, referralId) {
    try {
        if (!this.db) return;
        
        const checkRef = await this.db.ref(`referrals/${referrerId}/${referralId}/bonusGiven`).once('value');
        if (checkRef.val() === true) return;
        
        const referrerRef = this.db.ref(`users/${referrerId}`);
        const referrerSnapshot = await referrerRef.once('value');
        
        if (!referrerSnapshot.exists()) return;
        
        const referrerData = referrerSnapshot.val();
        
        if (referrerData.status === 'ban') return;
        
        const referralBonus = this.appConfig.REFERRAL_BONUS_TON;
        const referralStarBonus = this.appConfig.REFERRAL_BONUS_POP;
        
        const newBalance = this.safeNumber(referrerData.balance) + referralBonus;
        const newStar = this.safeNumber(referrerData.star) + referralStarBonus;
        const newReferrals = (referrerData.referrals || 0) + 1;
        const newReferralEarnings = this.safeNumber(referrerData.referralEarnings) + referralBonus;
        const newReferralStarEarnings = this.safeNumber(referrerData.referralStarEarnings) + referralStarBonus;
        const newTotalEarned = this.safeNumber(referrerData.totalEarned) + referralBonus;
        
        await referrerRef.update({
            balance: newBalance,
            star: newStar,
            referrals: newReferrals,
            referralEarnings: newReferralEarnings,
            referralStarEarnings: newReferralStarEarnings,
            totalEarned: newTotalEarned
        });
        
        await this.db.ref(`referrals/${referrerId}/${referralId}`).update({
            bonusGiven: true,
            verifiedAt: this.getServerTime()
        });
        
        if (this.tgUser && referrerId == this.tgUser.id) {
            this.userState.balance = newBalance;
            this.userState.star = newStar;
            this.userState.referrals = newReferrals;
            this.userState.referralEarnings = newReferralEarnings;
            this.userState.referralStarEarnings = newReferralStarEarnings;
            this.userState.totalEarned = newTotalEarned;
            
            this.updateHeader();
        }
        
        this.cache.delete(`user_${referrerId}`);
        this.cache.delete(`referrals_${referrerId}`);
        
        if (this.referralManager) {
            await this.referralManager.refreshReferralsList();
        }
        
    } catch (error) {}
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
            if (!this.db || !this.auth?.currentUser) {
                this.userWithdrawals = [];
                return;
            }
            
            const telegramId = this.tgUser.id;
            
            const pendingWithdrawals = [];
            const pendingRef = await this.db.ref('withdrawals/pending').once('value');
            if (pendingRef.exists()) {
                pendingRef.forEach(child => {
                    const withdrawal = child.val();
                    if (withdrawal.userId === telegramId) {
                        pendingWithdrawals.push({
                            id: child.key,
                            ...withdrawal,
                            status: 'pending'
                        });
                    }
                });
            }
            
            const completedWithdrawals = [];
            const completedRef = await this.db.ref('withdrawals/completed').once('value');
            if (completedRef.exists()) {
                completedRef.forEach(child => {
                    const withdrawal = child.val();
                    if (withdrawal.userId === telegramId) {
                        completedWithdrawals.push({
                            id: child.key,
                            ...withdrawal,
                            status: 'completed'
                        });
                    }
                });
            }
            
            const rejectedWithdrawals = [];
            const rejectedRef = await this.db.ref('withdrawals/rejected').once('value');
            if (rejectedRef.exists()) {
                rejectedRef.forEach(child => {
                    const withdrawal = child.val();
                    if (withdrawal.userId === telegramId) {
                        rejectedWithdrawals.push({
                            id: child.key,
                            ...withdrawal,
                            status: 'rejected'
                        });
                    }
                });
            }
            
            this.userWithdrawals = [
                ...pendingWithdrawals,
                ...completedWithdrawals,
                ...rejectedWithdrawals
            ].sort((a, b) => b.timestamp - a.timestamp);
            
        } catch (error) {
            this.showNotification("Warning", "Failed to load history", "warning");
            this.userWithdrawals = [];
        }
    }

    async loadAppStats() {
        try {
            if (!this.db) {
                this.appStats = {
                    totalUsers: 0,
                    onlineUsers: 0,
                    totalPayments: 0,
                    totalWithdrawals: 0
                };
                return;
            }
            
            const statsSnapshot = await this.db.ref('appStats').once('value');
            if (statsSnapshot.exists()) {
                const stats = statsSnapshot.val();
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
                await this.db.ref('appStats').set(this.appStats);
            }
            
        } catch (error) {
            this.showNotification("Warning", "Failed to load stats", "warning");
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
            if (!this.db) return;
            
            if (stat === 'totalUsers') {
                const newTotal = (this.appStats.totalUsers || 0) + value;
                const minOnline = Math.floor(newTotal * 0.05);
                const maxOnline = Math.floor(newTotal * 0.20);
                const onlineUsers = Math.floor(Math.random() * (maxOnline - minOnline + 1)) + minOnline;
                
                await this.db.ref('appStats/onlineUsers').set(Math.max(onlineUsers, Math.floor(newTotal * 0.05)));
            }
            
            await this.db.ref(`appStats/${stat}`).transaction(current => (current || 0) + value);
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
            if (this.tgUser && this.tgUser.id) {
                await this.processPendingReferralsForReferrer(this.tgUser.id);
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
        const headerBalance = document.querySelector('.profile-left');
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
                    <span class="balance-ton">${tonBalance.toFixed(3)}</span>
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
            
            if (mainTasks.length > 0) {
                const tasksHTML = mainTasks.map(task => this.renderTaskCard(task)).join('');
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
            
            if (partnerTasks.length > 0) {
                const tasksHTML = partnerTasks.map(task => this.renderTaskCard(task)).join('');
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
            
            if (socialTasks.length > 0) {
                const tasksHTML = socialTasks.map(task => this.renderTaskCard(task)).join('');
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
                        ${reward.rewardAmount > 0 ? `<span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="reward-icon">+${reward.rewardAmount.toFixed(3)} TON</span>` : ''}
                        ${reward.starAmount > 0 ? `<span class="reward-badge"><img src="https://cdn-icons-png.flaticon.com/512/15660/15660192.png" class="reward-icon">+${reward.starAmount} STAR</span>` : ''}
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
                    
                    const currentBalance = this.safeNumber(this.userState.balance);
                    const currentSTAR = this.safeNumber(this.userState.star);
                    
                    const updates = {};
                    if (reward.rewardAmount > 0) updates.balance = currentBalance + reward.rewardAmount;
                    if (reward.starAmount > 0) updates.star = currentSTAR + reward.starAmount;
                    updates.totalEarned = this.safeNumber(this.userState.totalEarned) + reward.rewardAmount;
                    
                    if (this.db && Object.keys(updates).length > 0) {
                        await this.db.ref(`users/${this.tgUser.id}`).update(updates);
                    }
                    
                    if (reward.rewardAmount > 0) this.userState.balance = currentBalance + reward.rewardAmount;
                    if (reward.starAmount > 0) this.userState.star = currentSTAR + reward.starAmount;
                    this.userState.totalEarned = this.safeNumber(this.userState.totalEarned) + reward.rewardAmount;
                    
                    this.updateHeader();
                    
                    btn.innerHTML = '<i class="fas fa-check"></i> Claimed';
                    btn.disabled = true;
                    
                    this.showNotification("Reward Claimed", `+${reward.rewardAmount > 0 ? reward.rewardAmount.toFixed(3) + ' TON ' : ''}${reward.starAmount > 0 ? reward.starAmount + ' STAR' : ''}`, "success");
                    this.showShake('success');
                }
            });
        });
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
                            ${task.reward.toFixed(3)}
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
        
        const adShown = await this.showInAppAd('AdBlock1');
        
        if (!adShown) {
            this.showNotification("Ad Required", "Please watch the ad to apply promo code", "info");
            this.showShake('warning');
            return;
        }
        
        const originalText = promoBtn.innerHTML;
        promoBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Checking...';
        promoBtn.disabled = true;
        
        try {
            let promoData = null;
            if (this.db) {
                const promoCodesRef = await this.db.ref('config/promoCodes').once('value');
                if (promoCodesRef.exists()) {
                    const promoCodes = promoCodesRef.val();
                    for (const id in promoCodes) {
                        if (promoCodes[id].code === code) {
                            promoData = { id, ...promoCodes[id] };
                            break;
                        }
                    }
                }
            }
            
            if (!promoData) {
                this.showNotification("Promo Code", "Promo code not active", "error");
                this.showShake('error');
                promoBtn.innerHTML = originalText;
                promoBtn.disabled = false;
                return;
            }
            
            if (this.db) {
                const usedRef = await this.db.ref(`usedPromoCodes/${this.tgUser.id}/${promoData.id}`).once('value');
                if (usedRef.exists()) {
                    this.showNotification("Promo Code", "You have already used this code", "error");
                    this.showShake('error');
                    promoBtn.innerHTML = originalText;
                    promoBtn.disabled = false;
                    return;
                }
            }
            
            if (APP_CONFIG.PROMO_CODE_REQUIRED_CHECK && promoData.required) {
                const requiredChannel = promoData.required || APP_CONFIG.REQUIRED_PROMO_CODE_CHANNEL;
                
                const isMember = await this.checkChannelMembership(requiredChannel);
                
                if (!isMember) {
                    this.showJoinRequiredModal(requiredChannel);
                    promoBtn.innerHTML = originalText;
                    promoBtn.disabled = false;
                    return;
                }
            }
            
            this.rateLimiter.addRequest(this.tgUser.id, 'promo_code');
            
            let rewardType = promoData.rewardType || 'ton';
            let rewardAmount = this.safeNumber(promoData.reward || 0.01);
            
            const userUpdates = {};
            
            if (rewardType === 'ton') {
                const currentBalance = this.safeNumber(this.userState.balance);
                userUpdates.balance = currentBalance + rewardAmount;
                userUpdates.totalEarned = this.safeNumber(this.userState.totalEarned) + rewardAmount;
            } else if (rewardType === 'pop') {
                const currentSTAR = this.safeNumber(this.userState.star);
                userUpdates.star = currentSTAR + rewardAmount;
            }
            
            userUpdates.totalPromoCodes = this.safeNumber(this.userState.totalPromoCodes) + 1;
            
            if (this.db) {
                await this.db.ref(`users/${this.tgUser.id}`).update(userUpdates);
                
                await this.db.ref(`usedPromoCodes/${this.tgUser.id}/${promoData.id}`).set({
                    code: code,
                    reward: rewardAmount,
                    rewardType: rewardType,
                    claimedAt: this.getServerTime()
                });
                
                await this.db.ref(`config/promoCodes/${promoData.id}/usedCount`).transaction(current => (current || 0) + 1);
            }
            
            if (rewardType === 'ton') {
                this.userState.balance = userUpdates.balance;
                this.userState.totalEarned = userUpdates.totalEarned;
            } else if (rewardType === 'pop') {
                this.userState.star = userUpdates.star;
            }
            this.userState.totalPromoCodes = userUpdates.totalPromoCodes;
            
            this.cache.delete(`user_${this.tgUser.id}`);
            
            this.updateHeader();
            promoInput.value = '';
            
            this.showNotification("Success", `Promo code applied! +${rewardAmount.toFixed(3)} ${rewardType === 'ton' ? 'TON' : 'STAR'}`, "success");
            this.showShake('success');
            
        } catch (error) {
            this.showNotification("Error", "Failed to apply promo code", "error");
            this.showShake('error');
        } finally {
            promoBtn.innerHTML = originalText;
            promoBtn.disabled = false;
        }
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
            <div class="task-modal-content">
                <button class="task-modal-close" id="modal-close">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="task-modal-body">
                    <div class="join-required-content">
                        <div class="join-icon">
                            <i class="fab fa-telegram"></i>
                        </div>
                        <h3>Join Required</h3>
                        <p>You need to join the channel to use this promo code:</p>
                        <div class="channel-link">
                            <a href="https://t.me/${channelUsername.replace('@', '')}" target="_blank" class="join-channel-btn">
                                <i class="fab fa-telegram"></i> ${channelUsername}
                            </a>
                        </div>
                        <button class="check-join-btn" id="check-join-btn">
                            <i class="fas fa-check-circle"></i> I've Joined
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = document.getElementById('modal-close');
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
        
        const checkJoinBtn = document.getElementById('check-join-btn');
        if (checkJoinBtn) {
            checkJoinBtn.addEventListener('click', async () => {
                checkJoinBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Checking...';
                checkJoinBtn.disabled = true;
                
                const isMember = await this.checkChannelMembership(channelUsername);
                
                if (isMember) {
                    modal.remove();
                    await this.handlePromoCodeAfterJoin();
                } else {
                    this.showNotification("Not Joined", "Please join the channel first", "error");
                    this.showShake('error');
                    checkJoinBtn.innerHTML = '<i class="fas fa-check-circle"></i> I\'ve Joined';
                    checkJoinBtn.disabled = false;
                }
            });
        }
    }

    async handlePromoCodeAfterJoin() {
        const promoBtn = document.getElementById('promo-btn');
        if (promoBtn) {
            await this.handlePromoCode();
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
            
            if (verification === 'YES') {
                const chatId = this.taskManager.extractChatIdFromUrl(url);
                
                let shouldVerify = false;
                let isChannel = false;
                
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
            if (!this.db) {
                throw new Error("Database not initialized");
            }
            
            if (this.userCompletedTasks.has(taskId)) {
                this.showNotification("Already Completed", "This task was already completed", "info");
                this.showShake('warning');
                this.enableAllTaskButtons();
                this.isProcessingTask = false;
                return false;
            }
            
            const taskReward = this.safeNumber(task.reward);
            const taskStarReward = this.safeNumber(task.popReward || 1);
            
            const currentBalance = this.safeNumber(this.userState.balance);
            const currentSTAR = this.safeNumber(this.userState.star);
            const totalEarned = this.safeNumber(this.userState.totalEarned);
            const totalTasksCompleted = this.safeNumber(this.userState.totalTasksCompleted);
            const completedTasksCount = this.safeNumber(this.userState.completedTasksCount);
            
            const updates = {
                balance: currentBalance + taskReward,
                star: currentSTAR + taskStarReward,
                totalEarned: totalEarned + taskReward,
                totalTasksCompleted: totalTasksCompleted + 1,
                completedTasksCount: completedTasksCount + 1
            };
            
            this.userCompletedTasks.add(taskId);
            updates.completedTasks = [...this.userCompletedTasks];
            
            await this.db.ref(`users/${this.tgUser.id}`).update(updates);
            
            if (task.owner) {
                const ownerRef = this.db.ref(`config/userTasks/${task.owner}/${taskId}`);
                const ownerSnapshot = await ownerRef.once('value');
                
                if (ownerSnapshot.exists()) {
                    const currentCompletions = ownerSnapshot.val().currentCompletions || 0;
                    const newCompletions = currentCompletions + 1;
                    
                    if (newCompletions >= task.maxCompletions) {
                        await ownerRef.update({
                            currentCompletions: newCompletions,
                            status: 'completed'
                        });
                    } else {
                        await ownerRef.update({
                            currentCompletions: newCompletions
                        });
                    }
                }
            } else {
                const taskRef = this.db.ref(`config/tasks/${taskId}`);
                const taskSnapshot = await taskRef.once('value');
                
                if (taskSnapshot.exists()) {
                    const currentCompletions = taskSnapshot.val().currentCompletions || 0;
                    const newCompletions = currentCompletions + 1;
                    
                    if (newCompletions >= task.maxCompletions) {
                        await taskRef.update({
                            currentCompletions: newCompletions,
                            status: 'completed'
                        });
                    } else {
                        await taskRef.update({
                            currentCompletions: newCompletions
                        });
                    }
                }
            }
            
            this.userState.balance = currentBalance + taskReward;
            this.userState.star = currentSTAR + taskStarReward;
            this.userState.totalEarned = totalEarned + taskReward;
            this.userState.totalTasksCompleted = totalTasksCompleted + 1;
            this.userState.completedTasksCount = completedTasksCount + 1;
            this.userState.completedTasks = [...this.userCompletedTasks];
            
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
            
            this.updateHeader();
            
            await this.updateAppStats('totalTasks', 1);
            
            this.cache.delete(`tasks_${this.tgUser.id}`);
            this.cache.delete(`user_${this.tgUser.id}`);
            
            if (task.owner && task.owner == this.tgUser.id) {
                await this.loadUserCreatedTasks();
            }
            
            if (this.userState.referredBy && this.appConfig.REFERRAL_PERCENTAGE > 0) {
                await this.processReferralTaskBonus(this.userState.referredBy, taskReward);
            }
            
            if (this.userState.referredBy && this.referralManager) {
                await this.referralManager.checkUserCompletedTasksForReferral(this.tgUser.id);
            }
            
            this.taskCompletionCount++;
            
            if (this.taskCompletionCount >= 5) {
                this.taskCompletionCount = 0;
                await this.showInAppAd('AdBlock1');
            }
            
            this.enableAllTaskButtons();
            this.isProcessingTask = false;
            
            this.showNotification("Task Completed!", `+${taskReward.toFixed(3)} TON, +${taskStarReward} STAR`, "success");
            this.showShake('success');
            
            return true;
            
        } catch (error) {
            this.enableAllTaskButtons();
            this.isProcessingTask = false;
            
            this.showNotification("Error", "Failed to complete task", "error");
            this.showShake('error');
            
            if (button) {
                button.innerHTML = 'Start';
                button.disabled = false;
                button.classList.remove('check');
                button.classList.add('start');
            }
            
            throw error;
        }
    }

    disableAllTaskButtons() {
        document.querySelectorAll('.task-btn:not(.done):not(.counting):not(:disabled)').forEach(btn => {
            btn.disabled = true;
        });
    }

    enableAllTaskButtons() {
        document.querySelectorAll('.task-btn:not(.done):not(.counting)').forEach(btn => {
            btn.disabled = false;
        });
    }

    async renderReferralsPage() {
        const referralsPage = document.getElementById('referrals-page');
        if (!referralsPage) return;
        
        const referralLink = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
        const totalReferrals = this.safeNumber(this.userState.referrals || 0);
        const referralEarnings = this.safeNumber(this.userState.referralEarnings || 0);
        const referralStarEarnings = this.safeNumber(this.userState.referralStarEarnings || 0);
        
        let activeReferrals = 0;
        if (this.db) {
            const referralsRef = await this.db.ref(`referrals/${this.tgUser.id}`).once('value');
            if (referralsRef.exists()) {
                const referrals = referralsRef.val();
                for (const referralId in referrals) {
                    if (referrals[referralId].state === 'verified') {
                        activeReferrals++;
                    }
                }
            }
        }
        
        const recentReferrals = await this.referralManager.loadRecentReferrals();
        
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
                                <i class="fas fa-gift"></i>
                            </div>
                            <div class="info-content">
                                <h4>EARN ${this.appConfig.REFERRAL_BONUS_TON} TON & ${this.appConfig.REFERRAL_BONUS_POP} STAR</h4>
                                <p>For Every Verified Referral</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="referral-stats-section">
                    <h3><i class="fas fa-chart-bar"></i> Referrals Statistics</h3>
                    <div class="stats-grid-two">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h4>Total Referrals</h4>
                                <p class="stat-value">${totalReferrals}</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-user-check"></i>
                            </div>
                            <div class="stat-info">
                                <h4>Active Referrals</h4>
                                <p class="stat-value">${activeReferrals}/${totalReferrals}</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-coins"></i>
                            </div>
                            <div class="stat-info">
                                <h4>TON Earnings</h4>
                                <p class="stat-value">${referralEarnings.toFixed(3)} TON</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="stat-info">
                                <h4>STAR Earnings</h4>
                                <p class="stat-value">${Math.floor(referralStarEarnings)} STAR</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="last-referrals-section">
                    <h3><i class="fas fa-history"></i> Recent Referrals</h3>
                    <div class="referrals-list" id="referrals-list">
                        ${recentReferrals.length > 0 ? 
                            recentReferrals.slice(0, 10).map(referral => this.renderReferralRow(referral)).join('') : 
                            '<div class="no-data"><i class="fas fa-handshake"></i><p>No referrals yet</p><p class="hint">Share your link to earn!</p></div>'
                        }
                    </div>
                </div>
            </div>
        `;
        
        this.setupReferralsPageEvents();
    }

renderReferralRow(referral) {
    const statusText = referral.bonusGiven === true ? 'VERIFIED' : 'PENDING';
    const statusClass = referral.bonusGiven === true ? 'verified' : 'pending';
    
    return `
        <div class="referral-row">
            <div class="referral-row-avatar">
                <img src="${referral.photoUrl}" alt="${referral.firstName}">
            </div>
            <div class="referral-row-info">
                <p class="referral-row-username">${referral.username}</p>
            </div>
            <div class="referral-row-status ${statusClass}">
                ${statusText}
            </div>
        </div>
    `;
}

    setupReferralsPageEvents() {
        const copyBtn = document.getElementById('copy-referral-link-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const referralLink = `https://t.me/Strzzbot/stars?startapp=${this.tgUser.id}`;
                this.copyToClipboard(referralLink);
                
                copyBtn.classList.add('copied');
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>Referral Link Copied!';
                
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = originalText;
                }, 2000);
            });
        }
    }

    async refreshReferralsList() {
        try {
            await this.referralManager.refreshReferralsList();
        } catch (error) {}
    }

                                    
        
async renderProfilePage() {
    const profilePage = document.getElementById('profile-page');
    if (!profilePage) return;
    
    const joinDate = new Date(this.userState.createdAt || this.getServerTime());
    const formattedDate = this.formatDate(joinDate);
    
    const totalTasksCompleted = this.safeNumber(this.userState.totalTasksCompleted || 0);
    const totalReferrals = this.safeNumber(this.userState.referrals || 0);
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
                            <span>${this.safeNumber(this.userState.balance).toFixed(3)} TON</span>
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
                                   placeholder="Min: ${this.appConfig.MINIMUM_WITHDRAW.toFixed(3)} TON"
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
            
            return `
                <div class="history-item-simple">
                    <div class="history-left">
                        <div class="history-amount-row">
                            <img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="history-ton-icon" alt="TON">
                            <span class="history-amount">${amount.toFixed(3)}</span>
                        </div>
                        <div class="history-time-row">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatDateTime(timestamp)}</span>
                        </div>
                    </div>
                    <div class="history-right">
                        <span class="history-status-badge ${statusClass}">${statusText}</span>
                    </div>
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
        return address.substring(0, 5) + '...' + address.substring(address.length - 5);
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
                exchangeInput.value = max.toFixed(3);
                const starAmount = Math.floor(max * this.appConfig.POP_PER_TON);
                if (exchangePreview) {
                    exchangePreview.textContent = `≈ ${starAmount} STAR`;
                }
            });
        }
        
        if (maxBtn && amountInput) {
            maxBtn.addEventListener('click', () => {
                const max = this.safeNumber(this.userState.balance);
                amountInput.value = max.toFixed(3);
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
                    amountInput.value = max.toFixed(3);
                }
            });
        }
    }
    
    async exchangeTonToStar() {
        try {
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
            
            try {
                const starAmount = Math.floor(tonAmount * this.appConfig.POP_PER_TON);
                const newTonBalance = tonBalance - tonAmount;
                const newStarBalance = this.safeNumber(this.userState.star) + starAmount;
                
                const updates = {
                    balance: newTonBalance,
                    star: newStarBalance
                };
                
                if (this.db) {
                    await this.db.ref(`users/${this.tgUser.id}`).update(updates);
                }
                
                this.userState.balance = newTonBalance;
                this.userState.star = newStarBalance;
                
                this.cache.delete(`user_${this.tgUser.id}`);
                
                exchangeInput.value = '';
                if (exchangePreview) {
                    exchangePreview.textContent = '≈ 0 STAR';
                }
                this.updateHeader();
                
                const miniBalanceItems = document.querySelectorAll('.mini-balance-item');
                if (miniBalanceItems.length >= 2) {
                    miniBalanceItems[0].querySelector('span').textContent = `${newTonBalance.toFixed(3)} TON`;
                    miniBalanceItems[1].querySelector('span').textContent = `${Math.floor(newStarBalance)} STAR`;
                }
                
                this.showNotification("Success", `Exchanged ${tonAmount.toFixed(3)} TON to ${starAmount} STAR`, "success");
                this.showShake('success');
                
            } catch (error) {
                this.showNotification("Error", "Failed to exchange", "error");
                this.showShake('error');
            } finally {
                exchangeBtn.innerHTML = originalText;
                exchangeBtn.disabled = false;
            }
            
        } catch (error) {
            this.showNotification("Error", "Failed to exchange", "error");
            this.showShake('error');
        }
    }
    
    async handleProfileWithdrawal(walletInput, amountInput, withdrawBtn) {
        if (!walletInput || !amountInput || !withdrawBtn) return;
        
        const originalBalance = this.safeNumber(this.userState.balance);
        
        const walletAddress = walletInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const userBalance = this.safeNumber(this.userState.balance);
        const minimumWithdraw = this.appConfig.MINIMUM_WITHDRAW;
        
        const totalTasksCompleted = this.safeNumber(this.userState.totalTasksCompleted || 0);
        const requiredTasks = this.appConfig.REQUIRED_TASKS_FOR_WITHDRAWAL;
        const totalReferrals = this.safeNumber(this.userState.referrals || 0);
        const requiredReferrals = this.appConfig.REQUIRED_REFERRALS_FOR_WITHDRAWAL;
        const totalSTAR = this.safeNumber(this.userState.star || 0);
        const requiredSTAR = this.appConfig.REQUIRED_POP_FOR_WITHDRAWAL;
        
        if (!walletAddress || walletAddress.length < 20) {
            this.showNotification("Error", "Please enter a valid TON wallet address", "error");
            this.showShake('error');
            return;
        }
        
        if (!amount || amount < minimumWithdraw) {
            this.showNotification("Error", `Minimum withdrawal is ${minimumWithdraw.toFixed(3)} TON`, "error");
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
        
        try {
            const newBalance = userBalance - amount;
            
            const newTasksCompleted = totalTasksCompleted - requiredTasks;
            const newSTAR = totalSTAR - requiredSTAR;
            
            const currentTime = this.getServerTime();
            const newTotalWithdrawnAmount = this.safeNumber(this.userState.totalWithdrawnAmount) + amount;
            
            const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
            const withdrawalId = `STAR_${randomId}`;
            
            const withdrawalData = {
                id: withdrawalId,
                userId: this.tgUser.id,
                walletAddress: walletAddress,
                amount: amount,
                status: 'pending',
                timestamp: currentTime,
                userName: this.userState.firstName,
                username: this.userState.username,
                telegramId: this.tgUser.id
            };
            
            if (this.db) {
                const updates = {
                    balance: newBalance,
                    star: newSTAR,
                    totalTasksCompleted: newTasksCompleted,
                    totalWithdrawals: this.safeNumber(this.userState.totalWithdrawals) + 1,
                    totalWithdrawnAmount: newTotalWithdrawnAmount,
                    lastWithdrawalDate: currentTime
                };
                
                await this.db.ref(`users/${this.tgUser.id}`).update(updates);
                await this.db.ref(`withdrawals/pending/${withdrawalId}`).set(withdrawalData);
                
                this.userState.balance = newBalance;
                this.userState.star = newSTAR;
                this.userState.totalTasksCompleted = newTasksCompleted;
                this.userState.totalWithdrawals = this.safeNumber(this.userState.totalWithdrawals) + 1;
                this.userState.totalWithdrawnAmount = newTotalWithdrawnAmount;
                this.userState.lastWithdrawalDate = currentTime;
                
                const remainingTasks = [...this.userCompletedTasks];
                const tasksToRemove = [];
                for (const taskId of this.userCompletedTasks) {
                    if (tasksToRemove.length < requiredTasks) {
                        tasksToRemove.push(taskId);
                    } else {
                        break;
                    }
                }
                
                for (const taskId of tasksToRemove) {
                    remainingTasks.splice(remainingTasks.indexOf(taskId), 1);
                }
                
                this.userCompletedTasks = new Set(remainingTasks);
                
                await this.db.ref(`users/${this.tgUser.id}`).update({
                    completedTasks: remainingTasks,
                    completedTasksCount: remainingTasks.length
                });
                
                this.userWithdrawals.unshift(withdrawalData);
                this.cache.delete(`user_${this.tgUser.id}`);
                
                await this.updateAppStats('totalWithdrawals', 1);
                await this.updateAppStats('totalPayments', amount);
                
                walletInput.value = '';
                amountInput.value = '';
                
                this.updateHeader();
                this.renderProfilePage();
                
                this.showNotification("Success", "Withdrawal request submitted! Tasks and STAR have been deducted.", "success");
                this.showShake('success');
            }
            
        } catch (error) {
            if (this.userState.balance !== originalBalance) {
                this.userState.balance = originalBalance;
            }
            
            this.showNotification("Error", "Failed to process withdrawal. No changes were made to your balance.", "error");
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

    async updateExistingUser(userRef, userData) {
        const currentTime = this.getServerTime();
        
        await userRef.update({ 
            lastActive: currentTime,
            username: this.tgUser.username ? `@${this.tgUser.username}` : 'No Username',
            firstName: userData.firstName || this.getShortName(this.tgUser.first_name || 'User'),
            deviceId: this.deviceId
        });
        
        if (userData.completedTasks && Array.isArray(userData.completedTasks)) {
            this.userCompletedTasks = new Set(userData.completedTasks);
        } else {
            this.userCompletedTasks = new Set();
            userData.completedTasks = [];
            await userRef.update({ completedTasks: [] });
        }
        
        const defaultData = {
            status: userData.status || 'free',
            referralState: userData.referralState || 'verified',
            referralEarnings: userData.referralEarnings || 0,
            referralStarEarnings: userData.referralStarEarnings || 0,
            totalEarned: userData.totalEarned || 0,
            totalWithdrawals: userData.totalWithdrawals || 0,
            totalTasksCompleted: userData.totalTasksCompleted || 0,
            completedTasksCount: userData.completedTasksCount || 0,
            balance: userData.balance || 0,
            star: userData.star || 0,
            referrals: userData.referrals || 0,
            firebaseUid: this.auth?.currentUser?.uid || userData.firebaseUid || 'pending',
            totalWithdrawnAmount: userData.totalWithdrawnAmount || 0,
            deviceId: this.deviceId
        };
        
        const updates = {};
        Object.keys(defaultData).forEach(key => {
            if (userData[key] === undefined) {
                updates[key] = defaultData[key];
                userData[key] = defaultData[key];
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await userRef.update(updates);
        }
        
        return userData;
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
