let cachedAccessToken = null;
let tokenExpiry = null;
let cachedGameId = null;

async function getAccessToken() {
    // Si on a un token en cache et qu'il n'est pas expiré, on le retourne
    if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET doivent être définis');
    }

    try {
        const response = await fetch(
            `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
            { method: 'POST' }
        );

        if (!response.ok) {
            throw new Error('Erreur lors de l\'obtention du token d\'accès');
        }

        const data = await response.json();
        cachedAccessToken = data.access_token;
        tokenExpiry = Date.now() + (3600 * 1000);

        return cachedAccessToken;
    } catch (error) {
        console.error('Erreur getAccessToken:', error);
        throw error;
    }
}

async function getGameId() {
    if (cachedGameId) {
        return cachedGameId;
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = await getAccessToken();

    try {
        const response = await fetch(
            'https://api.twitch.tv/helix/games?name=Stream for Humanity',
            {
                headers: {
                    'Client-ID': clientId,
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération du game ID');
        }

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            cachedGameId = data.data[0].id;
            return cachedGameId;
        } else {
            throw new Error('Catégorie "Stream for Humanity" non trouvée');
        }
    } catch (error) {
        console.error('Erreur getGameId:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const clientId = process.env.TWITCH_CLIENT_ID;
        const accessToken = await getAccessToken();
        const gameId = await getGameId();

        const response = await fetch(
            `https://api.twitch.tv/helix/streams?game_id=${gameId}&first=100`,
            {
                headers: {
                    'Client-ID': clientId,
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des streams');
        }

        const data = await response.json();
        const sortedStreams = data.data.sort((a, b) => b.viewer_count - a.viewer_count);

        res.status(200).json({ success: true, data: sortedStreams });
    } catch (error) {
        console.error('Erreur /api/streams:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
