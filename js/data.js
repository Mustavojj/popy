export const APP_CONFIG = {
    APP_NAME: "STAR Z",
    BOT_USERNAME: "Strzzbot",
    BOT_WALLET: "UQCDl6ZDEWWmowrfUUL31Z837jdg3zvGQgTE9djjAcvSXxcg",
    MINIMUM_WITHDRAW: 0.05,
    REFERRAL_PERCENTAGE: 10,  // نسبة أرباح الإحالات
    REFERRAL_BONUS: 0.01,     // مكافأة تفعيل الخطة المجانية
    EXCHANGE_RATE: 1000,      // 1000 Egg = 1 TON
    
    // خطط التعدين
    MINING_PLANS: {
        free: { name: "Free", price: 0, hourlyRate: 5, durationDays: 20, image: "https://i.ibb.co/DPzr86bw/1777227682124.png" },
        silver: { name: "Silver", price: 0.5, hourlyRate: 10, durationDays: 30, image: "https://i.ibb.co/8DKJDmFM/1777227757985.png" },
        gold: { name: "Gold", price: 1, hourlyRate: 25, durationDays: 25, image: "https://i.ibb.co/0R7scpqd/1777227764100.png" },
        diamond: { name: "Diamond", price: 5, hourlyRate: 50, durationDays: 50, image: "https://i.ibb.co/Y7n4G91v/1777227803619.png" }
    },
    
    MINING_SESSION_HOURS: 6,   // مدة جلسة التعدين (ساعات)
    DEFAULT_USER_AVATAR: "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png",
    BOT_AVATAR: "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png",
    DEPOSIT_WALLET: "UQCDl6ZDEWWmowrfUUL31Z837jdg3zvGQgTE9djjAcvSXxcg",
    POP_PER_TON: 1000,
    MIN_EXCHANGE_TON: 0.01,
    TASK_PRICE_PER_100_COMPLETIONS: 100,
    WITHDRAWAL_LIMIT_PER_DAY: 1,
    NEWS_CHANNEL_LINK: "https://t.me/STARZ_NEW",
    MAINTENANCE_MODE: false,
};

export const CORE_CONFIG = {
    CACHE_TTL: 300000,
    RATE_LIMITS: {
        'task_start': { limit: 1, window: 3000 },
        'withdrawal': { limit: 1, window: 86400000 },
        'exchange': { limit: 3, window: 3600000 },
        'plan_buy': { limit: 1, window: 5000 }
    },
    NOTIFICATION_COOLDOWN: 2000,
    MAX_NOTIFICATION_QUEUE: 3,
};

export const THEME_CONFIG = {
    DAY_MODE: {
        background: "#FFF8E7",
        cardBg: "rgba(255, 248, 225, 0.85)",
        cardBgSolid: "#FFF0D4",
        textPrimary: "#3D2B1F",
        textSecondary: "#5D4037",
        textLight: "#8D6E63",
        primaryColor: "#7CB342",
        secondaryColor: "#C0CA33",
        accentColor: "#FFB74D",
        tonColor: "#26A69A",
        popColor: "#FFA726",
        skyGradient: "linear-gradient(135deg, #87CEEB 0%, #E0F6FF 100%)"
    },
    NIGHT_MODE: {
        background: "#1a2a3a",
        cardBg: "rgba(30, 40, 50, 0.85)",
        cardBgSolid: "#1e2a36",
        textPrimary: "#E0E0E0",
        textSecondary: "#B0BEC5",
        textLight: "#78909C",
        primaryColor: "#43A047",
        secondaryColor: "#66BB6A",
        accentColor: "#FFA726",
        tonColor: "#4DB6AC",
        popColor: "#FFB74D",
        skyGradient: "linear-gradient(135deg, #0D1B2A 0%, #1B2B40 100%)"
    }
};
