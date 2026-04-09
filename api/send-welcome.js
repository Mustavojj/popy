export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId, firstName, username } = req.body;
        
        if (!userId) {
            return res.status(200).json({ success: false });
        }
        
        const BOT_TOKEN = process.env.BOT_TOKEN;
        
        if (!BOT_TOKEN) {
            return res.status(200).json({ success: false });
        }
        
        const message = `🎉 *Welcome to STAR BUZZ!* 🎉\n\nEarn TON and STAR by completing tasks and inviting friends!\n\n🌟 Start your journey now!`;
        
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
                        web_app: { url: "https://t.me/Strzzbot/star" }
                    }]]
                }
            })
        });
        
        res.status(200).json({ success: true });
        
    } catch (error) {
        res.status(200).json({ success: false });
    }
}
