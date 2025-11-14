class TwitchMultiplex {
    constructor() {
        this.streamers = [];
        this.selectedStreamers = [];
        this.maxStreams = 4;
        this.embeds = [];
        this.apiBaseUrl = window.location.origin;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkBackendHealth();
        await this.loadStreamers();
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadStreamers());
        document.getElementById('layoutSelect').addEventListener('change', (e) => {
            this.maxStreams = parseInt(e.target.value);
            this.updateLayout();
            this.updateStreamGrid();
        });
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`);
            const data = await response.json();

            if (!data.configured) {
                this.showConfigurationWarning();
            }
        } catch (error) {
            console.error('Erreur de connexion au backend:', error);
            this.showBackendError();
        }
    }

    showConfigurationWarning() {
        const error = document.getElementById('error');
        error.style.display = 'block';
        error.querySelector('p').innerHTML = '⚠️ Le serveur n\'est pas configuré.<br>Contactez l\'administrateur pour configurer les credentials Twitch.';
    }

    showBackendError() {
        const error = document.getElementById('error');
        error.style.display = 'block';
        error.querySelector('p').innerHTML = '⚠️ Impossible de se connecter au serveur.<br>Assurez-vous que le serveur est démarré avec <code>npm start</code>';
    }

    async loadStreamers() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');

        loading.style.display = 'block';
        error.style.display = 'none';

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/streams`);

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des streams');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Erreur inconnue');
            }

            this.streamers = data.data;
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
        } finally {
            loading.style.display = 'none';
        }
    }

    displayStreamers() {
        const container = document.getElementById('streamers');
        container.innerHTML = '';

        if (this.streamers.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem; text-align: center;">Aucun stream disponible pour le moment</p>';
            return;
        }

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
