export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { action, userId, chatId, channel, planType, firstName, amount, wallet, time } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    
    if (!BOT_TOKEN) {
        return res.status(500).json({ error: 'BOT_TOKEN not configured' });
    }
    
    try {
        if (action === 'check_channel') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
            const data = await response.json();
            const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
            return res.json({ isMember });
        }
        
        if (action === 'check_bot_admin') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatAdministrators?chat_id=${chatId}`);
            const data = await response.json();
            const isAdmin = data.result?.some(admin => admin.user?.is_bot && admin.user?.username === 'Strzzbot');
            return res.json({ isAdmin });
        }
        
        if (action === 'verify_member') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
            const data = await response.json();
            const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
            return res.json({ isMember });
        }
        
        if (action === 'send_welcome') {
            const message = `<b>🚀 Welcome to Star Farmer!</b>\n\n🤑 Complete tasks to earn Eggs\n👫 Invite friends for 10% bonus\n✅ Start mining with Free plan\n⚡ Start your farming journey now!`;
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: userId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: "JOIN COMMUNITY 📢", url: "https://t.me/STARZ_NEW" }]]
                    }
                })
            });
            const data = await response.json();
            return res.json({ success: data.ok });
        }
        
        if (action === 'mining_stopped') {
            const message = `⏰ <b>Mining Session Stopped!</b>\n\nYour <b>${planType}</b> plan has finished its ${process.env.MINING_SESSION_HOURS || 6}-hour mining session.\n\n🔄 Return to Star Farmer and click <b>Start</b> to continue mining!`;
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'HTML' })
            });
            const data = await response.json();
            return res.json({ success: data.ok });
        }
        
        if (action === 'withdrawal_notification') {
            const message = `<b>🌟 Withdrawal Requested!</b>\n\n✦ Amount: <code>${amount}</code> <b>TON</b>\n✦ Wallet: <code>${wallet}</code>\n✦ Time: <code>${time}</code>\n\n<b>✓ Withdrawal will be processed within 24 hours.</b>`;
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'HTML' })
            });
            const data = await response.json();
            return res.json({ success: data.ok });
        }
        
        return res.status(400).json({ error: 'Invalid action' });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
