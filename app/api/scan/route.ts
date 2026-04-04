import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;

// Accurate BST detection: last Sunday in March → last Sunday in October
// Mirrors the logic in lib/sessions.ts — kept inline to avoid import issues in edge runtime.
function isBSTAccurate(date: Date): boolean {
  const year = date.getUTCFullYear();

  const march = new Date(Date.UTC(year, 2, 31));
  while (march.getUTCDay() !== 0) march.setUTCDate(march.getUTCDate() - 1);
  march.setUTCHours(1, 0, 0, 0); // clocks go forward at 01:00 UTC

  const october = new Date(Date.UTC(year, 9, 31));
  while (october.getUTCDay() !== 0) october.setUTCDate(october.getUTCDate() - 1);
  october.setUTCHours(1, 0, 0, 0); // clocks go back at 01:00 UTC

  return date >= march && date < october;
}

// Build an unambiguous date/time block for the AI prompt.
// Called fresh on every request — never cached, never hardcoded.
function serverTimeContext(): string {
  const now = new Date(); // always live from JS runtime
  const bst = isBSTAccurate(now);
  const offsetMs = bst ? 3_600_000 : 0;

  // Derive UK local date by shifting UTC epoch
  const ukDate = new Date(now.getTime() + offsetMs);

  const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const dayName  = DAYS[ukDate.getUTCDay()];
  const day      = ukDate.getUTCDate();
  const month    = MONTHS[ukDate.getUTCMonth()];
  const year     = ukDate.getUTCFullYear();
  const hh       = ukDate.getUTCHours().toString().padStart(2, "0");
  const mm       = ukDate.getUTCMinutes().toString().padStart(2, "0");
  const tz       = bst ? "BST (UTC+1)" : "GMT (UTC+0)";

  return [
    "╔═ CURRENT DATE & TIME (server-verified, live) ═╗",
    `  Date     : ${dayName}, ${day} ${month} ${year}`,
    `  UK Time  : ${hh}:${mm} ${tz}`,
    `  UTC Time : ${now.toISOString()}`,
    "╚════════════════════════════════════════════════╝",
    "Use ONLY the date/time above. Do NOT use training-data dates.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const systemContent = [
      serverTimeContext(),
      body.system,
      "RESPOND WITH ONLY VALID JSON. No markdown fences. No backticks. No text before { or after }.",
    ].join("\n\n");

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 6000,
        temperature: 0.3, // lower = more consistent JSON output
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: body.user },
        ],
      }),
    });

    const data = await res.json();
    console.log("XAI STATUS:", res.status);
    console.log("XAI RESPONSE:", JSON.stringify(data).slice(0, 800));

    if (!res.ok) {
      const errMsg = data.error?.message ?? `xAI error ${res.status}`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    // Normalise to { content: [{ type: "text", text: "..." }] }
    // so page.tsx response parsing needs no changes
    const text: string = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content: [{ type: "text", text }] });
  } catch (e: any) {
    console.log("ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}