"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Modal } from "@/shared/ui/Modal";

interface SidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: () => void;
}

interface PanelStats {
  consultations_today: number;
  total_patients: number;
}

export function SidebarPanel({ isOpen, onClose, onItemClick }: SidebarPanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<PanelStats>({ consultations_today: 0, total_patients: 0 });
  const [openModal, setOpenModal] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/panel-stats");
      const data = await res.json();
      if (data.success) {
        setStats({
          consultations_today: data.consultations_today ?? 0,
          total_patients: data.total_patients ?? 0,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleItemClick = (action: () => void) => {
    action();
    onItemClick?.();
  };

  const openStubModal = (key: string) => {
    setOpenModal(key);
  };

  const closeModal = () => setOpenModal(null);

  const menuItems = [
    {
      section: "Principal",
      items: [
        {
          label: "Nueva Nota Clínica",
          action: () => {
            router.push("/");
            onClose();
          },
        },
        {
          label: "Ver consultas",
          action: () => {
            router.push("/dashboard");
            onClose();
          },
        },
      ],
    },
    {
      section: "Redactar con IA",
      items: [
        { label: "Recetas y Órdenes", action: () => openStubModal("recetas") },
        { label: "Documentos médicos", action: () => openStubModal("documentos") },
      ],
    },
    {
      section: "Análisis de Estudios con IA",
      items: [
        { label: "Imágenes, laboratorio, dermatología, cardiológico", action: () => openStubModal("analisis") },
      ],
    },
    {
      section: "Pacientes",
      items: [
        { label: "Gestionar pacientes", action: () => openStubModal("pacientes") },
      ],
    },
    {
      section: "Fármacos",
      items: [
        { label: "Vademécum", action: () => openStubModal("vademecum") },
        { label: "Interacciones medicamentosas", action: () => openStubModal("interacciones") },
        { label: "Calculadoras médicas", action: () => openStubModal("calculadoras") },
      ],
    },
    {
      section: "Guías y Protocolos",
      items: [
        { label: "Guías y Protocolos", action: () => openStubModal("guias") },
      ],
    },
    {
      section: "Consultorio",
      items: [
        { label: "Agenda de hoy", action: () => openStubModal("agenda") },
        { label: "Programar nuevo turno", action: () => openStubModal("turno") },
        { label: "Configurar horarios", action: () => openStubModal("horarios") },
        { label: "Gestión de pagos", action: () => openStubModal("pagos") },
      ],
    },
    {
      section: "Más",
      items: [
        { label: "Perfil médico", action: () => openStubModal("perfil") },
      ],
    },
  ];

  return (
    <>
      <aside
        className="fixed top-0 left-0 z-40 h-full w-72 flex flex-col shadow-xl border-r border-rene-aquaDark/60"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 40,
          height: "100vh",
          width: "18rem",
          backgroundColor: "#f0fdfa",
          borderRight: "1px solid rgba(204,251,241,0.6)",
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease-out",
        }}
      >
        <div className="p-4 border-b border-rene-aquaDark/40 shrink-0" style={{ backgroundColor: "rgba(204,251,241,0.3)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-lg text-gray-800">Rene</span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-600 hover:text-gray-800 rounded-lg"
              aria-label="Cerrar panel"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-rene-green flex items-center justify-center text-white font-semibold shrink-0">
              {(session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{session?.user?.name ?? "Usuario"}</p>
              <p className="text-gray-600 text-xs">{session?.user?.email ?? "Profesional de salud"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg p-2.5 text-center border border-rene-aquaDark/30" style={{ backgroundColor: "rgba(255,255,255,0.8)" }}>
              <p className="text-xs text-gray-600 font-medium">Consultas Hoy</p>
              <p className="text-lg font-bold text-gray-800">{stats.consultations_today}</p>
            </div>
            <div className="flex-1 rounded-lg p-2.5 text-center border border-rene-aquaDark/30" style={{ backgroundColor: "rgba(255,255,255,0.8)" }}>
              <p className="text-xs text-gray-600 font-medium">Pacientes</p>
              <p className="text-lg font-bold text-gray-800">{stats.total_patients}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuItems.map((group) => (
            <div key={group.section} className="mb-4">
              <h3 className="px-3 py-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                {group.section}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => handleItemClick(item.action)}
                      className="w-full px-3 py-2.5 text-left text-sm font-medium text-gray-800 rounded-lg border border-rene-green/30 hover:bg-rene-green hover:text-white hover:border-rene-green transition-colors"
                      style={{ backgroundColor: "rgba(20,184,166,0.1)" }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <Modal isOpen={openModal === "recetas"} onClose={closeModal} title="Recetas y Órdenes">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "documentos"} onClose={closeModal} title="Documentos médicos">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "analisis"} onClose={closeModal} title="Análisis de Estudios con IA">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "pacientes"} onClose={closeModal} title="Gestionar pacientes">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "vademecum"} onClose={closeModal} title="Vademécum">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "interacciones"} onClose={closeModal} title="Interacciones medicamentosas">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "calculadoras"} onClose={closeModal} title="Calculadoras médicas">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "guias"} onClose={closeModal} title="Guías y Protocolos">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "agenda"} onClose={closeModal} title="Agenda de hoy">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "turno"} onClose={closeModal} title="Programar nuevo turno">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "horarios"} onClose={closeModal} title="Configurar horarios">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "pagos"} onClose={closeModal} title="Gestión de pagos">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
      <Modal isOpen={openModal === "perfil"} onClose={closeModal} title="Perfil médico">
        <p className="text-gray-600">En desarrollo</p>
      </Modal>
    </>
  );
}
