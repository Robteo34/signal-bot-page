import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("KEY LENGTH:", process.env.ANTHROPIC_API_KEY?.length, "STARTS:", process.env.ANTHROPIC_API_KEY?.substring(0, 20));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, tools: [{ type: "web_search_20250305", name: "web_search" }], system: body.system + "\n\nOdpowiedz TYLKO czystym JSON od { do }. Zero backticks.", messages: [{ role: "user", content: body.user }] }),
    });
    const data = await res.json();
    console.log("ANTHROPIC STATUS:", res.status);
    console.log("ANTHROPIC RESPONSE:", JSON.stringify(data).slice(0, 500));
    return NextResponse.json(data);
  } catch (e: any) {
    console.log("ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}