
import { useState } from "react";
import Modal from "./Modal";
import { EQUIPMENT_MODELS } from "../data/modules";


const COLORS = {
    green: "#5EB453",
    greenDark: "#4CA23D",
    greenTint: "#EAF6E8",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",

};

function inputClass() {
    return "w-full px-3.5 py-2.5 rounded-lg text-sm bg-white outline-none";
}

function parseSummary(summary) {
    // Intenta reconstruir líneas { modelo, cantidad, series } a partir del texto guardado,
    // para poder reabrir el modal y seguir editando. Si no coincide el formato, arranca vacío.
    if (!summary) return [];
    try {
        const parts = summary.split(";").map((p) => p.trim()).filter(Boolean);
        return parts.map((p, i) => {
            const [head, seriesPart] = p.split("—").map((s) => s.trim());
            const match = head.match(/^(\d+)\s+(.+)$/);
            const cantidad = match ? match[1] : "1";
            const modelo = match ? match[2] : head;
            const series = seriesPart ? seriesPart.split(",").map((s) => s.trim()).filter(Boolean) : [];
            return { key: `${i}-${modelo}`, modelo, cantidad, series };
        });
    } catch {
        return [];
    }
}

function buildSummary(lines) {
    return lines
        .filter((l) => l.modelo && Number(l.cantidad) > 0)
        .map((l) => {
            const seriesText = l.series.filter(Boolean).join(", ");
            return `${l.cantidad} ${l.modelo}${seriesText ? ` — ${seriesText}` : ""}`;
        })
        .join("; ");
}

