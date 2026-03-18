"use client";

import { useState, useEffect } from "react";
import { SidebarPanel } from "./SidebarPanel";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      const desktop = window.innerWidth >= 1024;
      setIsMobile(mobile);
      setIsDesktop(desktop);
      if (!mobile) setPanelOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const togglePanel = () => setPanelOpen((o) => !o);
  const closePanel = () => setPanelOpen(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ minHeight: "100vh", backgroundColor: "#f0fdfa" }}>
      {/* Header fijo */}
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 shrink-0 border-b border-gray-200"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: "3.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1rem",
          backgroundColor: "rgba(255,255,255,0.95)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <button
          type="button"
          onClick={togglePanel}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg touch-manipulation"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-lg text-gray-800 pointer-events-none">
          Rene
        </h1>

        <div className="flex items-center gap-2">
          <a
            href="/api/auth/signout?callbackUrl=/login"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Cerrar sesión"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </a>
        </div>
      </header>

      {/* Panel lateral - sin overlay para evitar bloqueo de clics */}
      <SidebarPanel
        isOpen={panelOpen}
        onClose={closePanel}
        onItemClick={isMobile ? closePanel : undefined}
      />

      {/* Contenido principal */}
      <main
        className="flex-1 min-w-0 flex flex-col pt-14"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          paddingTop: "3.5rem",
          paddingLeft: panelOpen && isDesktop ? "18rem" : 0,
          transition: "padding-left 0.3s ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}
