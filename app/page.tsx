'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getCurrentSession,
  formatUKTime,
  getNextEvent,
  Session,
} from '@/lib/sessions';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import {
  loadState,
  saveState,
  incrementVisitCount,
  AppState,
  ScanResult,
} from '@/lib/storage';

import SessionHeader from '@/components/SessionHeader';
import ActionHero from '@/components/ActionHero';
import ThreeNumbers from '@/components/ThreeNumbers';
import SignalBar from '@/components/SignalBar';
import WaitMode from '@/components/WaitMode';
import NarrativeStrip from '@/components/NarrativeStrip';
import Journal from '@/components/Journal';
import SignalDetail from '@/components/SignalDetail';

type Screen = 'main' | 'detail' | 'journal';

interface PriceData {
  btc: number | null;
  gbpusd: number | null;
  spx: number | null;
  eth: number | null;
  ftse: number | null;
  gold: number | null;
  vix: number | null;
  btcChange: number | null;
}

function fixJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return raw;
  return raw.slice(start, end + 1);
}

async function sendLocalNotification(title: string, body: string) {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'NOTIFY', title, body });
  } catch {
    try { new Notification(title, { body, icon: '/icon-192.png' }); } catch {}
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export default function SignalBotApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [timeStr, setTimeStr] = useState('');
  const [nextEvent, setNextEvent] = useState({ label: '', minutes: 0 });
  const [screen, setScreen] = useState<Screen>('main');
  const [detailIndex, setDetailIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanResult: ScanResult | null = appState?.lastScanResult ?? null;
  const isWaitMode =
    !scanResult ||
    scanResult.action === 'WAIT' ||
    scanResult.signal_strength < 7;

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const state = loadState();
    const visits = incrementVisitCount();
    setAppState(state);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {});
    }

    if (visits >= 3) requestNotificationPermission();
  }, []);

  // ── Clock tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      const now = new Date();
      setSession(getCurrentSession(now));
      setTimeStr(formatUKTime(now));
      setNextEvent(getNextEvent(now));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Price refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok) return;
        const data = await res.json();
        setPrices(data);
        if (data.btcChange !== null && Math.abs(data.btcChange) > 3) {
          const dir = data.btcChange > 0 ? '▲' : '▼';
          sendLocalNotification(
            `BTC ${dir} ${Math.abs(data.btcChange).toFixed(1)}%`,
            `BTC/USD: $${data.btc?.toLocaleString()}`
          );
        }
      } catch {}
    }
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── AI Scan ────────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    if (!session || isScanning) return;
    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(session.name, timeStr),
          user: buildUserPrompt(session.name),
        }),
      });

      const data = await res.json();

      let rawText = '';
      if (data.content) {
        for (const block of data.content) {
          if (block.type === 'text') rawText += block.text;
        }
      } else if (data.error) {
        throw new Error(data.error.message || 'API error');
      }

      const jsonStr = fixJson(rawText);
      const result: ScanResult = JSON.parse(jsonStr);

      const current = loadState();
      const isWait = result.action === 'WAIT' || result.signal_strength < 7;
      const newState: AppState = {
        ...current,
        lastScan: Date.now(),
        lastScanResult: result,
        patientStreak: isWait ? (current.patientStreak || 0) + 1 : 0,
      };
      saveState(newState);
      setAppState(newState);

      if (result.signal_strength >= 8 && result.action !== 'WAIT') {
        sendLocalNotification(
          `${result.action} ${result.primary_asset} [${result.signal_strength}/10]`,
          result.reason
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd skanu';
      setScanError(msg.slice(0, 80));
    } finally {
      setIsScanning(false);
    }
  }, [session, timeStr, isScanning]);

  // ── Swipe gestures ─────────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function showHint(hint: string) {
    setSwipeHint(hint);
    if (swipeHintTimer.current) clearTimeout(swipeHintTimer.current);
    swipeHintTimer.current = setTimeout(() => setSwipeHint(null), 1200);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 50) return;

    if (screen !== 'main') return;

    if (absDx > absDy) {
      // Horizontal → detail
      if (scanResult?.signals?.length) {
        setDetailIndex(dx < 0 ? 1 : 0);
        setScreen('detail');
        showHint('Szczegóły →');
      }
    } else {
      if (dy < 0) {
        // Up → journal
        setScreen('journal');
        showHint('P&L ↑');
      } else {
        // Down → scan
        showHint('Skanowanie ↓');
        runScan();
      }
    }
  }

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (!appState || !session) {
    return (
      <div
        style={{
          background: '#050505',
          color: '#5DCAA5',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          fontSize: 14,
          letterSpacing: '0.2em',
        }}
      >
        SIGNAL BOT...
      </div>
    );
  }

  // ── Journal screen ─────────────────────────────────────────────────────────
  if (screen === 'journal') {
    return (
      <div style={{ height: '100dvh', background: '#050505', overflow: 'hidden' }}>
        <Journal
          state={appState}
          onUpdate={() => setAppState(loadState())}
          onClose={() => setScreen('main')}
        />
      </div>
    );
  }

  // ── Signal detail screen ───────────────────────────────────────────────────
  if (screen === 'detail' && scanResult?.signals?.length) {
    const signals = scanResult.signals;
    const idx = Math.min(detailIndex, signals.length - 1);
    const sig = signals[idx];
    const enriched = {
      ...sig,
      ...(idx === 0
        ? { entry: scanResult.entry, stop: scanResult.stop, target: scanResult.target }
        : {}),
    };

    return (
      <div style={{ height: '100dvh', background: '#050505', overflow: 'hidden' }}>
        <SignalDetail
          signal={enriched}
          currentIndex={idx}
          total={signals.length}
          onClose={() => setScreen('main')}
          onPrev={() => setDetailIndex((i) => (i - 1 + signals.length) % signals.length)}
          onNext={() => setDetailIndex((i) => (i + 1) % signals.length)}
        />
      </div>
    );
  }

  // ── Main screen ────────────────────────────────────────────────────────────
  const DEFAULT_RESULT: ScanResult = {
    action: 'WAIT',
    primary_asset: '—',
    signal_strength: 0,
    entry: '—',
    stop: '—',
    target: '—',
    reason: 'Swipe ↓ aby uruchomić skan',
    narrative: 'Naciśnij ⟳ lub przesuń w dół aby skanować rynek.',
    signals: [],
    countdown_event: nextEvent,
    session_plan: '',
  };

  const result = scanResult ?? DEFAULT_RESULT;
  const signals = result.signals ?? [];

  return (
    <div
      className="no-select"
      style={{
        height: '100dvh',
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Status / session bar */}
      <SessionHeader session={session} timeStr={timeStr} nextEvent={nextEvent} />

      {isWaitMode && scanResult ? (
        /* ── WAIT MODE ────────────────────────────────────────────────────── */
        <>
          <NarrativeStrip text={result.narrative} />
          <WaitMode
            patientStreak={appState.patientStreak}
            nextEvent={nextEvent}
            narrative={result.narrative}
            signals={signals}
          />
        </>
      ) : (
        /* ── ACTIVE SIGNAL MODE ───────────────────────────────────────────── */
        <>
          <ActionHero result={result} nextEvent={nextEvent} />
          <NarrativeStrip text={result.narrative} sessionPlan={result.session_plan} />
          <ThreeNumbers prices={prices} sessionName={session.name} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {signals.slice(0, 4).map((sig, i) => (
              <SignalBar
                key={i}
                asset={sig.asset}
                direction={sig.direction}
                strength={sig.strength}
                reason={sig.reason}
                onClick={() => {
                  setDetailIndex(i);
                  setScreen('detail');
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom hint bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          borderTop: '1px solid #1A1A1A',
          fontSize: 11,
          color: '#333',
          fontFamily: 'monospace',
          minHeight: 40,
          flexShrink: 0,
        }}
      >
        <span>← detale</span>
        <span style={{ color: isScanning ? '#EF9F27' : '#333' }}>
          {isScanning ? '● SKANOWANIE...' : '↓ nowy skan'}
        </span>
        <span>↑ P&amp;L</span>
      </div>

      {/* Scan error toast */}
      {scanError && (
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            left: 16,
            right: 80,
            background: '#D85A3022',
            border: '1px solid #D85A3044',
            color: '#D85A30',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          ⚠ {scanError}
        </div>
      )}

      {/* Swipe feedback overlay */}
      {swipeHint && (
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#111111ee',
            border: '1px solid #222',
            color: '#888',
            padding: '12px 24px',
            borderRadius: 12,
            fontSize: 13,
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          {swipeHint}
        </div>
      )}

      {/* Scan FAB — fallback for desktop / non-swipe */}
      <button
        onClick={runScan}
        disabled={isScanning}
        aria-label="Uruchom skan"
        style={{
          position: 'absolute',
          bottom: 52,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isScanning ? '#111' : '#5DCAA522',
          border: `1px solid ${isScanning ? '#1A1A1A' : '#5DCAA544'}`,
          color: isScanning ? '#333' : '#5DCAA5',
          fontSize: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isScanning ? 'not-allowed' : 'pointer',
        }}
      >
        {isScanning ? '◌' : '⟳'}
      </button>
    </div>
  );
}
