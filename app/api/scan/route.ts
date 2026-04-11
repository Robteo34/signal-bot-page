import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;

function buildTimeContext() {
  const now = new Date();

  // Force UK timezone — never rely on server timezone
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

  // Detect BST vs GMT from the formatted string
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const time = buildTimeContext();
    const timeBlock = [
      "═══ CURRENT DATE AND TIME — USE THIS, NOT YOUR OWN CLOCK ═══",
      `TODAY IS: ${time.ukDay}, ${time.ukDate}`,
      `UK TIME NOW: ${time.ukTime} ${time.tzAbbr}`,
      `ISO: ${time.iso}`,
      "THIS IS AUTHORITATIVE. Do not use any other date.",
      "═══ END TIME BLOCK ═══",
    ].join("\n");

    // Prepend today's date to the user prompt so it appears in BOTH system and user turns
    const userContent = `TODAY IS ${time.ukDay.toUpperCase()}, ${time.ukDate} — ${time.ukTime} ${time.tzAbbr}\n\n${body.user}`;

    const systemContent = [
      timeBlock,
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
        temperature: 0.3,
        messages: [
          { role: "system", content: systemContent },
          { role: "user",   content: userContent },
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
    const text: string = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content: [{ type: "text", text }] });
  } catch (e: any) {
    console.log("ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
