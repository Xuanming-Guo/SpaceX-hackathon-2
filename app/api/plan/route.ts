import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  scenarioId: z.literal("preston-demo"),
  goal: z.string().max(600),
  blockedDrainIds: z.array(z.string().regex(/^G-(?:0[1-9]|1[0-9]|20)$/)).max(20).default([]),
});

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 64 * 1024) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    const input = requestSchema.parse(await request.json());
    // Paid model access is deliberately opt-in. The browser never receives credentials.
    if (process.env.LIVE_AI_ENABLED !== "true" || !process.env.XAI_API_KEY) {
      return NextResponse.json({ mode: "Recorded example", fallback: true, message: "Live AI is not configured; using the bundled evidence-led example.", blockedDrainIds: input.blockedDrainIds });
    }
    return NextResponse.json({ mode: "Fallback", fallback: true, message: "Live model adapter is not enabled in this demo build.", blockedDrainIds: input.blockedDrainIds });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
