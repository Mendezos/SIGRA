import { useEffect, useState } from "react";
import { Ban, Building2, ExternalLink, Pencil, RotateCcw } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice, Pill } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmProspectosService";
import { formatearFechaHora } from "../../utils/format";
import { fechaHoraLocal, fechaLocal } from "./helpers";

const PESTANAS = [
    { key: "datos", label: "Datos de la empresa" },
    { key: "contactos", label: "Contactos" },
    { key: "cotizaciones", label: "Cotizaciones" },
    { key: "notas", label: "Notas" },
    { key: "interacciones", label: "Interacciones" },
    { key: "seguimientos", label: "Seguimientos" },
    { key: "estados", label: "Cambios de estado" },
];

const monto = (valor, moneda) =>
    moneda === "CRC" ? `₡${Number(valor).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${moneda} ${Number(valor).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;

function Vacio({ children }) {
    return (
        <p className="text-sm py-6 text-center" style={{ color: COLORS.muted }}>
            {children}
        </p>
    );
}

function Lista({ items, vacio, render }) {
    if (items.length === 0) return <Vacio>{vacio}</Vacio>;
    return (
        <ul className="space-y-3">
            {items.map((item, i) => (
                <li key={i} className="rounded-xl p-4 text-sm" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}>
                    {render(item)}
                </li>
            ))}
        </ul>
    );
}

// CRMGPSC-002 (escenario 3): detalle de solo lectura de un prospecto. Desde aquí se editan, descartan o reactivan.
// version cambia cuando el padre guardó algo y hay que volver a leer.
export default function ProspectoDetalleModal({ idProspecto, version = 0, puedeEditar, onClose, onEditar, onDescartar, onReactivar }) {
    const [cargado, setCargado] = useState(null);
    const [error, setError] = useState("");
    const [pestana, setPestana] = useState("datos");

    useEffect(() => {
        let activo = true;
        api.obtenerProspecto(idProspecto)
            .then((d) => activo && (setCargado({ idProspecto, version, datos: d }), setError("")))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el detalle del prospecto."));
        return () => {
            activo = false;
        };
    }, [idProspecto, version]);

    const detalle = cargado?.idProspecto === idProspecto ? cargado.datos : null;
    const p = detalle?.prospecto;
    const convertido = p?.estado === "Convertido";
    const descartado = p?.estado === "Descartado";
    const activoEditable = p && !convertido && !descartado;

    const conteo = (clave, lista) => (lista?.length ? `${clave} (${lista.length})` : clave);
    const pestanas = PESTANAS.map((t) => ({
        ...t,
        label:
            t.key === "contactos" ? conteo(t.label, detalle?.contactos)
            : t.key === "cotizaciones" ? conteo(t.label, detalle?.cotizaciones)
            : t.key === "notas" ? conteo(t.label, detalle?.notas)
            : t.key === "interacciones" ? conteo(t.label, detalle?.interacciones)
            : t.key === "seguimientos" ? conteo(t.label, detalle?.seguimientos)
            : t.label,
    }));

    return (
        <Modal
            open
            onClose={onClose}
            icon={Building2}
            title={p ? `${api.codigoProspecto(p.idProspecto)} · ${p.empresa}` : "Detalle del prospecto"}
            subtitle={p ? `Ingresó el ${fechaLocal(p.fechaIngreso)} · Responsable: ${p.vendedor ?? "Sin asignar"}` : undefined}
            width="max-w-4xl"
            headerExtra={p ? <StatusBadge value={p.estado} /> : null}
            tabs={pestanas}
            activeTab={pestana}
            onTabChange={setPestana}
            footer={
                p && (
                    <div className="flex flex-wrap justify-end gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cerrar
                        </Button>
                        {puedeEditar && activoEditable && (
                            <>
                                <Button className="flex items-center gap-1.5" onClick={() => onEditar(p)}>
                                    <Pencil size={14} /> Editar
                                </Button>
                                <Button variant="danger" className="flex items-center gap-1.5" onClick={() => onDescartar(p)}>
                                    <Ban size={14} /> Descartar
                                </Button>
                            </>
                        )}
                        {puedeEditar && descartado && (
                            <Button variant="primary" className="flex items-center gap-1.5" onClick={() => onReactivar(p)}>
                                <RotateCcw size={14} /> Reactivar
                            </Button>
                        )}
                    </div>
                )
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            {!detalle && !error && <Vacio>Cargando detalle del prospecto...</Vacio>}

            {detalle && convertido && (
                <Notice tone="warning">
                    <span className="flex flex-wrap items-center gap-3">
                        <span>
                            Este prospecto ya fue convertido en cliente y no se puede editar ni descartar.
                            {p.clienteEmpresa ? ` Cliente vinculado: ${p.clienteEmpresa} (ID ${p.idCliente}).` : ""}
                        </span>
                        <Button className="flex items-center gap-1.5" disabled title="El perfil del cliente se consulta en el módulo de clientes">
                            <ExternalLink size={14} /> Abrir cliente
                        </Button>
                    </span>
                </Notice>
            )}
            {detalle && descartado && (
                <Notice tone="warning">
                    Prospecto descartado{p.motivoDescarte ? ` (${p.motivoDescarte})` : ""}
                    {p.fechaDescarte ? ` el ${fechaLocal(p.fechaDescarte)}` : ""}. No se puede editar mientras esté descartado: use «Reactivar» si vuelve a mostrar interés.
                    {p.observacionDescarte ? ` Observación: ${p.observacionDescarte}` : ""}
                </Notice>
            )}

            {detalle && pestana === "datos" && (
                <DetailGrid
                    title="Datos de la empresa"
                    items={[
                        { label: "Identificador", value: api.codigoProspecto(p.idProspecto) },
                        { label: "Empresa", value: p.empresa },
                        { label: "Sector", value: p.sector },
                        { label: "Fuente del contacto", value: p.fuente },
                        { label: "Dirección", value: p.direccion, wide: true },
                        { label: "Teléfono", value: p.telefono },
                        { label: "Correo electrónico", value: p.correo },
                        { label: "Nombre del contacto", value: p.contacto },
                        { label: "Tamaño estimado de la flota", value: p.tamanoFlota == null ? "" : `${p.tamanoFlota} radios` },
                        { label: "Estado", value: p.estado },
                        { label: "Vendedor responsable", value: p.vendedor ? `${p.vendedor}${p.vendedorActivo ? "" : " (inactivo)"}` : "" },
                        { label: "Fecha de ingreso", value: fechaLocal(p.fechaIngreso) },
                        { label: "Registrado por", value: p.creadoPor },
                        { label: "Justificación de duplicado", value: p.justificacionDuplicado, wide: true },
                    ]}
                />
            )}

            {detalle && pestana === "contactos" && (
                <Lista
                    items={detalle.contactos}
                    vacio="Este prospecto todavía no tiene contactos registrados."
                    render={(c) => (
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <strong>{c.nombre}</strong>
                                {c.cargo ? ` · ${c.cargo}` : ""}
                                <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                                    {[c.telefono, c.correo].filter(Boolean).join(" · ") || "Sin medios de contacto"} · Prefiere: {c.preferenciaContacto}
                                    {c.fechaCumpleanos ? ` · Cumpleaños: ${fechaLocal(c.fechaCumpleanos)}` : ""}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {c.esPrincipal && <Pill tone="positive">Principal</Pill>}
                                {!c.activo && <Pill tone="negative">Inactivo</Pill>}
                            </div>
                        </div>
                    )}
                />
            )}

            {detalle && pestana === "cotizaciones" && (
                <Lista
                    items={detalle.cotizaciones}
                    vacio="Este prospecto no tiene cotizaciones."
                    render={(c) => (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                                <strong>COT-{String(c.idCotizacion).padStart(4, "0")}</strong> · {fechaLocal(c.fecha)} · v{c.version}
                            </span>
                            <span className="flex items-center gap-3">
                                <strong>{monto(c.monto, c.moneda)}</strong>
                                <StatusBadge value={c.estado} />
                            </span>
                        </div>
                    )}
                />
            )}

            {detalle && pestana === "notas" && (
                <Lista
                    items={detalle.notas}
                    vacio="Este prospecto no tiene notas visibles para usted."
                    render={(n) => (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5" style={{ color: COLORS.muted }}>
                                <span>
                                    {n.categoria} · {n.autor ?? "Usuario"} · {formatearFechaHora(n.fecha)}
                                </span>
                                <Pill tone={n.visibilidad === "Privada" ? "warning" : "neutral"}>{n.visibilidad}</Pill>
                            </div>
                            <p className="whitespace-pre-wrap break-words">{n.texto}</p>
                        </>
                    )}
                />
            )}

            {detalle && pestana === "interacciones" && (
                <Lista
                    items={detalle.interacciones}
                    vacio="Este prospecto no tiene interacciones registradas."
                    render={(i) => (
                        <>
                            <div className="text-xs mb-1.5" style={{ color: COLORS.muted }}>
                                {fechaHoraLocal(i.fecha)} · <strong>{i.tipo}</strong>
                                {i.contacto ? ` · con ${i.contacto}` : ""}
                                {i.usuario ? ` · ${i.usuario}` : ""}
                            </div>
                            {i.detalle && <p className="whitespace-pre-wrap break-words">{i.detalle}</p>}
                            {i.resultado && <p className="text-xs mt-1">Resultado: {i.resultado}</p>}
                            {i.proximoPaso && <p className="text-xs mt-1">Próximo paso: {i.proximoPaso}</p>}
                        </>
                    )}
                />
            )}

            {detalle && pestana === "seguimientos" && (
                <Lista
                    items={detalle.seguimientos}
                    vacio="Este prospecto no tiene seguimientos."
                    render={(s) => (
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <strong>{s.tipo}</strong> · {fechaHoraLocal(s.fechaHora)} · Prioridad {s.prioridad}
                                <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                                    {s.motivo} · {s.responsable ?? "Sin responsable"} · Origen: {s.origen}
                                    {s.motivoCancelacion ? ` · Cancelado: ${s.motivoCancelacion}` : ""}
                                </div>
                            </div>
                            <StatusBadge value={s.estado} />
                        </div>
                    )}
                />
            )}

            {detalle && pestana === "estados" && (
                <Lista
                    items={detalle.cambiosEstado}
                    vacio="Este prospecto no tiene cambios de estado registrados."
                    render={(c) => (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                {c.estadoAnterior ? <StatusBadge value={c.estadoAnterior} /> : <span style={{ color: COLORS.muted }}>Alta</span>}
                                <span aria-hidden="true">→</span>
                                <StatusBadge value={c.estadoNuevo} />
                                <span className="text-xs" style={{ color: COLORS.muted }}>
                                    {formatearFechaHora(c.fecha)} · {c.usuario ?? "Sistema"}
                                </span>
                            </div>
                            {(c.motivo || c.observacion) && (
                                <p className="text-xs mt-1.5">
                                    {c.motivo ? `Motivo: ${c.motivo}` : ""}
                                    {c.motivo && c.observacion ? " · " : ""}
                                    {c.observacion ?? ""}
                                </p>
                            )}
                        </>
                    )}
                />
            )}
        </Modal>
    );
}
