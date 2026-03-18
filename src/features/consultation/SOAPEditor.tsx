"use client";

import { useState } from "react";
import { AutoResizeTextarea } from "@/shared/components/AutoResizeTextarea";

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPEditorProps {
  soap: SOAPNote;
  onChange: (soap: SOAPNote) => void;
  onSave: () => void;
}

const BLOCKS: Array<{ key: keyof SOAPNote; label: string }> = [
  { key: "subjective", label: "Subjetivo" },
  { key: "objective", label: "Objetivo" },
  { key: "assessment", label: "Evaluación" },
  { key: "plan", label: "Plan" },
];

export function SOAPEditor({ soap, onChange, onSave }: SOAPEditorProps) {
  const [saving, setSaving] = useState(false);

  const handleChange = (key: keyof SOAPNote, value: string) => {
    onChange({ ...soap, [key]: value });
  };

  const handleSave = () => {
    setSaving(true);
    onSave();
    setTimeout(() => setSaving(false), 500);
  };

  const handleCopy = () => {
    const text = BLOCKS.map((b) => `${b.label}:\n${soap[b.key]}`).join("\n\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white border border-rene-aquaDark/40 rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-visible">
        {BLOCKS.map(({ key, label }) => (
          <div key={key} className="border-b border-rene-aquaDark/20 last:border-0">
            <label className="block px-4 pt-3 text-sm font-medium text-gray-600">
              {label}
            </label>
            <AutoResizeTextarea
              value={soap[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full px-4 pb-3 pt-1 text-sm border-0 focus:ring-0"
              placeholder={`${label}...`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 bg-rene-aqua/50 border-t border-rene-aquaDark/40 shrink-0">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-rene-green text-white rounded-lg hover:bg-rene-greenDark disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm bg-rene-aquaDark/50 text-rene-greenDark rounded-lg hover:bg-rene-aquaDark"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}
