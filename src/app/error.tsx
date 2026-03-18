"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        backgroundColor: "#f0fdfa",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ color: "#1f2937", marginBottom: "1rem" }}>Algo salió mal</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", textAlign: "center" }}>
        {error.message}
      </p>
      <button
        type="button"
        onClick={reset}
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
  );
}
