import { NextRequest, NextResponse } from "next/server";
import { getProject, getLatestScan } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const latestScan = getLatestScan(params.id);
  return NextResponse.json({ ...project, latestScan });
}
