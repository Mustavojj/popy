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
        
        const message = `🎉 *Welcome to STAR BUZZ!* 🎉\n\nEarn TON and STAR by completing tasks and inviting friends!\n\n🌟 Start your journey now!`;
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: userId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{
                        text: "🚀 Start App",
                        url: `https://t.me/${BOT_USERNAME}?start=welcome`
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
