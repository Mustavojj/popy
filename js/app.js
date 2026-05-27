import { APP_CONFIG } from './data.js';

const translations = {
    ru: {
        level: "Уровень", mining_rig: "Майнинг-установка Ур.", hourly: "8 часов", daily: "Ежедневно", monthly: "Ежемесячно",
        start_mining: "НАЧАТЬ МАЙНИНГ", claim_reward: "ПОЛУЧИТЬ НАГРАДУ", mining_note: "Награды можно получить после окончания сеанса майнинга",
        next_level_reward: "Награда за следующий уровень", power: "Энергия", ton: "TON", promo_code: "Промокод",
        enter_code: "Введите код", claim: "Получить", main_tasks: "Основные задания", partner_tasks: "Социальные задания",
        watch_ad: "Смотреть рекламу", reward_amount: "Награда", available_in: "Доступно через", hours: "ч",
        watch: "Смотреть", all_tasks_completed: "Все задания выполнены!", check_later: "Заходите позже за новыми",
        no_tasks: "Нет доступных заданий", team_benefits: "Преимущества команды", share_earn: "ДЕЛИСЬ И ЗАРАБАТЫВАЙ",
        copy: "Копировать", share: "Поделиться", total_members: "Всего участников",
        power_earnings: "Заработок энергии", withdraw: "Вывести",
        available: "Доступно", ton_wallet: "TON кошелек", amount: "Сумма", min_withdraw: "Мин. вывод",
        confirm_withdrawal: "Подтвердить вывод", withdrawal_history: "История выводов", no_withdrawals: "Пока нет выводов",
        pending: "В ОЖИДАНИИ", completed: "ВЫПЛАЧЕНО", claim_mining_title: "Получить награды майнинга", claim_btn: "Получить награды",
        partner_info_title: "Социальные задания", partner_text1: "Вы можете добавить задание через поддержку", partner_text2: "Вы можете сотрудничать с нами",
        partner_text3: "Свяжитесь с поддержкой для деталей", contact_support: "Связаться с поддержкой", mining: "Майнинг", earn: "Заработок",
        team: "Команда", copy_success: "Скопировано!", link_copied: "Ссылка скопирована", earn_more: "Заработай больше энергии",
        complete_tasks: "Выполнить задания", go: "ПЕРЕЙТИ", invite_frens: "Пригласить друзей", ad_reward: "Смотреть рекламу", loading: "Загрузка",
        ready: "Готово", mining_active: "МАЙНИНГ АКТИВЕН", team_earnings: "Зарабатывайте %from%% от дохода команды", save_error: "Ошибка сохранения данных! Попробуйте снова.",
        daily_tasks: "Ежедневные задания", daily_check_news: "Проверка новостей", daily_ad_task: "Ежедневная реклама", refresh_in: "Обновление через",
        watch_ad_btn: "СМОТРЕТЬ", claiming: "Получение..."
    },
    en: {
        level: "Level", mining_rig: "Mining Rig Lv.", hourly: "8 Hours", daily: "Daily", monthly: "Monthly",
        start_mining: "START MINING", claim_reward: "CLAIM REWARD", mining_note: "Rewards can be collected after mining session ends",
        next_level_reward: "Next level reward", power: "Power", ton: "TON", promo_code: "Promo Code",
        enter_code: "Enter code", claim: "Claim", main_tasks: "Main Tasks", partner_tasks: "Social Tasks",
        watch_ad: "Watch Reward AD", reward_amount: "Reward", available_in: "Available in", hours: "h",
        watch: "Watch", all_tasks_completed: "All tasks completed!", check_later: "Check back later for more",
        no_tasks: "No tasks available", team_benefits: "Team Benefits", share_earn: "SHARE & EARN",
        copy: "Copy", share: "Share", total_members: "Total Members",
        power_earnings: "Power Earnings", withdraw: "Withdraw",
        available: "Available", ton_wallet: "TON Wallet", amount: "Amount", min_withdraw: "Minimum withdrawal",
        confirm_withdrawal: "Confirm Withdrawal", withdrawal_history: "Withdrawal History", no_withdrawals: "No withdrawals yet",
        pending: "PENDING", completed: "PAID", claim_mining_title: "Claim Mining Rewards", claim_btn: "Claim Rewards",
        partner_info_title: "Social Tasks", partner_text1: "You can add task by support", partner_text2: "You can cooperate with us",
        partner_text3: "Contact support for details", contact_support: "Contact Support", mining: "Mining", earn: "Earn",
        team: "Team", copy_success: "Copied!", link_copied: "Link copied to clipboard", earn_more: "Earn More Power",
        complete_tasks: "Complete Tasks", go: "GO", invite_frens: "Invite Frens", ad_reward: "Watch AD", loading: "Loading",
        ready: "Ready", mining_active: "MINING ACTIVE", team_earnings: "Earn %from%% from team earnings", save_error: "Data save failed! Please try again.",
        daily_tasks: "Daily Tasks", daily_check_news: "Daily Check News", daily_ad_task: "Daily AD Task", refresh_in: "Refresh in",
        watch_ad_btn: "WATCH", claiming: "Claiming..."
    },
    tr: {
        level: "Seviye", mining_rig: "Madenci Seviye", hourly: "8 saat", daily: "Günlük", monthly: "Aylık",
        start_mining: "MADENCİLİĞE BAŞLA", claim_reward: "ÖDÜLÜ AL", mining_note: "Ödüller madencilik oturumu bittikten sonra toplanabilir",
        next_level_reward: "Sonraki seviye ödülü", power: "Güç", ton: "TON", promo_code: "Promosyon Kodu",
        enter_code: "Kodu girin", claim: "Al", main_tasks: "Ana Görevler", partner_tasks: "Sosyal Görevler",
        watch_ad: "Ödüllü Reklam İzle", reward_amount: "Ödül", available_in: "Kalan süre", hours: "sa",
        watch: "İzle", all_tasks_completed: "Tüm görevler tamamlandı!", check_later: "Daha fazlası için daha sonra kontrol edin",
        no_tasks: "Görev yok", team_benefits: "Takım Avantajları", share_earn: "PAYLAŞ VE KAZAN",
        copy: "Kopyala", share: "Paylaş", total_members: "Toplam Üye",
        power_earnings: "Güç Kazancı", withdraw: "Çek",
        available: "Mevcut", ton_wallet: "TON Cüzdanı", amount: "Miktar", min_withdraw: "Minimum çekim",
        confirm_withdrawal: "Çekimi Onayla", withdrawal_history: "Çekim Geçmişi", no_withdrawals: "Henüz çekim yok",
        pending: "beklemede", completed: "tamamlandı", claim_mining_title: "Madencilik Ödüllerini Al", claim_btn: "Ödülleri Al",
        partner_info_title: "Sosyal Görevler", partner_text1: "Destek ile görev ekleyebilirsiniz", partner_text2: "Bizimle işbirliği yapabilirsiniz",
        partner_text3: "Detaylar için desteğe başvurun", contact_support: "Desteğe Başvur", mining: "Madencilik", earn: "Kazan",
        team: "Takım", copy_success: "Kopyalandı!", link_copied: "Bağlantı panoya kopyalandı", earn_more: "Daha Fazla Güç Kazan",
        complete_tasks: "Görevleri Tamamla", go: "GİT", invite_frens: "Arkadaşları Davet Et", ad_reward: "Reklam İzle", loading: "Yükleniyor",
        ready: "Hazır", mining_active: "MADENCİLİK AKTİF", team_earnings: "Takım kazancından %from%% kazanın", save_error: "Veri kaydedilemedi! Lütfen tekrar deneyin.",
        daily_tasks: "Günlük Görevler", daily_check_news: "Günlük Haber Kontrolü", daily_ad_task: "Günlük Reklam Görevi", refresh_in: "Yenileme süresi",
        watch_ad_btn: "İZLE", claiming: "Alınıyor..."
    },
    ar: {
        level: "مستوى", mining_rig: "جهاز التعدين مستوى", hourly: "كل 8 ساعات", daily: "يومي", monthly: "شهري",
        start_mining: "بدء التعدين", claim_reward: "استلام المكافأة", mining_note: "يمكن جمع المكافآت بعد انتهاء جلسة التعدين",
        next_level_reward: "مكافأة المستوى التالي", power: "الطاقة", ton: "تون", promo_code: "رمز ترويجي",
        enter_code: "أدخل الرمز", claim: "استلام", main_tasks: "المهام الرئيسية", partner_tasks: "المهام الاجتماعية",
        watch_ad: "مشاهدة إعلان مكافأة", reward_amount: "المكافأة", available_in: "متاح بعد", hours: "ساعة",
        watch: "مشاهدة", all_tasks_completed: "جميع المهام مكتملة!", check_later: "تحقق لاحقاً للمزيد",
        no_tasks: "لا توجد مهام متاحة", team_benefits: "مزايا الفريق", share_earn: "شارك واربح",
        copy: "نسخ", share: "مشاركة", total_members: "إجمالي الأعضاء",
        power_earnings: "أرباح الطاقة", withdraw: "سحب",
        available: "الرصيد المتوفر", ton_wallet: "محفظة تون", amount: "المبلغ", min_withdraw: "الحد الأدنى للسحب",
        confirm_withdrawal: "تأكيد السحب", withdrawal_history: "سجل السحوبات", no_withdrawals: "لا توجد سحوبات بعد",
        pending: "قيد الانتظار", completed: "مكتمل", claim_mining_title: "استلام مكافآت التعدين", claim_btn: "استلام المكافآت",
        partner_info_title: "المهام الاجتماعية", partner_text1: "يمكنك إضافة مهمة عن طريق الدعم", partner_text2: "يمكنك التعاون معنا",
        partner_text3: "اتصل بالدعم للتفاصيل", contact_support: "اتصل بالدعم", mining: "التعدين", earn: "الأرباح",
        team: "الفريق", copy_success: "تم النسخ!", link_copied: "تم نسخ الرابط", earn_more: "احصل على طاقة أكثر",
        complete_tasks: "إكمال المهام", go: "اذهب", invite_frens: "دعوة الأصدقاء", ad_reward: "مشاهدة إعلان", loading: "جاري التحميل",
        ready: "جاهز", mining_active: "التعدين نشط", team_earnings: "اربح %from%% من أرباح الفريق", save_error: "فشل حفظ البيانات! حاول مرة أخرى.",
        daily_tasks: "المهام اليومية", daily_check_news: "فحص الأخبار اليومي", daily_ad_task: "مهمة الإعلان اليومية", refresh_in: "تحديث خلال",
        watch_ad_btn: "شاهد", claiming: "جاري الاستلام..."
    }
};

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
        this.hasClaimedWelcome = false;
        this.hasStartedMining = false;
        this.userCompletedTasks = new Set();
        this.userCompletedPromoCodes = new Set();
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        this.miningInterval = null;
        this.uiUpdateInterval = null;
        this.pendingTonReward = 0;
        this.miningSessionHours = 8;
        this.withdrawals = [];
        this.totalReferrals = 0;
        this.referralPower = 0;
        this.isTaskRunning = false;
        this.mainTasks = [];
        this.partnerTasks = [];
        
        this.lastRewardAdTime = 0;
        this.lang = 'en';
        this.cooldownInterval = null;
        
        this.vibrationEnabled = true;
        this.loadSettings();
        this.referredBy = null;
        this.timeOffset = 0;
        this.lastServerTimeSync = 0;
        this.serverTimeOffset = 0;
        this.firebaseConfigCache = null;
        this.membershipCache = new Map();
        
        this._dirtyPower = false;
        this._dirtyTon = false;
        this._dirtyMining = false;
        this._saveTimeout = null;
        this._isSaving = false;
        
        this.cache = {
            tasks: null,
            tasksTime: 0
        };
        
        this._userDataLoaded = false;
        this._earnLoaded = false;
        this._teamLoaded = false;
        this._withdrawLoaded = false;
        this._withdrawLock = false;
        
        this.lastDailyCheckNews = 0;
        this.lastDailyAdTask = 0;
        this.dailyCheckNewsCompleted = false;
        this.dailyAdTaskCompleted = false;
        this.dailyAdTaskReward = 0;
        this.isDailyAdTaskRunning = false;
    }
    
    t(key) {
        let text = translations[this.lang]?.[key] || translations.en[key] || key;
        if (key === 'team_earnings') {
            text = text.replace('%from%', APP_CONFIG.REFERRAL_PERCENTAGE);
        }
        return text;
    }
    
    formatNumber(num) {
        return num.toLocaleString('en');
    }
    
    getHourlyTonRate() {
        return (this.powerBalance / 1000) * APP_CONFIG.POWER_PER_TON_RATE * 8;
    }
    
    getDailyTonRate() {
        return this.getHourlyTonRate() * 3;
    }
    
    getMonthlyTonRate() {
        return this.getDailyTonRate() * 15;
    }
    
    calculateRewardForHours(hours) {
        return this.getHourlyTonRate();
    }
    
    updateLevelFromPower() {
        const power = this.powerBalance;
        let newLevel = 1;
        
        if (power >= 60000) newLevel = 10;
        else if (power >= 50000) newLevel = 9;
        else if (power >= 40000) newLevel = 8;
        else if (power >= 30000) newLevel = 7;
        else if (power >= 20000) newLevel = 6;
        else if (power >= 10000) newLevel = 5;
        else if (power >= 8000) newLevel = 4;
        else if (power >= 4000) newLevel = 3;
        else if (power >= 2000) newLevel = 2;
        else newLevel = 1;
        
        if (newLevel > this.userLevel) {
            this.userLevel = newLevel;
        } else if (newLevel < this.userLevel) {
            this.userLevel = newLevel;
        }
        
        const levelSpan = document.getElementById('user-level');
        const levelBadge = document.getElementById('user-level-badge');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        if (levelBadge) levelBadge.innerText = this.userLevel;
        
        localStorage.setItem(`user_level_${this.tgUser?.id}`, this.userLevel.toString());
    }
    
    getRequiredPowerForLevel(level) {
        if (level === 2) return 2000;
        if (level === 3) return 4000;
        if (level === 4) return 8000;
        if (level === 5) return 10000;
        if (level === 6) return 20000;
        if (level === 7) return 30000;
        if (level === 8) return 40000;
        if (level === 9) return 50000;
        if (level === 10) return 60000;
        return 1000;
    }
    
    async addReferralEarnings(userId, powerAmount) {
        if (!this.referredBy) return;
        
        const commission = Math.floor(powerAmount * (APP_CONFIG.REFERRAL_PERCENTAGE / 100));
        
        if (commission > 0) {
            const referrerPowerRef = this.db.ref(`users/${this.referredBy}/powerBalance`);
            const referrerPowerSnap = await referrerPowerRef.once('value');
            const currentPower = referrerPowerSnap.val() ?? 0;
            
            const referrerReferralPowerRef = this.db.ref(`users/${this.referredBy}/referralPower`);
            const referrerReferralPowerSnap = await referrerReferralPowerRef.once('value');
            const currentReferralPower = referrerReferralPowerSnap.val() ?? 0;
            
            await this.db.ref(`users/${this.referredBy}`).update({ 
                powerBalance: currentPower + commission,
                referralPower: currentReferralPower + commission
            });
            
            if (window.app && window.app.tgUser && window.app.tgUser.id === this.referredBy) {
                if (window.app.powerBalance) window.app.powerBalance += commission;
                window.app._dirtyPower = true;
                window.app.scheduleSave();
            }
        }
    }
    
    async startMining() {
        const serverTime = await this.getServerTime(true);
        
        this.miningActive = true;
        this.miningStartTime = serverTime;
        this.miningEndTime = serverTime + (this.miningSessionHours * 3600000);
        this.pendingTonReward = 0;
        this._dirtyMining = true;
        
        if (!this.hasStartedMining && this.db && this.tgUser) {
            this.hasStartedMining = true;
            await this.db.ref(`users/${this.tgUser.id}`).update({ hasStartedMining: true });
        }
        
        await this.saveUserData(true);
        this.renderMining();
        this.startMiningLoop();
        this.showNotification(this.t('start_mining'), 'Your rig is now mining TON', 'success');
    }
    
    async stopMining() {
        if (!this.miningActive) return;
        
        const currentServerTime = await this.getServerTime(true);
        const elapsedSeconds = (currentServerTime - this.miningStartTime) / 1000;
        const elapsedHours = Math.min(elapsedSeconds / 3600, this.miningSessionHours);
        
        this.pendingTonReward = this.calculateRewardForHours(elapsedHours);
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        this._dirtyMining = true;
        
        await this.saveUserData(true);
        this.renderMining();
        if (this.miningInterval) clearInterval(this.miningInterval);
        if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
        this.showNotification('Mining Stopped', `${this.pendingTonReward.toFixed(8)} TON ready to claim!`, 'success');
    }
    
    async claimMiningRewards() {
        if (this.miningActive) {
            this.showNotification('Error', 'Complete mining session first!', 'error');
            return;
        }
        if (this.pendingTonReward <= 0) {
            this.showNotification('Error', 'No rewards to claim', 'error');
            return;
        }
        
        const adWatched = await this.showInterstitialAd();
        if (!adWatched) return;
        
        const modal = document.getElementById('claim-modal');
        const rewardEl = document.getElementById('claim-reward-amount');
        rewardEl.innerText = this.pendingTonReward.toFixed(6) + ' TON';
        modal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('confirm-claim-btn');
        const closeBtn = document.getElementById('close-claim-modal');
        
        const handleClaim = async () => {
            modal.style.display = 'none';
            cleanup();
            
            const earnedAmount = this.pendingTonReward;
            this.tonBalance += earnedAmount;
            this._dirtyTon = true;
            this.pendingTonReward = 0;
            this._dirtyMining = true;
            
            await this.saveUserData(true);
            
            this.updateLevelFromPower();
            this.renderMining();
            this.showNotification('Rewards Claimed!', `${earnedAmount.toFixed(8)} TON added to balance`, 'success');
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
            const currentTime = await this.getServerTime(false);
            if (this.miningEndTime && currentTime >= this.miningEndTime) {
                await this.stopMining();
            }
        }, 60000);
        
        this.uiUpdateInterval = setInterval(() => {
            if (this.miningActive) {
                this.updateMiningTimerDisplay();
            }
        }, 1000);
    }
    
    updateMiningTimerDisplay() {
        if (!this.miningEndTime) return;
        
        (async () => {
            const currentTime = await this.getServerTime(false);
            const remaining = Math.max(0, (this.miningEndTime - currentTime) / 1000);
            
            if (remaining <= 0 && this.miningActive) {
                this.stopMining();
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
        })();
    }
    
    updateAdCooldownDisplay() {
        const now = Date.now();
        const cooldownMs = APP_CONFIG.AD_COOLDOWN_HOURS * 3600000;
        const remaining = Math.max(0, cooldownMs - (now - this.lastRewardAdTime));
        
        const adBtn = document.getElementById('mining-reward-ad');
        
        if (adBtn) {
            if (remaining > 0) {
                const hours = Math.floor(remaining / 3600000);
                const minutes = Math.floor((remaining % 3600000) / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                adBtn.innerHTML = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                adBtn.disabled = true;
                adBtn.classList.add('disabled');
            } else {
                adBtn.innerHTML = this.t('watch');
                adBtn.disabled = false;
                adBtn.classList.remove('disabled');
            }
        }
    }
    
    startCooldownTimer() {
        if (this.cooldownInterval) clearInterval(this.cooldownInterval);
        this.cooldownInterval = setInterval(() => this.updateAdCooldownDisplay(), 1000);
    }
    
    async watchRewardAd() {
        const now = Date.now();
        const cooldownMs = APP_CONFIG.AD_COOLDOWN_HOURS * 3600000;
        if (now - this.lastRewardAdTime < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - (now - this.lastRewardAdTime)) / 1000);
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;
            this.showNotification('Cooldown', `${this.t('available_in')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, 'warning');
            return;
        }
        
        const adWatched = await this.showRewardAd();
        if (adWatched) {
            this.lastRewardAdTime = now;
            localStorage.setItem('last_reward_ad_time', now.toString());
            this.powerBalance += 10;
            this._dirtyPower = true;
            await this.updateLevelFromPower();
            this.scheduleSave();
            await this.addReferralEarnings(this.tgUser.id, 10);
            this.renderMining();
            if (this._earnLoaded) {
                await this.loadTasks();
                this.renderEarn();
            }
            this.updateAdCooldownDisplay();
            this.showNotification('Reward Claimed!', '10 Power', 'success');
        }
    }
    
    async completeTask(taskId, rewardPower, url, verification, btnElement) {
        if (this.userCompletedTasks.has(taskId)) return false;
        
        let verificationSucceeded = false;
        
        if (verification) {
            const chatId = this.extractChatId(url);
            if (chatId) {
                const isBotAdmin = await this.checkBotAdmin(chatId);
                
                if (!isBotAdmin) {
                    verificationSucceeded = true;
                } else {
                    const isMember = await this.checkMembership(chatId);
                    if (isMember) {
                        verificationSucceeded = true;
                    } else {
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
            } else {
                verificationSucceeded = true;
            }
        } else {
            verificationSucceeded = true;
        }
        
        if (!verificationSucceeded) {
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
        
        this.userCompletedTasks.add(taskId);
        this.powerBalance += rewardPower;
        this._dirtyPower = true;
        
        await this.saveUserData(true);
        
        await this.addReferralEarnings(this.tgUser.id, rewardPower);
        
        await this.updateLevelFromPower();
        if (this.db) {
            await this.db.ref(`users/${this.tgUser.id}/completedTasks`).set(Array.from(this.userCompletedTasks));
            localStorage.setItem(`completed_${this.tgUser.id}`, JSON.stringify(Array.from(this.userCompletedTasks)));
            
                if (this.cache.tasks && this.cache.tasks.partner) {
                    const cachedTask = this.cache.tasks.partner.find(t => t.id === taskId);
                    if (cachedTask) {
                        cachedTask.total = currentTotal + 1;
                }
            }
        }
        
        if (btnElement) {
            btnElement.innerHTML = 'Done';
            btnElement.disabled = true;
            btnElement.classList.add('done');
            btnElement.classList.remove('start', 'check');
        }
        
        this.renderMining();
        if (this._earnLoaded) {
            await this.loadTasks();
            this.renderEarn();
        }
        this.showNotification('Task Completed!', `${rewardPower} ${this.t('power')}`, 'success');
        this.vibrate('success');
        this.isTaskRunning = false;
        this.enableAllTaskButtons();
        return true;
    }
    
    async checkBotAdmin(channel) {
        const cacheKey = `bot_admin_${channel}`;
        const cached = this.membershipCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < 3600000) {
            return cached.isAdmin;
        }
        
        try {
            const res = await fetch('/api/bot-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_bot_admin', channel: `@${channel}` })
            });
            const data = await res.json();
            const isAdmin = data.isAdmin === true;
            this.membershipCache.set(cacheKey, { isAdmin, timestamp: now });
            return isAdmin;
        } catch(e) {
            return false;
        }
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
    if (!this.db) {
        this.showNotification('Error', 'Database not connected', 'error');
        return false;
    }
    
    if (this.userCompletedPromoCodes.has(code)) {
        this.showNotification('Already Used', 'Code already redeemed', 'warning');
        return false;
    }
    
    localStorage.removeItem('promoCodes_cache');
    localStorage.removeItem('promoCodes_cache_time');
    
    try {
        const allCodesRef = this.db.ref('promoCodes');
        const allCodesSnap = await allCodesRef.once('value');
        
        if (!allCodesSnap.exists()) {
            this.showNotification('Debug', 'No promoCodes found in database at all!', 'error');
            return false;
        }
        
        const allCodes = allCodesSnap.val();
        const codesList = Object.keys(allCodes).join(', ');
        this.showNotification('Debug', `Available codes: ${codesList}`, 'info');
        
        const targetCodeSnap = await this.db.ref(`promoCodes/${code}`).once('value');
        
        if (!targetCodeSnap.exists()) {
            this.showNotification('Debug', `Code "${code}" not found. Available: ${codesList}`, 'warning');
            return false;
        }
        
        const promoData = targetCodeSnap.val();
        this.showNotification('Debug', `Found: ${promoData.reward} ${promoData.rewardType}`, 'success');
        
        const usedRef = this.db.ref(`usedPromoCodes/${this.tgUser.id}/${code}`);
        const usedSnap = await usedRef.once('value');
        if (usedSnap.exists()) {
            this.showNotification('Already Used', 'Code already redeemed', 'warning');
            return false;
        }
        
        const totalUses = promoData.total || 0;
        const maxUses = promoData.maxUses;
        if (maxUses && totalUses >= maxUses) {
            this.showNotification('Expired', 'Promo code has reached maximum uses', 'warning');
            return false;
        }
        
        const adWatched = await this.showInterstitialAd();
        if (!adWatched) return false;
        
        await usedRef.set(true);
        this.userCompletedPromoCodes.add(code);
        
        if (promoData.rewardType === 'power') {
            this.powerBalance += promoData.reward;
            this._dirtyPower = true;
            await this.updateLevelFromPower();
            await this.saveUserData();
            await this.addReferralEarnings(this.tgUser.id, promoData.reward);
            this.showNotification('Code Applied!', `You received ${this.formatNumber(promoData.reward)} Power`, 'success');
        } else if (promoData.rewardType === 'ton') {
            this.tonBalance += promoData.reward;
            this._dirtyTon = true;
            await this.saveUserData();
            this.showNotification('Code Applied!', `You received ${promoData.reward} TON`, 'success');
        } else {
            this.showNotification('Error', 'Invalid reward type', 'error');
            return false;
        }
        
        const promoRef = this.db.ref(`promoCodes/${code}/total`);
        await promoRef.set(totalUses + 1);
        
        this.renderMining();
        this.renderEarn();
        return true;
        
    } catch (error) {
        this.showNotification('Error', `Failed: ${error.message}`, 'error');
        return false;
    }
}
            
    async withdraw(amount, wallet) {
        if (this._withdrawLock) {
            this.showNotification('Please wait', 'You can withdraw again after 10 seconds', 'warning');
            return false;
        }
        
        this._withdrawLock = true;
        setTimeout(() => { this._withdrawLock = false; }, 10000);
        
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
        
        const originalBalance = this.tonBalance;
        this.tonBalance -= amount;
        this._dirtyTon = true;
        
        await this.saveUserData(true);
        
        const withdrawal = {
            id: Date.now(),
            amount: amount,
            wallet: wallet,
            status: 'pending',
            timestamp: await this.getServerTime(true)
        };
        
        if (this.db) {
            try {
                await this.db.ref(`withdrawals/${this.tgUser.id}/${withdrawal.id}`).set(withdrawal);
                await this.db.ref('Status/totalWithdrawals').transaction(current => (current || 0) + 1);
                await this.db.ref('Status/totalTonPaid').transaction(current => (current || 0) + amount);
                
                const userWithdrawalsRef = this.db.ref(`withdrawals/${this.tgUser.id}`);
                const snapshot = await userWithdrawalsRef.once('value');
                if (snapshot.exists()) {
                    const allWithdrawals = [];
                    snapshot.forEach(child => {
                        allWithdrawals.push({ id: child.key, ...child.val() });
                    });
                    allWithdrawals.sort((a, b) => b.timestamp - a.timestamp);
                    if (allWithdrawals.length > 5) {
                        const toDelete = allWithdrawals.slice(5);
                        for (const old of toDelete) {
                            await userWithdrawalsRef.child(old.id).remove();
                        }
                    }
                }
            } catch (error) {
                console.error('Withdrawal save failed:', error);
                this.tonBalance += amount;
                this._dirtyTon = true;
                await this.saveUserData(true);
                this.showNotification('Error', 'Failed to submit withdrawal', 'error');
                return false;
            }
        }
        
        this.withdrawals.unshift(withdrawal);
        if (this.withdrawals.length > 5) this.withdrawals = this.withdrawals.slice(0, 5);
        localStorage.setItem(`withdrawals_${this.tgUser.id}`, JSON.stringify(this.withdrawals));
        if (this._withdrawLoaded) {
            this.renderWithdraw();
        }
        this.showNotification('Withdrawn!', `${amount.toFixed(5)} TON requested`, 'success');
        return true;
    }
    
    extractChatId(url) {
        const match = url.match(/t\.me\/([^\/\?]+)/);
        return match ? match[1] : null;
    }
    
    async checkMembership(channel) {
        const cacheKey = `membership_${channel}_${this.tgUser.id}`;
        const cached = this.membershipCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < 1800000) {
            return cached.isMember;
        }
        
        try {
            const res = await fetch('/api/bot-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_channel', channel: `@${channel}`, userId: this.tgUser.id })
            });
            const data = await res.json();
            
            if (data.error === 'bot_not_admin') {
                return true;
            }
            
            const isMember = data.isMember === true;
            this.membershipCache.set(cacheKey, { isMember, timestamp: now });
            localStorage.setItem(cacheKey, JSON.stringify({ isMember, timestamp: now }));
            return isMember;
        } catch(e) {
            return false;
        }
    }
    
    async getServerTime(forceSync = false) {
        const now = Date.now();
        
        if (!forceSync && this.lastServerTimeSync && (now - this.lastServerTimeSync) < 3600000) {
            return now + this.serverTimeOffset;
        }
        
        try {
            const res = await fetch('/api/time');
            const data = await res.json();
            this.serverTimeOffset = data.serverTime - now;
            this.lastServerTimeSync = now;
            return data.serverTime;
        } catch(e) {
            return now + this.serverTimeOffset;
        }
    }
    
    async generateUniqueDeviceId() {
        const userAgent = navigator.userAgent;
        const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const platform = navigator.platform;
        const language = navigator.language;
        
        let seed = `${userAgent}|${screen}|${timezone}|${platform}|${language}`;
        
        const cryptoHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
        const hashArray = Array.from(new Uint8Array(cryptoHash));
        const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
        
        return `dev_${hexHash}`;
    }
    
    async checkDevice() {
        this.deviceId = await this.generateUniqueDeviceId();
        const savedDevice = localStorage.getItem('device_owner');
        
        if (savedDevice && savedDevice !== this.tgUser.id.toString()) {
            this.showNotification('Device Locked', 'Multiple accounts not allowed', 'error');
            setTimeout(() => window.Telegram?.WebApp?.close(), 3000);
            throw new Error('Device already registered with different user');
        }
        
        localStorage.setItem('device_owner', this.tgUser.id);
        return null;
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
            console.warn('Interstitial ad failed:', e);
            return true;
        }
    }
    
    async showRewardAd() {
        try {
            const AdController = window.Adsgram.init({ blockId: APP_CONFIG.REWARD_AD_BLOCK_ID });
            await AdController.show();
            return true;
        } catch(e) {
            console.warn('Reward ad failed:', e);
            return true;
        }
    }
    
    async updateFirebaseUid() {
        if (!this.db || !this.tgUser) return;
        const userRef = this.db.ref(`users/${this.tgUser.id}`);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const authUid = this.auth.currentUser.uid;
            await userRef.update({ firebaseUid: authUid });
        }
    }
    
    scheduleSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            this.saveUserData(false);
        }, 30000);
    }
    
    async saveUserData(immediate = false) {
        if (!this.db || !this.tgUser) return true;
        
        if (this._isSaving) {
            if (immediate) {
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                return true;
            }
        }
        
        this._isSaving = true;
        
        try {
            const updates = {};
            if (this._dirtyPower) updates.powerBalance = this.powerBalance;
            if (this._dirtyTon) updates.tonBalance = this.tonBalance;
            if (this._dirtyMining) {
                updates.miningActive = this.miningActive;
                updates.miningStartTime = this.miningStartTime;
                updates.miningEndTime = this.miningEndTime;
                updates.pendingTonReward = this.pendingTonReward;
            }
            
            if (Object.keys(updates).length === 0) {
                this._isSaving = false;
                return true;
            }
            
            await this.db.ref(`users/${this.tgUser.id}`).update(updates);
            
            const userDataForCache = {
                powerBalance: this.powerBalance,
                tonBalance: this.tonBalance,
                userLevel: this.userLevel,
                miningActive: this.miningActive,
                miningStartTime: this.miningStartTime,
                miningEndTime: this.miningEndTime,
                pendingTonReward: this.pendingTonReward,
                totalReferrals: this.totalReferrals,
                referralPower: this.referralPower
            };
            localStorage.setItem(`user_${this.tgUser.id}`, JSON.stringify(userDataForCache));
            
            this._dirtyPower = false;
            this._dirtyTon = false;
            this._dirtyMining = false;
            
            if (this._saveTimeout) clearTimeout(this._saveTimeout);
            
            return true;
        } catch (error) {
            console.warn('Failed to save user data:', error);
            return false;
        } finally {
            this._isSaving = false;
        }
    }
    
    async forceCreateUserData() {
        const startParam = this.tg.initDataUnsafe?.start_param;
        let referredBy = (startParam && !isNaN(startParam)) ? parseInt(startParam) : null;
        if (referredBy === this.tgUser.id || referredBy === this.deviceOwnerId) referredBy = null;
        
        const userData = {
            id: this.tgUser.id,
            firebaseUid: this.auth.currentUser.uid,
            username: this.tgUser.username || '',
            firstName: this.tgUser.first_name || 'User',
            photoUrl: this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
            referredBy: referredBy,
            createdAt: await this.getServerTime(true),
            miningSessionHours: this.miningSessionHours,
            hasStartedMining: false,
            hasClaimedWelcome: false,
            powerBalance: 0,
            tonBalance: 0,
            level: 1
        };
        
        await this.db.ref(`users/${this.tgUser.id}`).set(userData);
        
        const totalUsersRef = this.db.ref('Status/totalUsers');
        const currentTotal = (await totalUsersRef.once('value')).val() || 0;
        await totalUsersRef.set(currentTotal + 1);
        
        if (referredBy && referredBy !== this.tgUser.id) {
            const referrerRef = this.db.ref(`users/${referredBy}`);
            const referrerSnap = await referrerRef.once('value');
            if (referrerSnap.exists()) {
                const currentTotalRef = referrerSnap.val().totalReferrals ?? 0;
                await referrerRef.update({ totalReferrals: currentTotalRef + 1 });
            }
        }
        
        this.powerBalance = 0;
        this.tonBalance = 0;
        this.userLevel = 1;
        this.hasClaimedWelcome = false;
        this.hasStartedMining = false;
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        this.pendingTonReward = 0;
        
        const nameSpan = document.getElementById('user-name');
        if (nameSpan) nameSpan.innerText = this.tgUser.first_name || 'User';
        const levelSpan = document.getElementById('user-level');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        const levelBadge = document.getElementById('user-level-badge');
        if (levelBadge) levelBadge.innerText = this.userLevel;
        const photoImg = document.getElementById('user-photo');
        if (photoImg) photoImg.src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
    }
    
    async initFirebase() {
        let config = this.firebaseConfigCache;
        
        if (!config) {
            const cachedConfig = localStorage.getItem('firebase_config');
            const cachedTime = localStorage.getItem('firebase_config_time');
            
            if (cachedConfig && cachedTime && (Date.now() - parseInt(cachedTime)) < 86400000) {
                config = JSON.parse(cachedConfig);
            } else {
                const res = await fetch('/api/firebase-config', { method: 'POST' });
                const { encrypted } = await res.json();
                config = JSON.parse(atob(encrypted));
                localStorage.setItem('firebase_config', JSON.stringify(config));
                localStorage.setItem('firebase_config_time', Date.now().toString());
            }
            this.firebaseConfigCache = config;
        }
        
        let app;
        try { app = firebase.initializeApp(config); } catch(e) { app = firebase.app(); }
        this.db = app.database();
        this.auth = app.auth();
        await this.auth.signInAnonymously();
    }
    
    async loadUserData() {
        if (this._userDataLoaded) return;
        
        const cachedUser = localStorage.getItem(`user_${this.tgUser.id}`);
        if (cachedUser) {
            const data = JSON.parse(cachedUser);
            this.powerBalance = data.powerBalance ?? 0;
            this.tonBalance = data.tonBalance ?? 0;
            this.userLevel = data.userLevel ?? 1;
            this.miningActive = data.miningActive ?? false;
            this.miningStartTime = data.miningStartTime ?? null;
            this.miningEndTime = data.miningEndTime ?? null;
            this.pendingTonReward = data.pendingTonReward ?? 0;
            this.totalReferrals = data.totalReferrals ?? 0;
            this.referralPower = data.referralPower ?? 0;
        }
        
        try {
            const userRef = this.db.ref(`users/${this.tgUser.id}`);
            const snap = await userRef.once('value');
            if (snap.exists()) {
                const d = snap.val();
                this.powerBalance = d.powerBalance ?? this.powerBalance;
                
                if (this.powerBalance < 900 && !d.hasClaimedWelcome) {
                    this.powerBalance += 1000;
                    this._dirtyPower = true;
                    this.hasClaimedWelcome = true;
                    await this.saveUserData(true);
                    this.showNotification('Welcome Bonus', '1000 Power added to your balance', 'success');
                } else {
                    this.hasClaimedWelcome = d.hasClaimedWelcome ?? false;
                }
                
                this.tonBalance = d.tonBalance ?? this.tonBalance;
                this.userLevel = d.level ?? this.userLevel;
                this.hasStartedMining = d.hasStartedMining ?? false;
                this.miningActive = d.miningActive ?? this.miningActive;
                this.miningStartTime = d.miningStartTime ?? this.miningStartTime;
                this.miningEndTime = d.miningEndTime ?? this.miningEndTime;
                this.pendingTonReward = d.pendingTonReward ?? this.pendingTonReward;
                this.miningSessionHours = d.miningSessionHours ?? 8;
                this.referredBy = d.referredBy ?? null;
                this.totalReferrals = d.totalReferrals ?? this.totalReferrals;
                this.referralPower = d.referralPower ?? this.referralPower;
                
                const userDataForCache = {
                    powerBalance: this.powerBalance,
                    tonBalance: this.tonBalance,
                    userLevel: this.userLevel,
                    miningActive: this.miningActive,
                    miningStartTime: this.miningStartTime,
                    miningEndTime: this.miningEndTime,
                    pendingTonReward: this.pendingTonReward,
                    totalReferrals: this.totalReferrals,
                    referralPower: this.referralPower
                };
                localStorage.setItem(`user_${this.tgUser.id}`, JSON.stringify(userDataForCache));
            } else {
                await this.forceCreateUserData();
                const userRef2 = this.db.ref(`users/${this.tgUser.id}`);
                const snap2 = await userRef2.once('value');
                if (snap2.exists()) {
                    this.referredBy = snap2.val().referredBy ?? null;
                }
            }
        } catch (error) {
            console.error('loadUserData error:', error);
            await this.forceCreateUserData();
        }
        
        this._userDataLoaded = true;
        
        const nameSpan = document.getElementById('user-name');
        if (nameSpan) nameSpan.innerText = this.tgUser.first_name || 'User';
        const levelSpan = document.getElementById('user-level');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        const levelBadge = document.getElementById('user-level-badge');
        if (levelBadge) levelBadge.innerText = this.userLevel;
        const photoImg = document.getElementById('user-photo');
        if (photoImg) photoImg.src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
        
        await this.loadDailyTaskStatus();
    }
    
    async loadDailyTaskStatus() {
        const today = this.getTodayUTC();
        const stored = localStorage.getItem(`daily_tasks_${this.tgUser?.id}`);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.date === today) {
                this.dailyCheckNewsCompleted = data.checkNewsCompleted || false;
                this.dailyAdTaskCompleted = data.adTaskCompleted || false;
                this.lastDailyCheckNews = data.lastCheckNews || 0;
                this.lastDailyAdTask = data.lastAdTask || 0;
                return;
            }
        }
        this.dailyCheckNewsCompleted = false;
        this.dailyAdTaskCompleted = false;
        this.lastDailyCheckNews = 0;
        this.lastDailyAdTask = 0;
    }
    
    saveDailyTaskStatus() {
        const today = this.getTodayUTC();
        const data = {
            date: today,
            checkNewsCompleted: this.dailyCheckNewsCompleted,
            adTaskCompleted: this.dailyAdTaskCompleted,
            lastCheckNews: this.lastDailyCheckNews,
            lastAdTask: this.lastDailyAdTask
        };
        localStorage.setItem(`daily_tasks_${this.tgUser?.id}`, JSON.stringify(data));
    }
    
    getTodayUTC() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().split('T')[0];
    }
    
    getDailyResetTimeUTC() {
        const now = new Date();
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
        return tomorrow.getTime();
    }
    
    async completeDailyCheckNews(btnElement) {
        if (this.dailyCheckNewsCompleted) {
            this.showNotification('Already Completed', 'Daily task already done today', 'warning');
            return false;
        }
        
        const url = APP_CONFIG.DAILY_CHECK_NEWS_LINK;
        window.open(url, '_blank');
        
        btnElement.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        btnElement.disabled = true;
        
        let seconds = APP_CONFIG.TASK_VERIFICATION_DELAY;
        const interval = setInterval(() => {
            seconds--;
            if (seconds <= 0) {
                clearInterval(interval);
                btnElement.innerHTML = 'Claim';
                btnElement.disabled = false;
                btnElement.classList.remove('start');
                btnElement.classList.add('check');
                
                const newBtn = btnElement.cloneNode(true);
                btnElement.parentNode.replaceChild(newBtn, btnElement);
                
                newBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                    newBtn.disabled = true;
                    
                    const chatId = this.extractChatId(url);
                    let isMember = false;
                    
                    if (chatId) {
                        const isBotAdmin = await this.checkBotAdmin(chatId);
                        if (!isBotAdmin) {
                            isMember = true;
                        } else {
                            isMember = await this.checkMembership(chatId);
                        }
                    } else {
                        isMember = true;
                    }
                    
                    if (isMember) {
                        this.dailyCheckNewsCompleted = true;
                        this.lastDailyCheckNews = Date.now();
                        this.saveDailyTaskStatus();
                        
                        const rewardPower = 10;
                        this.powerBalance += rewardPower;
                        this._dirtyPower = true;
                        await this.updateLevelFromPower();
                        await this.saveUserData(true);
                        await this.addReferralEarnings(this.tgUser.id, rewardPower);
                        
                        newBtn.innerHTML = 'Done';
                        newBtn.disabled = true;
                        newBtn.classList.add('done');
                        newBtn.classList.remove('check');
                        
                        this.showNotification('Task Completed!', `${rewardPower} Power`, 'success');
                        this.renderEarn();
                    } else {
                        this.showNotification('Join Required', 'Please join the channel first', 'warning');
                        newBtn.innerHTML = 'Start';
                        newBtn.disabled = false;
                        newBtn.classList.remove('check');
                        newBtn.classList.add('start');
                    }
                });
            }
        }, 1000);
        
        return true;
    }
    
    async completeDailyAdTask() {
        if (this.dailyAdTaskCompleted) {
            this.showNotification('Already Completed', 'Daily task already done today', 'warning');
            return false;
        }
        
        if (this.isDailyAdTaskRunning) {
            this.showNotification('Busy', 'Please wait for current task', 'warning');
            return false;
        }
        
        this.isDailyAdTaskRunning = true;
        
        const taskContainer = document.querySelector('.daily-ad-task-container');
        const watchBtn = document.querySelector('#daily-ad-task-btn');
        
        if (watchBtn) watchBtn.style.display = 'none';
        
        const rewardAmount = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
        
        taskContainer.innerHTML = `
            <div class="daily-task-header">
                <div class="daily-task-icon"><i class="fas fa-video"></i></div>
                <div class="daily-task-info">
                    <h4>${this.t('daily_ad_task')}</h4>
                    <div class="daily-task-reward" id="ad-reward-display">+${rewardAmount} ${this.t('power')}</div>
                </div>
                <adsgram-task id="daily-ads-task" data-block-id='${APP_CONFIG.DAILY_AD_TASK_BLOCK_ID}' data-debug='true' class="task-ad-component"></adsgram-task>
            </div>
        `;
        
        const adComponent = document.getElementById('daily-ads-task');
        
        const rewardHandler = () => {
            this.showNotification('Reward Earned!', `+${rewardAmount} Power`, 'success');
            
            this.dailyAdTaskCompleted = true;
            this.dailyAdTaskReward = rewardAmount;
            this.saveDailyTaskStatus();
            this.powerBalance += rewardAmount;
            this._dirtyPower = true;
            this.updateLevelFromPower();
            this.saveUserData(true);
            this.addReferralEarnings(this.tgUser.id, rewardAmount);
            
            adComponent.removeEventListener('reward', rewardHandler);
            adComponent.removeEventListener('onError', errorHandler);
            
            this.renderEarn();
            this.isDailyAdTaskRunning = false;
        };
        
        const errorHandler = () => {
            this.showNotification('Ad Error', 'Please try again later', 'error');
            adComponent.removeEventListener('reward', rewardHandler);
            adComponent.removeEventListener('onError', errorHandler);
            this.renderEarn();
            this.isDailyAdTaskRunning = false;
        };
        
        adComponent.addEventListener('reward', rewardHandler);
        adComponent.addEventListener('onError', errorHandler);
        
        return true;
    }
    
    async loadCompletedTasks() {
        const cached = localStorage.getItem(`completed_${this.tgUser.id}`);
        if (cached && !this._forceRefreshCompleted) {
            this.userCompletedTasks = new Set(JSON.parse(cached));
            return;
        }
        
        if (!this.db) {
            this.userCompletedTasks = new Set();
            return;
        }
        
        try {
            const snap = await this.db.ref(`users/${this.tgUser.id}/completedTasks`).once('value');
            this.userCompletedTasks = snap.exists() ? new Set(snap.val()) : new Set();
            localStorage.setItem(`completed_${this.tgUser.id}`, JSON.stringify(Array.from(this.userCompletedTasks)));
            this._forceRefreshCompleted = false;
        } catch (error) {
            console.warn('Failed to load completed tasks:', error);
            this.userCompletedTasks = new Set();
        }
    }
    
    async loadWithdrawals() {
        if (this._withdrawLoaded) return;
        
        const cached = localStorage.getItem(`withdrawals_${this.tgUser.id}`);
        if (cached) {
            this.withdrawals = JSON.parse(cached);
            if (this.withdrawals.length > 5) this.withdrawals = this.withdrawals.slice(0, 5);
        }
        
        try {
            const snap = await this.db.ref(`withdrawals/${this.tgUser.id}`).once('value');
            this.withdrawals = [];
            if (snap.exists()) {
                snap.forEach(c => {
                    this.withdrawals.push({ id: c.key, ...c.val() });
                });
                this.withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                if (this.withdrawals.length > 5) this.withdrawals = this.withdrawals.slice(0, 5);
                localStorage.setItem(`withdrawals_${this.tgUser.id}`, JSON.stringify(this.withdrawals));
            }
        } catch (error) {
            console.warn('Failed to load withdrawals:', error);
        }
        
        this._withdrawLoaded = true;
    }
    
    async loadReferralStats() {
        if (!this.db) return;
        try {
            const totalRef = this.db.ref(`users/${this.tgUser.id}/totalReferrals`);
            const totalSnap = await totalRef.once('value');
            this.totalReferrals = totalSnap.val() ?? 0;
            
            const powerRef = this.db.ref(`users/${this.tgUser.id}/referralPower`);
            const powerSnap = await powerRef.once('value');
            this.referralPower = powerSnap.val() ?? 0;
        } catch (error) {
            console.warn('Failed to load referral stats:', error);
        }
    }
    
    async loadTasks() {
        if (!this.db) {
            this.partnerTasks = [];
            return;
        }
        
        const now = Date.now();
        if (this.cache.tasks && (now - this.cache.tasksTime) < 3600000) {
            this.partnerTasks = this.cache.tasks.partner || [];
            return;
        }
        
        try {
            const snap = await this.db.ref('tasks').once('value');
            this.partnerTasks = [];
            if (snap.exists()) {
                snap.forEach(c => {
                    const task = { id: c.key, ...c.val() };
                    const total = task.total || 0;
                    const max = task.max;
                    
                    if (max !== undefined && max !== null && total >= max) {
                        return;
                    }
                    
                    if (task.category === 'partner') this.partnerTasks.push(task);
                });
            }
            this.cache.tasks = {
                main: APP_CONFIG.MAIN_TASKS,
                partner: this.partnerTasks
            };
            this.cache.tasksTime = now;
        } catch (error) {
            console.warn('Failed to load tasks:', error);
            this.partnerTasks = [];
        }
    }
    
    async loadEarnData() {
        await this.loadTasks();
        await this.loadCompletedTasks();
        await this.loadDailyTaskStatus();
    }
    
    renderMining() {
        const el = document.getElementById('mining-page');
        if (!el) return;
        const requiredPower = this.getRequiredPowerForLevel(this.userLevel + 1);
        const hourlyRate = this.getHourlyTonRate();
        const dailyRate = this.getDailyTonRate();
        const monthlyRate = this.getMonthlyTonRate();
        
        const showStartButton = !this.miningActive && this.pendingTonReward <= 0;
        const showClaimButton = !this.miningActive && this.pendingTonReward > 0;
        const showMiningActive = this.miningActive;
        
        el.innerHTML = `
            <div class="balance-cards">
                <div class="balance-card"><div class="icon power"><i class="fas fa-bolt"></i></div><span class="label">${this.t('power')}</span><span class="value">${this.formatNumber(Math.floor(this.powerBalance))}</span></div>
                <div class="balance-card"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" class="ton-icon-img"><span class="label">${this.t('ton')}</span><span class="value">${this.tonBalance.toFixed(6)}</span></div>
            </div>
            <div class="mining-card">
                <div class="mining-icon"><i class="fas fa-microchip"></i></div>
                <h3>${this.t('mining_rig')}${this.userLevel}</h3>
                <div class="rate-stats">
                    <div class="rate-stat"><div class="stat-label">${this.t('hourly')}</div><div class="stat-value">${hourlyRate.toFixed(6)}</div></div>
                    <div class="rate-stat"><div class="stat-label">${this.t('daily')}</div><div class="stat-value">${dailyRate.toFixed(6)}</div></div>
                    <div class="rate-stat"><div class="stat-label">${this.t('monthly')}</div><div class="stat-value">${monthlyRate.toFixed(6)}</div></div>
                </div>
                ${showMiningActive ? `<div class="mining-timer"><i class="fas fa-hourglass-half"></i> 00:00:00</div><div class="mining-note">${this.t('mining_note')}</div>` : ''}
                ${showStartButton ? `<button id="start-mining-btn" class="mining-action-btn"><i class="fas fa-play"></i> ${this.t('start_mining')}</button>` : ''}
                ${showClaimButton ? `<button id="claim-mining-btn" class="mining-claim-btn"><i class="fas fa-gift"></i> ${this.t('claim_reward')}</button>` : ''}
                ${showMiningActive ? `<div class="mining-note mining-active-note"><i class="fas fa-circle" style="color:#2ecc71;font-size:0.6rem"></i> ${this.t('mining_active')}</div>` : ''}
            </div>
            
            <div class="earn-more-title"><i class="fas fa-chart-line"></i> ${this.t('earn_more')}</div>
            <div class="earn-cards">
                <div class="earn-card"><div class="earn-card-info"><h4>${this.t('watch_ad')}</h4><p>10 ${this.t('power')}</p></div><button id="mining-reward-ad" class="earn-card-btn">${this.t('watch')}</button></div>
                <div class="earn-card"><div class="earn-card-info"><h4>${this.t('complete_tasks')}</h4><p>${this.t('power_earnings')}</p></div><button id="go-tasks-btn" class="earn-card-btn">${this.t('go')}</button></div>
                <div class="earn-card"><div class="earn-card-info"><h4>${this.t('invite_frens')}</h4><p>${this.t('power_earnings')}</p></div><button id="go-team-btn" class="earn-card-btn">${this.t('go')}</button></div>
            </div>
        `;
        
        document.getElementById('start-mining-btn')?.addEventListener('click', () => this.startMining());
        document.getElementById('claim-mining-btn')?.addEventListener('click', () => this.claimMiningRewards());
        document.getElementById('mining-reward-ad')?.addEventListener('click', () => this.watchRewardAd());
        document.getElementById('go-tasks-btn')?.addEventListener('click', () => {
            document.querySelector('.nav-btn[data-page="earn-page"]').click();
        });
        document.getElementById('go-team-btn')?.addEventListener('click', () => {
            document.querySelector('.nav-btn[data-page="team-page"]').click();
        });
        
        if (this.miningActive) this.updateMiningTimerDisplay();
        this.updateAdCooldownDisplay();
    }
    
    renderEarn() {
        const el = document.getElementById('earn-page');
        if (!el) return;
        
        const resetTime = this.getDailyResetTimeUTC();
        const now = Date.now();
        const timeRemaining = Math.max(0, resetTime - now);
        const hoursRemaining = Math.floor(timeRemaining / 3600000);
        const minutesRemaining = Math.floor((timeRemaining % 3600000) / 60000);
        
        const dailyCheckNewsBtnClass = this.dailyCheckNewsCompleted ? 'done' : 'start';
        const dailyCheckNewsBtnText = this.dailyCheckNewsCompleted ? 'Done' : this.t('start');
        const dailyCheckNewsBtnDisabled = this.dailyCheckNewsCompleted;
        
        const mainTasksHtml = APP_CONFIG.MAIN_TASKS.map(t => {
            const isCompleted = this.userCompletedTasks.has(t.id);
            const btnClass = isCompleted ? 'done' : 'start';
            const btnText = isCompleted ? 'Done' : 'Start';
            const btnDisabled = isCompleted;
            return `
                <div class="task-item">
                    <img class="task-img" src="${t.img}">
                    <div class="task-info">
                        <h4>${t.name}</h4>
                        <div class="task-reward"><i class="fas fa-bolt"></i> ${t.reward} ${this.t('power')}</div>
                    </div>
                    <button class="task-btn ${btnClass}" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
                </div>
            `;
        }).join('');
        
        const availablePartnerTasks = this.partnerTasks.filter(t => !this.userCompletedTasks.has(t.id));
        const partnerTasksHtml = availablePartnerTasks.length > 0 ? availablePartnerTasks.map(t => `
            <div class="task-item">
                <img class="task-img" src="${t.img}">
                <div class="task-info">
                    <h4>${t.name}</h4>
                    <div class="task-reward"><i class="fas fa-bolt"></i> ${t.reward} ${this.t('power')}</div>
                </div>
                <button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button>
            </div>
        `).join('') : '<div class="no-data"><i class="fas fa-globe"></i><p>' + this.t('no_tasks') + '</p><small>' + this.t('check_later') + '</small></div>';
        
        el.innerHTML = `
            <div class="promo-card">
                <div class="promo-title"><i class="fas fa-gift"></i> ${this.t('promo_code')}</div>
                <div class="promo-input-group">
                    <input type="text" id="promo-input" class="form-input" placeholder="${this.t('enter_code')}" autocomplete="off">
                    <button id="promo-submit" class="promo-submit-btn" disabled>${this.t('claim')}</button>
                </div>
            </div>
            
            <div class="section-header">
                <h3><i class="fas fa-calendar-day"></i> ${this.t('daily_tasks')}</h3>
                <p>${this.t('refresh_in')}: ${hoursRemaining.toString().padStart(2, '0')}:${minutesRemaining.toString().padStart(2, '0')}</p>
            </div>
            
            <div class="daily-tasks-container">
                <div class="daily-task-card">
                    <div class="daily-task-header">
                        <div class="daily-task-icon"><i class="fas fa-newspaper"></i></div>
                        <div class="daily-task-info">
                            <h4>${this.t('daily_check_news')}</h4>
                            <div class="daily-task-reward"><i class="fas fa-bolt"></i> 10 ${this.t('power')}</div>
                        </div>
                        <button class="task-btn ${dailyCheckNewsBtnClass}" id="daily-check-news-btn" ${dailyCheckNewsBtnDisabled ? 'disabled' : ''}>${dailyCheckNewsBtnText}</button>
                    </div>
                </div>
            </div>
            
            <div class="section-header">
                <h3><i class="fas fa-star"></i> ${this.t('main_tasks')}</h3>
            </div>
            <div class="tasks-list" id="main-tasks-list">${mainTasksHtml}</div>
            
            <div class="section-header">
                <h3><i class="fas fa-globe"></i> ${this.t('partner_tasks')} <button id="tasks-info-btn" class="info-icon-btn" style="margin-left:8px;background:none;border:none;color:var(--primary);cursor:pointer"><i class="fas fa-question-circle"></i></button>
                </h3>
            </div>
            <div class="tasks-list" id="partner-tasks-list">${partnerTasksHtml}</div>
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
            this.updateModalTranslations();
        });
        
        document.getElementById('daily-check-news-btn')?.addEventListener('click', (e) => {
            if (!this.dailyCheckNewsCompleted) {
                this.completeDailyCheckNews(e.target);
            }
        });
        
        document.querySelectorAll('#main-tasks-list .task-btn.start, #partner-tasks-list .task-btn.start').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (this.isTaskRunning) {
                    this.showNotification('Busy', 'Complete current task first', 'warning');
                    return;
                }
                const id = btn.dataset.id;
                const reward = parseInt(btn.dataset.reward);
                const url = btn.dataset.url;
                const verify = btn.dataset.verify === 'true';
                
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
                        
                        newBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                            newBtn.disabled = true;
                            await this.completeTask(id, reward, url, verify, newBtn);
                        });
                    }
                }, 1000);
            });
        });
    }
    
    renderTeam() {
        const el = document.getElementById('team-page');
        if (!el) return;
        const link = APP_CONFIG.BOT_LINK + this.tgUser.id;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on VELTRIX and start mining TON!')}`;
        
        el.innerHTML = `
            <div class="team-benefits"><h3><i class="fas fa-gift"></i> ${this.t('team_benefits')}</h3><div class="benefits-list"><div class="benefit-item"><i class="fas fa-coins"></i><div class="benefit-text">${this.t('team_earnings')}</div></div></div></div>
            <div class="referral-card"><h4><i class="fas fa-share-alt"></i> ${this.t('share_earn')}</h4><div class="link-display">${link}</div><div class="referral-buttons"><button id="copyLink"><i class="fas fa-copy"></i> ${this.t('copy')}</button><button id="shareLink"><i class="fab fa-telegram"></i> ${this.t('share')}</button></div></div>
            <div class="stats-grid"><div class="stat-mini"><span class="stat-label">${this.t('total_members')}</span><span class="stat-number">${this.totalReferrals}</span></div><div class="stat-mini"><span class="stat-label">${this.t('power_earnings')}</span><span class="stat-number">${this.formatNumber(Math.floor(this.referralPower))}</span></div></div>
        `;
        document.getElementById('copyLink')?.addEventListener('click', () => {
            navigator.clipboard.writeText(link);
            this.showNotification(this.t('copy_success'), this.t('link_copied'), 'success');
        });
        document.getElementById('shareLink')?.addEventListener('click', () => {
            window.open(shareUrl, '_blank');
        });
    }
    
    renderWithdraw() {
        const el = document.getElementById('withdraw-page');
        if (!el) return;
        const historyHtml = this.withdrawals && this.withdrawals.length ? this.withdrawals.map(w => `
            <div class="history-item">
                <div class="history-amount"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" style="width:16px;height:16px"> ${w.amount.toFixed(5)} TON</div>
                <div class="history-status ${w.status}">${w.status === 'pending' ? this.t('pending') : this.t('completed')}</div>
            </div>
        `).join('') : '<div class="no-data">' + this.t('no_withdrawals') + '</div>';
        
        el.innerHTML = `
            <div class="withdraw-card"><h3><i class="fas fa-wallet"></i> ${this.t('withdraw')}</h3><div class="withdraw-balance"><img src="https://cdn-icons-png.flaticon.com/512/12114/12114247.png" style="width:28px;height:28px"> ${this.t('available')}: ${this.tonBalance.toFixed(6)} TON</div>
            <div class="form-group"><label class="form-label">${this.t('ton_wallet')}</label><div class="input-wrapper"><input type="text" id="wallet-addr" class="form-input" placeholder="UQ..."></div></div>
            <div class="form-group"><label class="form-label">${this.t('amount')}</label><div class="input-wrapper"><input type="number" id="withdraw-amount" class="form-input" placeholder="${this.t('min_withdraw')}: ${APP_CONFIG.MINIMUM_WITHDRAW} TON" step="0.00001"><button id="max-amount" class="action-btn">MAX</button></div></div>
            <div class="withdraw-note"><i class="fas fa-info-circle"></i> ${this.t('min_withdraw')}: ${APP_CONFIG.MINIMUM_WITHDRAW} TON</div>
            <button id="withdraw-btn" class="withdraw-confirm-btn disabled">${this.t('confirm_withdrawal')}</button></div>
            <div class="history-list"><h4><i class="fas fa-history"></i> ${this.t('withdrawal_history')}</h4>${historyHtml}</div>
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
                let maxAmount = this.tonBalance - 0.00001;
                if (maxAmount < 0) maxAmount = 0;
                amountInput.value = maxAmount.toFixed(6);
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
    
    updateModalTranslations() {
        const titleEl = document.querySelector('#tasks-info-modal .modal-header h3');
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-globe"></i> ${this.t('partner_info_title')}`;
        const text1 = document.getElementById('partner-info-text1');
        const text2 = document.getElementById('partner-info-text2');
        const text3 = document.getElementById('partner-info-text3');
        const contactBtn = document.getElementById('contact-support-modal');
        if (text1) text1.innerHTML = `<i class="fas fa-plus-circle" style="color:#6C63FF;margin-right:8px"></i> ${this.t('partner_text1')}`;
        if (text2) text2.innerHTML = `<i class="fas fa-handshake" style="color:#6C63FF;margin-right:8px"></i> ${this.t('partner_text2')}`;
        if (text3) text3.innerHTML = `<i class="fas fa-headset" style="color:#6C63FF;margin-right:8px"></i> ${this.t('partner_text3')}`;
        if (contactBtn) contactBtn.innerHTML = `<i class="fas fa-headset"></i> ${this.t('contact_support')}`;
        
        const claimTitle = document.getElementById('claim-title');
        if (claimTitle) claimTitle.innerHTML = `<i class="fas fa-gift"></i> ${this.t('claim_mining_title')}`;
        const claimBtn = document.getElementById('confirm-claim-btn');
        if (claimBtn) claimBtn.innerText = this.t('claim_btn');
        
        document.getElementById('nav-mining').innerText = this.t('mining');
        document.getElementById('nav-earn').innerText = this.t('earn');
        document.getElementById('nav-team').innerText = this.t('team');
        document.getElementById('nav-withdraw').innerText = this.t('withdraw');
        document.getElementById('user-level-text').innerText = this.t('level');
        
        const currentFlag = this.lang === 'ru' ? '🇷🇺' : this.lang === 'en' ? '🇬🇧' : this.lang === 'tr' ? '🇹🇷' : '🇸🇦';
        document.getElementById('current-flag').innerText = currentFlag;
    }
    
    setupEventListeners() {
        document.getElementById('support-btn').onclick = () => window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        document.getElementById('close-tasks-info')?.addEventListener('click', () => {
            document.getElementById('tasks-info-modal').style.display = 'none';
        });
        document.getElementById('contact-support-modal')?.addEventListener('click', () => {
            window.open(APP_CONFIG.SUPPORT_LINK, '_blank');
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveUserData(true);
            }
        });
        
        window.addEventListener('beforeunload', () => {
            if (this.miningActive || this._dirtyPower || this._dirtyTon || this._dirtyMining) {
                this.saveUserData(true);
            }
        });
        
        const langBtn = document.getElementById('lang-btn');
        const langMenu = document.getElementById('lang-menu');
        langBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.style.display = langMenu.style.display === 'none' ? 'block' : 'none';
        });
        
        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.lang = opt.dataset.lang;
                localStorage.setItem('star_farmer_lang', this.lang);
                const settings = JSON.parse(localStorage.getItem('star_farmer_settings') || '{}');
                settings.lang = this.lang;
                localStorage.setItem('star_farmer_settings', JSON.stringify(settings));
                langMenu.style.display = 'none';
                this.renderUI();
                this.updateModalTranslations();
                this.updateAdCooldownDisplay();
                this.showNotification('Language', `Changed to ${opt.innerText}`, 'success');
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!langBtn?.contains(e.target) && !langMenu?.contains(e.target)) {
                if (langMenu) langMenu.style.display = 'none';
            }
        });
    }
    
    saveSettings() {
        localStorage.setItem('star_farmer_settings', JSON.stringify({ vibration: this.vibrationEnabled, lang: this.lang }));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('star_farmer_settings');
        if (saved) {
            const s = JSON.parse(saved);
            this.vibrationEnabled = s.vibration !== false;
            this.lang = s.lang || this.getDeviceLanguage();
        } else {
            this.lang = this.getDeviceLanguage();
        }
        const savedLang = localStorage.getItem('star_farmer_lang');
        if (savedLang) this.lang = savedLang;
        const savedAdTime = localStorage.getItem('last_reward_ad_time');
        if (savedAdTime) this.lastRewardAdTime = parseInt(savedAdTime);
    }
    
    getDeviceLanguage() {
        const userLang = navigator.language || navigator.userLanguage;
        if (userLang.startsWith('ru')) return 'ru';
        if (userLang.startsWith('tr')) return 'tr';
        if (userLang.startsWith('ar')) return 'ar';
        return 'en';
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.page;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                
                if (id === 'mining-page') {
                    this.renderMining();
                } else if (id === 'earn-page') {
                    this.showPageLoader('earn-page');
                    if (!this._earnLoaded) {
                        await this.loadEarnData();
                        this._earnLoaded = true;
                    }
                    this.renderEarn();
                    this.hidePageLoader();
                } else if (id === 'team-page') {
                    this.showPageLoader('team-page');
                    if (!this._teamLoaded) {
                        await this.loadReferralStats();
                        this._teamLoaded = true;
                    }
                    this.renderTeam();
                    this.hidePageLoader();
                } else if (id === 'withdraw-page') {
                    this.showPageLoader('withdraw-page');
                    if (!this._withdrawLoaded) {
                        await this.loadWithdrawals();
                    }
                    this.renderWithdraw();
                    this.hidePageLoader();
                }
            });
        });
    }
    
    showPageLoader(pageId) {
        const page = document.getElementById(pageId);
        if (page && page.children.length === 0) {
            page.innerHTML = `<div class="task-loading"><i class="fas fa-spinner fa-pulse"></i><p>${this.t('loading')}...</p></div>`;
        }
    }
    
    hidePageLoader() {
    }
    
    renderUI() {
        this.renderMining();
        if (this._earnLoaded) this.renderEarn();
        if (this._teamLoaded) this.renderTeam();
        if (this._withdrawLoaded) this.renderWithdraw();
        this.updateModalTranslations();
    }
    
    async initialize() {
        const progressBar = document.getElementById('loader-progress-bar');
        const loaderPercent = document.getElementById('loader-percent');
        
        const updateProgress = (percent) => {
            if (progressBar) progressBar.style.width = percent + '%';
            if (loaderPercent) loaderPercent.innerText = Math.floor(percent) + '%';
        };
        
        try {
            updateProgress(10);
            if (!window.Telegram?.WebApp) throw new Error('Open from Telegram');
            this.tg = window.Telegram.WebApp;
            this.tgUser = this.tg.initDataUnsafe.user;
            if (!this.tgUser) throw new Error('No user data');
            this.tg.ready();
            this.tg.expand();
            
            updateProgress(30);
            await this.initFirebase();
            
            updateProgress(50);
            await this.checkDevice();
            await this.updateFirebaseUid();
            
            updateProgress(70);
            await this.getServerTime(true);
            
            updateProgress(80);
            await this.loadUserData();
            
            updateProgress(90);
            const savedAdTime = localStorage.getItem('last_reward_ad_time');
            if (savedAdTime) this.lastRewardAdTime = parseInt(savedAdTime);
            
            if (this.miningActive && this.miningEndTime) {
                const serverTime = await this.getServerTime(true);
                if (serverTime >= this.miningEndTime) {
                    const elapsedSeconds = (serverTime - this.miningStartTime) / 1000;
                    const elapsedHours = elapsedSeconds / 3600;
                    this.pendingTonReward = this.calculateRewardForHours(Math.min(elapsedHours, this.miningSessionHours));
                    this.miningActive = false;
                    this.miningStartTime = null;
                    this.miningEndTime = null;
                    this._dirtyMining = true;
                    await this.saveUserData(true);
                } else {
                    this.startMiningLoop();
                }
            }
            
            const hasClaimedWelcomeRef = this.db.ref(`users/${this.tgUser.id}/hasClaimedWelcome`);
            const hasClaimedWelcomeSnap = await hasClaimedWelcomeRef.once('value');
            const hasClaimedWelcomeFromDB = hasClaimedWelcomeSnap.val();
            
            if (!hasClaimedWelcomeFromDB) {
                this.powerBalance = (this.powerBalance || 0) + APP_CONFIG.WELCOME_BONUS_POWER;
                this._dirtyPower = true;
                this.hasClaimedWelcome = true;
                await this.updateLevelFromPower();
                await this.saveUserData(true);
                if (this.db) {
                    await this.db.ref(`users/${this.tgUser.id}`).update({ 
                        hasClaimedWelcome: true,
                        powerBalance: this.powerBalance 
                    });
                    this.showNotification('Welcome!', `${APP_CONFIG.WELCOME_BONUS_POWER} Power Added`, 'success');
                }
            } else {
                this.hasClaimedWelcome = true;
            }
            
            this.setupEventListeners();
            this.renderUI();
            this.setupNavigation();
            this.startCooldownTimer();
            
            setInterval(() => {
                const resetTime = this.getDailyResetTimeUTC();
                const now = Date.now();
                if (now >= resetTime) {
                    this.dailyCheckNewsCompleted = false;
                    this.dailyAdTaskCompleted = false;
                    this.saveDailyTaskStatus();
                    if (this._earnLoaded) this.renderEarn();
                }
            }, 60000);
            
            setInterval(() => {
                if (this._dirtyPower || this._dirtyTon || this._dirtyMining) {
                    this.scheduleSave();
                }
            }, 60000);
            
            updateProgress(100);
            
            setTimeout(() => {
                const loader = document.getElementById('app-loader');
                if (loader) {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                        document.getElementById('app').style.display = 'block';
                        this.updateAdCooldownDisplay();
                    }, 500);
                } else {
                    document.getElementById('app').style.display = 'block';
                    this.updateAdCooldownDisplay();
                }
            }, 500);
            this.isInitialized = true;
            
        } catch(err) {
            console.error('Initialization error:', err);
            const errorEl = document.getElementById('loader-error');
            if (errorEl) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        }
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
