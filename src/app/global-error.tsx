"use client";

/**
 * Last-resort boundary for errors in the root layout itself.
 * Must render its own <html>/<body> and cannot rely on global CSS loading,
 * so styles are inline.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#03050d",
          color: "#eef4ff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <p style={{ letterSpacing: "0.3em", fontSize: 12, color: "#3fe4ff" }}>NEXUS · SYSTEM FAULT</p>
          <h1 style={{ fontWeight: 600 }}>NEXUS could not start</h1>
          <p style={{ color: "#8391b3" }}>An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              background: "#3fe4ff",
              color: "#03050d",
              border: 0,
              cursor: "pointer",
              letterSpacing: "0.15em",
            }}
          >
            TRY AGAIN
          </button>
        </div>
      </body>
    </html>
  );
}
