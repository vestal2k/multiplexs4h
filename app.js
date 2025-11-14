class TwitchMultiplex {
    constructor() {
        this.streamers = [];
        this.selectedStreamers = [];
        this.maxStreams = 4;
        this.embeds = [];
        this.embedPlayers = new Map();
        this.apiBaseUrl = window.location.origin;
        this.sidebarVisible = true;
        this.focusedStreamIndex = null;

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
        document.getElementById('toggleSidebar').addEventListener('click', () => this.toggleSidebar());
    }

    toggleSidebar() {
        this.sidebarVisible = !this.sidebarVisible;
        const sidebar = document.getElementById('streamerList');
        const grid = document.getElementById('streamGrid');
        const toggleBtn = document.getElementById('toggleSidebar');

        if (this.sidebarVisible) {
            sidebar.classList.remove('hidden');
            grid.classList.remove('sidebar-hidden');
            toggleBtn.classList.remove('sidebar-hidden');
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
            `;
        } else {
            sidebar.classList.add('hidden');
            grid.classList.add('sidebar-hidden');
            toggleBtn.classList.add('sidebar-hidden');
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            `;
        }
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
        error.querySelector('p').innerHTML = 'Le serveur n\'est pas configuré.<br>Contactez l\'administrateur pour configurer les credentials Twitch.';
    }

    showBackendError() {
        const error = document.getElementById('error');
        error.style.display = 'block';
        error.querySelector('p').innerHTML = 'Impossible de se connecter au serveur.<br>Assurez-vous que le serveur est démarré avec <code>npm start</code>';
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
            error.querySelector('p').textContent = err.message;
        } finally {
            loading.style.display = 'none';
        }
    }

    displayStreamers() {
        const container = document.getElementById('streamers');
        const countElement = document.getElementById('streamerCount');
        container.innerHTML = '';

        countElement.textContent = this.streamers.length;

        if (this.streamers.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem; text-align: center;">Aucun stream disponible</p>';
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
                    <div class="streamer-viewers">
                        <span class="viewer-dot"></span>
                        ${this.formatViewers(streamer.viewer_count)}
                    </div>
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
                return;
            }
            this.selectedStreamers.push(username);
            element.classList.add('selected');
        }

        this.updateStreamGrid();
    }

    updateLayout() {
        const grid = document.getElementById('streamGrid');
        if (this.focusedStreamIndex !== null) {
            grid.className = `stream-grid focus-mode ${this.sidebarVisible ? '' : 'sidebar-hidden'}`;
        } else {
            grid.className = `stream-grid layout-${this.maxStreams} ${this.sidebarVisible ? '' : 'sidebar-hidden'}`;
        }
    }

    toggleFocus(streamIndex) {
        if (this.focusedStreamIndex === streamIndex) {
            // Exit focus mode
            this.focusedStreamIndex = null;
        } else {
            // Enter focus mode
            this.focusedStreamIndex = streamIndex;
        }
        this.updateLayout();
        this.updateStreamVisibility();
        this.updateFocusButtons();
    }

    updateFocusButtons() {
        document.querySelectorAll('.focus-btn').forEach((btn, index) => {
            if (this.focusedStreamIndex === index) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateStreamVisibility() {
        const containers = document.querySelectorAll('.stream-container');
        containers.forEach((container, index) => {
            if (this.focusedStreamIndex !== null) {
                // Focus mode: only show focused stream
                if (index === this.focusedStreamIndex) {
                    container.classList.add('active', 'focused');
                } else {
                    container.classList.remove('active', 'focused');
                }
            } else {
                // Normal mode: show all streams
                if (index < this.selectedStreamers.length) {
                    container.classList.add('active');
                    container.classList.remove('focused');
                } else {
                    container.classList.remove('active', 'focused');
                }
            }
        });
    }

    toggleAudio(streamIndex) {
        // Mute all streams except the selected one
        this.embedPlayers.forEach((player, index) => {
            if (player && typeof player.setMuted === 'function') {
                player.setMuted(index !== streamIndex);
            }
        });

        // Update button states
        document.querySelectorAll('.audio-btn').forEach((btn, index) => {
            if (index === streamIndex) {
                btn.classList.add('active');
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M18.07 5.93a9 9 0 0 1 0 12.73" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
            } else {
                btn.classList.remove('active');
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
            }
        });
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
        this.embedPlayers.clear();

        const grid = document.getElementById('streamGrid');
        grid.innerHTML = '';

        // Create containers for streams first
        for (let i = 0; i < this.maxStreams; i++) {
            const container = document.createElement('div');
            container.className = 'stream-container';
            container.id = `stream-${i}`;

            if (i >= this.selectedStreamers.length) {
                container.innerHTML = '<div class="stream-placeholder">Sélectionnez un streamer</div>';
            }

            grid.appendChild(container);
        }

        this.updateStreamVisibility();

        // Then create embeds after containers are in the DOM
        setTimeout(() => {
            for (let i = 0; i < this.selectedStreamers.length && i < this.maxStreams; i++) {
                const username = this.selectedStreamers[i];
                const streamerData = this.streamers.find(s => s.user_login === username);
                const displayName = streamerData ? streamerData.user_name : username;
                const viewerCount = streamerData ? streamerData.viewer_count : 0;

                const container = document.getElementById(`stream-${i}`);
                if (!container) continue;

                // Add overlay controls
                const overlay = document.createElement('div');
                overlay.className = 'stream-overlay';
                overlay.innerHTML = `
                    <div class="stream-info">
                        <div class="stream-title">${displayName}</div>
                        <div class="stream-viewers">
                            <span class="viewer-dot"></span>
                            ${this.formatViewers(viewerCount)}
                        </div>
                    </div>
                    <div class="stream-controls">
                        <button class="stream-btn audio-btn" data-index="${i}" title="Son">
                            <svg viewBox="0 0 24 24">
                                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="stream-btn focus-btn" data-index="${i}" title="Focus">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                `;
                container.appendChild(overlay);

                try {
                    const embed = new Twitch.Embed(`stream-${i}`, {
                        width: '100%',
                        height: '100%',
                        channel: username,
                        layout: 'video',
                        autoplay: true,
                        muted: i > 0,
                        parent: [window.location.hostname || 'localhost']
                    });
                    this.embeds.push(embed);

                    // Store player reference when ready
                    embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
                        const player = embed.getPlayer();
                        this.embedPlayers.set(i, player);
                    });

                } catch (e) {
                    console.error('Error creating embed:', e);
                    container.innerHTML = `<div class="stream-placeholder">Erreur de chargement<br>${displayName}</div>`;
                }
            }

            // Attach event listeners to overlay buttons
            setTimeout(() => {
                document.querySelectorAll('.audio-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        this.toggleAudio(index);
                    });
                });

                document.querySelectorAll('.focus-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        this.toggleFocus(index);
                    });
                });
            }, 500);

        }, 100);
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
