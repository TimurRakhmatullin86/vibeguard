import { NextRequest, NextResponse } from "next/server";
import { insertScan } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { projectName, projectPath, scanResult } = body;
    if (!projectName || !scanResult) {
      return NextResponse.json(
        { error: "projectName and scanResult are required" },
        { status: 400 }
      );
    }

    if (
      typeof scanResult.totalScore !== "number" ||
      typeof scanResult.level !== "string" ||
      !Array.isArray(scanResult.issues)
    ) {
      return NextResponse.json(
        { error: "scanResult must contain totalScore (number), level (string), and issues (array)" },
        { status: 400 }
      );
    }

    const projectId =
      body.projectId ||
      crypto.createHash("sha256").update(projectName).digest("hex").slice(0, 16);

    const security = scanResult.categories?.find(
      (c: any) => c.category === "security"
    );
    const quality = scanResult.categories?.find(
      (c: any) => c.category === "quality"
    );
    const production = scanResult.categories?.find(
      (c: any) => c.category === "production"
    );

    const scanId = insertScan({
      projectId,
      projectName,
      projectPath,
      totalScore: scanResult.totalScore,
      level: scanResult.level,
      securityScore: security?.score ?? 0,
      securityMax: security?.maxScore ?? 40,
      qualityScore: quality?.score ?? 0,
      qualityMax: quality?.maxScore ?? 30,
      productionScore: production?.score ?? 0,
      productionMax: production?.maxScore ?? 30,
      filesScanned: scanResult.filesScanned ?? 0,
      issuesJson: JSON.stringify(scanResult.issues),
    });

    return NextResponse.json({ scanId, projectId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
