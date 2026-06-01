"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sk">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#121212",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <h1 style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Kritická chyba
        </h1>
        <p style={{ color: "#9a9a9a", marginTop: "1rem" }}>
          {error.message || "Skús obnoviť stránku."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1rem",
            background: "#c9a227",
            color: "#121212",
            border: "none",
            cursor: "pointer",
          }}
        >
          Skúsiť znova
        </button>
      </body>
    </html>
  );
}
