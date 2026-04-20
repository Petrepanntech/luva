/* ============================================
   LUVA — Multiplayer Client Logic
   Socket.IO + Game Rendering
   ============================================ */

const socket = io();

// ---- Client State ----
let myId = null;       // 'p1' or 'p2'
let roomCode = null;
let roomData = null;   // { code, players, scores, history, notes }
let currentView = 'landing';
let currentTab = 'games';
let currentGame = null;
let gameState = null;
let selectedEmoji = '😊';
let selectedNoteMood = '💖';
let partnerOnline = false;

const SESSION_KEY = 'luva_session';

// ---- Session Persistence ----
function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, myId }));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

// ---- Helpers ----
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getPartnerId() {
  return myId === 'p1' ? 'p2' : 'p1';
}

function getMyPlayer() {
  return roomData?.players?.[myId] || { name: 'You', emoji: '😊' };
}

function getPartnerPlayer() {
  const pid = getPartnerId();
  return roomData?.players?.[pid] || { name: 'Partner', emoji: '😊' };
}

// ---- Toast ----
function showToast(message, icon = '💝') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---- Confetti ----
function burstConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#ff6b9d', '#c084fc', '#fbbf24', '#6ee7b7', '#fb7185', '#818cf8', '#ff8a65'];
  const emojis = ['💖', '✨', '🎉', '💕', '🌟', '💗', '🎊'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.textContent = Math.random() > 0.5 ? emojis[Math.floor(Math.random() * emojis.length)] : '●';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.fontSize = (Math.random() * 14 + 10) + 'px';
    piece.style.color = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 4000);
}

// ---- Floating Hearts ----
function createFloatingHearts() {
  const container = document.getElementById('floating-hearts');
  const hearts = ['💖', '💕', '💗', '💓', '💞', '💘', '❤️', '🩷', '🩵'];
  for (let i = 0; i < 12; i++) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.animationDuration = (Math.random() * 15 + 15) + 's';
    heart.style.animationDelay = Math.random() * 20 + 's';
    heart.style.fontSize = (Math.random() * 12 + 10) + 'px';
    container.appendChild(heart);
  }
}

// ---- Emoji Picker ----
function initEmojiPickers() {
  const emojis = ['😊', '😍', '🥰', '😎', '🤗', '😻', '🦋', '🌸', '🐻', '🦊', '🐰', '🌙'];
  ['create-emoji-picker', 'join-emoji-picker'].forEach(id => {
    const row = document.getElementById(id);
    if (!row) return;
    row.innerHTML = '';
    emojis.forEach(em => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-btn' + (em === '😊' ? ' selected' : '');
      btn.textContent = em;
      btn.addEventListener('click', () => {
        row.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = em;
      });
      row.appendChild(btn);
    });
  });
}

