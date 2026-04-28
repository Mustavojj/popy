export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { action, userId, channel } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(500).json({ error: 'BOT_TOKEN not configured' });
    try {
        if (action === 'check_channel') {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
            const data = await response.json();
            const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
            return res.json({ isMember });
        }
        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
