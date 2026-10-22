import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../DataTable";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import SolicitudDetalleModal from "./SolicitudDetalleModal";
import AuditoriaSolicitudModal from "./AuditoriaSolicitudModal";
import CancelarSolicitudModal from "./CancelarSolicitudModal";
import OtorgamientoFormModal from "./OtorgamientoFormModal";
import SolicitudFormModal from "./SolicitudFormModal";
import FiltrosSolicitudes from "./FiltrosSolicitudes";
import { esVendedor, fechaCorta, puedeRegistrarSolicitud } from "./helpers";

const columnas = [
    { key: "codigo", label: "Solicitud" },
    { key: "empresa", label: "Cliente" },
    { key: "repetidora", label: "Repetidora" },
    { key: "frecuencia", label: "Frecuencia" },
    { key: "banda", label: "Banda" },
    { key: "presentacion", label: "Presentada" },
    // "vence" guarda la fecha ISO (la tabla la usa para su filtro "vence hasta"); se muestra con formato legible.
    { key: "vence", label: "Vence", render: (fila) => (fila.vence === "—" ? "—" : fechaCorta(`${fila.vence}T00:00:00`)) },
    { key: "vendedor", label: "Vendedor responsable" },
    { key: "documentos", label: "Documentos" },
    { key: "estado", label: "Estado" },
];

const FILTROS_VACIOS = { texto: "", cliente: "", estado: "", idVendedor: "", zona: "" };
const hayCriterios = (f) => Object.values(f).some((v) => String(v).trim() !== "");

