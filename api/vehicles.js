export default async function handler(req, res) {
    try {
        const response = await fetch('http://vc.mwrta.com/api/FR/0');
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(data);
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch from MWRTA API' });
    }
}
