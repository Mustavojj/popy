export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId, firstName, username } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        
        const BOT_TOKEN = process.env.BOT_TOKEN;
        const WELCOME_MESSAGE = process.env.WELCOME_MESSAGE || "🎉 *Welcome to STAR BUZZ!* 🎉\n\nEarn TON and STAR by completing tasks and inviting friends!\n\n🌟 Complete tasks to earn rewards\n👥 Invite friends for bonus\n💎 Exchange TON to STAR\n\nStart your journey now!";
        const WELCOME_BUTTON_TEXT = process.env.WELCOME_BUTTON_TEXT || "🚀 Start App";
        const WELCOME_BUTTON_URL = process.env.WELCOME_BUTTON_URL || "https://t.me/Strzzbot/star";
        
        const personalizedMessage = WELCOME_MESSAGE.replace('{firstName}', firstName || 'User').replace('{username}', username || '');
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: userId,
                text: personalizedMessage,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: WELCOME_BUTTON_TEXT,
                                web_app: { url: WELCOME_BUTTON_URL }
                            }
                        ]
                    ]
                }
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            res.status(200).json({ success: true, message: 'Welcome message sent' });
        } else {
            res.status(200).json({ success: false, error: data.description });
        }
        
    } catch (error) {
        res.status(200).json({ success: false, error: error.message });
    }
}
