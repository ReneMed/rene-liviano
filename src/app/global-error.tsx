"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            backgroundColor: "#f0fdfa",
          }}
        >
          <h2 style={{ color: "#1f2937", marginBottom: "1rem" }}>Error en Escriba Médico</h2>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem", textAlign: "center" }}>
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#14b8a6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
