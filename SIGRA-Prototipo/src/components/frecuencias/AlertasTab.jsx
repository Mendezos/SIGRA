import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import DataTable from "../DataTable";
import { Button, Notice, Pill } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import AlertaDetalleModal from "./AlertaDetalleModal";
import { esAdministrador, fechaCorta, puedeAtenderAlerta, textoDias } from "./helpers";

const columnas = [
    {
        key: "tipo",
        label: "Alerta",
        render: (f) =>
            f.urgente ? (
                <span className="inline-flex items-center gap-1" style={{ color: COLORS.red, fontWeight: 700 }}>
                    <AlertTriangle size={14} /> URGENTE · 30 días
                </span>
            ) : (
                f.tipoTexto
            ),
    },
    { key: "empresa", label: "Cliente" },
    { key: "frecuencia", label: "Frecuencia" },
    { key: "vence", label: "Vence", render: (f) => fechaCorta(`${f.vence}T00:00:00`) },
    { key: "dias", label: "Días restantes", render: (f) => textoDias(f.dias) },
    { key: "vendedor", label: "Vendedor responsable" },
    {
        key: "correo",
        label: "Correo",
        render: (f) => <Pill tone={f.correoEnviado ? "positive" : "warning"}>{f.correoEnviado ? "Enviado" : "Sin enviar"}</Pill>,
    },
    { key: "estadoAlerta", label: "Atención", render: (f) => (f.atendida ? `Atendida ${fechaCorta(f.fechaAtencion)}` : "Pendiente") },
];

export default function AlertasTab({ user, onVerSolicitud }) {
    const canAtender = puedeAtenderAlerta(user.role);
    const [alertas, setAlertas] = useState([]);
    const [filtro, setFiltro] = useState("pendientes");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [detalle, setDetalle] = useState(null);
    const [verificando, setVerificando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const atendida = filtro === "pendientes" ? false : filtro === "atendidas" ? true : undefined;
            setAlertas(await api.listarAlertas({ atendida }));
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar las alertas.");
        } finally {
            setCargando(false);
        }
    }, [filtro]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    async function verificar() {
        setVerificando(true);
        setMensaje("");
        setError("");
        try {
            const r = await api.verificarAlertas();
            setMensaje(r.mensaje);
            await cargar();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo ejecutar la verificación.");
        } finally {
            setVerificando(false);
        }
    }

    const filas = useMemo(
        () =>
            alertas.map((a) => ({
                id: a.idAlerta,
                urgente: a.urgente,
                tipoTexto: api.TIPOS_ALERTA[a.tipo] ?? a.tipo,
                empresa: a.empresa,
                frecuencia: a.frecuencia || "—",
                vence: a.fechaVencimiento.slice(0, 10),
                dias: a.diasRestantes,
                vendedor: a.vendedor,
                correoEnviado: a.correoEnviado,
                atendida: a.atendida,
                fechaAtencion: a.fechaAtencion,
            })),
        [alertas]
    );

    const urgentes = alertas.filter((a) => a.urgente && !a.atendida).length;

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {urgentes > 0 && (
                <Notice tone="error">
                    Hay {urgentes} alerta(s) <strong>urgente(s)</strong> pendiente(s): faltan 30 días o menos para el vencimiento y no hay renovación iniciada.
                </Notice>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar alertas" className={inputClass} style={{ ...inputStyle, width: "auto" }}>
                    <option value="pendientes">Pendientes</option>
                    <option value="atendidas">Atendidas</option>
                    <option value="todas">Todas</option>
                </select>
                {esAdministrador(user.role) && (
                    <Button className="ml-auto flex items-center gap-1.5" onClick={verificar} disabled={verificando}>
                        <RefreshCw size={14} className={verificando ? "animate-spin" : ""} /> {verificando ? "Verificando..." : "Ejecutar verificación ahora"}
                    </Button>
                )}
            </div>

            <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
                El sistema revisa los vencimientos automáticamente cada hora y envía las alertas por correo al vendedor responsable: a los 6 meses, a los 3 meses
                (si no hay renovación iniciada) y a los 30 días (urgente).
            </p>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando alertas...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => setDetalle(alertas.find((a) => a.idAlerta === fila.id) ?? null)}
                    searchPlaceholder="Buscar por cliente, frecuencia o vendedor..."
                    hideInactiveToggle
                    emptyMessage={filtro === "pendientes" ? "No tienes alertas de vencimiento pendientes." : "No hay alertas para mostrar."}
                />
            )}

            {detalle && (
                <AlertaDetalleModal
                    alerta={detalle}
                    canAtender={canAtender}
                    onVerSolicitud={() => onVerSolicitud(detalle.idSolicitud)}
                    onClose={() => setDetalle(null)}
                    onAtendida={async (atendida) => {
                        setDetalle(null);
                        setMensaje(`La alerta de ${atendida.empresa} (${atendida.frecuencia}) se marcó como atendida y salió del listado de pendientes.`);
                        await cargar();
                    }}
                />
            )}
        </div>
    );
}
