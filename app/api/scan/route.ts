import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;

// Inject server-side UTC timestamp so AI always gets accurate time
// regardless of client clock or timezone issues.
function serverTimeContext(): string {
  const now = new Date();
  const utcStr = now.toUTCString();
  // Approximate BST offset (UTC+1 Mar–Oct, UTC+0 otherwise)
  const month = now.getUTCMonth(); // 0-indexed
  const bst = month >= 2 && month <= 9; // Mar(2)–Oct(9)
  const ukHour = (now.getUTCHours() + (bst ? 1 : 0)) % 24;
  const ukMin = now.getUTCMinutes().toString().padStart(2, "0");
  const tz = bst ? "BST" : "GMT";
  return `[SERVER TIME] UTC: ${utcStr} | UK: ${ukHour}:${ukMin} ${tz}`;
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