// ==============================
// VIEW MANAGEMENT
// ==============================
function showView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${viewName}`);
  if (el) el.classList.add('active');
}

// ==============================
// ROOM ACTIONS
// ==============================
function createRoom() {
  const name = document.getElementById('create-name').value.trim();
  if (!name) return showToast('Enter your name!', '⚠️');
  socket.emit('create-room', { name, emoji: selectedEmoji });
}

function joinRoom() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  const name = document.getElementById('join-name').value.trim();
  if (!code || !name) return showToast('Enter both code and name!', '⚠️');
  socket.emit('join-room', { code, name, emoji: selectedEmoji });
}

function copyRoomCode() {
  if (!roomCode) return;
  navigator.clipboard.writeText(roomCode).then(() => {
    showToast('Code copied!', '📋');
  }).catch(() => {
    // Fallback
    const input = document.createElement('input');
    input.value = roomCode;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Code copied!', '📋');
  });
}

function shareRoomCode() {
  if (navigator.share) {
    navigator.share({
      title: 'Join me on Luva! 💕',
      text: `Join my Luva room with code: ${roomCode}`,
      url: window.location.origin,
    }).catch(() => { });
  } else {
    copyRoomCode();
  }
}

function toggleRoomInfo() {
  const banner = document.getElementById('room-info-banner');
  banner.style.display = banner.style.display === 'none' ? 'flex' : 'none';
  document.getElementById('banner-code').textContent = roomCode;
}

function leaveRoom() {
  if (confirm('Leave this room? You can rejoin later with the code.')) {
    clearSession();
    roomCode = null;
    myId = null;
    roomData = null;
    currentGame = null;
    gameState = null;
    showView('landing');
    socket.disconnect();
    socket.connect();
  }
}

// ==============================
// RENDER MAIN APP
// ==============================
function renderApp() {
  renderHeader();
  renderScoreStrip();
  renderLeaderboard();
  renderNotesTimeline();
  setActiveTab(currentTab);
}

function renderHeader() {
  const me = getMyPlayer();
  const partner = getPartnerPlayer();
  if (myId === 'p1') {
    document.getElementById('header-p1').textContent = `${me.emoji} ${me.name} (you)`;
    document.getElementById('header-p2').textContent = `${partner.emoji} ${partner.name || '...'}`;
  } else {
    document.getElementById('header-p1').textContent = `${roomData.players.p1.emoji} ${roomData.players.p1.name}`;
    document.getElementById('header-p2').textContent = `${me.emoji} ${me.name} (you)`;
  }
  updateConnectionDot();
}

function updateConnectionDot() {
  const dot = document.getElementById('connection-dot');
  dot.className = 'connection-dot ' + (partnerOnline ? 'online' : 'offline');
  dot.title = partnerOnline ? 'Partner online' : 'Partner offline';
}

function renderScoreStrip() {
  if (!roomData) return;
  const strip = document.getElementById('score-strip');
  const p1 = roomData.players.p1;
  const p2 = roomData.players.p2;
  const s = roomData.scores;
  strip.innerHTML = `
    <div class="strip-player ${myId === 'p1' ? 'is-me' : ''}">
      <span>${p1.emoji}</span>
      <span>${p1.name}${myId === 'p1' ? ' (you)' : ''}</span>
      <span class="strip-score">${s.p1}</span>
    </div>
    <span class="strip-vs">vs</span>
    <div class="strip-player ${myId === 'p2' ? 'is-me' : ''}">
      <span>${p2?.emoji || '❓'}</span>
      <span>${p2?.name || '...'}${myId === 'p2' ? ' (you)' : ''}</span>
      <span class="strip-score">${s.p2}</span>
    </div>
  `;
}

// ---- Tabs ----
function setActiveTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(tab =>
    tab.classList.toggle('active', tab.dataset.tab === tabName)
  );
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === `tab-${tabName}`)
  );
}

// ==============================
// GAME MANAGEMENT
// ==============================
function startGame(gameType) {
  socket.emit('start-game', { gameType });
}

function closeGame() {
  socket.emit('close-game');
  currentGame = null;
  gameState = null;
  document.getElementById('games-list').style.display = 'block';
  document.getElementById('game-arena').style.display = 'none';
}

function showGameArena(gameType) {
  currentGame = gameType;
  document.getElementById('games-list').style.display = 'none';
  document.getElementById('game-arena').style.display = 'block';

  const titles = {
    tictactoe: '❌⭕ Tic Tac Toe',
    memory: '🧠 Memory Match',
    rps: '✂️ Rock Paper Scissors',
    truthdare: '🎭 Truth or Dare',
  };
  document.getElementById('arena-title').textContent = titles[gameType] || 'Game';
  renderGameArena();
}

function renderGameArena() {
  if (!currentGame || !gameState) return;
  switch (currentGame) {
    case 'tictactoe': renderTTT(); break;
    case 'memory': renderMemory(); break;
    case 'rps': renderRPS(); break;
    case 'truthdare': renderTOD(); break;
  }
}

// ==============================
// TIC TAC TOE RENDERER
// ==============================
function renderTTT() {
  const container = document.getElementById('arena-body');
  const s = gameState;
  const p1 = roomData.players.p1;
  const p2 = roomData.players.p2;
  const isMyTurn = s.currentPlayer === myId;
  const currentP = s.currentPlayer === 'p1' ? p1 : p2;

  let html = '';
  if (!s.gameOver) {
    if (isMyTurn) {
      html += `<p class="turn-indicator">✨ <strong>Your turn!</strong> Tap a cell</p>`;
    } else {
      html += `<p class="turn-indicator">⏳ Waiting for <strong>${currentP.name}</strong>...</p>`;
    }
  }

  html += '<div class="ttt-board">';
  s.board.forEach((cell, idx) => {
    const isWinner = s.winningCells && s.winningCells.includes(idx);
    const takenClass = cell ? 'taken' : '';
    const winClass = isWinner ? 'winner-cell' : '';
    const clickable = !s.gameOver && isMyTurn && !cell;
    let symbol = '';
    if (cell === 'p1') symbol = p1.emoji;
    else if (cell === 'p2') symbol = p2.emoji;
    html += `<button class="ttt-cell ${takenClass} ${winClass} ${clickable ? 'clickable' : ''}"
              ${clickable ? `onclick="tttMove(${idx})"` : ''}>${symbol}</button>`;
  });
  html += '</div>';

  if (s.gameOver) {
    if (s.winner === 'draw') {
      html += `<p class="game-result draw">It's a tie! You're both adorable 💕</p>`;
    } else if (s.winner === myId) {
      html += `<p class="game-result win">You won! 🎉🏆</p>`;
    } else {
      const wp = s.winner === 'p1' ? p1 : p2;
      html += `<p class="game-result win">${wp.emoji} ${wp.name} wins! 🎉</p>`;
    }
    html += `<button class="btn-play-again" onclick="startGame('tictactoe')">Play Again 🔄</button>`;
  }

  container.innerHTML = html;
}

function tttMove(idx) {
  socket.emit('ttt-move', { cell: idx });
}

// ==============================
// MEMORY MATCH RENDERER
// ==============================
function renderMemory() {
  const container = document.getElementById('arena-body');
  const s = gameState;
  const p1 = roomData.players.p1;
  const p2 = roomData.players.p2;
  const isMyTurn = s.currentPlayer === myId;

  let html = '';
  if (!s.gameOver) {
    const turnText = isMyTurn ? '✨ <strong>Your turn!</strong> Flip a card' :
      `⏳ Waiting for <strong>${(s.currentPlayer === 'p1' ? p1 : p2).name}</strong>...`;
    html += `<p class="turn-indicator">${turnText} &nbsp;|&nbsp; ${p1.emoji} ${s.scores.p1} - ${s.scores.p2} ${p2.emoji}</p>`;
  }

  html += '<div class="memory-board">';
  s.cards.forEach((emoji, idx) => {
    const isFlipped = s.flipped.includes(idx);
    const isMatched = s.matched.includes(idx);
    const flipClass = isFlipped || isMatched ? 'flipped' : '';
    const matchClass = isMatched ? 'matched' : '';
    const clickable = isMyTurn && !isFlipped && !isMatched && !s.gameOver && s.flipped.length < 2;
    html += `
      <div class="memory-card ${flipClass} ${matchClass} ${clickable ? 'clickable' : ''}"
           ${clickable ? `onclick="memFlip(${idx})"` : ''}>
        <div class="memory-card-inner">
          <div class="memory-card-back">💝</div>
          <div class="memory-card-front">${emoji}</div>
        </div>
      </div>`;
  });
  html += '</div>';

  if (s.gameOver) {
    if (s.winner === 'draw') {
      html += `<p class="game-result draw">It's a tie at ${s.scores.p1} pairs each! 💕</p>`;
    } else if (s.winner === myId) {
      html += `<p class="game-result win">You won with ${s.scores[myId]} pairs! 🎉🏆</p>`;
    } else {
      const wp = s.winner === 'p1' ? p1 : p2;
      html += `<p class="game-result win">${wp.emoji} ${wp.name} wins with ${s.scores[s.winner]} pairs! 🎉</p>`;
    }
    html += `<button class="btn-play-again" onclick="startGame('memory')">Play Again 🔄</button>`;
  }

  container.innerHTML = html;
}

