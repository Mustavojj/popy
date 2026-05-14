export default function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ 
        success: true, 
        message: 'API works',
        method: req.method 
    });
}
