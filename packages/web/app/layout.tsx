import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeGuard Dashboard",
  description: "AI-generated code quality scanner dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          borderBottom: "1px solid var(--border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <a href="/" style={{ fontWeight: 700, fontSize: "18px" }}>
            <span style={{ color: "var(--green)" }}>Vibe</span>Guard
          </a>
          <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            AI Code Quality Scanner
          </span>
        </nav>
        <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
