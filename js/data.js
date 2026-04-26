export const APP_CONFIG = {
    APP_NAME: "Star Farmer",
    BOT_USERNAME: "Strzzbot",
    BOT_WALLET: "UQCDl6ZDEWWmowrfUUL31Z837jdg3zvGQgTE9djjAcvSXxcg",
    MINIMUM_WITHDRAW: 0.05,
    REFERRAL_PERCENTAGE: 10,
    REFERRAL_BONUS: 0.01,
    EXCHANGE_RATE: 1000,
    MINING_SESSION_HOURS: 6,
    DEFAULT_USER_AVATAR: "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png",
    BOT_AVATAR: "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png",
    MINING_PLANS: {
        free: { name: "Free Farm", price: 0, hourlyRate: 5, durationDays: 20, image: "https://i.ibb.co/DPzr86bw/1777227682124.png" },
        silver: { name: "Silver Barn", price: 0.5, hourlyRate: 10, durationDays: 30, image: "https://i.ibb.co/8DKJDmFM/1777227757985.png" },
        gold: { name: "Gold Coop", price: 1, hourlyRate: 25, durationDays: 25, image: "https://i.ibb.co/0R7scpqd/1777227764100.png" },
        diamond: { name: "Diamond Ranch", price: 5, hourlyRate: 50, durationDays: 50, image: "https://i.ibb.co/Y7n4G91v/1777227803619.png" }
    },
    TASK_PRICE_PER_100_COMPLETIONS: 100,
    WITHDRAWAL_LIMIT_PER_DAY: 1,
    MAINTENANCE_MODE: false,
};

export const CORE_CONFIG = {
    CACHE_TTL: 300000,
    NOTIFICATION_COOLDOWN: 2000,
    MAX_NOTIFICATION_QUEUE: 3,
};
