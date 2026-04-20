/* ============================================
   LUVA — Love Games & Notes
   Application Logic
   ============================================ */

// ---- State Management ----
const AppState = {
  players: { p1: { name: '', emoji: '😊' }, p2: { name: '', emoji: '😊' } },
  scores: { p1: 0, p2: 0 },
  history: [],
  notes: [],
  currentTab: 'games',
  currentGame: null,
  initialized: false,
};

const STORAGE_KEY = 'luva_app_state';

function saveState() {
  const toSave = {
    players: AppState.players,
    scores: AppState.scores,
    history: AppState.history,
    notes: AppState.notes,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      AppState.players = parsed.players || AppState.players;
      AppState.scores = parsed.scores || AppState.scores;
      AppState.history = parsed.history || [];
      AppState.notes = parsed.notes || [];
      AppState.initialized = true;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

// ---- Toast Notifications ----
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

// ---- Setup Screen ----
function initSetup() {
  const screen = document.getElementById('setup-screen');
  const main = document.getElementById('main-app');

  if (AppState.initialized) {
    screen.style.display = 'none';
    main.style.display = 'block';
    renderApp();
    return;
  }

  screen.style.display = 'flex';
  main.style.display = 'none';

  // Emoji pickers
  const emojis = ['😊', '😍', '🥰', '😎', '🤗', '😻', '🦋', '🌸', '🐻', '🦊', '🐰', '🌙'];
  document.querySelectorAll('.emoji-picker-row').forEach((row, idx) => {
    row.innerHTML = '';
    emojis.forEach(em => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-btn';
      btn.textContent = em;
      btn.addEventListener('click', () => {
        row.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (idx === 0) AppState.players.p1.emoji = em;
        else AppState.players.p2.emoji = em;
      });
      row.appendChild(btn);
    });
    // Select first by default
    row.children[0].classList.add('selected');
  });
}

function startApp() {
  const name1 = document.getElementById('player1-name').value.trim();
  const name2 = document.getElementById('player2-name').value.trim();

  if (!name1 || !name2) {
    showToast('Both lovers need names! 💫', '⚠️');
    return;
  }

  AppState.players.p1.name = name1;
  AppState.players.p2.name = name2;
  AppState.initialized = true;
  saveState();

  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  renderApp();
  burstConfetti();
  showToast(`Welcome ${name1} & ${name2}! Let the fun begin!`, '🎉');
}

// ---- Main App Render ----
function renderApp() {
  renderHeader();
  renderScoreStrip();
  renderGames();
  renderLeaderboard();
  renderNotes();
  setActiveTab(AppState.currentTab);
}

function renderHeader() {
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  document.getElementById('header-p1').textContent = `${p1.emoji} ${p1.name}`;
  document.getElementById('header-p2').textContent = `${p2.emoji} ${p2.name}`;
}

function renderScoreStrip() {
  const strip = document.getElementById('score-strip');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  strip.innerHTML = `
    <div class="strip-player">
      <span>${p1.emoji}</span>
      <span>${p1.name}</span>
      <span class="strip-score">${AppState.scores.p1}</span>
    </div>
    <span class="strip-vs">vs</span>
    <div class="strip-player">
      <span>${p2.emoji}</span>
      <span>${p2.name}</span>
      <span class="strip-score">${AppState.scores.p2}</span>
    </div>
  `;
}

// ---- Tab Navigation ----
function setActiveTab(tabName) {
  AppState.currentTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

// ---- Games ----
function renderGames() {
  // Already rendered in HTML, just wire up
}

function openGame(gameId) {
  AppState.currentGame = gameId;
  document.getElementById('games-list').style.display = 'none';

  const arenas = document.querySelectorAll('.game-arena');
  arenas.forEach(a => a.classList.remove('active'));

  const arena = document.getElementById(`arena-${gameId}`);
  if (arena) {
    arena.classList.add('active');
    initGameArena(gameId);
  }
}

function closeGame() {
  AppState.currentGame = null;
  document.querySelectorAll('.game-arena').forEach(a => a.classList.remove('active'));
  document.getElementById('games-list').style.display = 'block';
}

function initGameArena(gameId) {
  switch (gameId) {
    case 'tictactoe': initTicTacToe(); break;
    case 'memory': initMemoryMatch(); break;
    case 'rps': initRPS(); break;
    case 'truthdare': initTruthOrDare(); break;
  }
}

// ==============================
// TIC TAC TOE
// ==============================
let tttState = {
  board: Array(9).fill(null),
  currentPlayer: 'p1',
  gameOver: false,
  winningCells: [],
};

function initTicTacToe() {
  tttState = { board: Array(9).fill(null), currentPlayer: 'p1', gameOver: false, winningCells: [] };
  renderTicTacToe();
}

function renderTicTacToe() {
  const container = document.getElementById('ttt-container');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  const currentP = tttState.currentPlayer === 'p1' ? p1 : p2;

  let html = '';
  if (!tttState.gameOver) {
    html += `<p class="turn-indicator">${currentP.emoji} <strong>${currentP.name}</strong>'s turn</p>`;
  }

  html += '<div class="ttt-board">';
  tttState.board.forEach((cell, idx) => {
    const isWinner = tttState.winningCells.includes(idx);
    const takenClass = cell ? 'taken' : '';
    const winClass = isWinner ? 'winner-cell' : '';
    let symbol = '';
    if (cell === 'p1') symbol = p1.emoji;
    else if (cell === 'p2') symbol = p2.emoji;
    html += `<button class="ttt-cell ${takenClass} ${winClass}" onclick="tttMove(${idx})">${symbol}</button>`;
  });
  html += '</div>';

  if (tttState.gameOver) {
    const winner = checkTTTWinner();
    if (winner) {
      const wp = winner === 'p1' ? p1 : p2;
      html += `<p class="game-result win">${wp.emoji} ${wp.name} wins! 🎉</p>`;
    } else {
      html += `<p class="game-result draw">It's a tie! You're both adorable 💕</p>`;
    }
    html += `<button class="btn-play-again" onclick="initTicTacToe()">Play Again 🔄</button>`;
  }

  container.innerHTML = html;
}

function tttMove(idx) {
  if (tttState.board[idx] || tttState.gameOver) return;
  tttState.board[idx] = tttState.currentPlayer;

  const winner = checkTTTWinner();
  if (winner) {
    tttState.gameOver = true;
    tttState.winningCells = getTTTWinningCells();
    recordGameResult('Tic Tac Toe', '❌⭕', winner);
    burstConfetti();
  } else if (tttState.board.every(c => c !== null)) {
    tttState.gameOver = true;
    recordGameResult('Tic Tac Toe', '❌⭕', 'draw');
  } else {
    tttState.currentPlayer = tttState.currentPlayer === 'p1' ? 'p2' : 'p1';
  }

  renderTicTacToe();
}

const TTT_LINES = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

function checkTTTWinner() {
  for (const [a,b,c] of TTT_LINES) {
    if (tttState.board[a] && tttState.board[a] === tttState.board[b] && tttState.board[b] === tttState.board[c]) {
      return tttState.board[a];
    }
  }
  return null;
}

function getTTTWinningCells() {
  for (const [a,b,c] of TTT_LINES) {
    if (tttState.board[a] && tttState.board[a] === tttState.board[b] && tttState.board[b] === tttState.board[c]) {
      return [a,b,c];
    }
  }
  return [];
}

// ==============================
// MEMORY MATCH
// ==============================
let memState = {
  cards: [],
  flipped: [],
  matched: [],
  currentPlayer: 'p1',
  scores: { p1: 0, p2: 0 },
  canFlip: true,
};

const MEMORY_EMOJIS = ['💖', '🌹', '🦋', '🌟', '🍓', '🎀', '🌈', '🐱'];

function initMemoryMatch() {
  const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  memState = {
    cards: pairs,
    flipped: [],
    matched: [],
    currentPlayer: 'p1',
    scores: { p1: 0, p2: 0 },
    canFlip: true,
  };
  renderMemoryMatch();
}

function renderMemoryMatch() {
  const container = document.getElementById('memory-container');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  const currentP = memState.currentPlayer === 'p1' ? p1 : p2;
  const allMatched = memState.matched.length === memState.cards.length;

  let html = '';
  if (!allMatched) {
    html += `<p class="turn-indicator">${currentP.emoji} <strong>${currentP.name}</strong>'s turn &nbsp;|&nbsp; ${p1.emoji} ${memState.scores.p1} - ${memState.scores.p2} ${p2.emoji}</p>`;
  }

  html += '<div class="memory-board">';
  memState.cards.forEach((emoji, idx) => {
    const isFlipped = memState.flipped.includes(idx);
    const isMatched = memState.matched.includes(idx);
    const flipClass = isFlipped || isMatched ? 'flipped' : '';
    const matchClass = isMatched ? 'matched' : '';
    html += `
      <div class="memory-card ${flipClass} ${matchClass}" onclick="memFlip(${idx})">
        <div class="memory-card-inner">
          <div class="memory-card-back">💝</div>
          <div class="memory-card-front">${emoji}</div>
        </div>
      </div>`;
  });
  html += '</div>';

  if (allMatched) {
    let resultText;
    if (memState.scores.p1 > memState.scores.p2) {
      resultText = `<p class="game-result win">${p1.emoji} ${p1.name} wins with ${memState.scores.p1} pairs! 🎉</p>`;
      recordGameResult('Memory Match', '🧠', 'p1');
    } else if (memState.scores.p2 > memState.scores.p1) {
      resultText = `<p class="game-result win">${p2.emoji} ${p2.name} wins with ${memState.scores.p2} pairs! 🎉</p>`;
      recordGameResult('Memory Match', '🧠', 'p2');
    } else {
      resultText = `<p class="game-result draw">It's a tie at ${memState.scores.p1} pairs each! 💕</p>`;
      recordGameResult('Memory Match', '🧠', 'draw');
    }
    html += resultText;
    html += `<button class="btn-play-again" onclick="initMemoryMatch()">Play Again 🔄</button>`;
  }

  container.innerHTML = html;
}

function memFlip(idx) {
  if (!memState.canFlip) return;
  if (memState.flipped.includes(idx) || memState.matched.includes(idx)) return;

  memState.flipped.push(idx);

  if (memState.flipped.length === 2) {
    memState.canFlip = false;
    renderMemoryMatch();

    const [a, b] = memState.flipped;
    if (memState.cards[a] === memState.cards[b]) {
      // Match!
      setTimeout(() => {
        memState.matched.push(a, b);
        memState.scores[memState.currentPlayer]++;
        memState.flipped = [];
        memState.canFlip = true;
        renderMemoryMatch();
        if (memState.matched.length === memState.cards.length) {
          burstConfetti();
        }
      }, 600);
    } else {
      // No match
      setTimeout(() => {
        memState.flipped = [];
        memState.currentPlayer = memState.currentPlayer === 'p1' ? 'p2' : 'p1';
        memState.canFlip = true;
        renderMemoryMatch();
      }, 1000);
    }
  } else {
    renderMemoryMatch();
  }
}

// ==============================
// ROCK PAPER SCISSORS (Best of 3 rounds)
// ==============================
let rpsState = {
  phase: 'p1-choose', // p1-choose, p2-choose, reveal
  p1Choice: null,
  p2Choice: null,
  rounds: [],
  bestOf: 3,
};

function initRPS() {
  rpsState = { phase: 'p1-choose', p1Choice: null, p2Choice: null, rounds: [], bestOf: 3 };
  renderRPS();
}

function renderRPS() {
  const container = document.getElementById('rps-container');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  const choices = [
    { id: 'rock', emoji: '🪨', label: 'Rock' },
    { id: 'paper', emoji: '📄', label: 'Paper' },
    { id: 'scissors', emoji: '✂️', label: 'Scissors' },
  ];

  let html = '';

  // Round indicator
  const roundNum = rpsState.rounds.length + 1;
  const maxRounds = rpsState.bestOf;
  html += `<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">Best of ${maxRounds} • Round ${Math.min(roundNum, maxRounds)}</p>`;

  // Score so far
  const p1Wins = rpsState.rounds.filter(r => r === 'p1').length;
  const p2Wins = rpsState.rounds.filter(r => r === 'p2').length;
  html += `<p style="font-size: 1rem; margin-bottom: 16px;">${p1.emoji} ${p1Wins} - ${p2Wins} ${p2.emoji}</p>`;

  if (rpsState.phase === 'p1-choose') {
    html += `<p class="turn-indicator">${p1.emoji} <strong>${p1.name}</strong>, pick your weapon! 🫣</p>`;
    html += `<p class="rps-waiting">(${p2.name}, look away!)</p>`;
    html += '<div class="rps-choices">';
    choices.forEach(c => {
      html += `<button class="rps-choice" onclick="rpsChoose('p1','${c.id}')" title="${c.label}">${c.emoji}</button>`;
    });
    html += '</div>';
  } else if (rpsState.phase === 'p2-choose') {
    html += `<p class="turn-indicator">${p2.emoji} <strong>${p2.name}</strong>, your turn! 🫣</p>`;
    html += `<p class="rps-waiting">(${p1.name}, look away!)</p>`;
    html += '<div class="rps-choices">';
    choices.forEach(c => {
      html += `<button class="rps-choice" onclick="rpsChoose('p2','${c.id}')" title="${c.label}">${c.emoji}</button>`;
    });
    html += '</div>';
  } else if (rpsState.phase === 'reveal') {
    const p1Emoji = choices.find(c => c.id === rpsState.p1Choice).emoji;
    const p2Emoji = choices.find(c => c.id === rpsState.p2Choice).emoji;
    html += `<div class="rps-vs-display"><span>${p1Emoji}</span><span class="vs-text">vs</span><span>${p2Emoji}</span></div>`;

    const roundWinner = getRPSWinner(rpsState.p1Choice, rpsState.p2Choice);
    if (roundWinner === 'p1') {
      html += `<p class="game-result win">${p1.emoji} ${p1.name} wins this round!</p>`;
    } else if (roundWinner === 'p2') {
      html += `<p class="game-result win">${p2.emoji} ${p2.name} wins this round!</p>`;
    } else {
      html += `<p class="game-result draw">This round is a tie!</p>`;
    }

    // Check if match is over
    const newP1Wins = rpsState.rounds.filter(r => r === 'p1').length;
    const newP2Wins = rpsState.rounds.filter(r => r === 'p2').length;
    const winsNeeded = Math.ceil(rpsState.bestOf / 2);

    if (newP1Wins >= winsNeeded) {
      html += `<p class="game-result win" style="font-size:1.6rem; margin-top:12px;">🏆 ${p1.name} wins the match!</p>`;
      html += `<button class="btn-play-again" onclick="initRPS()">Play Again 🔄</button>`;
    } else if (newP2Wins >= winsNeeded) {
      html += `<p class="game-result win" style="font-size:1.6rem; margin-top:12px;">🏆 ${p2.name} wins the match!</p>`;
      html += `<button class="btn-play-again" onclick="initRPS()">Play Again 🔄</button>`;
    } else if (rpsState.rounds.length >= rpsState.bestOf) {
      // All rounds played, determine winner
      if (newP1Wins > newP2Wins) {
        html += `<p class="game-result win" style="font-size:1.6rem; margin-top:12px;">🏆 ${p1.name} wins the match!</p>`;
      } else if (newP2Wins > newP1Wins) {
        html += `<p class="game-result win" style="font-size:1.6rem; margin-top:12px;">🏆 ${p2.name} wins the match!</p>`;
      } else {
        html += `<p class="game-result draw" style="font-size:1.6rem; margin-top:12px;">The match is a draw! 💕</p>`;
      }
      html += `<button class="btn-play-again" onclick="initRPS()">Play Again 🔄</button>`;
    } else {
      html += `<button class="btn-play-again" onclick="rpsNextRound()">Next Round →</button>`;
    }
  }

  container.innerHTML = html;
}

function rpsChoose(player, choice) {
  if (player === 'p1') {
    rpsState.p1Choice = choice;
    rpsState.phase = 'p2-choose';
  } else {
    rpsState.p2Choice = choice;
    rpsState.phase = 'reveal';
    const winner = getRPSWinner(rpsState.p1Choice, rpsState.p2Choice);
    rpsState.rounds.push(winner);

    // Check if match over
    const p1Wins = rpsState.rounds.filter(r => r === 'p1').length;
    const p2Wins = rpsState.rounds.filter(r => r === 'p2').length;
    const winsNeeded = Math.ceil(rpsState.bestOf / 2);
    if (p1Wins >= winsNeeded || p2Wins >= winsNeeded || rpsState.rounds.length >= rpsState.bestOf) {
      // Record match result
      if (p1Wins > p2Wins) {
        recordGameResult('Rock Paper Scissors', '✂️', 'p1');
      } else if (p2Wins > p1Wins) {
        recordGameResult('Rock Paper Scissors', '✂️', 'p2');
      } else {
        recordGameResult('Rock Paper Scissors', '✂️', 'draw');
      }
      burstConfetti();
    }
  }
  renderRPS();
}

function rpsNextRound() {
  rpsState.p1Choice = null;
  rpsState.p2Choice = null;
  rpsState.phase = 'p1-choose';
  renderRPS();
}

function getRPSWinner(a, b) {
  if (a === b) return 'draw';
  if ((a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock')) {
    return 'p1';
  }
  return 'p2';
}

// ==============================
// TRUTH OR DARE
// ==============================
let todState = {
  currentPlayer: 'p1',
  type: null, // 'truth' or 'dare'
  prompt: '',
};

const TRUTHS = [
  "What's your favorite thing about your partner?",
  "When did you first know you liked me?",
  "What's the silliest thing you've done to impress me?",
  "What's your most embarrassing moment with me?",
  "If you could relive one date, which one would it be?",
  "What's the cutest thing I do without realizing?",
  "What were you thinking on our first date?",
  "What song reminds you of me?",
  "What's one thing you want us to try together?",
  "What's your favorite memory of us?",
  "If we were in a movie, what genre would it be?",
  "What's the first thing you noticed about me?",
  "What's a secret talent you haven't shown me yet?",
  "What do you daydream about when you think of me?",
  "What's the cheesiest pickup line you'd use on me?",
  "If you could read my mind for a day, would you?",
  "What's one habit of mine you secretly love?",
  "Describe me in three emojis.",
  "What's the sweetest thing I've ever done for you?",
  "If we had a couple name, what would it be?",
];

const DARES = [
  "Give your partner a 30-second back massage!",
  "Do your best impression of your partner!",
  "Serenade your partner with any song!",
  "Send your partner the most romantic text ever!",
  "Do a silly dance for 15 seconds!",
  "Draw a portrait of your partner (you have 30 seconds)!",
  "Give your partner 5 compliments in a row!",
  "Make your best puppy eyes face!",
  "Whisper something sweet in your partner's ear!",
  "Hold your partner's hand and don't let go for 2 minutes!",
  "Let your partner take a silly photo of you!",
  "Tell your partner a joke and try to make them laugh!",
  "Do 10 jumping jacks while saying 'I love you'!",
  "Give your partner a piggyback ride!",
  "Speak only in compliments for the next 2 minutes!",
  "Make up a poem about your partner right now!",
  "Recreate your first ever selfie together!",
  "Be your partner's butler for the next 5 minutes!",
  "Do the robot dance for 10 seconds!",
  "Let your partner style your hair however they want!",
];

function initTruthOrDare() {
  todState = { currentPlayer: 'p1', type: null, prompt: '' };
  renderTruthOrDare();
}

function renderTruthOrDare() {
  const container = document.getElementById('tod-container');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  const currentP = todState.currentPlayer === 'p1' ? p1 : p2;

  let html = '<div class="tod-container">';
  html += `<p class="tod-who">${currentP.emoji} <strong>${currentP.name}</strong>'s turn!</p>`;

  if (!todState.type) {
    html += `
      <div class="tod-card-display">
        <p class="prompt-text">Choose your fate... 🎭</p>
      </div>
      <div class="tod-buttons">
        <button class="btn-truth" onclick="todChoose('truth')">🤔 Truth</button>
        <button class="btn-dare" onclick="todChoose('dare')">🔥 Dare</button>
      </div>`;
  } else {
    html += `
      <div class="tod-card-display">
        <p class="prompt-text">${todState.prompt}</p>
      </div>
      <p style="margin: 8px 0; font-size: 0.85rem; color: var(--text-muted);">${todState.type === 'truth' ? '🤔 Truth' : '🔥 Dare'}</p>
      <button class="btn-done" onclick="todNext()">✓ Done — Next Player</button>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

function todChoose(type) {
  todState.type = type;
  const pool = type === 'truth' ? TRUTHS : DARES;
  todState.prompt = pool[Math.floor(Math.random() * pool.length)];
  renderTruthOrDare();
}

function todNext() {
  todState.currentPlayer = todState.currentPlayer === 'p1' ? 'p2' : 'p1';
  todState.type = null;
  todState.prompt = '';
  renderTruthOrDare();
}

// ---- Record game result & update scores ----
function recordGameResult(gameName, icon, winner) {
  if (winner === 'p1') AppState.scores.p1++;
  else if (winner === 'p2') AppState.scores.p2++;

  AppState.history.unshift({
    game: gameName,
    icon: icon,
    winner: winner,
    timestamp: new Date().toISOString(),
  });

  // Keep last 50
  if (AppState.history.length > 50) AppState.history = AppState.history.slice(0, 50);

  saveState();
  renderScoreStrip();
  renderLeaderboard();

  if (winner !== 'draw') {
    const wp = winner === 'p1' ? AppState.players.p1 : AppState.players.p2;
    showToast(`${wp.name} wins ${gameName}!`, '🏆');
  }
}

// ---- Leaderboard ----
function renderLeaderboard() {
  const container = document.getElementById('leaderboard-content');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  const s = AppState.scores;

  const p1Leading = s.p1 > s.p2;
  const p2Leading = s.p2 > s.p1;

  let html = `
    <div class="score-overview">
      <div class="score-player ${p1Leading ? 'leading' : ''}">
        ${p1Leading ? '<span class="crown-icon">👑</span>' : ''}
        <span class="player-avatar">${p1.emoji}</span>
        <div class="player-name">${p1.name}</div>
        <div class="player-score">${s.p1}</div>
        <div class="player-label">wins</div>
      </div>
      <div class="score-vs">vs</div>
      <div class="score-player ${p2Leading ? 'leading' : ''}">
        ${p2Leading ? '<span class="crown-icon">👑</span>' : ''}
        <span class="player-avatar">${p2.emoji}</span>
        <div class="player-name">${p2.name}</div>
        <div class="player-score">${s.p2}</div>
        <div class="player-label">wins</div>
      </div>
    </div>
  `;

  html += '<div class="score-history"><h3>Match History</h3>';
  if (AppState.history.length === 0) {
    html += '<div class="no-history">No games played yet — go have fun! 🎮</div>';
  } else {
    html += '<div class="history-list">';
    AppState.history.forEach(item => {
      const time = new Date(item.timestamp);
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let winnerLabel, winnerClass;
      if (item.winner === 'p1') {
        winnerLabel = `${p1.emoji} ${p1.name}`;
        winnerClass = 'p1';
      } else if (item.winner === 'p2') {
        winnerLabel = `${p2.emoji} ${p2.name}`;
        winnerClass = 'p2';
      } else {
        winnerLabel = 'Draw 🤝';
        winnerClass = 'draw';
      }

      html += `
        <div class="history-item">
          <div class="game-name">
            <span class="game-icon">${item.icon}</span>
            <span>${item.game}</span>
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

// ---- Love Notes ----
let selectedNoteMood = '💖';

function renderNotes() {
  const select = document.getElementById('note-from-select');
  const p1 = AppState.players.p1;
  const p2 = AppState.players.p2;
  select.innerHTML = `
    <option value="p1">${p1.emoji} ${p1.name}</option>
    <option value="p2">${p2.emoji} ${p2.name}</option>
  `;

  renderNotesTimeline();
}

function renderNotesTimeline() {
  const container = document.getElementById('notes-timeline');
  if (AppState.notes.length === 0) {
    container.innerHTML = `
      <div class="no-notes">
        <span class="empty-icon">💌</span>
        <p>No love notes yet... Send the first one!</p>
      </div>`;
    return;
  }

  let html = '';
  AppState.notes.forEach((note, idx) => {
    const cls = note.from === 'p1' ? 'from-p1' : 'from-p2';
    const sender = note.from === 'p1' ? AppState.players.p1 : AppState.players.p2;
    const time = new Date(note.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

    html += `
      <div class="note-bubble ${cls}">
        <div class="note-inner">
          <p class="note-text">${escapeHtml(note.text)}</p>
          <div class="note-meta">
            <span class="note-sender">${sender.emoji} ${sender.name}</span>
            <span class="note-mood">${note.mood}</span>
            <span class="note-time">${dateStr} ${timeStr}</span>
            <button class="note-delete-btn" onclick="deleteNote(${idx})" title="Delete note">✕</button>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function sendNote() {
  const textarea = document.getElementById('note-textarea');
  const text = textarea.value.trim();
  if (!text) {
    showToast('Write something sweet first!', '✍️');
    return;
  }

  const from = document.getElementById('note-from-select').value;
  AppState.notes.unshift({
    text: text,
    from: from,
    mood: selectedNoteMood,
    timestamp: new Date().toISOString(),
  });

  textarea.value = '';
  saveState();
  renderNotesTimeline();
  showToast('Love note sent! 💌', '💝');
}

function deleteNote(idx) {
  AppState.notes.splice(idx, 1);
  saveState();
  renderNotesTimeline();
}

function selectMood(emoji, btn) {
  selectedNoteMood = emoji;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Reset ----
function resetAllData() {
  if (confirm('Reset everything? All scores, history, and notes will be lost! 😢')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  createFloatingHearts();
  loadState();
  initSetup();

  // Tab clicks
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });
});