function EquipmentModal({ open, initialSummary, onClose, onSave }) {
    const [lines, setLines] = useState(() => {
        const parsed = parseSummary(initialSummary);
        return parsed.length ? parsed : [{ key: "0", modelo: EQUIPMENT_MODELS[0].modelo, cantidad: "1", series: [""] }];
    });

    function updateLine(key, patch) {
        setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    }

    function setCantidad(key, cantidadRaw) {
        const cantidad = cantidadRaw.replace(/[^0-9]/g, "");
        setLines((ls) =>
            ls.map((l) => {
                if (l.key !== key) return l;
                const n = Math.max(0, Number(cantidad || 0));
                const series = Array.from({ length: n }, (_, i) => l.series[i] ?? "");
                return { ...l, cantidad, series };
            })
        );
    }

    function setSerie(key, index, value) {
        setLines((ls) =>
            ls.map((l) => {
                if (l.key !== key) return l;
                const series = [...l.series];
                series[index] = value;
                return { ...l, series };
            })
        );
    }

    function addLine() {
        setLines((ls) => [...ls, { key: `${Date.now()}`, modelo: EQUIPMENT_MODELS[0].modelo, cantidad: "1", series: [""] }]);
    }

    function removeLine(key) {
        setLines((ls) => ls.filter((l) => l.key !== key));
    }

    return (
        <Modal open={open} onClose={onClose} title="Equipos incluidos en el contrato" subtitle="Indicá el modelo, la cantidad y el número de serie de cada equipo." width="max-w-xl">
            <div className="flex flex-col gap-5 mb-6">
                {lines.map((line) => (
                    <div key={line.key} className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.border}` }}>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <label className="block">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                                    Modelo
                                </span>
                                <select
                                    value={line.modelo}
                                    onChange={(e) => updateLine(line.key, { modelo: e.target.value })}
                                    className={inputClass()}
                                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                                >
                                    {EQUIPMENT_MODELS.map((m) => (
                                        <option key={m.modelo} value={m.modelo}>
                                            {m.modelo} ({m.tipo})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                                    Cantidad
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    value={line.cantidad}
                                    onChange={(e) => setCantidad(line.key, e.target.value)}
                                    className={inputClass()}
                                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                                />
                            </label>
                        </div>

                        {line.series.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {line.series.map((s, i) => (
                                    <input
                                        key={i}
                                        value={s}
                                        onChange={(e) => setSerie(line.key, i, e.target.value)}
                                        placeholder={`Serie del equipo ${i + 1}`}
                                        className={inputClass()}
                                        style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                                    />
                                ))}
                            </div>
                        )}

                        {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(line.key)} className="text-xs mt-1" style={{ color: COLORS.red }}>
                                Quitar este modelo
                            </button>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addLine}
                    className="self-start px-3.5 py-2 rounded-lg text-xs"
                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                >
                    + Agregar otro modelo
                </button>
            </div>

            <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm" style={{ color: COLORS.muted }}>
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={() => onSave(buildSummary(lines))}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: COLORS.green, color: COLORS.white, border: "none" }}
                >
                    Guardar equipos
                </button>
            </div>
        </Modal>
    );
}

function EquipmentField({ value, onChange }) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <div className="rounded-lg px-3.5 py-2.5 text-sm mb-2" style={{ border: `1px solid ${COLORS.border}`, color: value ? COLORS.charcoal : COLORS.muted }}>
                {value || "Sin equipos definidos todavía."}
            </div>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
            >
                Gestionar equipos incluidos
            </button>
            <EquipmentModal open={open} initialSummary={value} onClose={() => setOpen(false)} onSave={(summary) => { onChange(summary); setOpen(false); }} />
        </div>
    );
}

function MultiSelectField({ options, value, onChange }) {
    const selected = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];

    function toggle(option) {
        const next = selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option];
        onChange(next.join(", "));
    }

    return (
        <div className="rounded-lg p-3 max-h-40 overflow-y-auto" style={{ border: `1px solid ${COLORS.border}` }}>
            {options.map((option) => (
                <label key={option} className="flex items-center gap-2 py-1 text-sm" style={{ color: COLORS.charcoal }}>
                    <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} style={{ accentColor: COLORS.green }} />
                    {option}
                </label>
            ))}
        </div>
    );
}


export default function RecordForm({ fields, initialValues = {}, onSubmit, onCancel, submitLabel = "Guardar" }) {
    const [values, setValues] = useState(() => {
        const base = {};
        fields.forEach((f) => {
            base[f.key] = initialValues[f.key] ?? "";
        });
        return base;
    });

    function update(key, val) {
        setValues((v) => ({ ...v, [key]: val }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(values);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {fields.map((f) => (
                    <label key={f.key} className={f.type === "textarea" || f.type === "equipment" || f.type === "multiselect" ? "sm:col-span-2 block" : "block"}>
                        <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                            {f.label}
                            {f.required && <span style={{ color: COLORS.red }}> *</span>}

                        </span>
                        {f.type === "select" ? (
                            <select
                                value={values[f.key]}
                                onChange={(e) => update(f.key, e.target.value)}
                                required={f.required}
                                className={inputClass()}
                                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                            >
                                <option value="" disabled>
                                    Seleccionar...
                                </option>
                                {f.options.map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                        ) : f.type === "textarea" ? (
                            <textarea
                                value={values[f.key]}
                                onChange={(e) => update(f.key, e.target.value)}
                                required={f.required}
                                rows={3}
                                className={inputClass()}
                                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                            />
                        ) : f.type === "equipment" ? (
                            <EquipmentField value={values[f.key]} onChange={(v) => update(f.key, v)} />
                        ) : f.type === "multiselect" ? (
                            <MultiSelectField options={f.options} value={values[f.key]} onChange={(v) => update(f.key, v)} />
                        ) : (
                            <input
                                type={f.type || "text"}
                                value={values[f.key]}
                                onChange={(e) => update(f.key, e.target.value)}
                                required={f.required}
                                className={inputClass()}
                                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                            />
                        )}
                    </label>
                ))}
            </div>

            <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm" style={{ color: COLORS.muted }}>
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: COLORS.green, color: COLORS.white, border: "none" }}
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

