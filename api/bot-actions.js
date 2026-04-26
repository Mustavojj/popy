export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { action, userId, chatId, channel, planType, firstName } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    
    if (!BOT_TOKEN) {
        return res.status(500).json({ error: 'BOT_TOKEN not configured' });
    }
    
    try {
        // التحقق من العضوية في القناة
        if (action === 'check_channel') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
            const data = await response.json();
            const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
            return res.json({ isMember });
        }
        
        // التحقق من كون البوت أدمن
        if (action === 'check_bot_admin') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatAdministrators?chat_id=${chatId}`);
            const data = await response.json();
            const isAdmin = data.result?.some(admin => admin.user?.is_bot && admin.user?.username === 'Strzzbot');
            return res.json({ isAdmin });
        }
        
        // التحقق من عضوية المستخدم في مجموعة
        if (action === 'verify_member') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
            const data = await response.json();
            const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
            return res.json({ isMember });
        }
        
        // إرسال رسالة ترحيب
        if (action === 'send_welcome') {
            const message = `<b>🚀 Welcome to STARS BUZZ!</b>\n\n🤑 Complete tasks to earn rewards\n👫 Invite friends for bonus rewards\n✅ Get real users for your tasks\n⚡ Start your journey now!`;
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: userId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: "GET NEWS 📉", url: "https://t.me/STARZ_NEW" }]]
                    }
                })
            });
            const data = await response.json();
            return res.json({ success: data.ok });
        }
        
        // إرسال إشعار توقف التعدين
        if (action === 'mining_stopped') {
            const message = `⏰ <b>Mining Session Stopped!</b>\n\nYour <b>${planType}</b> plan has finished its ${process.env.MINING_SESSION_HOURS || 6}-hour mining session.\n\n🔄 Return to the app and click <b>Start</b> to continue mining!`;
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'HTML' })
            });
            const data = await response.json();
            return res.json({ success: data.ok });
        }
        
        // إرسال إشعار السحب
        if (action === 'withdrawal_notification') {
            const { amount, wallet, time } = req.body;
            const message = `<b>★ Your Withdrawal Requested!</b>\n\n✦ Amount: <code>${amount}</code> <b>TON</b>\n✦ Wallet: <code>${wallet}</code>\n✦ Time: <code>${time}</code>\n\n<b>☆ Withdrawal will be processed within 24 hours.</b>`;
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
