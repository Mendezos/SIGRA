import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button, FieldLabel } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/frecuenciasService";

// Barra de búsqueda y filtros de las solicitudes. Los criterios se combinan: se muestran las solicitudes que cumplen todos.
export default function FiltrosSolicitudes({ filtros, onChange, onLimpiar, hayFiltros, puedeFiltrarVendedor, total }) {
    const [vendedores, setVendedores] = useState([]);

    useEffect(() => {
        if (!puedeFiltrarVendedor) return;
        let activo = true;
        api.listarVendedores()
            .then((lista) => activo && setVendedores(lista))
            .catch(() => activo && setVendedores([]));
        return () => {
            activo = false;
        };
    }, [puedeFiltrarVendedor]);

    const set = (campo) => (e) => onChange({ ...filtros, [campo]: e.target.value });

    return (
        <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <FieldLabel label="Búsqueda general">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                        <input
                            value={filtros.texto}
                            onChange={set("texto")}
                            placeholder="Código, repetidora, frecuencia..."
                            className={inputClass}
                            style={{ ...inputStyle, paddingLeft: "2.1rem" }}
                        />
                    </div>
                </FieldLabel>

                <FieldLabel label="Cliente (nombre de la empresa)">
                    <input value={filtros.cliente} onChange={set("cliente")} placeholder="Ej. Bomberos" className={inputClass} style={inputStyle} />
                </FieldLabel>

                <FieldLabel label="Estado del trámite">
                    <select value={filtros.estado} onChange={set("estado")} className={inputClass} style={inputStyle}>
                        <option value="">Todos los estados</option>
                        {api.ESTADOS_SOLICITUD.map((e) => <option key={e}>{e}</option>)}
                    </select>
                </FieldLabel>

                {puedeFiltrarVendedor && (
                    <FieldLabel label="Vendedor responsable">
                        <select value={filtros.idVendedor} onChange={set("idVendedor")} className={inputClass} style={inputStyle}>
                            <option value="">Todos los vendedores</option>
                            {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                        </select>
                    </FieldLabel>
                )}

                <FieldLabel label="Zona geográfica de cobertura">
                    <input value={filtros.zona} onChange={set("zona")} placeholder="Ej. Zona Sur" className={inputClass} style={inputStyle} />
                </FieldLabel>
            </div>

            {hayFiltros && (
                <div className="flex flex-wrap items-center gap-3 mt-3">
                    <p className="text-sm" style={{ color: COLORS.charcoal }} aria-live="polite">
                        <strong>{total}</strong> solicitud(es) encontrada(s)
                    </p>
                    <Button className="ml-auto flex items-center gap-1.5" onClick={onLimpiar}>
                        <X size={14} /> Limpiar filtros
                    </Button>
                </div>
            )}
        </div>
    );
}
