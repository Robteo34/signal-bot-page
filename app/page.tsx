'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentSession, formatUKTime, getNextEvent, Session } from '@/lib/sessions';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import { loadState, saveState, incrementVisitCount, AppState, ScanResult } from '@/lib/storage';

import SessionHeader from '@/components/SessionHeader';
import ActionHero from '@/components/ActionHero';
import ThreeNumbers from '@/components/ThreeNumbers';
import SignalBar from '@/components/SignalBar';
import WaitMode from '@/components/WaitMode';
import NarrativeStrip from '@/components/NarrativeStrip';
import Journal from '@/components/Journal';
import SignalDetail from '@/components/SignalDetail';
import XSentimentStrip from '@/components/XSentimentStrip';
import MacroEventsStrip from '@/components/MacroEventsStrip';
import TopSharesCard from '@/components/TopSharesCard';
import IGTipsCard from '@/components/IGTipsCard';
import CryptoSection from '@/components/CryptoSection';

type Screen = 'main' | 'detail' | 'journal';

interface PriceData {
  btc: number | null; gbpusd: number | null; spx: number | null;
  eth: number | null; ftse: number | null; gold: number | null;
  vix: number | null; btcChange: number | null;
}

function fixJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return raw.slice(start, end + 1);
}

async function sendLocalNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'NOTIFY', title, body });
  } catch {
    try { new Notification(title, { body, icon: '/icon-192.png' }); } catch {}
  }
}

