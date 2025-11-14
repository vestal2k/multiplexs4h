export default function handler(req, res) {
    const configured = !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

    res.status(200).json({
        success: true,
        message: 'Serveur backend fonctionnel',
        configured: configured
    });
}
