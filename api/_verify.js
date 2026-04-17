import crypto from 'crypto';

export function verifyTelegramAuth(initData, botToken) {
    if (!initData) return null;
    
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) return null;
    
    params.delete('hash');
    params.sort();
    
    let dataCheckString = '';
    for (const [key, value] of params.entries()) {
        dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.trim();
    
    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken);
    const calculatedHash = crypto.createHmac('sha256', secret.digest())
        .update(dataCheckString)
        .digest('hex');
    
    if (calculatedHash !== hash) return null;
    
    const user = JSON.parse(params.get('user'));
    return user;
}