function memFlip(idx) {
  socket.emit('memory-flip', { card: idx });
}

// ==============================
// ROCK PAPER SCISSORS RENDERER
// ==============================
function renderRPS() {
  const container = document.getElementById('arena-body');
  const s = gameState;
  const p1 = roomData.players.p1;
  const p2 = roomData.players.p2;
  const me = getMyPlayer();
  const partner = getPartnerPlayer();
  const choices = [
    { id: 'rock', emoji: '🪨', label: 'Rock' },
    { id: 'paper', emoji: '📄', label: 'Paper' },
    { id: 'scissors', emoji: '✂️', label: 'Scissors' },
  ];

  let html = '';
  const roundNum = s.rounds.length + (s.phase === 'reveal' ? 0 : 1);
  html += `<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">Best of ${s.bestOf} • Round ${Math.min(roundNum, s.bestOf)}</p>`;

  const p1Wins = s.rounds.filter(r => r === 'p1').length;
  const p2Wins = s.rounds.filter(r => r === 'p2').length;
  html += `<p style="font-size: 1rem; margin-bottom: 16px;">${p1.emoji} ${p1Wins} - ${p2Wins} ${p2.emoji}</p>`;

  if (s.phase === 'choosing') {
    if (s.myChoice) {
      // I've chosen, waiting for partner
      const myEmoji = choices.find(c => c.id === s.myChoice)?.emoji || '?';
      html += `<p class="turn-indicator">You picked ${myEmoji}</p>`;
      html += `<p class="rps-waiting">Waiting for ${partner.name}... ${s.partnerChosen ? '✅' : '⏳'}</p>`;
      html += '<div class="rps-choices">';
      choices.forEach(c => {
        const sel = c.id === s.myChoice ? 'selected' : 'dimmed';
        html += `<button class="rps-choice ${sel}" disabled>${c.emoji}</button>`;
      });
      html += '</div>';
    } else {
      // I haven't chosen yet
      html += `<p class="turn-indicator">✨ Pick your weapon!</p>`;
      if (s.partnerChosen) {
        html += `<p class="rps-waiting">${partner.name} is ready! 🫣</p>`;
      } else {
        html += `<p class="rps-waiting">Both pick at the same time!</p>`;
      }
      html += '<div class="rps-choices">';
      choices.forEach(c => {
        html += `<button class="rps-choice" onclick="rpsChoose('${c.id}')" title="${c.label}">${c.emoji}</button>`;
      });
      html += '</div>';
    }
  } else if (s.phase === 'reveal') {
    const p1Emoji = choices.find(c => c.id === s.p1Choice)?.emoji || '?';
    const p2Emoji = choices.find(c => c.id === s.p2Choice)?.emoji || '?';
    html += `<div class="rps-vs-display"><span>${p1Emoji}</span><span class="vs-text">vs</span><span>${p2Emoji}</span></div>`;

    if (s.roundResult === 'draw') {
      html += `<p class="game-result draw">This round is a tie!</p>`;
    } else if (s.roundResult === myId) {
      html += `<p class="game-result win">You won this round! 🎉</p>`;
    } else {
      html += `<p class="game-result win">${partner.emoji} ${partner.name} won this round!</p>`;
    }

    if (s.matchWinner) {
      if (s.matchWinner === 'draw') {
        html += `<p class="game-result draw" style="font-size:1.6rem; margin-top:12px;">The match is a draw! 💕</p>`;
      } else if (s.matchWinner === myId) {
        html += `<p class="game-result win" style="font-size:1.6rem; margin-top:12px;">🏆 You won the match!</p>`;
      } else {
        html += `<p class="game-result win" style="font-size:1.6rem; margin-top:12px;">🏆 ${partner.name} wins the match!</p>`;
      }
      html += `<button class="btn-play-again" onclick="startGame('rps')">Play Again 🔄</button>`;
    } else {
      html += `<button class="btn-play-again" onclick="rpsNextRound()">Next Round →</button>`;
    }
  }

  container.innerHTML = html;
}

