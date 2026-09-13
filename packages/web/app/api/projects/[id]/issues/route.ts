import { NextRequest, NextResponse } from "next/server";
import { getLatestScan } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const scan = getLatestScan(params.id);
  if (!scan) {
    return NextResponse.json({ error: "No scans found" }, { status: 404 });
  }

  const issues = JSON.parse(scan.issues_json);
  return NextResponse.json(issues);
}
