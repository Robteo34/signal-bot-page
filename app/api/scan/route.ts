import { NextRequest, NextResponse } from "next/server";
import type { SessionName } from "@/lib/sessions";
import {
  buildScanSystemPrompt,
  buildScanUserPrompt,
  buildAnalyzeSystemPrompt,
  buildAnalyzeUserPrompt,
  type TimeContext,
} from "@/lib/prompts";
import { getSupabase } from "@/lib/supabase";
import { adjustConfidenceBySourceHistory } from "@/lib/sourceScoring";

export const maxDuration = 120; // covers two sequential xAI calls

function buildTimeContext(): TimeContext {
  const now = new Date();

  const ukFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = ukFormatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';

  const ukDate = `${get('year')}-${get('month')}-${get('day')}`;
  const ukTime = `${get('hour')}:${get('minute')}`;
  const ukDay  = get('weekday');

  const ukOffset = now.toLocaleString('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' });
  const tzAbbr = ukOffset.includes('BST') ? 'BST' : 'GMT';

  return {
    iso:     now.toISOString(),
    ukDate,
    ukTime,
    ukDay,
    tzAbbr,
    display: `${ukDay}, ${get('day')}/${get('month')}/${get('year')} ${ukTime} ${tzAbbr}`,
  };
}

function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return raw.slice(start, end + 1);
}

// ── Supabase persistence ──────────────────────────────────────────────────────
// Fire-and-forget — DB errors must never block the response to the client.

async function saveToDb(params: {
  sessionName: SessionName;
  timeCtx: TimeContext;
  rawScan: unknown;
  rawAnalysis: unknown;
  scanDurationMs: number;
  analyzeeDurationMs: number;
  totalDurationMs: number;
}): Promise<Record<string, string>> {
  const db = getSupabase();
  if (!db) {
    console.warn('DB: getSupabase() returned null — env vars missing, skipping save');
    return {};
  }

  const { sessionName, timeCtx, rawScan, rawAnalysis, scanDurationMs, analyzeeDurationMs, totalDurationMs } = params;

  const analysis = rawAnalysis as Record<string, any>;
  const scan     = rawScan     as Record<string, any>;

  console.log(`DB: attempting save — session=${sessionName} action=${analysis.action ?? '?'} signals=${(analysis.signals ?? []).length}`);

  // 1. Insert scan row
  const { data: scanRow, error: scanErr } = await db
    .from('scans')
    .insert({
      session_name:        sessionName,
      uk_date:             timeCtx.ukDate,
      uk_time:             timeCtx.ukTime,
      tz_abbr:             timeCtx.tzAbbr,
      action:              analysis.action        ?? null,
      primary_asset:       analysis.primary_asset ?? null,
      signal_strength:     analysis.signal_strength ?? null,
      data_quality:        scan.data_quality      ?? null,
      scan_duration_ms:    scanDurationMs,
      analyze_duration_ms: analyzeeDurationMs,
      total_duration_ms:   totalDurationMs,
      raw_scan:            rawScan,
      raw_analysis:        rawAnalysis,
    })
    .select('id')
    .single();

  if (scanErr) {
    console.error('DB scans insert error:', scanErr.code, scanErr.message);
    return {};
  }

  const scanId = scanRow.id as string;
  console.log(`DB: scan row created — id=${scanId}`);

  // 2. Insert individual signals — select back id + asset so we can return the mapping
  const signals: any[] = analysis.signals ?? [];
  const signalIdMap: Record<string, string> = {}; // asset → supabase uuid

  if (signals.length > 0) {
    const signalRows = signals.map((s) => ({
      scan_id:          scanId,
      asset:            s.asset            ?? null,
      direction:        s.direction        ?? null,
      strength:         s.strength         ?? null,
      confidence_basis: s.confidence_basis ?? null,
      platform:         s.platform         ?? null,
      source:           s.source           ?? null,
      reason:           s.reason           ?? null,
      entry:            s.entry            ?? null,
      stop:             s.stop             ?? null,
      target:           s.target           ?? null,
      overnight_risk:   s.overnight_risk   ?? null,
      session_relevant: s.session_relevant ?? null,
    }));

    const { data: insertedSignals, error: sigErr } = await db
      .from('signals')
      .insert(signalRows)
      .select('id, asset');

    if (sigErr) {
      console.error('DB signals insert error:', sigErr.code, sigErr.message);
    } else {
      console.log(`DB: ${signalRows.length} signals inserted`);
      for (const row of insertedSignals ?? []) {
        if (row.asset) signalIdMap[row.asset] = row.id;
      }
    }
  }

  // 3. Insert source_scores from accounts_checked
  // Prefer analysis accounts_checked; fall back to scan accounts_checked
  const checked = analysis.accounts_checked ?? scan.accounts_checked ?? {};
  const sourceRows: any[] = [];

  // Collect which handles were cited as source in actual signals
  const citedHandles = new Set(
    signals.map((s) => (s.source ?? '').toLowerCase()).filter(Boolean)
  );

  for (const item of (checked.with_relevant_posts ?? checked.with_posts ?? [])) {
    // item may be "@handle — description" string or { handle, summary } object
    const handle  = typeof item === 'string' ? item.split(' ')[0] : item.handle;
    const summary = typeof item === 'string' ? item.slice(handle.length).replace(/^[\s—-]+/, '') : item.summary;
    sourceRows.push({
      scan_id:         scanId,
      handle:          handle,
      status:          'with_posts',
      post_summary:    summary || null,
      cited_in_signal: citedHandles.has(handle.toLowerCase()),
    });
  }

  for (const handle of (checked.no_recent_posts ?? checked.no_posts ?? [])) {
    sourceRows.push({ scan_id: scanId, handle, status: 'no_posts', cited_in_signal: false });
  }

  for (const handle of (checked.could_not_check ?? [])) {
    sourceRows.push({ scan_id: scanId, handle, status: 'could_not_check', cited_in_signal: false });
  }

  if (sourceRows.length > 0) {
    const { error: srcErr } = await db.from('source_scores').insert(sourceRows);
    if (srcErr) console.error('DB source_scores insert error:', srcErr.code, srcErr.message);
    else console.log(`DB: ${sourceRows.length} source_scores inserted`);
  }

  console.log(`DB saved: scan ${scanId} | ${signals.length} signals | ${sourceRows.length} source rows`);
  return signalIdMap;
}

