export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId, firstName, username } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        
        const BOT_TOKEN = process.env.BOT_TOKEN;
        const BOT_USERNAME = "Strzzbot";
        
        if (!BOT_TOKEN) {
            return res.status(500).json({ success: false, error: 'BOT_TOKEN not configured' });
        }
        
        const message = `<tg-emoji emoji-id="5258332798409783582">🚀</tg-emoji> <b>Welcome to STARS BUZZ!\n\n<tg-emoji emoji-id="6030445631921721471">🤑</tg-emoji> Complete tasks to earn rewards\n\n<tg-emoji emoji-id="6028171274939797252">👫</tg-emoji> Invite friends for bonus rewards\n\n<tg-emoji emoji-id="6030445631921721471">✅</tg-emoji> Get real users for your tasks\n\n<tg-emoji emoji-id="5116406862538867511">⚡</tg-emoji> Start your journey now!</b> `;
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: userId,
                text: message,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{
                        text: "GET NEWS 📉",
                        url: `https://t.me/POP_BUZZ`
                    }]]
                }
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(200).json({ success: false, error: data.description });
        }
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
