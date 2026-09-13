import { NextRequest, NextResponse } from "next/server";
import { getProjectScans } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const scans = getProjectScans(params.id);
  return NextResponse.json(
    scans.map((s) => ({
      id: s.id,
      totalScore: s.total_score,
      level: s.level,
      security: s.security_score,
      quality: s.quality_score,
      production: s.production_score,
      filesScanned: s.files_scanned,
      createdAt: s.created_at,
    }))
  );
}
