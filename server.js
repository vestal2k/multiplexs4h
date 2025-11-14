const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Cache pour le token d'accès et le game ID
let cachedAccessToken = null;
let tokenExpiry = null;
let cachedGameId = null;

// Fonction pour obtenir un token d'accès
async function getAccessToken() {
    // Si on a un token en cache et qu'il n'est pas expiré, on le retourne
    if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET doivent être définis dans le fichier .env');
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
        // Le token expire généralement après quelques heures, on le met en cache pour 1 heure
        tokenExpiry = Date.now() + (3600 * 1000);

        return cachedAccessToken;
    } catch (error) {
        console.error('Erreur getAccessToken:', error);
        throw error;
    }
}

// Fonction pour récupérer le Game ID de "Stream for Humanity"
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

// Route pour récupérer les streams
app.get('/api/streams', async (req, res) => {
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

        // Trier par nombre de viewers
        const sortedStreams = data.data.sort((a, b) => b.viewer_count - a.viewer_count);

        res.json({ success: true, data: sortedStreams });
    } catch (error) {
        console.error('Erreur /api/streams:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route de santé pour vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Serveur backend fonctionnel',
        configured: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
    });
});

// Route pour la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📺 Ouvrez http://localhost:${PORT} dans votre navigateur`);

    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        console.warn('⚠️  ATTENTION: Les credentials Twitch ne sont pas configurés !');
        console.warn('   Créez un fichier .env avec TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET');
    } else {
        console.log('✅ Credentials Twitch configurés');
    }
});
