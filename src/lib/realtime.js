// Local real-time synchronization using BroadcastChannel + localStorage
// plus in-tab listener dispatch so the originating tab updates immediately.

const LOCAL_PREFIX = 'sortrush_room_';
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sortrush_sync') : null;

// Same-tab subscribers keyed by normalized room code
const localListeners = new Map();

function notifyLocalListeners(code, data) {
  const listeners = localListeners.get(code);
  if (!listeners) return;
  const snapshot = JSON.parse(JSON.stringify(data));
  listeners.forEach((cb) => cb(snapshot));
}

function readLocalRoom(code) {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + code);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalRoom(code, data) {
  const normalized = code.trim().toUpperCase();
  localStorage.setItem(LOCAL_PREFIX + normalized, JSON.stringify(data));
  // Notify current tab immediately (BroadcastChannel & storage events only fire in OTHER tabs)
  notifyLocalListeners(normalized, data);
  if (channel) {
    channel.postMessage({ code: normalized, data });
  }
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function createRoom({ code, hostName, deckId, targetCount }) {
  const normalized = code.trim().toUpperCase();
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const roomData = {
    code: normalized,
    deckId,
    targetCount,
    seed,
    status: 'waiting', // waiting | roulette | countdown | playing | finished | abandoned
    roulette: null,
    winner: null,
    leftBy: null,
    createdAt: Date.now(),
    players: {
      host: {
        name: hostName || 'Player 1',
        selectedDeck: deckId,
        ready: false,
        score: 0,
        mistakes: 0,
        streak: 0,
        bestStreak: 0,
      },
      guest: null,
    },
  };

  writeLocalRoom(normalized, roomData);
  return roomData;
}

export async function joinRoom({ code, guestName, preferredDeck }) {
  const normalized = code.trim().toUpperCase();
  const existing = readLocalRoom(normalized);
  if (!existing) {
    throw new Error('Room not found. Host a room in another tab of this browser first.');
  }
  if (existing.status === 'abandoned') {
    throw new Error('This room has already been closed.');
  }
  if (existing.players?.guest && existing.status !== 'waiting') {
    throw new Error('This room is already full or in progress.');
  }
  const updated = {
    ...existing,
    players: {
      ...existing.players,
      guest: {
        name: guestName || 'Player 2',
        selectedDeck: preferredDeck || existing.deckId,
        ready: false,
        score: 0,
        mistakes: 0,
        streak: 0,
        bestStreak: 0,
      },
    },
  };
  writeLocalRoom(normalized, updated);
  return updated;
}

export function subscribeRoom(code, callback) {
  const normalized = code.trim().toUpperCase();

  if (!localListeners.has(normalized)) {
    localListeners.set(normalized, new Set());
  }
  localListeners.get(normalized).add(callback);

  const onMessage = (event) => {
    if (event.data?.code === normalized) {
      callback(event.data.data);
    }
  };
  const onStorage = (event) => {
    if (event.key === LOCAL_PREFIX + normalized && event.newValue) {
      callback(JSON.parse(event.newValue));
    }
  };

  if (channel) channel.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);

  const current = readLocalRoom(normalized);
  if (current) callback(current);

  return () => {
    const set = localListeners.get(normalized);
    if (set) {
      set.delete(callback);
      if (set.size === 0) localListeners.delete(normalized);
    }
    if (channel) channel.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}

export async function updatePlayerState(code, role, patch) {
  const normalized = code.trim().toUpperCase();
  const room = readLocalRoom(normalized);
  if (!room || !room.players?.[role]) return;
  const updated = {
    ...room,
    players: {
      ...room.players,
      [role]: { ...room.players[role], ...patch },
    },
  };
  writeLocalRoom(normalized, updated);
}

export async function updateRoomState(code, patch) {
  const normalized = code.trim().toUpperCase();
  const room = readLocalRoom(normalized);
  if (!room) return;
  writeLocalRoom(normalized, { ...room, ...patch });
}

export function leaveRoomSync(code, role, inMatch = false) {
  const normalized = code.trim().toUpperCase();
  const room = readLocalRoom(normalized);
  if (!room || room.status === 'abandoned') return;
  const leaverName =
    room.players?.[role]?.name || (role === 'host' ? 'Host' : 'Opponent');
  writeLocalRoom(normalized, {
    ...room,
    status: 'abandoned',
    leftBy: {
      role,
      name: leaverName,
      inMatch:
        inMatch ||
        room.status === 'playing' ||
        room.status === 'countdown' ||
        room.status === 'roulette',
      at: Date.now(),
    },
  });
}
