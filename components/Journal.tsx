'use client';

import { useState } from 'react';
import { Trade, AppState, addTrade, closeTrade, loadState, getStats } from '@/lib/storage';

interface Props {
  state: AppState;
  onUpdate: () => void;
  onClose: () => void;
}

export default function Journal({ state, onUpdate, onClose }: Props) {
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [form, setForm] = useState({
    asset: 'BTC/USD',
    direction: 'LONG' as 'LONG' | 'SHORT',
    size: '',
    entry: '',
  });
  const [closeForm, setCloseForm] = useState<{ id: string; exit: string } | null>(null);

  const stats = getStats(state);
  const openTrades = state.trades.filter((t) => !t.closed);
  const closedTrades = state.trades.filter((t) => t.closed).slice(0, 10);

  function handleAdd() {
    if (!form.asset || !form.size || !form.entry) return;
    addTrade({
      asset: form.asset,
      direction: form.direction,
      size: parseFloat(form.size),
      entry: parseFloat(form.entry),
    });
    setShowAddTrade(false);
    setForm({ asset: 'BTC/USD', direction: 'LONG', size: '', entry: '' });
    onUpdate();
  }

  function handleClose(id: string) {
    if (!closeForm?.exit) return;
    closeTrade(id, parseFloat(closeForm.exit));
    setCloseForm(null);
    onUpdate();
  }

  const pnlColor = (n: number) => (n >= 0 ? '#5DCAA5' : '#D85A30');
  const fmt = (n: number) => (n >= 0 ? `+£${n.toFixed(0)}` : `-£${Math.abs(n).toFixed(0)}`);

  return (
    <div
      className="flex flex-col h-full font-mono"
      style={{ backgroundColor: '#050505', color: '#E8E8E0' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1A1A1A' }}
      >
        <button
          className="text-sm"
          style={{ color: '#555', minHeight: 44, minWidth: 44 }}
          onClick={onClose}
        >
          ← Wróć
        </button>
        <span className="text-sm font-bold tracking-wider" style={{ color: '#888' }}>
          P&amp;L TRACKER
        </span>
        <button
          className="text-sm px-3 py-1 rounded"
          style={{
            color: '#5DCAA5',
            border: '1px solid #5DCAA544',
            minHeight: 44,
            minWidth: 44,
          }}
          onClick={() => setShowAddTrade(true)}
        >
          + Trade
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
        {[
          { label: 'Dziś', value: fmt(stats.todayPnl), color: pnlColor(stats.todayPnl) },
          { label: 'Tydzień', value: fmt(stats.weekPnl), color: pnlColor(stats.weekPnl) },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: '#E8E8E0' },
        ].map((s, i) => (
          <div
            key={i}
            className="flex flex-col items-center py-4"
            style={{ borderRight: i < 2 ? '1px solid #1A1A1A' : undefined }}
          >
            <div className="text-lg font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: '#555' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Streak */}
      {stats.streak > 1 && (
        <div
          className="px-4 py-2 text-sm text-center"
          style={{
            backgroundColor: stats.streakType === 'WIN' ? '#5DCAA511' : '#D85A3011',
            borderBottom: '1px solid #1A1A1A',
          }}
        >
          {stats.streakType === 'WIN' ? '🔥' : '❄️'} Seria: {stats.streak} {stats.streakType === 'WIN' ? 'wygranych' : 'strat'}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Add trade form */}
        {showAddTrade && (
          <div className="p-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <div className="text-xs mb-3" style={{ color: '#555' }}>
              NOWA POZYCJA
            </div>
            <div className="flex gap-2 mb-2">
              {(['BTC/USD', 'ETH/USD', 'FTSE100', 'GBP/USD', 'SPX'] as const).map((a) => (
                <button
                  key={a}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: form.asset === a ? '#378ADD22' : '#111',
                    color: form.asset === a ? '#378ADD' : '#555',
                    border: `1px solid ${form.asset === a ? '#378ADD44' : '#1A1A1A'}`,
                    minHeight: 36,
                  }}
                  onClick={() => setForm((f) => ({ ...f, asset: a }))}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              {(['LONG', 'SHORT'] as const).map((d) => (
                <button
                  key={d}
                  className="flex-1 py-2 rounded text-sm font-bold"
                  style={{
                    backgroundColor:
                      form.direction === d
                        ? d === 'LONG'
                          ? '#5DCAA522'
                          : '#D85A3022'
                        : '#111',
                    color:
                      form.direction === d
                        ? d === 'LONG'
                          ? '#5DCAA5'
                          : '#D85A30'
                        : '#555',
                    border: `1px solid ${
                      form.direction === d
                        ? d === 'LONG'
                          ? '#5DCAA544'
                          : '#D85A3044'
                        : '#1A1A1A'
                    }`,
                    minHeight: 56,
                  }}
                  onClick={() => setForm((f) => ({ ...f, direction: d }))}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                placeholder="Rozmiar (£)"
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: '#111',
                  color: '#E8E8E0',
                  border: '1px solid #1A1A1A',
                  minHeight: 56,
                }}
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Entry cena"
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: '#111',
                  color: '#E8E8E0',
                  border: '1px solid #1A1A1A',
                  minHeight: 56,
                }}
                value={form.entry}
                onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 rounded text-sm font-bold"
                style={{
                  backgroundColor: '#5DCAA522',
                  color: '#5DCAA5',
                  border: '1px solid #5DCAA544',
                  minHeight: 56,
                }}
                onClick={handleAdd}
              >
                DODAJ
              </button>
              <button
                className="flex-1 py-3 rounded text-sm"
                style={{
                  backgroundColor: '#111',
                  color: '#555',
                  border: '1px solid #1A1A1A',
                  minHeight: 56,
                }}
                onClick={() => setShowAddTrade(false)}
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* Open positions */}
        {openTrades.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1 text-xs" style={{ color: '#555' }}>
              OTWARTE POZYCJE
            </div>
            {openTrades.map((t) => (
              <div
                key={t.id}
                className="px-4 py-3"
                style={{ borderBottom: '1px solid #0d0d0d' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span
                      className="text-sm font-bold mr-2"
                      style={{ color: t.direction === 'LONG' ? '#5DCAA5' : '#D85A30' }}
                    >
                      {t.direction}
                    </span>
                    <span className="text-sm" style={{ color: '#E8E8E0' }}>
                      {t.asset}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: '#555' }}>
                    @ {t.entry.toLocaleString()} · £{t.size}
                  </div>
                </div>
                {closeForm?.id === t.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Exit cena"
                      className="flex-1 px-3 py-2 rounded text-sm"
                      style={{
                        backgroundColor: '#111',
                        color: '#E8E8E0',
                        border: '1px solid #1A1A1A',
                        minHeight: 44,
                      }}
                      value={closeForm.exit}
                      onChange={(e) =>
                        setCloseForm((f) => f && { ...f, exit: e.target.value })
                      }
                    />
                    <button
                      className="px-4 rounded text-sm font-bold"
                      style={{
                        backgroundColor: '#5DCAA522',
                        color: '#5DCAA5',
                        border: '1px solid #5DCAA544',
                        minHeight: 44,
                      }}
                      onClick={() => handleClose(t.id)}
                    >
                      OK
                    </button>
                    <button
                      className="px-3 rounded text-sm"
                      style={{
                        backgroundColor: '#111',
                        color: '#555',
                        border: '1px solid #1A1A1A',
                        minHeight: 44,
                      }}
                      onClick={() => setCloseForm(null)}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    className="text-xs px-3 py-1.5 rounded"
                    style={{
                      backgroundColor: '#D85A3022',
                      color: '#D85A30',
                      border: '1px solid #D85A3044',
                      minHeight: 36,
                    }}
                    onClick={() => setCloseForm({ id: t.id, exit: '' })}
                  >
                    Zamknij pozycję
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Closed trades */}
        {closedTrades.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1 text-xs" style={{ color: '#555' }}>
              HISTORIA (10 ostatnich)
            </div>
            {closedTrades.map((t) => (
              <div
                key={t.id}
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid #0d0d0d' }}
              >
                <div>
                  <span
                    className="text-xs font-bold mr-2"
                    style={{ color: t.direction === 'LONG' ? '#5DCAA5' : '#D85A30' }}
                  >
                    {t.direction}
                  </span>
                  <span className="text-sm" style={{ color: '#888' }}>
                    {t.asset}
                  </span>
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: (t.pnl ?? 0) >= 0 ? '#5DCAA5' : '#D85A30' }}
                >
                  {t.pnl !== undefined ? fmt(t.pnl) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {openTrades.length === 0 && closedTrades.length === 0 && !showAddTrade && (
          <div className="px-4 py-12 text-center text-sm" style={{ color: '#333' }}>
            Brak transakcji.
            <br />
            Naciśnij + Trade aby dodać.
          </div>
        )}
      </div>
    </div>
  );
}
