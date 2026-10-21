import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { getMqttStatus } from "@/lib/mqtt";

export async function GET() {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  return NextResponse.json(getMqttStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
