import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "vibeguard-data.json");

interface DbData {
  projects: Record<string, ProjectRow>;
  scans: ScanRow[];
  nextScanId: number;
}

export interface ProjectRow {
  id: string;
  name: string;
  path: string | null;
  created_at: string;
}

export interface ScanRow {
  id: number;
  project_id: string;
  total_score: number;
  level: string;
  security_score: number;
  security_max: number;
  quality_score: number;
  quality_max: number;
  production_score: number;
  production_max: number;
  files_scanned: number;
  issues_json: string;
  created_at: string;
}

function readDb(): DbData {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { projects: {}, scans: [], nextScanId: 1 };
  }
}

function writeDb(data: DbData): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function listProjects(): (ProjectRow & { latest_score: number | null; latest_level: string | null; scan_count: number })[] {
  const db = readDb();
  return Object.values(db.projects).map((p) => {
    const projectScans = db.scans.filter((s) => s.project_id === p.id);
    const latest = projectScans[projectScans.length - 1];
    return {
      ...p,
      latest_score: latest?.total_score ?? null,
      latest_level: latest?.level ?? null,
      scan_count: projectScans.length,
    };
  });
}

export function getProject(id: string): ProjectRow | undefined {
  const db = readDb();
  return db.projects[id];
}

export function getProjectScans(projectId: string): ScanRow[] {
  const db = readDb();
  return db.scans.filter((s) => s.project_id === projectId).reverse();
}

export function getLatestScan(projectId: string): ScanRow | undefined {
  const db = readDb();
  const scans = db.scans.filter((s) => s.project_id === projectId);
  return scans[scans.length - 1];
}

export function insertScan(data: {
  projectId: string;
  projectName: string;
  projectPath?: string;
  totalScore: number;
  level: string;
  securityScore: number;
  securityMax: number;
  qualityScore: number;
  qualityMax: number;
  productionScore: number;
  productionMax: number;
  filesScanned: number;
  issuesJson: string;
}): number {
  const db = readDb();

  if (!db.projects[data.projectId]) {
    db.projects[data.projectId] = {
      id: data.projectId,
      name: data.projectName,
      path: data.projectPath || null,
      created_at: new Date().toISOString(),
    };
  }

  const scanId = db.nextScanId++;
  db.scans.push({
    id: scanId,
    project_id: data.projectId,
    total_score: data.totalScore,
    level: data.level,
    security_score: data.securityScore,
    security_max: data.securityMax,
    quality_score: data.qualityScore,
    quality_max: data.qualityMax,
    production_score: data.productionScore,
    production_max: data.productionMax,
    files_scanned: data.filesScanned,
    issues_json: data.issuesJson,
    created_at: new Date().toISOString(),
  });

  writeDb(db);
  return scanId;
}
