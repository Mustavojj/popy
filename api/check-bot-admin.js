export default async function handler(req, res) {
    const { chatId } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatAdministrators?chat_id=${chatId}`);
    const data = await response.json();
    const isAdmin = data.result?.some(admin => admin.user?.is_bot && admin.user?.username === 'Strzzbot');
    res.json({ isAdmin });
}
