# 🎮 Multiplex Stream 4 Humanity

Application web pour regarder plusieurs streams Twitch simultanément pendant l'événement Stream 4 Humanity.

## ✨ Fonctionnalités

- 📺 Affichage de plusieurs streams en simultané (2, 4, 6 ou 9)
- 🔄 Récupération automatique des streams de la catégorie "Stream for Humanity"
- 👥 Liste des streamers triés par popularité
- 🎯 Sélection facile des streams à afficher
- 📱 Interface responsive
- 🔐 Configuration centralisée des credentials (pas besoin pour chaque utilisateur)

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm

### Étapes

1. Clonez ce repository
```bash
git clone <votre-repo>
cd "Multiplex S4H"
```

2. Installez les dépendances
```bash
npm install
```

3. Configurez vos credentials Twitch

Créez un fichier `.env` à la racine du projet (copiez `.env.example`) :
```bash
cp .env.example .env
```

Éditez le fichier `.env` et ajoutez vos credentials :
```
TWITCH_CLIENT_ID=votre_client_id
TWITCH_CLIENT_SECRET=votre_client_secret
PORT=3000
```

### Obtenir les credentials Twitch

1. Allez sur [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Cliquez sur "Register Your Application"
3. Remplissez :
   - **Name** : Multiplex S4H
   - **OAuth Redirect URLs** : `http://localhost:3000`
   - **Category** : Website Integration
4. Copiez votre **Client ID**
5. Cliquez sur "New Secret" pour générer votre **Client Secret**
6. Ajoutez ces valeurs dans votre fichier `.env`

## 🎬 Utilisation

1. Démarrez le serveur
```bash
npm start
```

2. Ouvrez votre navigateur sur `http://localhost:3000`

3. Les streams de la catégorie "Stream for Humanity" se chargent automatiquement

4. Cliquez sur les streamers pour les ajouter/retirer de la grille

5. Changez le layout selon vos préférences (2, 4, 6 ou 9 streams)

6. Profitez du Stream 4 Humanity ! 🎉

## 🛠️ Technologies

- **Backend** : Node.js, Express
- **Frontend** : HTML5, CSS3, JavaScript Vanilla
- **API** : Twitch Helix API
- **Player** : Twitch Embed Player

## 📂 Structure du projet

```
Multiplex S4H/
├── server.js           # Serveur backend Node.js
├── app.js              # Logique frontend
├── index.html          # Interface utilisateur
├── style.css           # Styles
├── package.json        # Dépendances npm
├── .env.example        # Template de configuration
├── .env                # Configuration (non versionné)
└── README.md           # Ce fichier
```

## 🔧 Développement

Pour le développement avec rechargement automatique :
```bash
npm run dev
```

## 📝 Licence

Libre d'utilisation pour Stream 4 Humanity et événements similaires.
