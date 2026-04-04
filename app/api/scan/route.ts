import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: body.system + "\n\nOdpowiedz TYLKO czystym JSON od { do }. Zero backticks.",
          },
          { role: "user", content: body.user },
        ],
      }),
    });
    const data = await res.json();
    console.log("XAI STATUS:", res.status);
    console.log("XAI RESPONSE:", JSON.stringify(data).slice(0, 500));

    // Normalise to the shape page.tsx expects: { content: [{ type: "text", text: "..." }] }
    const text = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content: [{ type: "text", text }] });
  } catch (e: any) {
    console.log("ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}