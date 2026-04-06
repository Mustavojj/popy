export default async function handler(req, res) {
    const { channel, userId } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
    const data = await response.json();
    res.json({ isMember: data.result?.status === 'member' });
}
