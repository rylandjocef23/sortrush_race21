import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DECKS, createSeededQueue } from './data/decks';
import { sfx } from './lib/sound';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  subscribeRoom,
  updatePlayerState,
  updateRoomState,
  leaveRoomSync,
} from './lib/realtime';

const BOT_PROFILES = {
  easy: { label: 'Easy', minMs: 2400, maxMs: 3200, accuracy: 0.8 },
  medium: { label: 'Medium', minMs: 1500, maxMs: 2100, accuracy: 0.88 },
  hard: { label: 'Hard', minMs: 900, maxMs: 1350, accuracy: 0.94 },
};

const QUEUE_SIZES = [15, 25, 30];
const LOCKOUT_MS = 1500;
const ROULETTE_DELAYS = [70, 75, 85, 95, 110, 130, 155, 185, 220, 270, 340, 430];

function IconLeft({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3.5L5.5 8L10 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRight({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3.5L10.5 8L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUp({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 10L8 5.5L12.5 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDown({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 6L8 10.5L12.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSound({ muted, className = 'w-4 h-4' }) {
  return muted ? (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 6h2.8L9 3v10l-3.7-3H2.5V6z" strokeLinejoin="round" />
      <path d="M11.5 6l3 4m0-4l-3 4" strokeLinecap="round" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 6h2.8L9 3v10l-3.7-3H2.5V6z" strokeLinejoin="round" />
      <path d="M11.5 5.5a3.5 3.5 0 010 5m1.8-7a6 6 0 010 9" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  // Navigation & Setup State
  const [screen, setScreen] = useState('home'); // home | lobby | roulette | countdown | playing | results
  const [mode, setMode] = useState('bot'); // bot | local1v1
  const [callsign, setCallsign] = useState('Player');
  const [deckId, setDeckId] = useState('dev');
  const [targetCount, setTargetCount] = useState(25);
  const [botLevel, setBotLevel] = useState('easy');
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  // Local 1v1 Room State
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [role, setRole] = useState('host'); // host | guest
  const [roomData, setRoomData] = useState(null);
  const [leftPopup, setLeftPopup] = useState(null); // { name, role, inMatch } | null
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Roulette State
  const [rouletteHighlight, setRouletteHighlight] = useState('host'); // 'host' | 'guest'
  const [rouletteDone, setRouletteDone] = useState(false);

  // Match State
  const [queue, setQueue] = useState([]);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [winner, setWinner] = useState(null); // 'self' | 'opponent'

  // Interaction & Feedback State
  const [lockedUntil, setLockedUntil] = useState(0);
  const [lockProgress, setLockProgress] = useState(0);
  const [shakeCard, setShakeCard] = useState(false);
  const [binFlash, setBinFlash] = useState(null);
  const [dragState, setDragState] = useState({ active: false, dx: 0, dy: 0 });

  const startTimeRef = useRef(0);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const leftBinRef = useRef(null);
  const rightBinRef = useRef(null);
  const screenRef = useRef(screen);
  const mutedRef = useRef(muted);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const deck = DECKS[deckId] || DECKS.dev;
  const currentItem = queue[score] || null;
  const nextItem = queue[score + 1] || null;
  const isLocked = lockedUntil > Date.now();
  const isModalOpen = Boolean(leftPopup || showQuitConfirm);

  const playSound = (fn, ...args) => {
    if (!mutedRef.current) fn(...args);
  };

  // Notify other tab if this tab is closed or refreshed while in a 1v1 room
  useEffect(() => {
    if (mode !== 'local1v1' || !roomCode) return;
    const onBeforeUnload = () => {
      const inMatch =
        screenRef.current === 'playing' ||
        screenRef.current === 'countdown' ||
        screenRef.current === 'roulette';
      leaveRoomSync(roomCode, role, inMatch);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [mode, roomCode, role]);

  // Subscribe to local 1v1 room updates
  useEffect(() => {
    if (mode !== 'local1v1' || !roomCode) return;
    const unsubscribe = subscribeRoom(roomCode, (data) => {
      setRoomData(data);

      // Handle opponent leaving the room or quitting mid-match
      if (data.status === 'abandoned') {
        if (data.leftBy?.role !== role) {
          setShowQuitConfirm(false);
          setLeftPopup({
            name: data.leftBy?.name || 'The other player',
            role: data.leftBy?.role || 'opponent',
            inMatch: Boolean(data.leftBy?.inMatch),
          });
        }
        return;
      }

      const oppRole = role === 'host' ? 'guest' : 'host';
      const opp = data.players?.[oppRole];
      if (opp) {
        setOpponentScore(opp.score || 0);
      }

      // Transition both players into roulette when different decks were picked
      if (data.status === 'roulette' && screenRef.current === 'lobby') {
        setRouletteDone(false);
        screenRef.current = 'roulette';
        setScreen('roulette');
      }

      // Transition both players into countdown when ready (same deck or after roulette)
      if (
        data.status === 'countdown' &&
        (screenRef.current === 'lobby' || screenRef.current === 'roulette')
      ) {
        setDeckId(data.deckId);
        setTargetCount(data.targetCount);
        setQueue(createSeededQueue(data.deckId, data.targetCount, data.seed));
        resetLocalStats();
        setCountdown(3);
        screenRef.current = 'countdown';
        setScreen('countdown');
      }

      // Return both players to lobby when either clicks Play Again
      if (data.status === 'waiting' && screenRef.current === 'results') {
        resetLocalStats();
        screenRef.current = 'lobby';
        setScreen('lobby');
      }

      // Resolve match for both players when someone finishes
      if (data.status === 'finished' && screenRef.current === 'playing') {
        setShowQuitConfirm(false);
        const didWin = data.winner === role;
        setWinner(didWin ? 'self' : 'opponent');
        playSound(didWin ? sfx.win : sfx.lose);
        screenRef.current = 'results';
        setScreen('results');
      }
    });
    return () => unsubscribe();
  }, [mode, roomCode, role]);

  // Host resolves deck picks when both players are ready
  useEffect(() => {
    if (
      mode === 'local1v1' &&
      role === 'host' &&
      screen === 'lobby' &&
      roomData?.status === 'waiting' &&
      roomData.players?.host?.ready &&
      roomData.players?.guest?.ready
    ) {
      const hostDeck = roomData.players.host.selectedDeck || roomData.deckId || 'dev';
      const guestDeck = roomData.players.guest.selectedDeck || roomData.deckId || 'dev';

      if (hostDeck === guestDeck) {
        // Both picked the same deck -> start directly on that deck
        updateRoomState(roomCode, {
          deckId: hostDeck,
          roulette: null,
          status: 'countdown',
        });
      } else {
        // Different decks -> launch random selector roulette between the two
        const winnerSlot = Math.random() < 0.5 ? 'host' : 'guest';
        const winnerDeck = winnerSlot === 'host' ? hostDeck : guestDeck;
        updateRoomState(roomCode, {
          deckId: winnerDeck,
          status: 'roulette',
          roulette: {
            hostDeck,
            guestDeck,
            winnerSlot,
            winnerDeck,
            startedAt: Date.now(),
          },
        });
      }
    }
  }, [mode, role, screen, roomData, roomCode]);

  // Deterministic decelerating roulette animation
  useEffect(() => {
    if (screen !== 'roulette' || !roomData?.roulette || leftPopup) return;
    const { winnerSlot } = roomData.roulette;
    let cancelled = false;
    let timer = null;
    let step = 0;

    // Choose starting side so the final step lands cleanly on winnerSlot
    const totalSteps = ROULETTE_DELAYS.length;
    const endIsOdd = (totalSteps - 1) % 2 === 1;
    const startSlot = endIsOdd
      ? winnerSlot === 'host'
        ? 'guest'
        : 'host'
      : winnerSlot;

    setRouletteDone(false);
    setRouletteHighlight(startSlot);

    const runStep = () => {
      if (cancelled) return;
      const currentSlot =
        step % 2 === 0 ? startSlot : startSlot === 'host' ? 'guest' : 'host';
      setRouletteHighlight(currentSlot);
      playSound(sfx.rouletteTick, step);

      if (step >= totalSteps - 1) {
        setRouletteDone(true);
        playSound(sfx.go);
        timer = setTimeout(() => {
          if (!cancelled && role === 'host') {
            updateRoomState(roomCode, { status: 'countdown' });
          }
        }, 1200);
        return;
      }

      const delay = ROULETTE_DELAYS[step];
      step += 1;
      timer = setTimeout(runStep, delay);
    };

    timer = setTimeout(runStep, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [screen, roomData?.roulette?.startedAt, leftPopup, role, roomCode]);

  // Countdown timer
  useEffect(() => {
    if (screen !== 'countdown' || leftPopup) return;
    if (countdown <= 0) {
      playSound(sfx.go);
      startTimeRef.current = performance.now();
      screenRef.current = 'playing';
      setScreen('playing');
      if (mode === 'local1v1' && role === 'host') {
        updateRoomState(roomCode, { status: 'playing' });
      }
      return;
    }
    playSound(sfx.tick);
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [screen, countdown, leftPopup]);

  // Elapsed match clock
  useEffect(() => {
    if (screen !== 'playing' || leftPopup) return;
    const id = setInterval(() => {
      setElapsedMs(performance.now() - startTimeRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [screen, leftPopup]);

  // Lockout progress bar animation
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(0);
        setLockProgress(0);
      } else {
        setLockProgress((remaining / LOCKOUT_MS) * 100);
      }
    }, 30);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Bot opponent simulation (StrictMode-safe single timer loop)
  useEffect(() => {
    if (screen !== 'playing' || mode !== 'bot') return;
    const profile = BOT_PROFILES[botLevel] || BOT_PROFILES.easy;
    let cancelled = false;
    let timer = null;
    let botScore = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = profile.minMs + Math.random() * (profile.maxMs - profile.minMs);
      timer = setTimeout(() => {
        if (cancelled) return;
        const isCorrect = Math.random() < profile.accuracy;
        if (isCorrect) {
          botScore += 1;
          setOpponentScore(botScore);
          if (botScore >= targetCount) {
            setShowQuitConfirm(false);
            setWinner('opponent');
            playSound(sfx.lose);
            screenRef.current = 'results';
            setScreen('results');
          } else {
            scheduleNext();
          }
        } else {
          timer = setTimeout(() => {
            if (!cancelled) scheduleNext();
          }, LOCKOUT_MS);
        }
      }, delay);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [screen, mode, botLevel, targetCount]);

  // Keyboard shortcuts: A / ArrowLeft -> left bin, D / ArrowRight -> right bin, Escape -> quit popup
  useEffect(() => {
    if (screen !== 'playing' || leftPopup) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowQuitConfirm((prev) => !prev);
        return;
      }
      if (showQuitConfirm || e.repeat) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        handleSort('left');
      } else if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        handleSort('right');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function resetLocalStats() {
    setScore(0);
    setOpponentScore(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setElapsedMs(0);
    setWinner(null);
    setLockedUntil(0);
    setLockProgress(0);
    setDragState({ active: false, dx: 0, dy: 0 });
  }

  function startBotMatch() {
    setMode('bot');
    setLeftPopup(null);
    setShowQuitConfirm(false);
    const seed = Math.floor(Math.random() * 1_000_000_000);
    setQueue(createSeededQueue(deckId, targetCount, seed));
    resetLocalStats();
    setCountdown(3);
    screenRef.current = 'countdown';
    setScreen('countdown');
  }

  async function handleHostRoom() {
    setRoomError('');
    setLeftPopup(null);
    setShowQuitConfirm(false);
    try {
      const code = generateRoomCode();
      const created = await createRoom({
        code,
        hostName: callsign.trim() || 'Player 1',
        deckId,
        targetCount,
      });
      setMode('local1v1');
      setRole('host');
      setRoomCode(code);
      setRoomData(created);
      screenRef.current = 'lobby';
      setScreen('lobby');
    } catch (err) {
      setRoomError(err.message || 'Could not create room.');
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setRoomError('');
    setLeftPopup(null);
    setShowQuitConfirm(false);
    const code = joinInput.trim().toUpperCase();
    if (code.length !== 4) {
      setRoomError('Enter a 4-character room code.');
      return;
    }
    try {
      const joined = await joinRoom({
        code,
        guestName: callsign.trim() || 'Player 2',
        preferredDeck: deckId,
      });
      setMode('local1v1');
      setRole('guest');
      setRoomCode(code);
      setTargetCount(joined.targetCount);
      setRoomData(joined);
      screenRef.current = 'lobby';
      setScreen('lobby');
    } catch (err) {
      setRoomError(err.message || 'Could not join room.');
    }
  }

  async function handleLobbyDeckPick(pickedDeckId) {
    if (!roomData || !roomCode) return;
    setDeckId(pickedDeckId);
    await updatePlayerState(roomCode, role, {
      selectedDeck: pickedDeckId,
      ready: false,
    });
  }

  async function toggleReady() {
    if (!roomData || !roomCode) return;
    const currentReady = Boolean(roomData.players?.[role]?.ready);
    await updatePlayerState(roomCode, role, { ready: !currentReady });
  }

  function handleSort(side) {
    if (screen !== 'playing' || isModalOpen || !currentItem || lockedUntil > Date.now()) return;

    const isCorrect = currentItem.category === side;
    setBinFlash({ side, ok: isCorrect });
    setTimeout(() => setBinFlash(null), 220);

    if (isCorrect) {
      const nextScore = score + 1;
      const nextStreak = streak + 1;
      const nextBest = Math.max(bestStreak, nextStreak);
      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak(nextBest);
      playSound(sfx.correct, nextStreak);

      if (mode === 'local1v1') {
        updatePlayerState(roomCode, role, {
          score: nextScore,
          streak: nextStreak,
          bestStreak: nextBest,
        });
      }

      if (nextScore >= targetCount) {
        if (mode === 'local1v1') {
          updateRoomState(roomCode, { status: 'finished', winner: role });
        } else {
          setShowQuitConfirm(false);
          setWinner('self');
          playSound(sfx.win);
          screenRef.current = 'results';
          setScreen('results');
        }
      }
    } else {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setStreak(0);
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setLockProgress(100);
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 300);
      playSound(sfx.wrong);

      if (mode === 'local1v1') {
        updatePlayerState(roomCode, role, { mistakes: nextMistakes, streak: 0 });
      }
    }
  }

  // Pointer drag-and-drop handlers (vertical swipe on mobile, horizontal drag on PC)
  function onPointerDown(e) {
    if (screen !== 'playing' || isLocked || isModalOpen) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOriginRef.current = { x: e.clientX, y: e.clientY };
    setDragState({ active: true, dx: 0, dy: 0 });
  }

  function onPointerMove(e) {
    if (!dragState.active) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    setDragState({ active: true, dx, dy });
  }

  function onPointerUp(e) {
    if (!dragState.active) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    setDragState({ active: false, dx: 0, dy: 0 });

    const leftRect = leftBinRef.current?.getBoundingClientRect();
    const rightRect = rightBinRef.current?.getBoundingClientRect();

    const insideLeft =
      leftRect &&
      e.clientX >= leftRect.left &&
      e.clientX <= leftRect.right &&
      e.clientY >= leftRect.top &&
      e.clientY <= leftRect.bottom;

    const insideRight =
      rightRect &&
      e.clientX >= rightRect.left &&
      e.clientX <= rightRect.right &&
      e.clientY >= rightRect.top &&
      e.clientY <= rightRect.bottom;

    if (isMobile) {
      if (insideLeft || dy < -70) {
        handleSort('left');
      } else if (insideRight || dy > 70) {
        handleSort('right');
      }
    } else {
      if (insideLeft || dx < -95) {
        handleSort('left');
      } else if (insideRight || dx > 95) {
        handleSort('right');
      }
    }
  }

  async function handleRematch() {
    if (mode === 'bot') {
      startBotMatch();
      return;
    }
    const seed = Math.floor(Math.random() * 1_000_000_000);
    await updateRoomState(roomCode, {
      status: 'waiting',
      roulette: null,
      winner: null,
      seed,
      players: {
        host: {
          ...roomData.players.host,
          ready: false,
          score: 0,
          mistakes: 0,
          streak: 0,
          bestStreak: 0,
        },
        guest: roomData.players.guest
          ? {
              ...roomData.players.guest,
              ready: false,
              score: 0,
              mistakes: 0,
              streak: 0,
              bestStreak: 0,
            }
          : null,
      },
    });
  }

  function handleHeaderHomeClick() {
    if (screen === 'playing') {
      setShowQuitConfirm(true);
    } else {
      returnHome(true);
    }
  }

  function returnHome(notifyLeave = true) {
    if (notifyLeave && mode === 'local1v1' && roomCode) {
      const inMatch =
        screenRef.current === 'playing' ||
        screenRef.current === 'countdown' ||
        screenRef.current === 'roulette';
      leaveRoomSync(roomCode, role, inMatch);
    }
    resetLocalStats();
    setShowQuitConfirm(false);
    setLeftPopup(null);
    setRoomCode('');
    setRoomData(null);
    setRoomError('');
    setJoinInput('');
    screenRef.current = 'home';
    setScreen('home');
  }

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const totalAttempts = score + mistakes;
    const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 100;
    const seconds = Math.max(elapsedMs / 1000, 0.1);
    const avgSortSec = score > 0 ? (seconds / score).toFixed(2) : '0.00';
    const itemsPerSec = (score / seconds).toFixed(2);
    return { accuracy, avgSortSec, itemsPerSec, seconds: seconds.toFixed(1) };
  }, [score, mistakes, elapsedMs]);

  const selfPct = Math.min(100, Math.round((score / targetCount) * 100));
  const oppPct = Math.min(100, Math.round((opponentScore / targetCount) * 100));
  const currentBotProfile = BOT_PROFILES[botLevel] || BOT_PROFILES.easy;
  const oppName =
    mode === 'bot'
      ? `BOT (${currentBotProfile.label.toUpperCase()})`
      : roomData?.players?.[role === 'host' ? 'guest' : 'host']?.name || 'Opponent';

  const dragTilt = dragState.active ? Math.max(-14, Math.min(14, dragState.dx * 0.06)) : 0;
  const hoverSide = dragState.active
    ? isMobile
      ? dragState.dy < -50
        ? 'left'
        : dragState.dy > 50
        ? 'right'
        : null
      : dragState.dx < -65
      ? 'left'
      : dragState.dx > 65
      ? 'right'
      : null
    : null;

  const hostSelectedDeck = roomData?.players?.host?.selectedDeck || roomData?.deckId || 'dev';
  const guestSelectedDeck = roomData?.players?.guest?.selectedDeck || null;
  const myLobbyDeck = roomData?.players?.[role]?.selectedDeck || deckId;
  const decksConflict = Boolean(guestSelectedDeck && hostSelectedDeck !== guestSelectedDeck);

  return (
    <div className="min-h-screen flex flex-col text-[#f3f4f6]">
      {/* Top Bar */}
      <header className="border-b border-border bg-canvas/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={handleHeaderHomeClick}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <span className="w-2 h-2 rounded-full bg-player" />
            <span className="font-mono font-bold tracking-tight text-sm text-white group-hover:text-player transition-colors">
              SORTRUSH
            </span>
            <span className="hidden sm:inline-block font-mono text-[11px] text-muted border border-border px-1.5 py-0.5 rounded">
              v1.0
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-muted border border-border bg-surface px-2.5 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              LOCAL LIVE SYNC
            </span>
            <button
              onClick={() => setMuted((m) => !m)}
              className="p-2 rounded border border-border bg-surface text-muted hover:text-white hover:border-[#363c48] transition-colors"
              aria-label="Toggle sound"
            >
              <IconSound muted={muted} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        {screen === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Config */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-lg p-6 space-y-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted mb-1">
                  Real-Time Categorization Race
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Sort faster than your opponent.
                </h1>
                <p className="text-sm text-muted mt-1.5 hidden md:block">
                  Drag cards or press <kbd className="font-mono text-xs px-1.5 py-0.5 bg-elevated border border-border rounded text-white">A</kbd> /{' '}
                  <kbd className="font-mono text-xs px-1.5 py-0.5 bg-elevated border border-border rounded text-white">D</kbd>. Wrong sorts trigger a 1.5s lockout.
                </p>
                <p className="text-sm text-muted mt-1.5 block md:hidden">
                  Swipe cards up or down, or tap either bin. Wrong sorts trigger a 1.5s lockout.
                </p>
              </div>

              <div className="space-y-4 pt-2 border-t border-border">
                {/* Callsign */}
                <div>
                  <label className="block font-mono text-xs text-muted uppercase tracking-wider mb-1.5">
                    Callsign
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-player transition-colors"
                  />
                </div>

                {/* Deck Selection */}
                <div>
                  <label className="block font-mono text-xs text-muted uppercase tracking-wider mb-1.5">
                    Category Deck
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.values(DECKS).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDeckId(d.id)}
                        className={`text-left px-3 py-2.5 rounded border text-xs font-medium transition-colors ${
                          deckId === d.id
                            ? 'bg-elevated border-player text-white'
                            : 'bg-canvas border-border text-muted hover:text-white hover:border-[#363c48]'
                        }`}
                      >
                        <div className="font-semibold">{d.label}</div>
                        <div className="font-mono text-[10px] text-muted mt-0.5">
                          {d.items.length} items
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Queue Length */}
                <div>
                  <label className="block font-mono text-xs text-muted uppercase tracking-wider mb-1.5">
                    Target Queue
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUEUE_SIZES.map((n) => (
                      <button
                        key={n}
                        onClick={() => setTargetCount(n)}
                        className={`font-mono py-2 rounded border text-xs transition-colors ${
                          targetCount === n
                            ? 'bg-elevated border-player text-white'
                            : 'bg-canvas border-border text-muted hover:text-white'
                        }`}
                      >
                        {n} ITEMS
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Launch Modes */}
            <div className="lg:col-span-5 space-y-4">
              {/* Solo vs Bot */}
              <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                    Solo vs. Bot
                  </span>
                  <span className="font-mono text-[11px] text-muted">Instant Race</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(BOT_PROFILES).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setBotLevel(key)}
                      className={`font-mono py-1.5 rounded border text-xs transition-colors ${
                        botLevel === key
                          ? 'bg-elevated border-white text-white'
                          : 'bg-canvas border-border text-muted hover:text-white'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={startBotMatch}
                  className="w-full py-2.5 rounded bg-player text-[#0c0d10] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#7dd3fc] transition-colors"
                >
                  Start Practice Race
                </button>
              </div>

              {/* 1v1 Live Room */}
              <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                    1v1 Live Room
                  </span>
                  <span className="font-mono text-[11px] text-muted">2-Tab Live Sync</span>
                </div>

                <button
                  onClick={handleHostRoom}
                  className="w-full py-2.5 rounded bg-elevated border border-border text-white font-mono text-xs font-semibold uppercase tracking-wider hover:border-player transition-colors"
                >
                  Host New Room
                </button>

                <div className="flex items-center gap-2 text-muted font-mono text-[11px]">
                  <div className="h-px flex-1 bg-border" />
                  <span>OR JOIN</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleJoinRoom} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    className="flex-1 bg-canvas border border-border rounded px-3 py-2 font-mono text-sm uppercase tracking-widest text-white focus:outline-none focus:border-opponent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-opponent text-[#0c0d10] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#fb923c] transition-colors"
                  >
                    Join
                  </button>
                </form>

                {roomError && (
                  <p className="font-mono text-xs text-danger">{roomError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {screen === 'lobby' && roomData && (
          <div className="max-w-xl mx-auto w-full bg-surface border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono text-xs text-muted uppercase tracking-wider">Room Code</p>
                <p className="font-mono text-3xl font-bold tracking-widest text-white mt-0.5">
                  {roomCode}
                </p>
              </div>
              <div className="text-right font-mono text-xs text-muted space-y-1">
                <div>{roomData.targetCount} ITEMS</div>
                <div className={decksConflict ? 'text-opponent' : 'text-player'}>
                  {guestSelectedDeck
                    ? decksConflict
                      ? 'ROULETTE TIEBREAKER'
                      : 'MATCHED DECK'
                    : 'WAITING FOR GUEST'}
                </div>
              </div>
            </div>

            {/* Players List with Individual Deck Picks */}
            <div className="space-y-3">
              {['host', 'guest'].map((slot) => {
                const p = roomData.players?.[slot];
                const isSelf = slot === role;
                const pickedDeck = p?.selectedDeck ? DECKS[p.selectedDeck] : null;
                return (
                  <div
                    key={slot}
                    className="flex items-center justify-between bg-canvas border border-border rounded px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {p ? p.name : 'Open a second tab & join with code...'}
                        {isSelf && (
                          <span className="ml-2 font-mono text-[10px] text-player uppercase">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-muted mt-0.5">
                        <span className="uppercase">{slot}</span>
                        {pickedDeck && (
                          <span>
                            {' · '}
                            <strong className={slot === 'host' ? 'text-player' : 'text-opponent'}>
                              {pickedDeck.label}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs px-2.5 py-1 rounded border ${
                        p?.ready
                          ? 'border-success/50 bg-success/10 text-success'
                          : 'border-border bg-surface text-muted'
                      }`}
                    >
                      {p ? (p.ready ? 'READY' : 'NOT READY') : 'EMPTY'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Lobby Category Deck Picker */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs text-muted uppercase tracking-wider">
                  Pick Your Category Deck
                </label>
                <span className="font-mono text-[11px] text-muted">
                  {decksConflict
                    ? 'Different picks → Roulette chooses'
                    : 'Same pick → Starts directly'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.values(DECKS).map((d) => {
                  const isMine = myLobbyDeck === d.id;
                  const hostPicked = hostSelectedDeck === d.id;
                  const guestPicked = guestSelectedDeck === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleLobbyDeckPick(d.id)}
                      className={`text-left px-3 py-2.5 rounded border text-xs transition-colors ${
                        isMine
                          ? role === 'host'
                            ? 'bg-elevated border-player text-white'
                            : 'bg-elevated border-opponent text-white'
                          : 'bg-canvas border-border text-muted hover:text-white hover:border-[#363c48]'
                      }`}
                    >
                      <div className="font-semibold">{d.label}</div>
                      <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[10px]">
                        {hostPicked && (
                          <span className="px-1.5 py-0.5 rounded bg-player/15 text-player border border-player/30">
                            HOST
                          </span>
                        )}
                        {guestPicked && (
                          <span className="px-1.5 py-0.5 rounded bg-opponent/15 text-opponent border border-opponent/30">
                            GUEST
                          </span>
                        )}
                        {!hostPicked && !guestPicked && (
                          <span className="text-muted">{d.items.length} items</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => returnHome(true)}
                className="px-4 py-2.5 rounded border border-border bg-canvas font-mono text-xs text-muted hover:text-white transition-colors"
              >
                Leave
              </button>
              <button
                onClick={toggleReady}
                className={`flex-1 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  roomData.players?.[role]?.ready
                    ? 'bg-elevated border border-border text-white'
                    : 'bg-player text-[#0c0d10] hover:bg-[#7dd3fc]'
                }`}
              >
                {roomData.players?.[role]?.ready ? 'Cancel Ready' : 'Ready Up'}
              </button>
            </div>
          </div>
        )}

        {screen === 'roulette' && roomData?.roulette && (
          <div className="max-w-xl mx-auto w-full bg-surface border border-border rounded-lg p-6 sm:p-8 space-y-6 text-center">
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                Different Decks Selected
              </p>
              <h2 className="font-mono text-2xl font-bold text-white tracking-tight">
                {rouletteDone ? 'DECK SELECTED' : 'RANDOM DECK ROULETTE'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['host', 'guest'].map((slot) => {
                const pickedId =
                  slot === 'host'
                    ? roomData.roulette.hostDeck
                    : roomData.roulette.guestDeck;
                const d = DECKS[pickedId] || DECKS.dev;
                const playerName =
                  roomData.players?.[slot]?.name || (slot === 'host' ? 'Host' : 'Guest');
                const isActive = rouletteHighlight === slot;
                const isWinner = rouletteDone && roomData.roulette.winnerSlot === slot;

                return (
                  <div
                    key={slot}
                    className={`rounded-lg border p-5 transition-all duration-100 ${
                      isWinner
                        ? 'border-success bg-success/10 scale-[1.03]'
                        : isActive
                        ? slot === 'host'
                          ? 'border-player bg-player/10 scale-[1.02]'
                          : 'border-opponent bg-opponent/10 scale-[1.02]'
                        : 'border-border bg-canvas opacity-45'
                    }`}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {slot} · {playerName}
                    </div>
                    <div className="text-lg font-semibold text-white mt-2">{d.label}</div>
                    <div className="font-mono text-[11px] text-muted mt-1">
                      {d.leftLabel} vs {d.rightLabel}
                    </div>
                    <div className="mt-3 h-5 flex items-center justify-center">
                      {isWinner ? (
                        <span className="font-mono text-[11px] font-bold text-success uppercase tracking-wider">
                          WINNER · STARTING MATCH
                        </span>
                      ) : isActive ? (
                        <span className="font-mono text-[11px] text-white uppercase tracking-wider">
                          SELECTING...
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="font-mono text-xs text-muted">
              {rouletteDone
                ? `Launching ${DECKS[roomData.roulette.winnerDeck]?.label}...`
                : 'Picking randomly between host and guest decks...'}
            </p>
          </div>
        )}

        {screen === 'countdown' && (
          <div className="text-center space-y-3 py-20">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              {deck.label} · {targetCount} Items
            </p>
            <div className="font-mono text-7xl font-bold text-white tracking-tight">
              {countdown > 0 ? countdown : 'GO'}
            </div>
            <p className="font-mono text-xs text-muted hidden md:block">
              [A / ←] {deck.leftLabel} &nbsp;·&nbsp; [D / →] {deck.rightLabel}
            </p>
            <p className="font-mono text-xs text-muted block md:hidden">
              [↑ UP] {deck.leftLabel} &nbsp;·&nbsp; [↓ DOWN] {deck.rightLabel}
            </p>
          </div>
        )}

        {screen === 'playing' && (
          <div className="space-y-6">
            {/* Real-Time Progress Header */}
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player Bar */}
                <div>
                  <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                    <span className="text-player font-semibold truncate">{callsign || 'YOU'}</span>
                    <span className="text-white">
                      {score}/{targetCount} <span className="text-muted">({selfPct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-canvas border border-border rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-player transition-all duration-150 ease-out"
                      style={{ width: `${selfPct}%` }}
                    />
                  </div>
                </div>

                {/* Opponent Bar */}
                <div>
                  <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                    <span className="text-opponent font-semibold truncate">{oppName}</span>
                    <span className="text-white">
                      {opponentScore}/{targetCount} <span className="text-muted">({oppPct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-canvas border border-border rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-opponent transition-all duration-150 ease-out"
                      style={{ width: `${oppPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Live Telemetry Strip & Quit Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border font-mono text-xs text-muted">
                <div className="flex items-center gap-4">
                  <span>
                    TIME <strong className="text-white">{telemetry.seconds}s</strong>
                  </span>
                  <span>
                    STREAK <strong className="text-white">{streak}</strong>
                  </span>
                  <span>
                    ERRORS <strong className={mistakes > 0 ? 'text-danger' : 'text-white'}>{mistakes}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {mode === 'local1v1' && <span>ROOM {roomCode}</span>}
                  <button
                    onClick={() => setShowQuitConfirm(true)}
                    className="px-2.5 py-1 rounded border border-border bg-canvas text-muted hover:text-danger hover:border-danger/60 transition-colors uppercase text-[11px]"
                  >
                    Quit
                  </button>
                </div>
              </div>
            </div>

            {/* Arena */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              {/* Left (PC) / Top (Mobile) Drop Bin */}
              <button
                ref={leftBinRef}
                onClick={() => handleSort('left')}
                disabled={isLocked || isModalOpen}
                className={`md:col-span-4 rounded-lg border p-4 md:p-6 flex flex-col items-center justify-center text-center transition-all min-h-[110px] md:min-h-[280px] ${
                  binFlash?.side === 'left'
                    ? binFlash.ok
                      ? 'border-success bg-success/10'
                      : 'border-danger bg-danger/10'
                    : hoverSide === 'left'
                    ? 'border-player bg-player/10'
                    : 'border-border bg-surface hover:border-player/60'
                } ${isLocked || isModalOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* PC Indicator */}
                <span className="hidden md:inline-flex font-mono text-[11px] text-muted border border-border bg-canvas px-2 py-0.5 rounded mb-3 items-center gap-1">
                  <IconLeft className="w-3.5 h-3.5" /> A / LEFT
                </span>
                {/* Mobile Indicator */}
                <span className="inline-flex md:hidden font-mono text-[11px] text-muted border border-border bg-canvas px-2 py-0.5 rounded mb-2 items-center gap-1">
                  <IconUp className="w-3.5 h-3.5" /> UP
                </span>
                <span className="font-mono text-lg font-bold tracking-wider text-white">
                  {deck.leftLabel}
                </span>
                <span className="text-xs text-muted mt-1">{deck.leftHint}</span>
              </button>

              {/* Center Card Stack */}
              <div className="md:col-span-4 flex flex-col items-center justify-center gap-3 relative min-h-[240px] md:min-h-[280px]">
                {/* Visible Next Up Bar */}
                <div className="w-full max-w-[280px] min-h-[42px] flex items-center justify-center">
                  {nextItem ? (
                    <div className="w-full bg-surface border border-border rounded-md px-3.5 py-2 flex items-center justify-between gap-2 select-none pointer-events-none">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted shrink-0">
                        Next Up
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {nextItem.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full bg-canvas/70 border border-dashed border-border rounded-md px-3.5 py-2 text-center select-none pointer-events-none">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        Final Card
                      </span>
                    </div>
                  )}
                </div>

                {/* Active Draggable Card */}
                {currentItem && (
                  <div
                    key={`${currentItem.id}-${score}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{
                      transform: dragState.active
                        ? `translate3d(${dragState.dx}px, ${dragState.dy}px, 0) rotate(${dragTilt}deg)`
                        : undefined,
                    }}
                    className={`w-full max-w-[280px] bg-elevated border rounded-lg p-6 text-center select-none touch-none relative z-10 ${
                      dragState.active ? 'cursor-grabbing border-player' : 'cursor-grab border-[#343a46] animate-card-pop'
                    } ${shakeCard ? 'animate-shake border-danger' : ''}`}
                  >
                    <div className="font-mono text-[11px] text-muted uppercase tracking-wider">
                      Item {score + 1} of {targetCount}
                    </div>
                    <div className="text-2xl font-semibold text-white mt-3 tracking-tight">
                      {currentItem.name}
                    </div>
                    <div className="inline-block font-mono text-[11px] text-muted bg-canvas border border-border px-2.5 py-1 rounded mt-3">
                      {currentItem.tag}
                    </div>

                    {/* Lockout Overlay Bar */}
                    {isLocked && (
                      <div className="mt-5 space-y-1.5">
                        <div className="font-mono text-[11px] text-danger uppercase tracking-wider">
                          Wrong bin · Locked (1.5s)
                        </div>
                        <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                          <div
                            className="h-full bg-danger transition-all duration-75"
                            style={{ width: `${lockProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right (PC) / Bottom (Mobile) Drop Bin */}
              <button
                ref={rightBinRef}
                onClick={() => handleSort('right')}
                disabled={isLocked || isModalOpen}
                className={`md:col-span-4 rounded-lg border p-4 md:p-6 flex flex-col items-center justify-center text-center transition-all min-h-[110px] md:min-h-[280px] ${
                  binFlash?.side === 'right'
                    ? binFlash.ok
                      ? 'border-success bg-success/10'
                      : 'border-danger bg-danger/10'
                    : hoverSide === 'right'
                    ? 'border-opponent bg-opponent/10'
                    : 'border-border bg-surface hover:border-opponent/60'
                } ${isLocked || isModalOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* PC Indicator */}
                <span className="hidden md:inline-flex font-mono text-[11px] text-muted border border-border bg-canvas px-2 py-0.5 rounded mb-3 items-center gap-1">
                  D / RIGHT <IconRight className="w-3.5 h-3.5" />
                </span>
                {/* Mobile Indicator */}
                <span className="inline-flex md:hidden font-mono text-[11px] text-muted border border-border bg-canvas px-2 py-0.5 rounded mb-2 items-center gap-1">
                  DOWN <IconDown className="w-3.5 h-3.5" />
                </span>
                <span className="font-mono text-lg font-bold tracking-wider text-white">
                  {deck.rightLabel}
                </span>
                <span className="text-xs text-muted mt-1">{deck.rightHint}</span>
              </button>
            </div>
          </div>
        )}

        {screen === 'results' && (
          <div className="max-w-2xl mx-auto w-full bg-surface border border-border rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  Match Complete · {deck.label}
                </p>
                <h2
                  className={`font-mono text-3xl font-bold tracking-tight mt-1 ${
                    winner === 'self' ? 'text-player' : 'text-opponent'
                  }`}
                >
                  {winner === 'self' ? 'VICTORY' : 'DEFEAT'}
                </h2>
              </div>
              <div className="text-right font-mono text-xs text-muted">
                <div>
                  YOU: <strong className="text-white">{score}/{targetCount}</strong>
                </div>
                <div className="mt-1">
                  {oppName}: <strong className="text-white">{opponentScore}/{targetCount}</strong>
                </div>
              </div>
            </div>

            {/* Post-Match Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Accuracy', value: `${telemetry.accuracy}%` },
                { label: 'Avg Sort', value: `${telemetry.avgSortSec}s` },
                { label: 'Speed', value: `${telemetry.itemsPerSec}/s` },
                { label: 'Best Streak', value: String(bestStreak) },
                { label: 'Mistakes', value: String(mistakes) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-canvas border border-border rounded p-3 text-center"
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {stat.label}
                  </div>
                  <div className="font-mono text-lg font-bold text-white mt-1">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleRematch}
                className="flex-1 py-2.5 rounded bg-player text-[#0c0d10] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#7dd3fc] transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => returnHome(true)}
                className="px-5 py-2.5 rounded border border-border bg-canvas font-mono text-xs text-white hover:border-[#363c48] transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Quit Match Confirmation Modal */}
      {showQuitConfirm && !leftPopup && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-5">
            <div className="space-y-1.5">
              <p className="font-mono text-xs uppercase tracking-widest text-danger">
                Leave Match
              </p>
              <h3 className="text-lg font-semibold text-white">
                Are you sure you want to quit?
              </h3>
              <p className="text-sm text-muted">
                {mode === 'local1v1'
                  ? 'Quitting now will end the live match for both players and return everyone to the main menu.'
                  : 'Your current match progress will be lost and you will return to the main menu.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2.5 rounded border border-border bg-canvas font-mono text-xs font-semibold uppercase tracking-wider text-white hover:border-player transition-colors"
              >
                Back to Game
              </button>
              <button
                onClick={() => returnHome(true)}
                className="flex-1 py-2.5 rounded bg-danger text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-red-500 transition-colors"
              >
                Quit Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opponent / Host Left Modal */}
      {leftPopup && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-5">
            <div className="space-y-1.5">
              <p className="font-mono text-xs uppercase tracking-widest text-opponent">
                {leftPopup.inMatch ? 'Match Ended' : 'Room Closed'}
              </p>
              <h3 className="text-lg font-semibold text-white">
                {leftPopup.role === 'host'
                  ? leftPopup.inMatch
                    ? 'Host Player Left the Game Match'
                    : 'Host Left the Room'
                  : leftPopup.inMatch
                  ? 'Opponent Left the Game Match'
                  : 'Opponent Left the Room'}
              </h3>
              <p className="text-sm text-muted">
                <strong className="text-white">{leftPopup.name}</strong> has left the{' '}
                {leftPopup.inMatch ? 'game match' : 'session'}. Returning back to the main menu to
                start a new match or join another host.
              </p>
            </div>
            <button
              onClick={() => returnHome(false)}
              className="w-full py-2.5 rounded bg-player text-[#0c0d10] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#7dd3fc] transition-colors"
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
