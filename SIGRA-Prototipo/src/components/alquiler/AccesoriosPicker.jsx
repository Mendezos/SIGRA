import { Plus, X } from "lucide-react";
import { Button } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";

// Lista editable de accesorios del catálogo con su cantidad. value: [{ idAccesorioModelo, cantidad }]
export default function AccesoriosPicker({ catalogo, value, onChange }) {
    const usados = new Set(value.map((i) => String(i.idAccesorioModelo)));

    function agregar() {
        const libre = catalogo.find((a) => !usados.has(String(a.id)));
        if (!libre) return;
        onChange([...value, { idAccesorioModelo: String(libre.id), cantidad: "1" }]);
    }

    function actualizar(indice, cambios) {
        onChange(value.map((item, i) => (i === indice ? { ...item, ...cambios } : item)));
    }

    return (
        <div>
            {value.length === 0 && (
                <p className="text-sm mb-2" style={{ color: COLORS.muted }}>
                    No se han agregado accesorios.
                </p>
            )}

            <ul className="flex flex-col gap-2 mb-3">
                {value.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <select
                            value={item.idAccesorioModelo}
                            onChange={(e) => actualizar(i, { idAccesorioModelo: e.target.value })}
                            aria-label="Accesorio"
                            className={inputClass}
                            style={inputStyle}
                        >
                            {catalogo.map((a) => (
                                <option
                                    key={a.id}
                                    value={a.id}
                                    disabled={usados.has(String(a.id)) && String(a.id) !== String(item.idAccesorioModelo)}
                                >
                                    {a.modelo} · {a.nombre} (bodega: {a.cantidad})
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.cantidad}
                            onChange={(e) => actualizar(i, { cantidad: e.target.value })}
                            aria-label="Cantidad"
                            className="w-24 px-3 py-2.5 rounded-lg text-sm"
                            style={inputStyle}
                        />
                        <button
                            type="button"
                            aria-label="Quitar accesorio"
                            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                            style={{ color: COLORS.red }}
                        >
                            <X size={15} />
                        </button>
                    </li>
                ))}
            </ul>

            <Button className="flex items-center gap-1" disabled={usados.size >= catalogo.length} onClick={agregar}>
                <Plus size={14} /> Agregar accesorio
            </Button>
        </div>
    );
}

