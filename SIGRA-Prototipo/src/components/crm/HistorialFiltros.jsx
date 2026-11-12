import { X } from "lucide-react";
import { Button, FieldLabel } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { TIPOS_INTERACCION } from "../../services/crmCatalogosService";
import { hayFiltrosHistorial, TIPOS_MOVIMIENTO } from "../../services/crmHistorialService";

// Filtros de la línea de tiempo: tipo de movimiento, rango de fechas y autor (CRMGPSC-014).
export default function HistorialFiltros({ filtros, onChange, onLimpiar, autores, total, rangoInvalido }) {
    const set = (campo) => (e) => onChange({ ...filtros, [campo]: e.target.value });

    return (
        <div className="rounded-lg border p-4 mb-5" style={{ borderColor: COLORS.border }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FieldLabel label="Tipo de movimiento">
                    <select value={filtros.tipoMovimiento} onChange={set("tipoMovimiento")} className={inputClass} style={inputStyle}>
                        <option value="">Todos</option>
                        <optgroup label="Movimiento">
                            {TIPOS_MOVIMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                        <optgroup label="Tipo de interacción">
                            {TIPOS_INTERACCION.map((t) => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                    </select>
                </FieldLabel>
                <FieldLabel label="Desde">
                    <input
                        type="date"
                        value={filtros.desde}
                        onChange={set("desde")}
                        aria-invalid={rangoInvalido || undefined}
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>
                <FieldLabel label="Hasta">
                    <input
                        type="date"
                        value={filtros.hasta}
                        onChange={set("hasta")}
                        aria-invalid={rangoInvalido || undefined}
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>
                <FieldLabel label="Autor">
                    <select value={filtros.idAutor} onChange={set("idAutor")} className={inputClass} style={inputStyle}>
                        <option value="">Todos</option>
                        {autores.map((a) => <option key={a.idUsuario} value={a.idUsuario}>{a.nombre}</option>)}
                    </select>
                </FieldLabel>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <p className="text-xs" style={{ color: COLORS.muted }} role="status" aria-live="polite">
                    {rangoInvalido ? "" : `${total} ${total === 1 ? "movimiento" : "movimientos"}${hayFiltrosHistorial(filtros) ? " con los filtros aplicados" : ""}`}
                </p>
                {hayFiltrosHistorial(filtros) && (
                    <Button variant="ghost" className="flex items-center gap-1.5" onClick={onLimpiar}>
                        <X size={14} /> Limpiar filtros
                    </Button>
                )}
            </div>
        </div>
    );
}
