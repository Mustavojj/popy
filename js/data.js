export const APP_CONFIG = {
    APP_NAME: "STAR Z",
    BOT_USERNAME: "Strzzbot",
    BOT_WALLET: "UQCDl6ZDEWWmowrfUUL31Z837jdg3zvGQgTE9djjAcvSXxcg",
    MINIMUM_WITHDRAW: 0.05,
    REFERRAL_BONUS_TON: 0.01,
    REFERRAL_BONUS_POP: 2,
    REFERRAL_PERCENTAGE: 0,
    REFERRAL_REQUIRED_TASKS: 3,
    MAX_DAILY_ADS: 20,
    AD_COOLDOWN: 180000,
    WATCH_AD_REWARD: 0.001,
    REQUIRED_TASKS_FOR_WITHDRAWAL: 5,
    REQUIRED_REFERRALS_FOR_WITHDRAWAL: 0,
    REQUIRED_POP_FOR_WITHDRAWAL: 20,
    DEFAULT_USER_AVATAR: "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png",
    BOT_AVATAR: "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png",
    DEPOSIT_WALLET: "UQCDl6ZDEWWmowrfUUL31Z837jdg3zvGQgTE9djjAcvSXxcg",
    POP_PER_TON: 1000,
    MIN_EXCHANGE_TON: 0.01,
    TASK_PRICE_PER_100_COMPLETIONS: 200,
    SOCIAL_TASK_REWARD: 0.001,
    SOCIAL_TASK_POP_REWARD: 1,
    IN_APP_AD_INTERVAL: 60000,
    INITIAL_AD_DELAY: 30000,
    WITHDRAWAL_LIMIT_PER_DAY: 1,
    NEWS_CHANNEL_LINK: "https://t.me/POP_BUZZ",
    NEWS_TASK_REWARD: 0.002,
    DAILY_CHECKIN_REWARD: 0.002,
    REQUIRED_PROMO_CODE_CHANNEL: "https://t.me/POP_BUZZ",
    PROMO_CODE_REQUIRED_CHECK: false,
    MAINTENANCE_MODE: false,
};

export const CORE_CONFIG = {
    CACHE_TTL: 300000,
    RATE_LIMITS: {
        'task_start': { limit: 1, window: 3000 },
        'withdrawal': { limit: 1, window: 86400000 },
        'promo_code': { limit: 5, window: 300000 },
        'exchange': { limit: 3, window: 3600000 }
    },
    NOTIFICATION_COOLDOWN: 2000,
    MAX_NOTIFICATION_QUEUE: 3,
    AD_COOLDOWN: 180000,
    INITIAL_AD_DELAY: 30000,
    INTERVAL_AD_DELAY: 60000
};

export const FEATURES_CONFIG = {
    TASK_VERIFICATION_DELAY: 10,
    REFERRAL_BONUS_TON: 0.01,
    REFERRAL_BONUS_POP: 10,
    REFERRAL_PERCENTAGE: 0,
    REFERRALS_PER_PAGE: 5
};

export const THEME_CONFIG = {
    GOLDEN_THEME: {
        background: "#0a1a0f",
        cardBg: "rgba(30, 50, 35, 0.65)",
        cardBgSolid: "#1e3223",
        textPrimary: "#ffffff",
        textSecondary: "#d5f5e3",
        textLight: "#a9dfbf",
        primaryColor: "#2ecc71",
        secondaryColor: "#82e0aa",
        accentColor: "#a9dfbf",
        tonColor: "#2ecc71",
        popColor: "#58d68d"
    }
};
