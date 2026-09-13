import { listProjects } from "@/lib/db";

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const color =
    level === "production-ready"
      ? "var(--green)"
      : level === "needs-review"
        ? "var(--yellow)"
        : level === "risky"
          ? "var(--orange)"
          : "var(--red)";

  const label =
    level === "production-ready"
      ? "Production Ready"
      : level === "needs-review"
        ? "Needs Review"
        : level === "risky"
          ? "Risky"
          : "Not Ready";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: `3px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "16px",
          color,
        }}
      >
        {score}
      </div>
      <span style={{ color, fontSize: "13px", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const projects = listProjects();

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Projects</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} scanned
        </p>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-muted)", marginBottom: "12px" }}>
            No projects scanned yet
          </p>
          <code
            style={{
              background: "var(--bg)",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            npx vibeguard check ./your-project --report http://localhost:3700
          </code>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/project/${p.id}`}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.15s",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>{p.name}</div>
                {p.path && (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
                    {p.path}
                  </div>
                )}
                <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                  {p.scan_count} scan{p.scan_count !== 1 ? "s" : ""}
                </div>
              </div>
              {p.latest_score !== null && p.latest_level && (
                <ScoreBadge score={p.latest_score} level={p.latest_level} />
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