function rpsChoose(choice) {
  socket.emit('rps-choose', { choice });
}

function rpsNextRound() {
  socket.emit('rps-next-round');
}

// ==============================
// TRUTH OR DARE RENDERER
// ==============================
function renderTOD() {
  const container = document.getElementById('arena-body');
  const s = gameState;
  const isMyTurn = s.currentPlayer === myId;
  const currentP = s.currentPlayer === 'p1' ? roomData.players.p1 : roomData.players.p2;

  let html = '<div class="tod-container">';
  if (isMyTurn) {
    html += `<p class="tod-who">✨ It's <strong>your</strong> turn!</p>`;
  } else {
    html += `<p class="tod-who">${currentP.emoji} <strong>${currentP.name}</strong>'s turn!</p>`;
  }

  if (!s.type) {
    html += `
      <div class="tod-card-display">
        <p class="prompt-text">${isMyTurn ? 'Choose your fate... 🎭' : `Waiting for ${currentP.name} to choose...`}</p>
      </div>`;
    if (isMyTurn) {
      html += `
        <div class="tod-buttons">
          <button class="btn-truth" onclick="todChoose('truth')">🤔 Truth</button>
          <button class="btn-dare" onclick="todChoose('dare')">🔥 Dare</button>
        </div>`;
    }
  } else {
    html += `
      <div class="tod-card-display">
        <p class="prompt-text">${s.prompt}</p>
      </div>
      <p style="margin: 8px 0; font-size: 0.85rem; color: var(--text-muted);">${s.type === 'truth' ? '🤔 Truth' : '🔥 Dare'}</p>`;
    if (isMyTurn) {
      html += `<button class="btn-done" onclick="todNext()">✓ Done — Next Player</button>`;
    } else {
      html += `<p class="rps-waiting">Waiting for ${currentP.name} to finish...</p>`;
    }
  }

  html += '</div>';
  container.innerHTML = html;
}

