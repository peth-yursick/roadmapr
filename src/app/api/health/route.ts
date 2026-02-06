import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET() {
  console.log("[API /health] Health check endpoint called");
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
