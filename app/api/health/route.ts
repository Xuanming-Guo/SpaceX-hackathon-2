import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "DrainOps" }, { headers: { "X-Content-Type-Options": "nosniff" } });
}
