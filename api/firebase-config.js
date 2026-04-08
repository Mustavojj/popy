export default async function handler(req, res) {
  const encrypted = Buffer.from(process.env.FIREBASE_CONFIG).toString('base64');
  res.json({ encrypted });
}
