import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch("https://api.x.ai/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.XAI_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 4000,
        system: body.system + "\n\nOdpowiedz TYLKO czystym JSON od { do }. Zero backticks.",
        messages: [{ role: "user", content: body.user }],
      }),
    });
    const data = await res.json();
    console.log("XAI STATUS:", res.status);
    console.log("XAI RESPONSE:", JSON.stringify(data).slice(0, 500));
    return NextResponse.json(data);
  } catch (e: any) {
    console.log("ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}