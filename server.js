/* ============================================
   LUVA — Real-time Multiplayer Server
   Express + Socket.IO + SQLite
   ============================================ */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));


// ---- In-Memory Room State ----
// Tracks active connections and transient game state
const activeRooms = new Map();

// ---- Helpers ----
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRoomData(code) {
  const room = db.getRoom(code);
  if (!room) return null;
  const history = db.getGameHistory(code);
  const notes = db.getNotes(code);
  return {
    code,
    players: {
      p1: { name: room.p1_name, emoji: room.p1_emoji },
      p2: { name: room.p2_name || null, emoji: room.p2_emoji || null },
    },
    scores: { p1: room.p1_score, p2: room.p2_score },
    history,
    notes,
  };
}

function getOrCreateActiveRoom(code) {
  if (!activeRooms.has(code)) {
    activeRooms.set(code, {
      sockets: { p1: null, p2: null },
      gameStates: {},
      currentGame: null,
      timers: {},
    });
  }
  return activeRooms.get(code);
}

function bothConnected(room) {
  return room.sockets.p1 && room.sockets.p2;
}

// ---- Game State Factories ----
const MEMORY_EMOJIS = ['💖', '🌹', '🦋', '🌟', '🍓', '🎀', '🌈', '🐱'];
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

function createGameState(gameType) {
  switch (gameType) {
    case 'tictactoe':
      return { board: Array(9).fill(null), currentPlayer: 'p1', gameOver: false, winner: null, winningCells: [] };
    case 'memory': {
      const pairs = shuffle([...MEMORY_EMOJIS, ...MEMORY_EMOJIS]);
      return { cards: pairs, flipped: [], matched: [], currentPlayer: 'p1', scores: { p1: 0, p2: 0 }, gameOver: false };
    }
    case 'rps':
      return { p1Choice: null, p2Choice: null, rounds: [], bestOf: 3, phase: 'choosing', roundResult: null, matchWinner: null };
    case 'truthdare':
      return { currentPlayer: 'p1', type: null, prompt: '' };
    default:
      return null;
  }
}

// ---- TTT Logic ----
const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkTTTWinner(board) {
  for (const [a, b, c] of TTT_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], cells: [a, b, c] };
    }
  }
  return null;
}

