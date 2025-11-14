class TwitchMultiplex {
    constructor() {
        this.clientId = '';
        this.accessToken = '';
        this.gameId = null;
        this.streamers = [];
        this.selectedStreamers = [];
        this.maxStreams = 4;
        this.embeds = [];

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.setupCredentials();
        if (this.clientId && this.accessToken) {
            await this.loadStreamers();
        }
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadStreamers());
        document.getElementById('layoutSelect').addEventListener('change', (e) => {
            this.maxStreams = parseInt(e.target.value);
            this.updateLayout();
            this.updateStreamGrid();
        });
    }

    async setupCredentials() {
        // Check for credentials in localStorage
        this.clientId = localStorage.getItem('twitch_client_id');
        this.accessToken = localStorage.getItem('twitch_access_token');

        // If no credentials, prompt user
        if (!this.clientId || !this.accessToken) {
            this.showCredentialsModal();
        }
    }

    showCredentialsModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: var(--surface); padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%;">
                <h2 style="margin-bottom: 1rem; color: var(--primary-color);">Configuration Twitch API</h2>
                <p style="margin-bottom: 1rem; color: var(--text-muted);">
                    Pour utiliser cette application, vous devez créer une application Twitch :
                </p>
                <ol style="margin-bottom: 1rem; padding-left: 1.5rem; color: var(--text-muted); line-height: 1.6;">
                    <li>Allez sur <a href="https://dev.twitch.tv/console/apps" target="_blank" style="color: var(--primary-color);">dev.twitch.tv/console/apps</a></li>
                    <li>Créez une nouvelle application</li>
                    <li>Copiez le Client ID</li>
                    <li>Générez un Client Secret et obtenez un Access Token</li>
                </ol>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Client ID:</label>
                    <input type="text" id="clientIdInput" placeholder="Votre Client ID"
                        style="width: 100%; padding: 0.5rem; background: var(--background); color: var(--text); border: 1px solid var(--border); border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Access Token:</label>
                    <input type="text" id="accessTokenInput" placeholder="Votre Access Token"
                        style="width: 100%; padding: 0.5rem; background: var(--background); color: var(--text); border: 1px solid var(--border); border-radius: 4px;">
                </div>
                <button id="saveCredentials" style="width: 100%; padding: 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Enregistrer et continuer
                </button>
                <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                    Vos credentials seront stockés localement dans votre navigateur.
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('saveCredentials').addEventListener('click', () => {
            const clientId = document.getElementById('clientIdInput').value.trim();
            const accessToken = document.getElementById('accessTokenInput').value.trim();

            if (clientId && accessToken) {
                localStorage.setItem('twitch_client_id', clientId);
                localStorage.setItem('twitch_access_token', accessToken);
                this.clientId = clientId;
                this.accessToken = accessToken;
                modal.remove();
                this.loadStreamers();
            } else {
                alert('Veuillez remplir tous les champs');
            }
        });
    }

    async getGameId() {
        try {
            const response = await fetch('https://api.twitch.tv/helix/games?name=Stream for Humanity', {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération du game ID');
            }

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                this.gameId = data.data[0].id;
                return this.gameId;
            } else {
                console.warn('Catégorie "Stream for Humanity" non trouvée');
                return null;
            }
        } catch (error) {
            console.error('Erreur getGameId:', error);
            return null;
        }
    }

    async loadStreamers() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');

        loading.style.display = 'block';
        error.style.display = 'none';

        try {
            // Get game ID first
            if (!this.gameId) {
                await this.getGameId();
            }

            if (!this.gameId) {
                throw new Error('Impossible de trouver la catégorie Stream for Humanity');
            }

            // Get streams
            const response = await fetch(`https://api.twitch.tv/helix/streams?game_id=${this.gameId}&first=100`, {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('twitch_client_id');
                    localStorage.removeItem('twitch_access_token');
                    throw new Error('Credentials invalides. Veuillez les reconfigurer.');
                }
                throw new Error('Erreur lors de la récupération des streams');
            }

            const data = await response.json();
            this.streamers = data.data.sort((a, b) => b.viewer_count - a.viewer_count);

            this.displayStreamers();

            // Auto-select top streamers if none selected
            if (this.selectedStreamers.length === 0 && this.streamers.length > 0) {
                this.selectedStreamers = this.streamers.slice(0, this.maxStreams).map(s => s.user_login);
                this.updateStreamGrid();
            }

        } catch (err) {
            console.error('Erreur:', err);
            error.style.display = 'block';
            error.querySelector('p').textContent = '⚠️ ' + err.message;

            if (err.message.includes('Credentials')) {
                setTimeout(() => this.showCredentialsModal(), 2000);
            }
        } finally {
            loading.style.display = 'none';
        }
    }

    displayStreamers() {
        const container = document.getElementById('streamers');
        container.innerHTML = '';

        this.streamers.forEach(streamer => {
            const item = document.createElement('div');
            item.className = 'streamer-item';
            if (this.selectedStreamers.includes(streamer.user_login)) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <img src="${streamer.thumbnail_url.replace('{width}', '50').replace('{height}', '50')}"
                     alt="${streamer.user_name}"
                     onerror="this.src='https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'">
                <div class="streamer-info">
                    <div class="streamer-name">${streamer.user_name}</div>
                    <div class="streamer-viewers">👁️ ${this.formatViewers(streamer.viewer_count)}</div>
                </div>
            `;

            item.addEventListener('click', () => this.toggleStreamer(streamer.user_login, item));
            container.appendChild(item);
        });
    }

    toggleStreamer(username, element) {
        const index = this.selectedStreamers.indexOf(username);

        if (index > -1) {
            this.selectedStreamers.splice(index, 1);
            element.classList.remove('selected');
        } else {
            if (this.selectedStreamers.length >= this.maxStreams) {
                alert(`Vous ne pouvez sélectionner que ${this.maxStreams} streams maximum. Changez le layout ou désélectionnez un stream.`);
                return;
            }
            this.selectedStreamers.push(username);
            element.classList.add('selected');
        }

        this.updateStreamGrid();
    }

    updateLayout() {
        const grid = document.getElementById('streamGrid');
        grid.className = `stream-grid layout-${this.maxStreams}`;
    }

    updateStreamGrid() {
        this.updateLayout();

        // Clear existing embeds
        this.embeds.forEach(embed => {
            if (embed && typeof embed.destroy === 'function') {
                try {
                    embed.destroy();
                } catch (e) {
                    console.warn('Error destroying embed:', e);
                }
            }
        });
        this.embeds = [];

        const grid = document.getElementById('streamGrid');
        grid.innerHTML = '';

        // Create containers for streams
        for (let i = 0; i < this.maxStreams; i++) {
            const container = document.createElement('div');
            container.className = 'stream-container';
            container.id = `stream-${i}`;

            if (i < this.selectedStreamers.length) {
                const username = this.selectedStreamers[i];
                const streamerData = this.streamers.find(s => s.user_login === username);
                const displayName = streamerData ? streamerData.user_name : username;

                // Create Twitch embed
                try {
                    const embed = new Twitch.Embed(`stream-${i}`, {
                        width: '100%',
                        height: '100%',
                        channel: username,
                        layout: 'video',
                        autoplay: true,
                        muted: i > 0, // Mute all except first stream
                        parent: [window.location.hostname || 'localhost']
                    });
                    this.embeds.push(embed);
                } catch (e) {
                    console.error('Error creating embed:', e);
                    container.innerHTML = `<div class="stream-placeholder">Erreur de chargement<br>${displayName}</div>`;
                }
            } else {
                container.innerHTML = '<div class="stream-placeholder">Sélectionnez un streamer →</div>';
            }

            grid.appendChild(container);
        }
    }

    formatViewers(count) {
        if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'k';
        }
        return count.toString();
    }
}

// Initialize app
const app = new TwitchMultiplex();
