exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    
    try {
        const { action, channel, userId } = JSON.parse(event.body);
        const BOT_TOKEN = process.env.BOT_TOKEN;
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
        const data = await response.json();
        const isMember = ['member', 'administrator', 'creator'].includes(data.result?.status);
        
        return { statusCode: 200, headers, body: JSON.stringify({ isMember }) };
    } catch(err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
