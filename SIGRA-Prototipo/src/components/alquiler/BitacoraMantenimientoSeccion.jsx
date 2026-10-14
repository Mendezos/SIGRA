import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { fechaHora } from "./helpers";

// Historial unificado de las intervenciones (tickets cerrados) de la repetidora, en orden cronológico.
export default function BitacoraMantenimientoSeccion({ numeroSerie }) {
    const [entradas, setEntradas] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        api.obtenerBitacoraRepetidora(numeroSerie)
            .then((datos) => activo && setEntradas(datos))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar la bitácora."));
        return () => {
            activo = false;
        };
    }, [numeroSerie]);

    return (
        <section className="mt-6">
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                Bitácora de mantenimiento
            </p>

            {error && <Notice tone="error">{error}</Notice>}
            {!error && entradas === null && <p className="text-sm" style={{ color: COLORS.muted }}>Cargando bitácora...</p>}
            {entradas?.length === 0 && (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Todavía no hay mantenimientos ni reparaciones registrados. Se agregan solos cuando se cierra un ticket de esta repetidora.
                </p>
            )}

            {entradas?.length > 0 && (
                <ol className="space-y-3">
                    {entradas.map((e) => (
                        <li key={e.idBitacora} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS.greenTint }}>
                                <Wrench size={15} color={COLORS.green} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm" style={{ fontWeight: 600 }}>
                                    {e.tipoServicio} · {e.codigoTicket}
                                </p>
                                <p className="text-xs" style={{ color: COLORS.muted }}>
                                    {fechaHora(e.fecha)} · Técnico: {e.tecnico ?? "—"} · Resolución: {e.resolucion ?? "—"}
                                </p>
                                <p className="text-sm mt-1">{e.detalle}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
