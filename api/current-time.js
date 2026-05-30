let cachedTime = null;
let lastFetch = 0;

export default async function handler(req, res) {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const lastMinute = Math.floor(lastFetch / 60000);
  
    if (lastMinute !== currentMinute) {
        cachedTime = now;
        lastFetch = now;
    }
    
    res.status(200).json({ serverTime: cachedTime || now });
}
