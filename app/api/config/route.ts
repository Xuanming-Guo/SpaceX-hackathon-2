import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    liveAiEnabled: process.env.LIVE_AI_ENABLED === "true" && Boolean(process.env.XAI_API_KEY),
    evidenceEnabled: Boolean(process.env.TAVILY_API_KEY),
    simulationAvailable: true,
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
