# 💕 Luva — Love Games & Notes

A real-time multiplayer web app where couples can play fun games, keep score, and exchange love notes — even when they're apart.

![Luva](https://img.shields.io/badge/Built_with-💕-ff6b9d) ![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io)

## ✨ Features

- 🏠 **Room System** — Create a room, share a 6-character code, play together remotely
- 🎮 **4 Fun Games** — Tic Tac Toe, Memory Match, Rock Paper Scissors, Truth or Dare
- 🏆 **Leaderboard** — Track wins, view match history with timestamps
- 💌 **Love Notes** — Exchange sweet messages with mood emojis
- 🔄 **Auto-Reconnect** — Refreshing the page rejoins your room automatically
- 📱 **Mobile-First** — Fully responsive, touch-optimized, works on any device

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/luva.git
cd luva

# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

## 🎮 How to Play

1. **Player 1**: Click "Create a Room" → enter your name → get a room code
2. **Share the code** with your partner (copy, text, or use the Share button)
3. **Player 2**: Click "Join a Room" → enter the code + your name
4. **Play games**, track scores, and send love notes! 💕

## 🌐 Playing Over the Internet

To play with someone on a different network:

```bash
# Option 1: Use ngrok for a public URL
npx ngrok http 3000

# Option 2: Deploy to a cloud platform (Render, Railway, Fly.io, etc.)
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js + Express |
| Real-time | Socket.IO |
| Database | SQLite (sql.js) |
| Frontend | Vanilla HTML/CSS/JS |

## 📁 Project Structure

```
luva/
├── server.js          # Express + Socket.IO server
├── database.js        # SQLite persistence layer
├── package.json
└── public/
    ├── index.html     # Multiplayer UI
    ├── styles.css     # Design system
    └── app.js         # Socket.IO client
```

## 📄 License

MIT — made with 💕
