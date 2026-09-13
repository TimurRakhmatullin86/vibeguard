import { NextResponse } from "next/server";
import { listProjects } from "@/lib/db";

export async function GET() {
  const projects = listProjects();
  return NextResponse.json(projects);
}
