import { useEffect, useState } from "react";
import { Boxes, Building2, CalendarDays, FileText, Hash, MapPin, Package, Tag, Truck, Wallet, Wrench } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/inventarioService";
import { colones, fechaCorta, fechaHora } from "./helpers";

const COLOR_ORIGEN = {
    Movimiento: COLORS.green,
    "Bitácora": "#3B82A0",
    Contrato: "#9C7A17",
    Ticket: COLORS.red,
};

function Historial({ items }) {
    if (!items.length) {
        return (
            <p className="text-sm" style={{ color: COLORS.muted }}>
                Este equipo todavía no tiene movimientos registrados.
            </p>
        );
    }

    return (
        <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
            {items.map((item, i) => (
                <li key={i} className="pl-5 pb-5 relative">
                    <span
                        className="absolute -left-[7px] top-1 w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLOR_ORIGEN[item.origen] ?? COLORS.muted, border: "2px solid white" }}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{item.titulo}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F1F1F1", color: COLORS.muted }}>
                            {item.origen}
                        </span>
                    </div>
                    {item.detalle && (
                        <p className="text-sm mt-0.5" style={{ color: COLORS.charcoal }}>{item.detalle}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
                        {fechaHora(item.fecha)}
                        {item.usuario ? ` · ${item.usuario}` : ""}
                    </p>
                </li>
            ))}
        </ol>
    );
}

function Bitacora({ idEquipo }) {
    const [lista, setLista] = useState(null);

    useEffect(() => {
        let activo = true;
        api.obtenerBitacora(idEquipo)
            .then((r) => activo && setLista(r))
            .catch(() => activo && setLista([]));
        return () => {
            activo = false;
        };
    }, [idEquipo]);

    if (!lista) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando bitácora...</p>;

    return (
        <>
            <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
                La bitácora es de solo lectura: se completa sola cuando se cierra una boleta de mantenimiento o reparación.
            </p>
            {lista.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Este equipo todavía no tiene registros en la bitácora.</p>
            ) : (
                <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
                    {lista.map((b) => (
                        <li key={b.idBitacora} className="pl-5 pb-4 relative">
                            <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ backgroundColor: b.idTicket ? COLORS.red : "#3B82A0", border: "2px solid white" }} />
                            <p className="text-sm" style={{ color: COLORS.charcoal }}>{b.descripcion}</p>
                            <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
                                {fechaHora(b.fecha)}{b.codigoSeguimiento ? ` · boleta ${b.codigoSeguimiento}` : ""}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </>
    );
}

export default function EquipoFichaModal({ ficha, onClose, onChanged, canWrite }) {
    const [nuevoEstado, setNuevoEstado] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [vista, setVista] = useState("datos");

    if (!ficha) return null;
    const { equipo, historial } = ficha;
    const dadoDeBaja = equipo.estado === "Dado de baja";
    const esBaja = nuevoEstado === "Dado de baja";

    async function cambiarEstado() {
        setError("");
        setMensaje("");
        setGuardando(true);
        try {
            const actualizada = await api.cambiarEstadoEquipo(equipo.idEquipo, nuevoEstado, motivo);
            setNuevoEstado("");
            setMotivo("");
            setVista("datos");
            setMensaje(`El estado del equipo cambió a "${actualizada.equipo.estado}".`);
            onChanged(actualizada);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado.");
        } finally {
            setGuardando(false);
        }
    }

    const detalles = [
        { icon: Tag, label: "Categoría", value: equipo.categoria },
        { icon: Hash, label: "Marca", value: equipo.marca },
        { icon: Package, label: "Modelo", value: equipo.modelo },
        { icon: Building2, label: "Propietario", value: equipo.propietario },
        { icon: MapPin, label: "Ubicación", value: equipo.ubicacion },
        { icon: Truck, label: "Proveedor", value: equipo.proveedor },
        { icon: CalendarDays, label: "Fecha de adquisición", value: fechaCorta(equipo.fechaAdquisicion) },
        { icon: Wallet, label: "Costo de compra", value: colones(equipo.costoCompra) },
        ...(equipo.manejaCantidad ? [{ icon: Boxes, label: "Cantidad en stock", value: String(equipo.cantidad) }] : []),
        { icon: FileText, label: "Descripción técnica", value: equipo.descripcionTecnica, wide: true },
    ];

    const puedeCambiarEstado = canWrite && !dadoDeBaja;
    const tabs = [
        { key: "datos", label: "Datos del equipo" },
        ...(puedeCambiarEstado ? [{ key: "estado", label: "Cambiar estado" }] : []),
        { key: "historial", label: "Historial completo" },
        { key: "bitacora", label: "Bitácora de boletas" },
    ];

    return (
        <Modal
            open
            onClose={onClose}
            title={`${equipo.marca} ${equipo.modelo}`}
            subtitle={`Número de serie ${equipo.numeroSerie}`}
            icon={Wrench}
            width="max-w-3xl"
            headerExtra={<StatusBadge value={equipo.estado} />}
            tabs={tabs}
            activeTab={vista}
            onTabChange={setVista}
        >
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {vista === "datos" && (
            <div className="flex flex-col sm:flex-row gap-5">
                {equipo.foto ? (
                    <img
                        src={equipo.foto}
                        alt={`Fotografía de ${equipo.marca} ${equipo.modelo}`}
                        className="w-full sm:w-44 h-44 rounded-xl object-cover shrink-0"
                        style={{ border: `1px solid ${COLORS.border}` }}
                    />
                ) : (
                    <div
                        className="w-full sm:w-44 h-44 rounded-xl shrink-0 flex flex-col items-center justify-center gap-2"
                        style={{ backgroundColor: COLORS.greenTint, color: COLORS.muted }}
                    >
                        <Boxes size={32} color={COLORS.green} />
                        <span className="text-xs">Sin fotografía</span>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {dadoDeBaja && (
                        <div className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                            Dado de baja el {fechaCorta(equipo.fechaBaja)}. Motivo: {equipo.motivoBaja || "sin registro"}.
                        </div>
                    )}

                    <DetailGrid items={detalles} />
                </div>
            </div>
            )}

            {vista === "estado" && puedeCambiarEstado && (
                <section className="rounded-xl p-4" style={{ backgroundColor: "#FAFAFA", border: `1px solid ${COLORS.border}` }}>
                    <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                        Cambiar estado
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldLabel label="Nuevo estado">
                            <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className={inputClass} style={inputStyle}>
                                <option value="">Seleccionar...</option>
                                {api.ESTADOS_EQUIPO.filter((e) => e !== equipo.estado).map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </FieldLabel>
                        {esBaja && (
                            <FieldLabel label="Motivo de la baja *">
                                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} className={inputClass} style={inputStyle} />
                            </FieldLabel>
                        )}
                    </div>
                    <div className="flex justify-end mt-3">
                        <Button variant={esBaja ? "danger" : "primary"} disabled={!nuevoEstado || guardando} onClick={cambiarEstado}>
                            {guardando ? "Guardando..." : esBaja ? "Dar de baja" : "Cambiar estado"}
                        </Button>
                    </div>
                </section>
            )}

            {vista === "historial" && <Historial items={historial} />}
            {vista === "bitacora" && <Bitacora key={historial.length} idEquipo={equipo.idEquipo} />}
        </Modal>
    );
}