export default function SolicitudesTab({ user, abrirId, onAbierta }) {
    const canRegistrar = puedeRegistrarSolicitud(user);
    const [todas, setTodas] = useState([]);
    const [solicitudes, setSolicitudes] = useState([]);
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [aplicados, setAplicados] = useState(FILTROS_VACIOS);
    const [cargando, setCargando] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [renovando, setRenovando] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [otorgando, setOtorgando] = useState(null);
    const [cancelando, setCancelando] = useState(null);
    const [auditando, setAuditando] = useState(null);

    const hayFiltros = hayCriterios(aplicados);
    const puedeFiltrarVendedor = !esVendedor(user.role);

    // Los criterios de texto se aplican una fracción de segundo después de dejar de escribir.
    useEffect(() => {
        const espera = setTimeout(() => setAplicados(filtros), 350);
        return () => clearTimeout(espera);
    }, [filtros]);

    // "todas" alimenta las tarjetas de resumen; "solicitudes" es lo que muestra la tabla con los filtros aplicados.
    const cargar = useCallback(async () => {
        setBuscando(true);
        try {
            const lista = await api.listarSolicitudes();
            setTodas(lista);
            setSolicitudes(hayFiltros ? await api.listarSolicitudes(aplicados) : lista);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar las solicitudes.");
        } finally {
            setCargando(false);
            setBuscando(false);
        }
    }, [aplicados, hayFiltros]);

    function limpiarFiltros() {
        setFiltros(FILTROS_VACIOS);
        setAplicados(FILTROS_VACIOS);
    }

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    // Llegada desde otra pestaña (por ejemplo, desde una alerta): abre el detalle de esa solicitud.
    useEffect(() => {
        if (!abrirId) return;
        let activo = true;
        api.obtenerSolicitud(abrirId)
            .then((s) => activo && setDetalle(s))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo abrir la solicitud."))
            .finally(() => activo && onAbierta?.());
        return () => {
            activo = false;
        };
    }, [abrirId, onAbierta]);

    const filas = useMemo(
        () =>
            solicitudes.map((s) => ({
                id: s.idSolicitud,
                codigo: api.codigoSolicitud(s.idSolicitud),
                empresa: s.empresa,
                repetidora: s.numeroSerie,
                frecuencia: s.frecuencia || "—",
                banda: s.banda || "—",
                presentacion: fechaCorta(s.fechaPresentacion) || "—",
                vence: s.fechaVencimiento ? s.fechaVencimiento.slice(0, 10) : "—",
                vendedor: s.vendedor,
                documentos: s.cantidadDocumentos === 0 ? "Sin documentos" : `${s.cantidadDocumentos} adjunto(s)`,
                estado: s.estado,
            })),
        [solicitudes]
    );

    const resumen = useMemo(
        () => [
            { label: "Solicitudes registradas", value: todas.length },
            { label: "Vigentes", value: todas.filter((s) => s.estado === "Vigente").length },
            { label: "Por renovar", value: todas.filter((s) => s.estado === "Por renovar").length },
        ],
        [todas]
    );

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {resumen.map((m) => (
                    <div key={m.label} className="rounded-lg p-4" style={{ backgroundColor: COLORS.greenTint }}>
                        <p className="text-xs mb-1" style={{ color: COLORS.muted }}>{m.label}</p>
                        <p className="text-2xl" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{m.value}</p>
                    </div>
                ))}
            </div>

            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {canRegistrar && (
                <div className="flex justify-end mb-4">
                    <Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setRegistrando(true); }}>
                        <Plus size={15} /> Nueva solicitud
                    </Button>
                </div>
            )}

            <FiltrosSolicitudes
                filtros={filtros}
                onChange={setFiltros}
                onLimpiar={limpiarFiltros}
                hayFiltros={hayFiltros}
                puedeFiltrarVendedor={puedeFiltrarVendedor}
                total={solicitudes.length}
            />

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando solicitudes...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => setDetalle(solicitudes.find((s) => s.idSolicitud === fila.id) ?? null)}
                    showSearch={false}
                    showEstadoFilter={false}
                    loading={buscando}
                    hideInactiveToggle
                    emptyMessage={hayFiltros ? api.MENSAJE_SIN_RESULTADOS : "Todavía no hay solicitudes de frecuencia registradas."}
                />
            )}

            {(registrando || renovando) && (
                <SolicitudFormModal
                    user={user}
                    renovacionDe={renovando}
                    onClose={() => {
                        if (renovando) setDetalle(renovando);
                        setRegistrando(false);
                        setRenovando(null);
                    }}
                    onSaved={async (guardada) => {
                        const origen = renovando;
                        setRegistrando(false);
                        setRenovando(null);
                        setMensaje(
                            `La solicitud ${api.codigoSolicitud(guardada.idSolicitud)} se registró con estado "${guardada.estado}" y quedó asignada a ${guardada.vendedor}.` +
                                (origen ? ` Quedó vinculada como renovación de ${api.codigoSolicitud(origen.idSolicitud)}, que pasó a "En renovación".` : "") +
                                (guardada.cantidadDocumentos > 0 ? ` Se adjuntaron ${guardada.cantidadDocumentos} documento(s).` : "")
                        );
                        await cargar();
                        setDetalle(guardada);
                    }}
                />
            )}

            {otorgando && (
                <OtorgamientoFormModal
                    solicitud={otorgando}
                    onClose={() => { setDetalle(otorgando); setOtorgando(null); }}
                    onSaved={async (otorgada) => {
                        setOtorgando(null);
                        setMensaje(
                            `Se registró el otorgamiento de la solicitud ${api.codigoSolicitud(otorgada.idSolicitud)}. La frecuencia quedó "${otorgada.estado}" y vence el ${fechaCorta(otorgada.fechaVencimiento)}.` +
                                (otorgada.idSolicitudOrigen ? ` La frecuencia ${api.codigoSolicitud(otorgada.idSolicitudOrigen)} quedó "Renovada" y esta nueva frecuencia inicia su propio ciclo de alertas (6 meses, 3 meses y 30 días).` : "")
                        );
                        await cargar();
                        setDetalle(otorgada);
                    }}
                />
            )}

            {auditando && (
                <AuditoriaSolicitudModal
                    solicitud={auditando}
                    onClose={() => { setDetalle(auditando); setAuditando(null); }}
                />
            )}

            {cancelando && (
                <CancelarSolicitudModal
                    solicitud={cancelando}
                    onClose={() => { setDetalle(cancelando); setCancelando(null); }}
                    onCancelada={async (cancelada) => {
                        setCancelando(null);
                        setMensaje(
                            `La solicitud ${api.codigoSolicitud(cancelada.idSolicitud)} se canceló. Se registró el motivo y la fecha, y se detuvieron sus alertas de vencimiento.`
                        );
                        await cargar();
                        setDetalle(cancelada);
                    }}
                />
            )}

            {detalle && (
                <SolicitudDetalleModal
                    solicitud={detalle}
                    canAdjuntar={canRegistrar}
                    onOtorgar={() => { setOtorgando(detalle); setDetalle(null); }}
                    onRenovar={() => { setRenovando(detalle); setDetalle(null); }}
                    onCancelar={() => { setCancelando(detalle); setDetalle(null); }}
                    onAuditoria={() => { setAuditando(detalle); setDetalle(null); }}
                    onVerSolicitud={async (id) => {
                        try {
                            setDetalle(await api.obtenerSolicitud(id));
                        } catch (e) {
                            setError(e instanceof ApiError ? e.message : "No se pudo abrir la solicitud.");
                        }
                    }}
                    onDocumentosCambiaron={cargar}
                    onClose={() => setDetalle(null)}
                />
            )}
        </div>
    );
}
