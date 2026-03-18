"use client";

import { useState } from "react";
import { OrderDocumentModal } from "./OrderDocumentModal";

interface Prescription {
  drug: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
}

interface MedicalOrder {
  type: string;
  description: string;
}

interface OrderItem {
  id: string;
  kind: "prescription" | "order";
  typeLabel: string;
  label: string;
  content: string;
  prescription?: Prescription;
  medicalOrder?: MedicalOrder;
}

interface EstudiosOrdenesSectionProps {
  prescriptions: Prescription[];
  medicalOrders: MedicalOrder[];
}

function formatPrescription(p: Prescription): string {
  return `${p.drug} ${p.dose} ${p.frequency} ${p.route} - ${p.duration}`;
}

function buildOrderItems(
  prescriptions: Prescription[],
  medicalOrders: MedicalOrder[]
): OrderItem[] {
  const items: OrderItem[] = [];
  prescriptions.forEach((p, i) => {
    items.push({
      id: `rx-${i}`,
      kind: "prescription",
      typeLabel: "Receta",
      label: p.drug,
      content: `Receta: ${formatPrescription(p)}`,
      prescription: p,
    });
  });
  medicalOrders.forEach((o, i) => {
    const typeLabel =
      o.type === "lab" ? "Laboratorio" : o.type === "imaging" ? "Imagen" : "Derivación";
    items.push({
      id: `order-${i}`,
      kind: "order",
      typeLabel,
      label: o.description,
      content: `${typeLabel}\n${o.description}`,
      medicalOrder: o,
    });
  });
  return items;
}

export function EstudiosOrdenesSection({
  prescriptions,
  medicalOrders,
}: EstudiosOrdenesSectionProps) {
  const items = buildOrderItems(prescriptions, medicalOrders);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalItem, setModalItem] = useState<OrderItem | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleWhatsApp = () => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    const text = selected.map((i) => i.content).join("\n\n");
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const selectedCount = selectedIds.size;

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Sin estudios ni medicación indicada.</p>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-auto min-h-0">
        {prescriptions.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-medical-medication mb-2">Medicación</h4>
            <ul className="space-y-1">
              {prescriptions.map((p, i) => {
                const id = `rx-${i}`;
                const item = items.find((it) => it.id === id)!;
                return (
                  <OrderRow
                    key={id}
                    item={item}
                    selected={selectedIds.has(id)}
                    onToggle={() => toggleSelect(id)}
                    onClick={() => setModalItem(item)}
                  />
                );
              })}
            </ul>
          </div>
        )}
        {medicalOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-medical-procedure mb-2">Estudios / Órdenes</h4>
            <ul className="space-y-1">
              {medicalOrders.map((o, i) => {
                const id = `order-${i}`;
                const item = items.find((it) => it.id === id)!;
                return (
                  <OrderRow
                    key={id}
                    item={item}
                    selected={selectedIds.has(id)}
                    onToggle={() => toggleSelect(id)}
                    onClick={() => setModalItem(item)}
                  />
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div className="pt-3 mt-3 border-t border-rene-aquaDark/40 shrink-0">
        <button
          onClick={handleWhatsApp}
          disabled={selectedCount === 0}
          className="w-full py-2.5 px-4 text-sm font-medium bg-rene-green text-white rounded-lg hover:bg-rene-greenDark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>Enviar por WhatsApp</span>
          {selectedCount > 0 && (
            <span className="bg-white/20 rounded-full px-1.5 text-xs">{selectedCount}</span>
          )}
        </button>
      </div>

      <OrderDocumentModal
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        type={modalItem?.kind ?? "order"}
        prescription={modalItem?.prescription}
        medicalOrder={modalItem?.medicalOrder}
      />
    </div>
  );
}

function OrderRow({
  item,
  selected,
  onToggle,
  onClick,
}: {
  item: OrderItem;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-rene-aqua/50 cursor-pointer border border-transparent hover:border-rene-aquaDark/40 transition"
    >
      <span className="flex-1 min-w-0 text-sm">
        <span className="font-medium text-gray-600">{item.typeLabel}:</span>{" "}
        <span className="text-gray-800">{item.label}</span>
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`shrink-0 mt-0.5 w-11 h-6 rounded-full transition flex items-center ${
          selected ? "bg-rene-green justify-end" : "bg-rene-aquaDark/50 justify-start"
        }`}
        role="switch"
        aria-checked={selected}
        aria-label={selected ? "Desmarcar para excluir del envío" : "Marcar para incluir en el envío"}
      >
        <span className="block w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
      </button>
    </li>
  );
}
