export default async function handler(req, res) {
    const { chatId, userId } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
    const data = await response.json();
    const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
    res.json({ isMember });
}