// Wrap saveToDb so any thrown exception is logged with a stack trace
async function saveToDbSafe(params: Parameters<typeof saveToDb>[0]): Promise<Record<string, string>> {
  try {
    return await saveToDb(params);
  } catch (e: any) {
    console.error('DB saveToDb exception:', e?.message ?? e, e?.stack ?? '');
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const XAI_URL = "https://api.x.ai/v1/chat/completions";

function xaiHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
  };
}

export async function POST(req: NextRequest) {
  const totalStart = Date.now();

  try {
    const body = await req.json();
    const sessionName = body.sessionName as SessionName;

    if (!sessionName) {
      return NextResponse.json({ error: "sessionName is required" }, { status: 400 });
    }

    const timeCtx = buildTimeContext();
    const JSON_ONLY = "RESPOND WITH ONLY VALID JSON. No markdown fences. No backticks. No text before { or after }.";

    // ── Call 1: SCAN ──────────────────────────────────────────────────────────
    const scanStart = Date.now();

    const scanRes = await fetch(XAI_URL, {
      method: "POST",
      headers: xaiHeaders(),
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: [buildScanSystemPrompt(sessionName, timeCtx), JSON_ONLY].join("\n\n"),
          },
          {
            role: "user",
            content: buildScanUserPrompt(sessionName),
          },
        ],
      }),
    });

    const scanDuration = Date.now() - scanStart;

    const scanData = await scanRes.json();
    console.log("SCAN STATUS:", scanRes.status);
    console.log("SCAN RESPONSE:", JSON.stringify(scanData).slice(0, 400));

    if (!scanRes.ok) {
      const errMsg = scanData.error?.message ?? `xAI scan error ${scanRes.status}`;
      return NextResponse.json({ error: errMsg }, { status: scanRes.status });
    }

    const scanRawText: string = scanData.choices?.[0]?.message?.content ?? "{}";

    let parsedScan: unknown = {};
    let scanPayload: string;
    try {
      parsedScan  = JSON.parse(extractJson(scanRawText));
      scanPayload = JSON.stringify(parsedScan, null, 2);
    } catch {
      scanPayload = scanRawText;
    }

    // ── Call 2: ANALYZE ───────────────────────────────────────────────────────
    const analyzeStart = Date.now();

    const analyzeRes = await fetch(XAI_URL, {
      method: "POST",
      headers: xaiHeaders(),
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 6000,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: [buildAnalyzeSystemPrompt(sessionName, timeCtx), JSON_ONLY].join("\n\n"),
          },
          {
            role: "user",
            content: buildAnalyzeUserPrompt(scanPayload, sessionName),
          },
        ],
      }),
    });

    const analyzeDuration = Date.now() - analyzeStart;
    const totalDuration   = Date.now() - totalStart;

    console.log(`SCAN call: ${scanDuration}ms | ANALYZE call: ${analyzeDuration}ms | Total: ${totalDuration}ms`);

    const analyzeData = await analyzeRes.json();
    console.log("ANALYZE STATUS:", analyzeRes.status);
    console.log("ANALYZE RESPONSE:", JSON.stringify(analyzeData).slice(0, 400));

    if (!analyzeRes.ok) {
      const errMsg = analyzeData.error?.message ?? `xAI analyze error ${analyzeRes.status}`;
      return NextResponse.json({ error: errMsg }, { status: analyzeRes.status });
    }

    const text: string = analyzeData.choices?.[0]?.message?.content ?? "";

    // ── Persist to Supabase (non-blocking) ───────────────────────────────────
    let parsedAnalysis: Record<string, any> = {};
    try { parsedAnalysis = JSON.parse(extractJson(text)); } catch {}

    // ── Adjust signal confidence by source history ────────────────────────────
    if (Array.isArray(parsedAnalysis.signals) && parsedAnalysis.signals.length > 0) {
      try {
        parsedAnalysis.signals = await adjustConfidenceBySourceHistory(parsedAnalysis.signals);
      } catch (e: any) {
        console.warn('sourceScoring adjustment failed (non-fatal):', e?.message ?? e);
      }
    }

    // Rebuild text with adjusted signals so the client JSON matches
    const adjustedText = JSON.stringify(parsedAnalysis);

    // Await save so we can return signal IDs to the client
    const signalIds = await saveToDbSafe({
      sessionName,
      timeCtx,
      rawScan:             parsedScan,
      rawAnalysis:         parsedAnalysis,
      scanDurationMs:      scanDuration,
      analyzeeDurationMs:  analyzeDuration,
      totalDurationMs:     totalDuration,
    });

    // Return adjusted analysis + signal ID map (asset → supabase uuid)
    return NextResponse.json({ content: [{ type: "text", text: adjustedText }], signal_ids: signalIds });

  } catch (e: any) {
    const totalDuration = Date.now() - totalStart;
    console.log(`ERROR after ${totalDuration}ms:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
