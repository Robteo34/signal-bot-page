import { NextRequest, NextResponse } from "next/server";
import type { SessionName } from "@/lib/sessions";
import {
  buildScanSystemPrompt,
  buildScanUserPrompt,
  buildAnalyzeSystemPrompt,
  buildAnalyzeUserPrompt,
  type TimeContext,
} from "@/lib/prompts";

export const maxDuration = 120;

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

    // ── Call 1: SCAN ────────────────────────────────────────────────────────────
    // Purpose: web search + data collection. Returns raw findings JSON.
    const scanStart = Date.now();

    const scanRes = await fetch(XAI_URL, {
      method: "POST",
      headers: xaiHeaders(),
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 4000,
        temperature: 0.1, // low temp for factual reporting
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

    // Parse and re-stringify so the analyze call gets clean formatted JSON
    let scanPayload: string;
    try {
      scanPayload = JSON.stringify(JSON.parse(extractJson(scanRawText)), null, 2);
    } catch {
      // If scan JSON is malformed, pass raw text — analyze can still work with partial data
      scanPayload = scanRawText;
    }

    // ── Call 2: ANALYZE ─────────────────────────────────────────────────────────
    // Purpose: receive scan data, generate trading signals. No web search needed.
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

    // Normalise to { content: [{ type: "text", text: "..." }] } — unchanged from before
    const text: string = analyzeData.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content: [{ type: "text", text }] });

  } catch (e: any) {
    const totalDuration = Date.now() - totalStart;
    console.log(`ERROR after ${totalDuration}ms:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