// ─── Scan timestamp ────────────────────────────────────────────────────────────
function timeSince(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s temu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m temu`;
  return `${Math.floor(diff / 3600)}h temu`;
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
  const [scanAge, setScanAge] = useState('');

  // Swipe state (horizontal only — no conflict with vertical scroll)
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const scanResult: ScanResult | null = appState?.lastScanResult ?? null;
  const isWaitMode = !scanResult || scanResult.action === 'WAIT' || scanResult.signal_strength < 7;

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const state = loadState();
    const visits = incrementVisitCount();
    setAppState(state);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }
    if (visits >= 3 && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Clock ───────────────────────────────────────────────────────────────────
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

  // ── Scan age counter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appState?.lastScan) return;
    const id = setInterval(() => setScanAge(timeSince(appState.lastScan!)), 10_000);
    setScanAge(timeSince(appState.lastScan));
    return () => clearInterval(id);
  }, [appState?.lastScan]);

  // ── Prices ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok) return;
        const data = await res.json();
        setPrices(data);
        if (data.btcChange != null && Math.abs(data.btcChange) > 3) {
          const dir = data.btcChange > 0 ? '▲' : '▼';
          sendLocalNotification(`BTC ${dir} ${Math.abs(data.btcChange).toFixed(1)}%`, `$${data.btc?.toLocaleString()}`);
        }
      } catch {}
    }
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── AI Scan ─────────────────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      let rawText = '';
      for (const block of data.content ?? []) {
        if (block.type === 'text') rawText += block.text;
      }
      const result: ScanResult = JSON.parse(fixJson(rawText));

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
      setScanAge(timeSince(Date.now()));

      if (result.signal_strength >= 8 && result.action !== 'WAIT') {
        sendLocalNotification(
          `${result.action} ${result.primary_asset} [${result.signal_strength}/10]`,
          result.reason
        );
      }
    } catch (err: unknown) {
      setScanError((err instanceof Error ? err.message : String(err)).slice(0, 100));
    } finally {
      setIsScanning(false);
    }
  }, [session, timeStr, isScanning]);

  // ── Horizontal swipe for signal detail ─────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current || screen !== 'main') return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (scanResult?.signals?.length) {
      setDetailIndex(dx < 0 ? 1 : 0);
      setScreen('detail');
    }
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!appState || !session) {
    return (
      <div style={{ background: '#050505', color: '#5DCAA5', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', fontSize: 13, letterSpacing: '0.2em' }}>
        SIGNAL BOT...
      </div>
    );
  }

  // ── Journal screen ──────────────────────────────────────────────────────────
  if (screen === 'journal') {
    return (
      <div style={{ height: '100dvh', background: '#050505', overflow: 'hidden' }}>
        <Journal state={appState} onUpdate={() => setAppState(loadState())} onClose={() => setScreen('main')} />
      </div>
    );
  }

  // ── Signal detail screen ────────────────────────────────────────────────────
  if (screen === 'detail' && scanResult?.signals?.length) {
    const signals = scanResult.signals;
    const idx = Math.min(detailIndex, signals.length - 1);
    const sig = signals[idx];
    const enriched = {
      ...sig,
      ...(idx === 0 ? { entry: scanResult.entry, stop: scanResult.stop, target: scanResult.target } : {}),
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

  // ── Main screen ─────────────────────────────────────────────────────────────
  const DEFAULT_RESULT: ScanResult = {
    action: 'WAIT', primary_asset: '—', signal_strength: 0,
    entry: '—', stop: '—', target: '—',
    reason: 'Naciśnij ⟳ aby skanować rynek',
    narrative: 'Oczekiwanie na skan rynkowy.',
    session_plan: 'Uruchom skan aby zobaczyć analizę.',
    signals: [], countdown_event: nextEvent,
  };
  const result = scanResult ?? DEFAULT_RESULT;
  const igSignals = (result.signals ?? []).filter((s) => s.platform !== 'CRYPTO');
  const allSignals = result.signals ?? [];

  return (
    <div
      style={{ height: '100dvh', background: '#050505', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Fixed top ──────────────────────────────────────────────────────── */}
      <SessionHeader session={session} timeStr={timeStr} nextEvent={nextEvent} />

      {result.x_sentiment && <XSentimentStrip sentiment={result.x_sentiment} />}
      {result.macro_events_today?.length ? <MacroEventsStrip events={result.macro_events_today} /> : null}

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {isWaitMode && scanResult ? (
          /* ── WAIT MODE ────────────────────────────────────────────────────── */
          <>
            <NarrativeStrip text={result.narrative} sessionPlan={result.session_plan} />
            <WaitMode
              patientStreak={appState.patientStreak}
              nextEvent={nextEvent}
              narrative={result.wait_mode_reason ?? result.narrative}
              signals={allSignals}
            />
          </>
        ) : (
          /* ── ACTIVE SIGNAL MODE ───────────────────────────────────────────── */
          <>
            <ActionHero result={result} nextEvent={nextEvent} />
            <NarrativeStrip text={result.narrative} sessionPlan={result.session_plan} />
            <ThreeNumbers prices={prices} sessionName={session.name} />
          </>
        )}

        {/* ── IG Signals (always shown) ──────────────────────────────────── */}
        {igSignals.length > 0 && (
          <div>
            <div style={{ padding: '6px 12px 2px', fontSize: 9, fontFamily: 'monospace', color: '#333', letterSpacing: '0.1em' }}>
              IG SPREAD BET SIGNALS
            </div>
            {igSignals.map((sig, i) => (
              <SignalBar
                key={i}
                asset={sig.asset}
                direction={sig.direction}
                strength={sig.strength}
                reason={sig.reason}
                platform={sig.platform}
                overnight_risk={sig.overnight_risk}
                onClick={() => { setDetailIndex(i); setScreen('detail'); }}
              />
            ))}
          </div>
        )}

        {/* ── Top shares ─────────────────────────────────────────────────── */}
        {result.top_shares && (
          <TopSharesCard
            uk={result.top_shares.uk ?? []}
            us={result.top_shares.us ?? []}
            eu={result.top_shares.eu ?? []}
          />
        )}

        {/* ── Crypto (non-IG) ─────────────────────────────────────────────── */}
        {result.crypto_update && (
          <CryptoSection btc={result.crypto_update.btc} eth={result.crypto_update.eth} />
        )}

        {/* ── IG Tips ─────────────────────────────────────────────────────── */}
        {result.ig_tips && <IGTipsCard tips={result.ig_tips} />}

        {/* Spacer so FAB doesn't cover last row */}
        <div style={{ height: 64 }} />
      </div>

      {/* ── Fixed bottom bar ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          borderTop: '1px solid #1A1A1A',
          fontSize: 11,
          fontFamily: 'monospace',
          minHeight: 44,
          flexShrink: 0,
          backgroundColor: '#050505',
        }}
      >
        {/* Journal button */}
        <button
          onClick={() => setScreen('journal')}
          style={{ color: '#444', background: 'none', border: 'none', fontSize: 11, fontFamily: 'monospace', minHeight: 44, minWidth: 60, cursor: 'pointer', padding: 0 }}
        >
          ↑ P&amp;L
        </button>

        {/* Scan age + status */}
        <span style={{ color: isScanning ? '#EF9F27' : '#333' }}>
          {isScanning ? '● SKANOWANIE...' : scanAge ? `skan ${scanAge}` : '⟳ skan'}
        </span>

        {/* Swipe hint */}
        <span style={{ color: '#333' }}>← detale</span>
      </div>

      {/* ── Scan error toast ────────────────────────────────────────────────── */}
      {scanError && (
        <div
          style={{
            position: 'absolute', bottom: 52, left: 12, right: 76,
            background: '#D85A3022', border: '1px solid #D85A3044',
            color: '#D85A30', padding: '8px 12px', borderRadius: 8,
            fontSize: 11, fontFamily: 'monospace',
          }}
        >
          ⚠ {scanError}
        </div>
      )}

      {/* ── Scan FAB ────────────────────────────────────────────────────────── */}
      <button
        onClick={runScan}
        disabled={isScanning}
        aria-label="Uruchom skan"
        style={{
          position: 'absolute', bottom: 52, right: 12,
          width: 56, height: 56, borderRadius: '50%',
          background: isScanning ? '#111' : '#5DCAA522',
          border: `1px solid ${isScanning ? '#1A1A1A' : '#5DCAA544'}`,
          color: isScanning ? '#333' : '#5DCAA5',
          fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isScanning ? 'not-allowed' : 'pointer',
        }}
      >
        {isScanning ? '◌' : '⟳'}
      </button>
    </div>
  );
}
