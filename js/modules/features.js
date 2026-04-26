import { APP_CONFIG } from '../data.js';

class TaskManager {
    constructor(app) {
        this.app = app;
        this.mainTasks = [];
        this.partnerTasks = [];
        this.socialTasks = [];
    }

    async loadTasksData(forceRefresh = false) {
        try {
            if (!this.app.db) {
                this.mainTasks = this.getDefaultTasks('main');
                this.partnerTasks = this.getDefaultTasks('partner');
                return;
            }
            
            this.mainTasks = await this.loadTasksFromDatabase('main');
            this.partnerTasks = await this.loadTasksFromDatabase('partner');
            
        } catch (error) {
            this.mainTasks = this.getDefaultTasks('main');
            this.partnerTasks = this.getDefaultTasks('partner');
        }
    }
    
    getDefaultTasks(category) {
        if (category === 'main') {
            return [
                { id: 'main_1', name: 'Join Telegram Channel', reward: 5, url: 'https://t.me/STARZ_NEW', picture: APP_CONFIG.BOT_AVATAR },
                { id: 'main_2', name: 'Follow on Twitter', reward: 5, url: 'https://twitter.com', picture: APP_CONFIG.BOT_AVATAR },
                { id: 'main_3', name: 'Subscribe on YouTube', reward: 10, url: 'https://youtube.com', picture: APP_CONFIG.BOT_AVATAR }
            ];
        } else {
            return [
                { id: 'partner_1', name: 'Partner Task 1', reward: 3, url: 'https://t.me/partner', picture: APP_CONFIG.BOT_AVATAR },
                { id: 'partner_2', name: 'Partner Task 2', reward: 5, url: 'https://t.me/partner2', picture: APP_CONFIG.BOT_AVATAR }
            ];
        }
    }

    async loadTasksFromDatabase(category) {
        try {
            const tasks = [];
            const snapshot = await this.app.db.ref('config/tasks').once('value');
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const task = child.val();
                    if (task.category === category && task.status === 'active') {
                        tasks.push({
                            id: child.key,
                            name: task.name,
                            reward: this.app.safeNumber(task.reward || 0.001),
                            url: task.url,
                            picture: task.picture || APP_CONFIG.BOT_AVATAR
                        });
                    }
                });
            }
            return tasks.length ? tasks : this.getDefaultTasks(category);
        } catch (error) {
            return this.getDefaultTasks(category);
        }
    }
}

class ReferralManager {
    constructor(app) {
        this.app = app;
    }
    
    async checkReferralsVerification() {
        try {
            if (!this.app.db || !this.app.tgUser) return;
            const friendsRef = await this.app.db.ref(`friends/${this.app.tgUser.id}`).once('value');
            if (!friendsRef.exists()) return;
        } catch (error) {}
    }
}

export { TaskManager, ReferralManager };
