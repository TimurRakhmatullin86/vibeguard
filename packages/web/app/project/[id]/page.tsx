import { getProject, getLatestScan, getProjectScans } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--red)",
  high: "var(--orange)",
  medium: "var(--yellow)",
  low: "var(--text-muted)",
  info: "var(--blue)",
};

const LEVEL_COLORS: Record<string, string> = {
  "production-ready": "var(--green)",
  "needs-review": "var(--yellow)",
  risky: "var(--orange)",
  "not-ready": "var(--red)",
};

const LEVEL_LABELS: Record<string, string> = {
  "production-ready": "Production Ready",
  "needs-review": "Needs Review",
  risky: "Risky",
  "not-ready": "Not Ready",
};

function CategoryBar({
  label,
  score,
  max,
  color,
}: {
  label: string;
  score: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
          fontSize: "14px",
        }}
      >
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>
          {score}/{max}
        </span>
      </div>
      <div
        style={{
          background: "var(--bg)",
          borderRadius: "4px",
          height: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const scan = getLatestScan(params.id);
  const history = getProjectScans(params.id);
  const issues = scan ? JSON.parse(scan.issues_json) : [];

  const levelColor = scan ? LEVEL_COLORS[scan.level] || "var(--text)" : "var(--text-muted)";
  const levelLabel = scan ? LEVEL_LABELS[scan.level] || scan.level : "No scans";

  const criticalCount = issues.filter((i: any) => i.severity === "critical").length;
  const highCount = issues.filter((i: any) => i.severity === "high").length;

  return (
    <div>
      <a
        href="/"
        style={{
          color: "var(--text-muted)",
          fontSize: "14px",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Back to projects
      </a>

      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>{project.name}</h1>
        {project.path && (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            {project.path}
          </p>
        )}
      </div>

      {scan ? (
        <>
          {/* Score header */}
          <div
            style={{
              background: "var(--bg-card)",
              border: `1px solid var(--border)`,
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: `4px solid ${levelColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "28px",
                color: levelColor,
                flexShrink: 0,
              }}
            >
              {scan.total_score}
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: levelColor }}>
                {levelLabel}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
                {scan.files_scanned} files scanned · {issues.length} issues found
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "8px",
                  fontSize: "13px",
                }}
              >
                {criticalCount > 0 && (
                  <span style={{ color: "var(--red)" }}>
                    {criticalCount} critical
                  </span>
                )}
                {highCount > 0 && (
                  <span style={{ color: "var(--orange)" }}>
                    {highCount} high
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
              Category Breakdown
            </h2>
            <CategoryBar label="Security" score={scan.security_score} max={scan.security_max} color="var(--red)" />
            <CategoryBar label="Code Quality" score={scan.quality_score} max={scan.quality_max} color="var(--yellow)" />
            <CategoryBar label="Production Ready" score={scan.production_score} max={scan.production_max} color="var(--blue)" />
          </div>

          {/* Issues list */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
              Issues ({issues.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {issues.map((issue: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg)",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: SEVERITY_COLORS[issue.severity] || "var(--text)",
                      fontWeight: 600,
                      fontSize: "12px",
                      textTransform: "uppercase",
                      minWidth: "64px",
                      paddingTop: "2px",
                    }}
                  >
                    {issue.severity}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div>{issue.message}</div>
                    {issue.file && (
                      <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>
                        {issue.file}
                        {issue.line > 0 ? `:${issue.line}` : ""}
                      </div>
                    )}
                    {issue.fix && (
                      <div style={{ color: "var(--blue)", fontSize: "12px", marginTop: "4px" }}>
                        Fix: {issue.fix.description}
                        {issue.fix.autoFixable && " (auto-fixable)"}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      background: "var(--bg-card)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {issue.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 1 && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "24px",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
                Scan History ({history.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background: "var(--bg)",
                      borderRadius: "6px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      {h.created_at}
                    </span>
                    <span
                      style={{
                        color: LEVEL_COLORS[h.level] || "var(--text)",
                        fontWeight: 600,
                      }}
                    >
                      {h.total_score}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>No scans yet for this project</p>
        </div>
      )}
    </div>
  );
}