function todChoose(type) {
  socket.emit('tod-choose', { type });
}

function todNext() {
  socket.emit('tod-next');
}

// ==============================
// LEADERBOARD
// ==============================
function renderLeaderboard() {
  if (!roomData) return;
  const container = document.getElementById('leaderboard-content');
  const p1 = roomData.players.p1;
  const p2 = roomData.players.p2;
  const s = roomData.scores;
  const p1Leading = s.p1 > s.p2;
  const p2Leading = s.p2 > s.p1;

  let html = `
    <div class="score-overview">
      <div class="score-player ${p1Leading ? 'leading' : ''}">
        ${p1Leading ? '<span class="crown-icon">👑</span>' : ''}
        <span class="player-avatar">${p1.emoji}</span>
        <div class="player-name">${p1.name}${myId === 'p1' ? ' (you)' : ''}</div>
        <div class="player-score">${s.p1}</div>
        <div class="player-label">wins</div>
      </div>
      <div class="score-vs">vs</div>
      <div class="score-player ${p2Leading ? 'leading' : ''}">
        ${p2Leading ? '<span class="crown-icon">👑</span>' : ''}
        <span class="player-avatar">${p2?.emoji || '❓'}</span>
        <div class="player-name">${p2?.name || '...'}${myId === 'p2' ? ' (you)' : ''}</div>
        <div class="player-score">${s.p2}</div>
        <div class="player-label">wins</div>
      </div>
    </div>`;

  html += '<div class="score-history"><h3>Match History</h3>';
  if (!roomData.history || roomData.history.length === 0) {
    html += '<div class="no-history">No games played yet — go have fun! 🎮</div>';
  } else {
    html += '<div class="history-list">';
    roomData.history.forEach(item => {
      const time = new Date(item.played_at + 'Z');
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
      let winnerLabel, winnerClass;
      if (item.winner === 'p1') {
        winnerLabel = item.winner === myId ? `${p1.emoji} You` : `${p1.emoji} ${p1.name}`;
        winnerClass = 'p1';
      } else if (item.winner === 'p2') {
        winnerLabel = item.winner === myId ? `${p2?.emoji} You` : `${p2?.emoji} ${p2?.name}`;
        winnerClass = 'p2';
      } else {
        winnerLabel = 'Draw 🤝';
        winnerClass = 'draw';
      }
      html += `
        <div class="history-item">
          <div class="game-name">
            <span class="game-icon">${item.game_icon}</span>
            <span>${item.game_name}</span>
          </div>
          <span class="winner ${winnerClass}">${winnerLabel}</span>
          <span class="timestamp">${dateStr} ${timeStr}</span>
        </div>`;
    });
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ==============================
// LOVE NOTES
// ==============================
function renderNotesTimeline() {
  if (!roomData) return;
  const container = document.getElementById('notes-timeline');
  const notes = roomData.notes || [];
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="no-notes">
        <span class="empty-icon">💌</span>
        <p>No love notes yet... Send the first one!</p>
      </div>`;
    return;
  }

  let html = '';
  notes.forEach(note => {
    const isMine = note.from_player === myId;
    const cls = isMine ? 'from-me' : 'from-partner';
    const sender = isMine ? getMyPlayer() : getPartnerPlayer();
    const time = new Date(note.created_at + 'Z');
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

    html += `
      <div class="note-bubble ${cls}">
        <div class="note-inner">
          <p class="note-text">${escapeHtml(note.text)}</p>
          <div class="note-meta">
            <span class="note-sender">${sender.emoji} ${isMine ? 'You' : sender.name}</span>
            <span class="note-mood">${note.mood}</span>
            <span class="note-time">${dateStr} ${timeStr}</span>
            ${isMine ? `<button class="note-delete-btn" onclick="deleteNote(${note.id})" title="Delete">✕</button>` : ''}
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html;
}

function sendNote() {
  const textarea = document.getElementById('note-textarea');
  const text = textarea.value.trim();
  if (!text) return showToast('Write something sweet first!', '✍️');
  socket.emit('send-note', { text, mood: selectedNoteMood });
  textarea.value = '';
  showToast('Love note sent! 💌', '💝');
}

function deleteNote(noteId) {
  socket.emit('delete-note', { noteId });
}

function selectMood(emoji, btn) {
  selectedNoteMood = emoji;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ==============================
// SOCKET.IO EVENT HANDLERS
// ==============================

// Room created — show waiting screen
socket.on('room-created', (data) => {
  roomCode = data.code;
  myId = data.playerId;
  roomData = data.room;
  saveSession();
  document.getElementById('code-display-text').textContent = roomCode;
  showView('waiting');
  showToast('Room created! Share the code with your love 💕', '🏠');
});

// Room joined — go to playing
socket.on('room-joined', (data) => {
  roomCode = data.code;
  myId = data.playerId;
  roomData = data.room;
  partnerOnline = true;
  saveSession();
  showView('playing');
  renderApp();
  burstConfetti();
  showToast(`Joined ${roomData.players.p1.name}'s room! Let's play! 🎉`, '💕');
});

// Partner joined my room — go to playing
socket.on('partner-joined', (data) => {
  roomData = data.room;
  partnerOnline = true;
  showView('playing');
  renderApp();
  burstConfetti();
  showToast(`${roomData.players.p2.name} joined! Let the fun begin! 🎉`, '💕');
});

// Rejoined successfully
socket.on('rejoined', (data) => {
  roomCode = data.code;
  myId = data.playerId;
  roomData = data.room;
  partnerOnline = data.partnerConnected;
  saveSession();
  showView('playing');
  renderApp();

  if (data.currentGame) {
    showGameArena(data.currentGame);
  }

  showToast('Welcome back! 🔄', '💕');
});

// Rejoin failed
socket.on('rejoin-failed', () => {
  clearSession();
  showView('landing');
});

// Partner disconnected
socket.on('partner-disconnected', () => {
  partnerOnline = false;
  updateConnectionDot();
  document.getElementById('disconnect-banner').style.display = 'flex';
  showToast('Partner disconnected...', '⏳');
});

// Partner reconnected
socket.on('partner-reconnected', () => {
  partnerOnline = true;
  updateConnectionDot();
  document.getElementById('disconnect-banner').style.display = 'none';
  showToast('Partner is back! 🎉', '💕');
});

// Game started
socket.on('game-started', (data) => {
  showGameArena(data.gameType);
});

// Game state update
socket.on('game-state', (data) => {
  currentGame = data.gameType;
  gameState = data.state;

  // Show arena if not visible
  if (document.getElementById('game-arena').style.display === 'none') {
    showGameArena(data.gameType);
  } else {
    renderGameArena();
  }

  // Confetti on wins
  if (gameState.gameOver && gameState.winner === myId) {
    burstConfetti();
  }
  if (gameState.matchWinner === myId) {
    burstConfetti();
  }
});

// Game closed (partner pressed back)
socket.on('game-closed', () => {
  currentGame = null;
  gameState = null;
  document.getElementById('games-list').style.display = 'block';
  document.getElementById('game-arena').style.display = 'none';
});

// Scores updated
socket.on('scores-updated', (data) => {
  if (roomData) {
    roomData.scores = data.scores;
    roomData.history = data.history;
    renderScoreStrip();
    renderLeaderboard();
  }
});

// Notes updated
socket.on('notes-updated', (data) => {
  if (roomData) {
    roomData.notes = data.notes;
    renderNotesTimeline();
  }
});

// Error
socket.on('error-msg', (data) => {
  showToast(data.message, '⚠️');
});

// Connection events
socket.on('connect', () => {
  console.log('🔌 Connected');
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected');
});

// ==============================
// INITIALIZATION
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  createFloatingHearts();
  initEmojiPickers();

  // Try to rejoin from session
  const session = loadSession();
  if (session && session.roomCode && session.myId) {
    socket.emit('rejoin', session);
  } else {
    showView('landing');
  }
});
