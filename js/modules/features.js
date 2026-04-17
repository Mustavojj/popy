import { APP_CONFIG, FEATURES_CONFIG } from '../data.js';

class TaskManager {
    constructor(app) {
        this.app = app;
        this.mainTasks = [];
        this.partnerTasks = [];
        this.socialTasks = [];
        this.taskTimers = new Map();
        this.userCompletedTasks = new Set();
    }

    async loadTasksData(forceRefresh = false) {
        const cacheKey = `tasks_${this.app.tgUser.id}`;
        
        if (!forceRefresh) {
            const cached = this.app.cache.get(cacheKey);
            if (cached) {
                this.mainTasks = cached.mainTasks || [];
                this.partnerTasks = cached.partnerTasks || [];
                this.socialTasks = cached.socialTasks || [];
                this.userCompletedTasks = new Set(cached.completedTasks || []);
                return;
            }
        }
        
        try {
            this.userCompletedTasks = new Set(this.app.userState.completedTasks || []);
            
            const result = await this.app.callApi('getTasks');
            
            if (result.success && result.data) {
                const allTasks = result.data;
                
                this.mainTasks = allTasks.filter(task => task.category === 'main');
                this.partnerTasks = allTasks.filter(task => task.category === 'partner');
                this.socialTasks = allTasks.filter(task => task.category === 'social');
            } else {
                this.mainTasks = [];
                this.partnerTasks = [];
                this.socialTasks = [];
            }
            
            this.app.cache.set(cacheKey, {
                mainTasks: this.mainTasks,
                partnerTasks: this.partnerTasks,
                socialTasks: this.socialTasks,
                completedTasks: Array.from(this.userCompletedTasks)
            }, 30000);
            
        } catch (error) {
            this.mainTasks = [];
            this.partnerTasks = [];
            this.socialTasks = [];
        }
    }

    async loadTasksFromDatabase(category) {
        try {
            const result = await this.app.callApi('getTasks');
            if (!result.success) return [];
            
            const allTasks = result.data || [];
            const userCompleted = this.app.userCompletedTasks || new Set();
            
            return allTasks.filter(task => {
                if (task.status !== 'active' && task.status !== undefined) return false;
                if (task.category !== category) return false;
                if (userCompleted.has(task.id)) return false;
                
                const currentCompletions = task.currentCompletions || 0;
                const maxCompletions = task.maxCompletions || 999999;
                if (currentCompletions >= maxCompletions) return false;
                
                return true;
            }).map(task => ({
                id: task.id,
                name: task.name,
                picture: task.picture || this.app.appConfig.BOT_AVATAR,
                url: task.url,
                type: task.type || 'channel',
                category: task.category,
                reward: task.reward || (category === 'social' ? APP_CONFIG.SOCIAL_TASK_REWARD : 0.001),
                popReward: task.popReward || (category === 'social' ? APP_CONFIG.SOCIAL_TASK_POP_REWARD : 1),
                currentCompletions: task.currentCompletions || 0,
                maxCompletions: task.maxCompletions || 999999,
                status: task.status || 'active',
                verification: task.verification || 'NO',
                owner: task.owner || null
            }));
            
        } catch (error) {
            return [];
        }
    }

    extractChatIdFromUrl(url) {
        try {
            if (!url) return null;
            
            url = url.toString().trim();
            
            if (url.includes('t.me/')) {
                const match = url.match(/t\.me\/([^\/\?]+)/);
                if (match && match[1]) {
                    const username = match[1];
                    
                    if (username.startsWith('@')) return username;
                    
                    if (/^[a-zA-Z][a-zA-Z0-9_]{4,}$/.test(username)) return '@' + username;
                    
                    return username;
                }
            }
            
            return null;
            
        } catch (error) {
            return null;
        }
    }
}

class ReferralManager {
    constructor(app) {
        this.app = app;
        this.recentReferrals = [];
    }

    async loadRecentReferrals() {
        try {
            const result = await this.app.callApi('getReferrals');
            if (result.success && result.data) {
                this.recentReferrals = result.data.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0)).slice(0, 10);
            } else {
                this.recentReferrals = [];
            }
            return this.recentReferrals;
        } catch (error) {
            return [];
        }
    }

    async refreshReferralsList() {
        try {
            const result = await this.app.callApi('getReferrals');
            if (result.success && result.data) {
                const friendsCount = result.data.length;
                this.app.userState.friendsCount = friendsCount;
                
                if (document.getElementById('referrals-page')?.classList.contains('active')) {
                    this.app.renderReferralsPage();
                }
                
                this.app.updateHeader();
            }
        } catch (error) {}
    }

    async checkReferralsVerification() {
        try {
            const result = await this.app.callApi('getReferrals');
            if (result.success && result.data) {
                this.app.userState.friendsCount = result.data.length;
            }
        } catch (error) {}
    }
    
    async checkUserCompletedTasksForReferral(userId) {
    }
}

export { TaskManager, ReferralManager };
