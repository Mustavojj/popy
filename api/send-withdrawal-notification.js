export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId, amount, wallet, time, firstName, username } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        
        const BOT_TOKEN = process.env.BOT_TOKEN;
        
        if (!BOT_TOKEN) {
            return res.status(500).json({ success: false, error: 'BOT_TOKEN not configured' });
        }
        
        const message = `<b>★ Your Withdrawal Requested!</b>\n\n✦ Amount: <code>${amount}</code> <b>TON</b>\n✦ Wallet: <code>${wallet}</code>\n✦ Time: <code>${time}</code>\n\n<b>☆ Withdrawal will be processed within 24 hours.</b>`;
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: userId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(200).json({ success: false, error: data.description });
        }
        
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
