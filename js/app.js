import { APP_CONFIG } from './data.js';

const translations = {
    en: {
        level: "Level", mining_rig: "Mining Rig Lv.", hourly: "Hourly", daily: "Daily", monthly: "Monthly",
        start_mining: "START MINING", claim_reward: "CLAIM REWARD", mining_note: "Rewards can be collected after mining session ends",
        next_level_reward: "Next level reward", power: "Power", ton: "TON", promo_code: "Promo Code",
        enter_code: "Enter code", claim: "Claim", main_tasks: "Main Tasks", partner_tasks: "Social Tasks",
        watch_ad: "Watch Reward AD", reward_amount: "Reward", available_in: "Available in", hours: "h",
        watch: "Watch", all_tasks_completed: "All tasks completed!", check_later: "Check back later for more",
        no_tasks: "No tasks available", team_benefits: "Team Benefits", share_earn: "SHARE & EARN",
        copy: "Copy", share: "Share", total_members: "Total Members", verified_members: "Verified Members",
        power_earnings: "Power Earnings", ton_earnings: "TON Earnings", withdraw: "Withdraw",
        available: "Available", ton_wallet: "TON Wallet", amount: "Amount", min_withdraw: "Minimum withdrawal",
        confirm_withdrawal: "Confirm Withdrawal", withdrawal_history: "Withdrawal History", no_withdrawals: "No withdrawals yet",
        pending: "pending", completed: "completed", claim_mining_title: "Claim Mining Rewards", claim_btn: "Claim Rewards",
        partner_info_title: "Social Tasks", partner_text1: "You can add task by support", partner_text2: "You can cooperate with us",
        partner_text3: "Contact support for details", contact_support: "Contact Support", mining: "Mining", earn: "Earn",
        team: "Team", copy_success: "Copied!", link_copied: "Link copied to clipboard", earn_more: "Earn More Power",
        complete_tasks: "Complete Tasks", go: "GO", invite_frens: "Invite Frens", ad_reward: "Watch AD", loading: "Loading",
        ready: "Ready", mining_active: "MINING ACTIVE", reward_collect: "Reward ready to collect"
    },
    es: {
        level: "Nivel", mining_rig: "Equipo de Minería Nv.", hourly: "Por hora", daily: "Diario", monthly: "Mensual",
        start_mining: "INICIAR MINERÍA", claim_reward: "RECLAMAR RECOMPENSA", mining_note: "Las recompensas se pueden recolectar después de la sesión de minería",
        next_level_reward: "Recompensa del próximo nivel", power: "Energía", ton: "TON", promo_code: "Código Promocional",
        enter_code: "Ingrese código", claim: "Reclamar", main_tasks: "Tareas Principales", partner_tasks: "Tareas Sociales",
        watch_ad: "Ver Anuncio Recompensa", reward_amount: "Recompensa", available_in: "Disponible en", hours: "h",
        watch: "Ver", all_tasks_completed: "¡Todas las tareas completadas!", check_later: "Vuelve más tarde para más",
        no_tasks: "No hay tareas disponibles", team_benefits: "Beneficios del Equipo", share_earn: "COMPARTIR Y GANAR",
        copy: "Copiar", share: "Compartir", total_members: "Miembros Totales", verified_members: "Miembros Verificados",
        power_earnings: "Ganancias de Energía", ton_earnings: "Ganancias en TON", withdraw: "Retirar",
        available: "Disponible", ton_wallet: "Billetera TON", amount: "Cantidad", min_withdraw: "Retiro mínimo",
        confirm_withdrawal: "Confirmar Retiro", withdrawal_history: "Historial de Retiros", no_withdrawals: "Sin retiros aún",
        pending: "pendiente", completed: "completado", claim_mining_title: "Reclamar Recompensas de Minería", claim_btn: "Reclamar Recompensas",
        partner_info_title: "Tareas Sociales", partner_text1: "Puedes agregar tareas con soporte", partner_text2: "Puedes cooperar con nosotros",
        partner_text3: "Contacta con soporte para detalles", contact_support: "Contactar Soporte", mining: "Minería", earn: "Ganar",
        team: "Equipo", copy_success: "¡Copiado!", link_copied: "Enlace copiado al portapapeles", earn_more: "Gana Más Energía",
        complete_tasks: "Completar Tareas", go: "IR", invite_frens: "Invitar Amigos", ad_reward: "Ver Anuncio", loading: "Cargando",
        ready: "Listo", mining_active: "MINERÍA ACTIVA", reward_collect: "Recompensa lista para recoger"
    },
    fa: {
        level: "سطح", mining_rig: "دستگاه استخراج سطح", hourly: "ساعتی", daily: "روزانه", monthly: "ماهانه",
        start_mining: "شروع استخراج", claim_reward: "دریافت پاداش", mining_note: "پاداش‌ها پس از پایان جلسه استخراج قابل دریافت هستند",
        next_level_reward: "پاداش سطح بعدی", power: "انرژی", ton: "تون", promo_code: "کد تخفیف",
        enter_code: "ورود کد", claim: "دریافت", main_tasks: "وظایف اصلی", partner_tasks: "وظایف اجتماعی",
        watch_ad: "تماشای تبلیغ جایزه‌دار", reward_amount: "پاداش", available_in: "موجود در", hours: "ساعت",
        watch: "تماشا", all_tasks_completed: "تمام وظایف انجام شد!", check_later: "بعداً برای موارد بیشتر مراجعه کنید",
        no_tasks: "هیچ وظیفه‌ای موجود نیست", team_benefits: "مزایای تیم", share_earn: "اشتراک‌گذاری و درآمدزایی",
        copy: "کپی", share: "اشتراک‌گذاری", total_members: "کل اعضا", verified_members: "اعضای تأیید شده",
        power_earnings: "درآمد انرژی", ton_earnings: "درآمد تون", withdraw: "برداشت",
        available: "موجودی", ton_wallet: "کیف پول تون", amount: "مقدار", min_withdraw: "حداقل برداشت",
        confirm_withdrawal: "تأیید برداشت", withdrawal_history: "تاریخچه برداشت", no_withdrawals: "هنوز برداشتی انجام نشده",
        pending: "در انتظار", completed: "تکمیل شده", claim_mining_title: "دریافت پاداش استخراج", claim_btn: "دریافت پاداش",
        partner_info_title: "وظایف اجتماعی", partner_text1: "می‌توانید وظیفه را با پشتیبانی اضافه کنید", partner_text2: "می‌توانید با ما همکاری کنید",
        partner_text3: "برای جزئیات با پشتیبانی تماس بگیرید", contact_support: "تماس با پشتیبانی", mining: "استخراج", earn: "درآمد",
        team: "تیم", copy_success: "کپی شد!", link_copied: "لینک در کلیپ‌بورد کپی شد", earn_more: "انرژی بیشتر کسب کنید",
        complete_tasks: "تکمیل وظایف", go: "برو", invite_frens: "دعوت از دوستان", ad_reward: "تماشای تبلیغ", loading: "در حال بارگذاری",
        ready: "آماده", mining_active: "استخراج فعال", reward_collect: "پاداش آماده دریافت"
    },
    tr: {
        level: "Seviye", mining_rig: "Madenci Seviye", hourly: "Saatlik", daily: "Günlük", monthly: "Aylık",
        start_mining: "MADENCİLİĞE BAŞLA", claim_reward: "ÖDÜLÜ AL", mining_note: "Ödüller madencilik oturumu bittikten sonra toplanabilir",
        next_level_reward: "Sonraki seviye ödülü", power: "Güç", ton: "TON", promo_code: "Promosyon Kodu",
        enter_code: "Kodu girin", claim: "Al", main_tasks: "Ana Görevler", partner_tasks: "Sosyal Görevler",
        watch_ad: "Ödüllü Reklam İzle", reward_amount: "Ödül", available_in: "Kalan süre", hours: "sa",
        watch: "İzle", all_tasks_completed: "Tüm görevler tamamlandı!", check_later: "Daha fazlası için daha sonra kontrol edin",
        no_tasks: "Görev yok", team_benefits: "Takım Avantajları", share_earn: "PAYLAŞ VE KAZAN",
        copy: "Kopyala", share: "Paylaş", total_members: "Toplam Üye", verified_members: "Doğrulanmış Üye",
        power_earnings: "Güç Kazancı", ton_earnings: "TON Kazancı", withdraw: "Çek",
        available: "Mevcut", ton_wallet: "TON Cüzdanı", amount: "Miktar", min_withdraw: "Minimum çekim",
        confirm_withdrawal: "Çekimi Onayla", withdrawal_history: "Çekim Geçmişi", no_withdrawals: "Henüz çekim yok",
        pending: "beklemede", completed: "tamamlandı", claim_mining_title: "Madencilik Ödüllerini Al", claim_btn: "Ödülleri Al",
        partner_info_title: "Sosyal Görevler", partner_text1: "Destek ile görev ekleyebilirsiniz", partner_text2: "Bizimle işbirliği yapabilirsiniz",
        partner_text3: "Detaylar için desteğe başvurun", contact_support: "Desteğe Başvur", mining: "Madencilik", earn: "Kazan",
        team: "Takım", copy_success: "Kopyalandı!", link_copied: "Bağlantı panoya kopyalandı", earn_more: "Daha Fazla Güç Kazan",
        complete_tasks: "Görevleri Tamamla", go: "GİT", invite_frens: "Arkadaşları Davet Et", ad_reward: "Reklam İzle", loading: "Yükleniyor",
        ready: "Hazır", mining_active: "MADENCİLİK AKTİF", reward_collect: "Ödül toplanmaya hazır"
    },
    ar: {
        level: "مستوى", mining_rig: "جهاز التعدين مستوى", hourly: "كل ساعة", daily: "يومي", monthly: "شهري",
        start_mining: "بدء التعدين", claim_reward: "استلام المكافأة", mining_note: "يمكن جمع المكافآت بعد انتهاء جلسة التعدين",
        next_level_reward: "مكافأة المستوى التالي", power: "الطاقة", ton: "تون", promo_code: "رمز ترويجي",
        enter_code: "أدخل الرمز", claim: "استلام", main_tasks: "المهام الرئيسية", partner_tasks: "المهام الاجتماعية",
        watch_ad: "مشاهدة إعلان مكافأة", reward_amount: "المكافأة", available_in: "متاح بعد", hours: "ساعة",
        watch: "مشاهدة", all_tasks_completed: "جميع المهام مكتملة!", check_later: "تحقق لاحقاً للمزيد",
        no_tasks: "لا توجد مهام متاحة", team_benefits: "مزايا الفريق", share_earn: "شارك واربح",
        copy: "نسخ", share: "مشاركة", total_members: "إجمالي الأعضاء", verified_members: "الأعضاء الموثقين",
        power_earnings: "أرباح الطاقة", ton_earnings: "أرباح التون", withdraw: "سحب",
        available: "الرصيد المتوفر", ton_wallet: "محفظة تون", amount: "المبلغ", min_withdraw: "الحد الأدنى للسحب",
        confirm_withdrawal: "تأكيد السحب", withdrawal_history: "سجل السحوبات", no_withdrawals: "لا توجد سحوبات بعد",
        pending: "قيد الانتظار", completed: "مكتمل", claim_mining_title: "استلام مكافآت التعدين", claim_btn: "استلام المكافآت",
        partner_info_title: "المهام الاجتماعية", partner_text1: "يمكنك إضافة مهمة عن طريق الدعم", partner_text2: "يمكنك التعاون معنا",
        partner_text3: "اتصل بالدعم للتفاصيل", contact_support: "اتصل بالدعم", mining: "التعدين", earn: "الأرباح",
        team: "الفريق", copy_success: "تم النسخ!", link_copied: "تم نسخ الرابط", earn_more: "احصل على طاقة أكثر",
        complete_tasks: "إكمال المهام", go: "اذهب", invite_frens: "دعوة الأصدقاء", ad_reward: "مشاهدة إعلان", loading: "جاري التحميل",
        ready: "جاهز", mining_active: "التعدين نشط", reward_collect: "المكافأة جاهزة للاستلام"
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
        this.isVerified = false;
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
        this.miningSessionHours = 0;
        this.withdrawals = [];
        this.totalReferrals = 0;
        this.verifiedReferrals = 0;
        this.referralPower = 0;
        this.referralTon = 0;
        this.isTaskRunning = false;
        this.mainTasks = [];
        this.partnerTasks = [];
        this.promoCodes = [];
        
        this.lastRewardAdTime = 0;
        this.lang = 'en';
        this.cooldownInterval = null;
        
        this.vibrationEnabled = true;
        this.loadSettings();
    }
    
    t(key) {
        return translations[this.lang]?.[key] || translations.en[key] || key;
    }
    
    formatNumber(num) {
        return num.toLocaleString('en');
    }
    
    getHourlyTonRate() {
        return (this.powerBalance / 1000) * APP_CONFIG.POWER_PER_TON_RATE;
    }
    
    getDailyTonRate() {
        return this.getHourlyTonRate() * 24;
    }
    
    getMonthlyTonRate() {
        return this.getDailyTonRate() * 30;
    }
    
    calculateRewardForHours(hours) {
        return this.getHourlyTonRate() * hours;
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
    
    async showInterstitialAd() {
        try {
            const AdController = window.Adsgram.init({ blockId: APP_CONFIG.INTERSTITIAL_AD_BLOCK_ID });
            await AdController.show();
            return true;
        } catch(e) {
            return true;
        }
    }
    
    async showRewardAd() {
        try {
            const AdController = window.Adsgram.init({ blockId: APP_CONFIG.REWARD_AD_BLOCK_ID });
            await AdController.show();
            return true;
        } catch(e) {
            return true;
        }
    }
    
    getRequiredPowerForLevel(level) {
        return Math.floor(APP_CONFIG.LEVEL_FORMULA.base * Math.pow(APP_CONFIG.LEVEL_FORMULA.multiplier, level - 1));
    }
    
    updateLevelFromPower() {
        let newLevel = 1;
        let levelUpBonus = 0;
        while (this.powerBalance >= this.getRequiredPowerForLevel(newLevel + 1)) {
            newLevel++;
            levelUpBonus += 50;
        }
        if (newLevel > this.userLevel) {
            if (levelUpBonus > 0) {
                this.powerBalance += levelUpBonus;
                this.showNotification(this.t('level') + ' Up!', `+${this.formatNumber(levelUpBonus)} ${this.t('power')} bonus for reaching level ${newLevel}!`, 'success');
            }
            this.userLevel = newLevel;
            this.showNotification(this.t('level') + ' Up!', `Reached level ${this.userLevel}!`, 'success');
            this.vibrate('success');
        }
        this.userLevel = newLevel;
        const levelSpan = document.getElementById('user-level');
        const levelBadge = document.getElementById('user-level-badge');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        if (levelBadge) levelBadge.innerText = this.userLevel;
    }
    
    async startMining() {
        const adWatched = await this.showInterstitialAd();
        if (!adWatched) return;
        
        const serverTime = await this.getServerTime();
        
        this.miningActive = true;
        this.miningStartTime = serverTime;
        this.miningEndTime = serverTime + (APP_CONFIG.MINING_SESSION_HOURS * 3600000);
        this.miningSessionHours = APP_CONFIG.MINING_SESSION_HOURS;
        this.pendingTonReward = 0;
        
        if (!this.hasStartedMining && this.db && this.tgUser) {
            this.hasStartedMining = true;
            await this.db.ref(`users/${this.tgUser.id}`).update({ hasStartedMining: true });
            
            const userSnap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
            const referredBy = userSnap.val()?.referredBy;
            if (referredBy && referredBy !== this.tgUser.id && referredBy !== this.deviceOwnerId) {
                const referrerRef = this.db.ref(`users/${referredBy}`);
                const referrerSnap = await referrerRef.once('value');
                if (referrerSnap.exists()) {
                    const currentPower = referrerSnap.val().powerBalance ?? 0;
                    const currentVerified = referrerSnap.val().verifiedReferrals ?? 0;
                    const currentReferralPower = referrerSnap.val().referralPower ?? 0;
                    await referrerRef.update({ 
                        powerBalance: currentPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                        verifiedReferrals: currentVerified + 1,
                        referralPower: currentReferralPower + APP_CONFIG.REFERRAL_POWER_BONUS
                    });
                    
                    await this.db.ref(`referrals/${referredBy}/${this.tgUser.id}`).update({
                        userId: this.tgUser.id,
                        userName: this.tgUser.first_name,
                        userPhoto: this.tgUser.photo_url,
                        state: 'Verified',
                        verifiedAt: serverTime
                    });
                }
            }
        }
        
        await this.saveUserData();
        this.renderMining();
        this.startMiningLoop();
        this.showNotification(this.t('start_mining'), 'Your rig is now mining TON', 'success');
    }

    async stopMining() {
        if (!this.miningActive) return;
        
        const currentServerTime = await this.getServerTime();
        const elapsedSeconds = (currentServerTime - this.miningStartTime) / 1000;
        const elapsedHours = elapsedSeconds / 3600;
        const actualHours = Math.min(elapsedHours, this.miningSessionHours);
        
        this.pendingTonReward = this.calculateRewardForHours(actualHours);
        this.miningActive = false;
        this.miningStartTime = null;
        this.miningEndTime = null;
        
        await this.saveUserData();
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
        
        const modal = document.getElementById('claim-modal');
        const rewardEl = document.getElementById('claim-reward-amount');
        rewardEl.innerText = this.pendingTonReward.toFixed(8) + ' TON';
        modal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('confirm-claim-btn');
        const closeBtn = document.getElementById('close-claim-modal');
        
        const handleClaim = async () => {
            modal.style.display = 'none';
            cleanup();
            
            this.tonBalance += this.pendingTonReward;
            const earnedAmount = this.pendingTonReward;
            this.pendingTonReward = 0;
            
            await this.saveUserData();
            
            if (this.db && this.tgUser.id) {
                await this.addReferralEarnings(this.tgUser.id, earnedAmount);
            }
            
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
            const serverTime = await this.getServerTime();
            if (this.miningEndTime && serverTime >= this.miningEndTime) {
                await this.stopMining();
            }
        }, 10000);
        
        this.uiUpdateInterval = setInterval(async () => {
            if (this.miningActive) {
                await this.updateMiningTimerDisplay();
            }
        }, 1000);
    }
    
    async updateMiningTimerDisplay() {
        if (!this.miningEndTime) return;
        
        const currentServerTime = await this.getServerTime();
        const remaining = Math.max(0, (this.miningEndTime - currentServerTime) / 1000);
        
        if (remaining <= 0 && this.miningActive) {
            await this.stopMining();
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
    
    async addReferralEarnings(userId, tonAmount) {
        const userSnap = await this.db.ref(`users/${userId}`).once('value');
        const referredBy = userSnap.val()?.referredBy;
        if (referredBy && referredBy !== userId && referredBy !== this.tgUser.id) {
            const commission = tonAmount * (APP_CONFIG.REFERRAL_PERCENTAGE / 100);
            const referrerRef = this.db.ref(`users/${referredBy}`);
            const referrerSnap = await referrerRef.once('value');
            if (referrerSnap.exists()) {
                const currentTon = referrerSnap.val().tonBalance ?? 0;
                const currentReferralTon = referrerSnap.val().referralTon ?? 0;
                await referrerRef.update({ 
                    tonBalance: currentTon + commission,
                    referralTon: currentReferralTon + commission
                });
            }
        }
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
            this.powerBalance += 50;
            await this.updateLevelFromPower();
            await this.saveUserData();
            this.renderMining();
            this.renderEarn();
            this.updateAdCooldownDisplay();
            this.showNotification('Reward Claimed!', '50 Power', 'success');
        }
    }
    
    async completeTask(taskId, rewardPower, url, verification, btnElement) {
        if (this.userCompletedTasks.has(taskId)) return false;
        if (verification) {
            const chatId = this.extractChatId(url);
            if (chatId) {
                const isMember = await this.checkMembership(chatId);
                if (!isMember) {
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
        }
        
        this.userCompletedTasks.add(taskId);
        this.powerBalance += rewardPower;
        await this.updateLevelFromPower();
        await this.saveUserData();
        if (this.db) {
            await this.db.ref(`users/${this.tgUser.id}/completedTasks`).set(Array.from(this.userCompletedTasks));
            const taskRef = this.db.ref(`tasks/${taskId}/total`);
            const currentTotal = (await taskRef.once('value')).val() || 0;
            await taskRef.set(currentTotal + 1);
        }
        this.renderMining();
        this.renderEarn();
        this.showNotification('Task Completed!', `${rewardPower} ${this.t('power')}`, 'success');
        this.vibrate('success');
        this.isTaskRunning = false;
        this.enableAllTaskButtons();
        return true;
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
        if (!this.db) return false;
        if (this.userCompletedPromoCodes.has(code)) {
            this.showNotification('Already Used', 'Code already redeemed', 'warning');
            return false;
        }
        const codeSnap = await this.db.ref(`promoCodes/${code}`).once('value');
        if (!codeSnap.exists()) {
            this.showNotification('Invalid Code', 'Promo code not found', 'error');
            return false;
        }
        const promoData = codeSnap.val();
        const usedRef = this.db.ref(`usedPromoCodes/${this.tgUser.id}/${code}`);
        const usedSnap = await usedRef.once('value');
        if (usedSnap.exists()) {
            this.showNotification('Already Used', 'Code already redeemed', 'warning');
            return false;
        }
        
        await usedRef.set(true);
        this.userCompletedPromoCodes.add(code);
        
        if (promoData.power) {
            this.powerBalance += promoData.power;
            await this.updateLevelFromPower();
        }
        if (promoData.ton) {
            this.tonBalance += promoData.ton;
        }
        
        const promoRef = this.db.ref(`promoCodes/${code}/total`);
        const currentTotal = (await promoRef.once('value')).val() || 0;
        await promoRef.set(currentTotal + 1);
        
        await this.saveUserData();
        this.renderMining();
        this.showNotification('Code Applied!', `You received ${promoData.power ? this.formatNumber(promoData.power) + ' Power' : promoData.ton + ' TON'}`, 'success');
        return true;
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
        
        const adWatched = await this.showInterstitialAd();
        if (!adWatched) return false;
        
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
            const withdrawalsCountRef = this.db.ref('Status/totalWithdrawals');
            const currentCount = (await withdrawalsCountRef.once('value')).val() || 0;
            await withdrawalsCountRef.set(currentCount + 1);
            
            const totalTonPaidRef = this.db.ref('Status/totalTonPaid');
            const currentPaid = (await totalTonPaidRef.once('value')).val() || 0;
            await totalTonPaidRef.set(currentPaid + amount);
        }
        
        this.withdrawals.unshift(withdrawal);
        this.renderWithdraw();
        this.showNotification('Withdrawn!', `${amount.toFixed(5)} TON requested`, 'success');
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
            const existingOwner = await this.checkDevice();
            
            updateProgress(70);
            if (existingOwner && existingOwner !== this.tgUser.id) {
                await this.loadUserById(existingOwner);
            } else {
                await this.loadUserData();
            }
            
            updateProgress(85);
            await this.loadCompletedTasks();
            await this.loadWithdrawals();
            await this.loadReferralStats();
            await this.loadPromoCodes();
            await this.loadTasks();
            
            const savedAdTime = localStorage.getItem('last_reward_ad_time');
            if (savedAdTime) this.lastRewardAdTime = parseInt(savedAdTime);
            
            updateProgress(95);
            if (this.miningActive && this.miningEndTime) {
                const serverTime = await this.getServerTime();
                if (serverTime >= this.miningEndTime) {
                    const elapsedSeconds = (serverTime - this.miningStartTime) / 1000;
                    const elapsedHours = elapsedSeconds / 3600;
                    this.pendingTonReward = this.calculateRewardForHours(Math.min(elapsedHours, this.miningSessionHours));
                    this.miningActive = false;
                    this.miningStartTime = null;
                    this.miningEndTime = null;
                    await this.saveUserData();
                    this.renderMining();
                } else {
                    this.startMiningLoop();
                }
            } else if (this.pendingTonReward > 0 && !this.miningActive) {
                this.renderMining();
            }
            
            if (!this.hasClaimedWelcome) {
                this.powerBalance += APP_CONFIG.WELCOME_BONUS_POWER;
                this.hasClaimedWelcome = true;
                this.isVerified = true;
                await this.updateLevelFromPower();
                await this.saveUserData();
                if (this.db) {
                    await this.db.ref(`users/${this.tgUser.id}`).update({ hasClaimedWelcome: true, isVerified: true });
                    const userSnap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
                    const referredBy = userSnap.val()?.referredBy;
                    if (referredBy && referredBy !== this.tgUser.id && referredBy !== this.deviceOwnerId) {
                        const referrerRef = this.db.ref(`users/${referredBy}`);
                        const referrerSnap = await referrerRef.once('value');
                        if (referrerSnap.exists()) {
                            const currentPower = referrerSnap.val().powerBalance ?? 0;
                            const currentVerified = referrerSnap.val().verifiedReferrals ?? 0;
                            const currentReferralPower = referrerSnap.val().referralPower ?? 0;
                            const currentTotalReferrals = referrerSnap.val().totalReferrals ?? 0;
                            await referrerRef.update({ 
                                powerBalance: currentPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                                verifiedReferrals: currentVerified + 1,
                                referralPower: currentReferralPower + APP_CONFIG.REFERRAL_POWER_BONUS,
                                totalReferrals: currentTotalReferrals + 1
                            });
                            
                            await this.db.ref(`referrals/${referredBy}/${this.tgUser.id}`).update({
                                userId: this.tgUser.id,
                                userName: this.tgUser.first_name,
                                userPhoto: this.tgUser.photo_url,
                                state: 'Verified',
                                joinedAt: await this.getServerTime()
                            });
                        }
                    }
                }
            }
            
            await this.loadReferralStats();
            
            this.setupEventListeners();
            this.renderUI();
            this.setupNavigation();
            this.startCooldownTimer();
            
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
            document.getElementById('loader-error').textContent = err.message;
            document.getElementById('loader-error').style.display = 'block';
        }
    }
    
    async loadUserById(userId) {
        const ref = this.db.ref(`users/${userId}`);
        const snap = await ref.once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.powerBalance = d.powerBalance ?? 0;
            this.tonBalance = d.tonBalance ?? 0;
            this.userLevel = d.level ?? 1;
            this.isVerified = d.isVerified ?? false;
            this.hasClaimedWelcome = d.hasClaimedWelcome ?? false;
            this.hasStartedMining = d.hasStartedMining ?? false;
            this.miningActive = d.miningActive ?? false;
            this.miningStartTime = d.miningStartTime ?? null;
            this.miningEndTime = d.miningEndTime ?? null;
            this.pendingTonReward = d.pendingTonReward ?? 0;
            this.miningSessionHours = d.miningSessionHours ?? APP_CONFIG.MINING_SESSION_HOURS;
            this.tgUser = { id: userId, first_name: d.firstName, username: d.username, photo_url: d.photoUrl };
            const nameSpan = document.getElementById('user-name');
            if (nameSpan) nameSpan.innerText = d.firstName;
            const photoImg = document.getElementById('user-photo');
            if (photoImg) photoImg.src = d.photoUrl || APP_CONFIG.DEFAULT_USER_AVATAR;
            const levelSpan = document.getElementById('user-level');
            if (levelSpan) levelSpan.innerText = this.userLevel;
            const levelBadge = document.getElementById('user-level-badge');
            if (levelBadge) levelBadge.innerText = this.userLevel;
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
            this.powerBalance = d.powerBalance ?? 0;
            this.tonBalance = d.tonBalance ?? 0;
            this.userLevel = d.level ?? 1;
            this.isVerified = d.isVerified ?? false;
            this.hasClaimedWelcome = d.hasClaimedWelcome ?? false;
            this.hasStartedMining = d.hasStartedMining ?? false;
            this.miningActive = d.miningActive ?? false;
            this.miningStartTime = d.miningStartTime ?? null;
            this.miningEndTime = d.miningEndTime ?? null;
            this.pendingTonReward = d.pendingTonReward ?? 0;
            this.miningSessionHours = d.miningSessionHours ?? APP_CONFIG.MINING_SESSION_HOURS;
        } else {
            const startParam = this.tg.initDataUnsafe?.start_param;
            let referredBy = (startParam && !isNaN(startParam)) ? parseInt(startParam) : null;
            if (referredBy === this.tgUser.id || referredBy === this.deviceOwnerId) referredBy = null;
            await ref.set({
                id: this.tgUser.id,
                firebaseUid: this.auth.currentUser.uid,
                username: this.tgUser.username || '',
                firstName: this.tgUser.first_name || 'User',
                photoUrl: this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR,
                referredBy: referredBy,
                createdAt: await this.getServerTime(),
                miningSessionHours: APP_CONFIG.MINING_SESSION_HOURS,
                powerBalance: 0,
                tonBalance: 0,
                level: 1,
                isVerified: false,
                hasClaimedWelcome: false,
                hasStartedMining: false,
                miningActive: false,
                miningStartTime: null,
                miningEndTime: null,
                pendingTonReward: 0,
                totalReferrals: 0,
                verifiedReferrals: 0,
                referralPower: 0,
                referralTon: 0
            });
            
            const totalUsersRef = this.db.ref('Status/totalUsers');
            const currentTotal = (await totalUsersRef.once('value')).val() || 0;
            await totalUsersRef.set(currentTotal + 1);
            
            if (referredBy && referredBy !== this.tgUser.id) {
                const referrerRef = this.db.ref(`users/${referredBy}`);
                const referrerSnap = await referrerRef.once('value');
                if (referrerSnap.exists()) {
                    const currentTotal = referrerSnap.val().totalReferrals ?? 0;
                    await referrerRef.update({ totalReferrals: currentTotal + 1 });
                    
                    await this.db.ref(`referrals/${referredBy}/${this.tgUser.id}`).set({
                        userId: this.tgUser.id,
                        userName: this.tgUser.first_name,
                        userPhoto: this.tgUser.photo_url,
                        state: 'Not Verified',
                        joinedAt: await this.getServerTime()
                    });
                }
            }
        }
        const nameSpan = document.getElementById('user-name');
        if (nameSpan) nameSpan.innerText = this.tgUser.first_name || 'User';
        const levelSpan = document.getElementById('user-level');
        if (levelSpan) levelSpan.innerText = this.userLevel;
        const levelBadge = document.getElementById('user-level-badge');
        if (levelBadge) levelBadge.innerText = this.userLevel;
        const photoImg = document.getElementById('user-photo');
        if (photoImg) photoImg.src = this.tgUser.photo_url || APP_CONFIG.DEFAULT_USER_AVATAR;
    }
    
    async saveUserData() {
        if (!this.db) return;
        const updates = {};
        if (this.powerBalance !== undefined) updates.powerBalance = this.powerBalance;
        if (this.tonBalance !== undefined) updates.tonBalance = this.tonBalance;
        if (this.userLevel !== undefined) updates.level = this.userLevel;
        if (this.isVerified !== undefined) updates.isVerified = this.isVerified;
        if (this.hasClaimedWelcome !== undefined) updates.hasClaimedWelcome = this.hasClaimedWelcome;
        if (this.hasStartedMining !== undefined) updates.hasStartedMining = this.hasStartedMining;
        if (this.miningActive !== undefined) updates.miningActive = this.miningActive;
        if (this.miningStartTime !== undefined) updates.miningStartTime = this.miningStartTime;
        if (this.miningEndTime !== undefined) updates.miningEndTime = this.miningEndTime;
        if (this.pendingTonReward !== undefined) updates.pendingTonReward = this.pendingTonReward;
        if (this.miningSessionHours !== undefined) updates.miningSessionHours = this.miningSessionHours;
        await this.db.ref(`users/${this.tgUser.id}`).update(updates);
    }
    
    async loadCompletedTasks() {
        if (!this.db) {
            this.userCompletedTasks = new Set();
            return;
        }
        const snap = await this.db.ref(`users/${this.tgUser.id}/completedTasks`).once('value');
        this.userCompletedTasks = snap.exists() ? new Set(snap.val()) : new Set();
    }
    
    async loadWithdrawals() {
        if (!this.db) {
            this.withdrawals = [];
            return;
        }
        const snap = await this.db.ref(`withdrawals/${this.tgUser.id}`).once('value');
        this.withdrawals = [];
        if (snap.exists()) {
            snap.forEach(c => {
                this.withdrawals.push({ id: c.key, ...c.val() });
            });
            this.withdrawals.sort((a,b) => b.timestamp - a.timestamp);
        }
    }
    
    async loadReferralStats() {
        if (!this.db) {
            this.totalReferrals = 0;
            this.verifiedReferrals = 0;
            this.referralPower = 0;
            this.referralTon = 0;
            return;
        }
        const snap = await this.db.ref(`users/${this.tgUser.id}`).once('value');
        if (snap.exists()) {
            const d = snap.val();
            this.totalReferrals = d.totalReferrals ?? 0;
            this.verifiedReferrals = d.verifiedReferrals ?? 0;
            this.referralPower = d.referralPower ?? 0;
            this.referralTon = d.referralTon ?? 0;
        }
    }
    
    async loadPromoCodes() {
        if (!this.db) return;
        const snap = await this.db.ref('promoCodes').once('value');
        this.promoCodes = [];
        if (snap.exists()) {
            snap.forEach(c => {
                this.promoCodes.push({ code: c.key, ...c.val() });
            });
        }
    }
    
    async loadTasks() {
        if (!this.db) {
            this.mainTasks = [];
            this.partnerTasks = [];
            return;
        }
        const snap = await this.db.ref('tasks').once('value');
        this.mainTasks = [];
        this.partnerTasks = [];
        if (snap.exists()) {
            snap.forEach(c => {
                const task = { id: c.key, ...c.val() };
                if (task.category === 'main') this.mainTasks.push(task);
                else if (task.category === 'partner') this.partnerTasks.push(task);
            });
        }
        if (!this.mainTasks.length) {
            this.mainTasks = [
                { id: 'main_1', name: 'Join Telegram Channel', reward: 50, url: 'https://t.me/STARZ_NEW', verify: true, img: APP_CONFIG.BOT_AVATAR, category: 'main' },
                { id: 'main_2', name: 'Follow on Twitter', reward: 30, url: 'https://twitter.com', verify: false, img: APP_CONFIG.BOT_AVATAR, category: 'main' }
            ];
        }
        if (!this.partnerTasks.length) {
            this.partnerTasks = [
                { id: 'partner_1', name: 'Social Task 1', reward: 25, url: 'https://t.me/partner', verify: true, img: APP_CONFIG.BOT_AVATAR, category: 'partner' }
            ];
        }
    }
    
    renderMining() {
        const el = document.getElementById('mining-page');
        if (!el) return;
        const requiredPower = this.getRequiredPowerForLevel(this.userLevel + 1);
        const progress = Math.min((this.powerBalance / requiredPower) * 100, 100);
        const hourlyRate = this.getHourlyTonRate();
        const dailyRate = this.getDailyTonRate();
        const monthlyRate = this.getMonthlyTonRate();
        const nextLevelBonus = 50;
        
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
                    <div class="rate-stat"><div class="stat-label">${this.t('hourly')}</div><div class="stat-value">${hourlyRate.toFixed(8)} TON</div></div>
                    <div class="rate-stat"><div class="stat-label">${this.t('daily')}</div><div class="stat-value">${dailyRate.toFixed(8)} TON</div></div>
                    <div class="rate-stat"><div class="stat-label">${this.t('monthly')}</div><div class="stat-value">${monthlyRate.toFixed(8)} TON</div></div>
                </div>
                ${showMiningActive ? `<div class="mining-timer"><i class="fas fa-hourglass-half"></i> 00:00:00</div><div class="mining-note">${this.t('mining_note')}</div>` : ''}
                ${showStartButton ? `<button id="start-mining-btn" class="mining-action-btn"><i class="fas fa-play"></i> ${this.t('start_mining')}</button>` : ''}
                ${showClaimButton ? `<button id="claim-mining-btn" class="mining-claim-btn"><i class="fas fa-gift"></i> ${this.t('claim_reward')}</button>` : ''}
                ${showMiningActive ? `<div class="mining-note mining-active-note"><i class="fas fa-circle" style="color:#2ecc71;font-size:0.6rem"></i> ${this.t('mining_active')}</div>` : ''}
                ${showClaimButton ? `<div class="mining-note reward-ready"><i class="fas fa-gift" style="color:#f39c12"></i> ${this.t('reward_collect')}</div>` : ''}
            </div>
            <div class="level-progress">
                <div class="progress-header"><span>${this.t('level')} ${this.userLevel}</span><span>${this.formatNumber(Math.floor(this.powerBalance))} / ${this.formatNumber(requiredPower)} ${this.t('power')}</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                <div class="level-reward"><i class="fas fa-gift"></i> ${this.t('next_level_reward')}: ${nextLevelBonus} ${this.t('power')}</div>
            </div>
            <div class="earn-more-title"><i class="fas fa-chart-line"></i> ${this.t('earn_more')}</div>
            <div class="earn-cards">
                <div class="earn-card"><div class="earn-card-info"><h4>${this.t('watch_ad')}</h4><p>50 ${this.t('power')}</p></div><button id="mining-reward-ad" class="earn-card-btn">${this.t('watch')}</button></div>
                <div class="earn-card"><div class="earn-card-info"><h4>${this.t('complete_tasks')}</h4><p>${this.t('power')}</p></div><button id="go-tasks-btn" class="earn-card-btn">${this.t('go')}</button></div>
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
        
        const availableMainTasks = this.mainTasks.filter(t => !this.userCompletedTasks.has(t.id));
        const availablePartnerTasks = this.partnerTasks.filter(t => !this.userCompletedTasks.has(t.id));
        
        const mainTasksHtml = availableMainTasks.length > 0 ? availableMainTasks.map(t => `
            <div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> ${t.reward} ${this.t('power')}</div><div class="task-total"><i class="fas fa-users"></i> ${(t.total || 0)} users</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button></div>
        `).join('') : '<div class="no-data"><i class="fas fa-check-circle"></i><p>' + this.t('all_tasks_completed') + '</p><small>' + this.t('check_later') + '</small></div>';
        
        const partnerTasksHtml = availablePartnerTasks.length > 0 ? availablePartnerTasks.map(t => `
            <div class="task-item"><img class="task-img" src="${t.img}"><div class="task-info"><h4>${t.name}</h4><div class="task-reward"><i class="fas fa-bolt"></i> ${t.reward} ${this.t('power')}</div><div class="task-total"><i class="fas fa-users"></i> ${(t.total || 0)} users</div></div><button class="task-btn start" data-id="${t.id}" data-reward="${t.reward}" data-url="${t.url}" data-verify="${t.verify}">Start</button></div>
        `).join('') : '<div class="no-data"><i class="fas fa-globe"></i><p>' + this.t('no_tasks') + '</p><small>' + this.t('check_later') + '</small></div>';
        
        const promoCodesHtml = this.promoCodes.map(p => `
            <div class="promo-item"><div class="promo-code">${p.code}</div><div class="promo-reward">${p.power ? p.power + ' Power' : p.ton + ' TON'}</div><div class="promo-total"><i class="fas fa-users"></i> ${(p.total || 0)} users</div></div>
        `).join('');
        
        el.innerHTML = `
            <div class="promo-card"><div class="promo-title"><i class="fas fa-gift"></i> ${this.t('promo_code')}</div><div class="promo-input-group"><input type="text" id="promo-input" class="form-input" placeholder="${this.t('enter_code')}" autocomplete="off"><button id="promo-submit" class="promo-submit-btn" disabled>${this.t('claim')}</button></div></div>
            ${promoCodesHtml ? `<div class="promo-list"><h4>Available Codes</h4>${promoCodesHtml}</div>` : ''}
            
            <div class="section-header"><h3><i class="fas fa-star"></i> ${this.t('main_tasks')}</h3></div>
            <div class="tasks-list">${mainTasksHtml}</div>
            
            <div class="section-header"><h3><i class="fas fa-globe"></i> ${this.t('partner_tasks')} <button id="tasks-info-btn" class="info-icon-btn" style="margin-left:8px;background:none;border:none;color:var(--primary);cursor:pointer"><i class="fas fa-question-circle"></i></button></h3></div>
            <div class="tasks-list">${partnerTasksHtml}</div>
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
        
        document.querySelectorAll('.task-btn.start').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (this.isTaskRunning) {
                    this.showNotification('Busy', 'Complete current task first', 'warning');
                    return;
                }
                const id = btn.dataset.id, reward = parseInt(btn.dataset.reward), url = btn.dataset.url, verify = btn.dataset.verify === 'true';
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
                        newBtn.addEventListener('click', async () => {
                            newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                            newBtn.disabled = true;
                            await this.completeTask(id, reward, url, verify, newBtn);
                            newBtn.innerHTML = 'Done';
                            newBtn.classList.remove('check');
                            newBtn.classList.add('done');
                            newBtn.disabled = true;
                            newBtn.style.display = 'none';
                            this.isTaskRunning = false;
                            this.enableAllTaskButtons();
                            this.renderEarn();
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
            <div class="team-benefits"><h3><i class="fas fa-gift"></i> ${this.t('team_benefits')}</h3><div class="benefits-list"><div class="benefit-item"><i class="fas fa-coins"></i><div class="benefit-text">Earn 10% of your team members TON earnings</div></div><div class="benefit-item"><i class="fas fa-bolt"></i><div class="benefit-text">Get ${this.formatNumber(APP_CONFIG.REFERRAL_POWER_BONUS)} Power per verified member</div></div></div></div>
            <div class="referral-card"><h4><i class="fas fa-share-alt"></i> ${this.t('share_earn')}</h4><div class="link-display">${link}</div><div class="referral-buttons"><button id="copyLink"><i class="fas fa-copy"></i> ${this.t('copy')}</button><button id="shareLink"><i class="fab fa-telegram"></i> ${this.t('share')}</button></div></div>
            <div class="stats-grid"><div class="stat-mini"><span class="stat-label">${this.t('total_members')}</span><span class="stat-number">${this.totalReferrals}</span></div><div class="stat-mini"><span class="stat-label">${this.t('verified_members')}</span><span class="stat-number">${this.verifiedReferrals}</span></div><div class="stat-mini"><span class="stat-label">${this.t('power_earnings')}</span><span class="stat-number">${this.formatNumber(Math.floor(this.referralPower))}</span></div><div class="stat-mini"><span class="stat-label">${this.t('ton_earnings')}</span><span class="stat-number">${this.referralTon.toFixed(6)}</span></div></div>
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
`).join('') : '<div class="no-data">...</div>';
        
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
                amountInput.value = this.tonBalance.toFixed(6);
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
        
        const currentFlag = this.lang === 'en' ? '🇬🇧' : this.lang === 'es' ? '🇪🇸' : this.lang === 'fa' ? '🇮🇷' : this.lang === 'tr' ? '🇹🇷' : '🇸🇦';
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
        window.addEventListener('beforeunload', () => {
            if (this.miningActive) this.saveUserData();
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
        if (userLang.startsWith('es')) return 'es';
        if (userLang.startsWith('fa')) return 'fa';
        if (userLang.startsWith('tr')) return 'tr';
        if (userLang.startsWith('ar')) return 'ar';
        return 'en';
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.page;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                if (id === 'mining-page') this.renderMining();
                else if (id === 'earn-page') this.renderEarn();
                else if (id === 'team-page') this.renderTeam();
                else if (id === 'withdraw-page') this.renderWithdraw();
            });
        });
    }
    
    renderUI() {
        this.renderMining();
        this.renderEarn();
        this.renderTeam();
        this.renderWithdraw();
        this.updateModalTranslations();
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
