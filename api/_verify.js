import crypto from 'crypto';

export async function verifyTelegram(initData, botToken) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let dataCheckString = '';
    for (const [key, value] of sortedParams) {
        dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);
    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    return computedHash === hash;
}