// ---- RPS Logic ----
function getRPSWinner(a, b) {
  if (a === b) return 'draw';
  if ((a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock')) return 'p1';
  return 'p2';
}

// ---- Broadcast helpers ----
function broadcastGameState(roomCode, gameType, activeRoom) {
  const state = activeRoom.gameStates[gameType];
  if (!state) return;

  if (gameType === 'rps' && state.phase === 'choosing') {
    // Send personalized states — hide partner's choice
    if (activeRoom.sockets.p1) {
      io.to(activeRoom.sockets.p1).emit('game-state', {
        gameType,
        state: {
          myChoice: state.p1Choice,
          partnerChosen: state.p2Choice !== null,
          rounds: state.rounds,
          bestOf: state.bestOf,
          phase: 'choosing',
          roundResult: null,
          matchWinner: null,
        },
      });
    }
    if (activeRoom.sockets.p2) {
      io.to(activeRoom.sockets.p2).emit('game-state', {
        gameType,
        state: {
          myChoice: state.p2Choice,
          partnerChosen: state.p1Choice !== null,
          rounds: state.rounds,
          bestOf: state.bestOf,
          phase: 'choosing',
          roundResult: null,
          matchWinner: null,
        },
      });
    }
  } else {
    // Broadcast same state to both
    io.to(roomCode).emit('game-state', { gameType, state });
  }
}

function broadcastScores(roomCode) {
  const data = getRoomData(roomCode);
  if (data) {
    io.to(roomCode).emit('scores-updated', { scores: data.scores, history: data.history });
  }
}

function broadcastNotes(roomCode) {
  const notes = db.getNotes(roomCode);
  io.to(roomCode).emit('notes-updated', { notes });
}

// ---- Record result ----
function recordResult(roomCode, gameName, icon, winner) {
  const room = db.getRoom(roomCode);
  if (!room) return;
  let p1 = room.p1_score, p2 = room.p2_score;
  if (winner === 'p1') p1++;
  else if (winner === 'p2') p2++;
  db.updateScores(roomCode, p1, p2);
  db.addGameHistory(roomCode, gameName, icon, winner);
}

// ============================================
// SOCKET.IO CONNECTION HANDLER
// ============================================
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayer = null;

  // ---- Create Room ----
  socket.on('create-room', ({ name, emoji }) => {
    if (!name || !name.trim()) return socket.emit('error-msg', { message: 'Name is required' });
    name = name.trim().slice(0, 20);
    emoji = emoji || '😊';

    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
    } while (db.getRoom(code) && attempts < 100);

    if (attempts >= 100) return socket.emit('error-msg', { message: 'Could not create room, try again' });

    db.createRoom(code, name, emoji);
    const active = getOrCreateActiveRoom(code);
    active.sockets.p1 = socket.id;

    socket.join(code);
    currentRoom = code;
    currentPlayer = 'p1';

    socket.emit('room-created', {
      code,
      playerId: 'p1',
      room: getRoomData(code),
    });

    console.log(`🏠 Room ${code} created by ${name}`);
  });

  // ---- Join Room ----
  socket.on('join-room', ({ code, name, emoji }) => {
    if (!code || !name || !name.trim()) return socket.emit('error-msg', { message: 'Room code and name are required' });
    code = code.toUpperCase().trim();
    name = name.trim().slice(0, 20);
    emoji = emoji || '😊';

    const room = db.getRoom(code);
    if (!room) return socket.emit('error-msg', { message: 'Room not found. Check the code!' });
    if (room.p2_name) {
      // Room already has 2 players — check if this is a rejoin
      const active = activeRooms.get(code);
      if (active && !active.sockets.p2) {
        // p2 slot is free, allow rejoin
      } else if (active && !active.sockets.p1) {
        // Hmm, edge case. For now, reject
        return socket.emit('error-msg', { message: 'Room is full!' });
      } else {
        return socket.emit('error-msg', { message: 'Room is full!' });
      }
    }

    db.joinRoom(code, name, emoji);
    const active = getOrCreateActiveRoom(code);
    active.sockets.p2 = socket.id;

    socket.join(code);
    currentRoom = code;
    currentPlayer = 'p2';

    const roomData = getRoomData(code);

    socket.emit('room-joined', {
      code,
      playerId: 'p2',
      room: roomData,
    });

    // Notify p1 that partner joined
    if (active.sockets.p1) {
      io.to(active.sockets.p1).emit('partner-joined', { room: roomData });
    }

    console.log(`💕 ${name} joined room ${code}`);
  });

  // ---- Rejoin Room ----
  socket.on('rejoin', ({ roomCode, playerId }) => {
    if (!roomCode || !playerId) return socket.emit('rejoin-failed');

    const room = db.getRoom(roomCode);
    if (!room) return socket.emit('rejoin-failed');

    const active = getOrCreateActiveRoom(roomCode);

    // Check player is valid
    if (playerId === 'p1' && !room.p1_name) return socket.emit('rejoin-failed');
    if (playerId === 'p2' && !room.p2_name) return socket.emit('rejoin-failed');

    // Assign socket
    active.sockets[playerId] = socket.id;
    socket.join(roomCode);
    currentRoom = roomCode;
    currentPlayer = playerId;

    const roomData = getRoomData(roomCode);
    const partnerId = playerId === 'p1' ? 'p2' : 'p1';
    const partnerConnected = !!active.sockets[partnerId];

    socket.emit('rejoined', {
      code: roomCode,
      playerId,
      room: roomData,
      partnerConnected,
      currentGame: active.currentGame,
    });

    // If there's an active game, send the state
    if (active.currentGame && active.gameStates[active.currentGame]) {
      broadcastGameState(roomCode, active.currentGame, active);
    }

    // Notify partner
    if (partnerConnected) {
      io.to(active.sockets[partnerId]).emit('partner-reconnected');
    }

    db.touchRoom(roomCode);
    console.log(`🔄 ${playerId} rejoined room ${roomCode}`);
  });

  // ---- Start Game ----
  socket.on('start-game', ({ gameType }) => {
    if (!currentRoom || !currentPlayer) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;

    // Clear any pending timers from previous game
    if (active.timers[gameType]) {
      clearTimeout(active.timers[gameType]);
      active.timers[gameType] = null;
    }

    const state = createGameState(gameType);
    active.gameStates[gameType] = state;
    active.currentGame = gameType;

    broadcastGameState(currentRoom, gameType, active);
    io.to(currentRoom).emit('game-started', { gameType });
  });

  // ---- Close Game (back to list) ----
  socket.on('close-game', () => {
    if (!currentRoom) return;
    const active = activeRooms.get(currentRoom);
    if (active) {
      active.currentGame = null;
    }
    io.to(currentRoom).emit('game-closed');
  });

  // ==============================
  // TIC TAC TOE MOVES
  // ==============================
  socket.on('ttt-move', ({ cell }) => {
    if (!currentRoom || !currentPlayer) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;
    const state = active.gameStates.tictactoe;
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== currentPlayer) return;
    if (cell < 0 || cell > 8 || state.board[cell] !== null) return;

    state.board[cell] = currentPlayer;

    const result = checkTTTWinner(state.board);
    if (result) {
      state.gameOver = true;
      state.winner = result.winner;
      state.winningCells = result.cells;
      recordResult(currentRoom, 'Tic Tac Toe', '❌⭕', result.winner);
      broadcastGameState(currentRoom, 'tictactoe', active);
      broadcastScores(currentRoom);
    } else if (state.board.every(c => c !== null)) {
      state.gameOver = true;
      state.winner = 'draw';
      recordResult(currentRoom, 'Tic Tac Toe', '❌⭕', 'draw');
      broadcastGameState(currentRoom, 'tictactoe', active);
      broadcastScores(currentRoom);
    } else {
      state.currentPlayer = currentPlayer === 'p1' ? 'p2' : 'p1';
      broadcastGameState(currentRoom, 'tictactoe', active);
    }
  });

  // ==============================
  // MEMORY MATCH MOVES
  // ==============================
  socket.on('memory-flip', ({ card }) => {
    if (!currentRoom || !currentPlayer) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;
    const state = active.gameStates.memory;
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== currentPlayer) return;
    if (card < 0 || card >= state.cards.length) return;
    if (state.flipped.includes(card) || state.matched.includes(card)) return;
    if (state.flipped.length >= 2) return; // Already 2 flipped, waiting for timer

    state.flipped.push(card);
    broadcastGameState(currentRoom, 'memory', active);

    if (state.flipped.length === 2) {
      const [a, b] = state.flipped;
      if (state.cards[a] === state.cards[b]) {
        // Match!
        active.timers.memory = setTimeout(() => {
          state.matched.push(a, b);
          state.scores[state.currentPlayer]++;
          state.flipped = [];
          // Check if game over
          if (state.matched.length === state.cards.length) {
            state.gameOver = true;
            let winner;
            if (state.scores.p1 > state.scores.p2) winner = 'p1';
            else if (state.scores.p2 > state.scores.p1) winner = 'p2';
            else winner = 'draw';
            state.winner = winner;
            recordResult(currentRoom, 'Memory Match', '🧠', winner);
            broadcastGameState(currentRoom, 'memory', active);
            broadcastScores(currentRoom);
          } else {
            broadcastGameState(currentRoom, 'memory', active);
          }
        }, 700);
      } else {
        // No match
        active.timers.memory = setTimeout(() => {
          state.flipped = [];
          state.currentPlayer = state.currentPlayer === 'p1' ? 'p2' : 'p1';
          broadcastGameState(currentRoom, 'memory', active);
        }, 1200);
      }
    }
  });

  // ==============================
  // ROCK PAPER SCISSORS
  // ==============================
  socket.on('rps-choose', ({ choice }) => {
    if (!currentRoom || !currentPlayer) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;
    const state = active.gameStates.rps;
    if (!state || state.matchWinner) return;
    if (!['rock', 'paper', 'scissors'].includes(choice)) return;

    // Store choice
    if (currentPlayer === 'p1') state.p1Choice = choice;
    else state.p2Choice = choice;

    // Check if both have chosen
    if (state.p1Choice && state.p2Choice) {
      const roundWinner = getRPSWinner(state.p1Choice, state.p2Choice);
      state.rounds.push(roundWinner);
      state.phase = 'reveal';
      state.roundResult = roundWinner;

      // Check if match is over
      const p1Wins = state.rounds.filter(r => r === 'p1').length;
      const p2Wins = state.rounds.filter(r => r === 'p2').length;
      const winsNeeded = Math.ceil(state.bestOf / 2);

      if (p1Wins >= winsNeeded) {
        state.matchWinner = 'p1';
        recordResult(currentRoom, 'Rock Paper Scissors', '✂️', 'p1');
      } else if (p2Wins >= winsNeeded) {
        state.matchWinner = 'p2';
        recordResult(currentRoom, 'Rock Paper Scissors', '✂️', 'p2');
      } else if (state.rounds.length >= state.bestOf) {
        if (p1Wins > p2Wins) state.matchWinner = 'p1';
        else if (p2Wins > p1Wins) state.matchWinner = 'p2';
        else state.matchWinner = 'draw';
        recordResult(currentRoom, 'Rock Paper Scissors', '✂️', state.matchWinner);
      }

      // Broadcast with both choices visible
      io.to(currentRoom).emit('game-state', { gameType: 'rps', state });
      if (state.matchWinner) broadcastScores(currentRoom);
    } else {
      // Only one has chosen — send personalized states
      broadcastGameState(currentRoom, 'rps', active);
    }
  });

  socket.on('rps-next-round', () => {
    if (!currentRoom) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;
    const state = active.gameStates.rps;
    if (!state || state.matchWinner) return;

    state.p1Choice = null;
    state.p2Choice = null;
    state.phase = 'choosing';
    state.roundResult = null;
    broadcastGameState(currentRoom, 'rps', active);
  });

  // ==============================
  // TRUTH OR DARE
  // ==============================
  socket.on('tod-choose', ({ type }) => {
    if (!currentRoom || !currentPlayer) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;
    const state = active.gameStates.truthdare;
    if (!state) return;
    if (state.currentPlayer !== currentPlayer) return;

    const pool = type === 'truth' ? TRUTHS : DARES;
    state.type = type;
    state.prompt = pool[Math.floor(Math.random() * pool.length)];

    io.to(currentRoom).emit('game-state', { gameType: 'truthdare', state });
  });

  socket.on('tod-next', () => {
    if (!currentRoom || !currentPlayer) return;
    const active = activeRooms.get(currentRoom);
    if (!active) return;
    const state = active.gameStates.truthdare;
    if (!state) return;

    state.currentPlayer = state.currentPlayer === 'p1' ? 'p2' : 'p1';
    state.type = null;
    state.prompt = '';

    io.to(currentRoom).emit('game-state', { gameType: 'truthdare', state });
  });

  // ==============================
  // LOVE NOTES
  // ==============================
  socket.on('send-note', ({ text, mood }) => {
    if (!currentRoom || !currentPlayer) return;
    if (!text || !text.trim()) return;
    text = text.trim().slice(0, 1000);
    mood = mood || '💖';

    db.addNote(currentRoom, currentPlayer, text, mood);
    broadcastNotes(currentRoom);
  });

  socket.on('delete-note', ({ noteId }) => {
    if (!currentRoom || !currentPlayer) return;
    db.deleteNote(noteId, currentRoom);
    broadcastNotes(currentRoom);
  });

  // ==============================
  // DISCONNECT
  // ==============================
  socket.on('disconnect', () => {
    if (currentRoom && currentPlayer) {
      const active = activeRooms.get(currentRoom);
      if (active) {
        active.sockets[currentPlayer] = null;
        const partnerId = currentPlayer === 'p1' ? 'p2' : 'p1';
        if (active.sockets[partnerId]) {
          io.to(active.sockets[partnerId]).emit('partner-disconnected');
        }
        // If both disconnected, clean up active room after 30 min
        if (!active.sockets.p1 && !active.sockets.p2) {
          setTimeout(() => {
            const r = activeRooms.get(currentRoom);
            if (r && !r.sockets.p1 && !r.sockets.p2) {
              // Clear game timers
              Object.values(r.timers).forEach(t => t && clearTimeout(t));
              activeRooms.delete(currentRoom);
            }
          }, 30 * 60 * 1000);
        }
      }
      console.log(`👋 ${currentPlayer} disconnected from room ${currentRoom}`);
    }
  });
});

// ---- Start Server ----
async function start() {
  await db.init();
  db.cleanOldRooms();
  server.listen(PORT, () => {
    console.log(`\n  💕 Luva is running!\n`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://<your-ip>:${PORT}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start Luva:', err);
  process.exit(1);
});
