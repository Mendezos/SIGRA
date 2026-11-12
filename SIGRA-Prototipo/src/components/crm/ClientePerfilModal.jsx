import { useEffect, useState } from "react";
import { Building2, UserCog } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmClientesService";
import { fechaCorta, fechaHora } from "../inventario/helpers";
import { fechaHoraLocal, fechaLocal } from "./helpers";

const PESTANAS = [
    { key: "resumen", label: "Resumen" },
    { key: "contactos", label: "Contactos" },
    { key: "alquiler", label: "Alquiler" },
    { key: "servicio", label: "Servicio técnico" },
    { key: "facturacion", label: "Facturación" },
    { key: "comercial", label: "Seguimiento comercial" },
];

const dinero = (valor, moneda = "CRC") =>
    new Intl.NumberFormat("es-CR", { style: "currency", currency: moneda === "USD" ? "USD" : "CRC", maximumFractionDigits: 2 }).format(valor ?? 0);

// Una sección del perfil: oculta por permiso, vacía con su mensaje, o con su lista. Nunca desaparece sin explicación.
function Seccion({ titulo, seccion, render }) {
    return (
        <section className="mb-6 last:mb-0">
            <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                {titulo}{seccion.visible && seccion.items.length > 0 ? ` (${seccion.items.length})` : ""}
            </h3>
            {!seccion.visible || seccion.items.length === 0 ? (
                <p className="text-sm rounded-lg px-4 py-3" style={{ color: COLORS.muted, backgroundColor: "#F7F9F6" }}>{seccion.mensaje}</p>
            ) : (
                <ul className="space-y-2">
                    {seccion.items.map((item, i) => (
                        <li key={i} className="rounded-xl px-4 py-3 text-sm" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}>{render(item)}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}

const Sub = ({ children }) => <span className="block text-xs" style={{ color: COLORS.muted }}>{children}</span>;

// CRMGPSC-021: el cliente completo en una pantalla.
export default function ClientePerfilModal({ idCliente, version = 0, puedeAsignar, onClose, onAsignar }) {
    const [cargado, setCargado] = useState(null);
    const [error, setError] = useState("");
    const [pestana, setPestana] = useState("resumen");

    useEffect(() => {
        let activo = true;
        api.obtenerPerfil(idCliente)
            .then((p) => activo && (setCargado({ idCliente, version, perfil: p }), setError("")))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el perfil del cliente."));
        return () => { activo = false; };
    }, [idCliente, version]);

    const perfil = cargado?.idCliente === idCliente ? cargado.perfil : null;
    const c = perfil?.cliente;

    return (
        <Modal
            open
            onClose={onClose}
            icon={Building2}
            title={c ? `${api.codigoCliente(c.idCliente)} · ${c.empresa}` : "Perfil del cliente"}
            subtitle={c ? `Cliente desde el ${fechaLocal(c.fechaRegistro)} · Responsable: ${c.vendedor ?? "Sin asignar"}` : undefined}
            width="max-w-4xl"
            headerExtra={c ? <StatusBadge value={c.activo ? "Activo" : "Inactivo"} /> : null}
            tabs={PESTANAS}
            activeTab={pestana}
            onTabChange={setPestana}
            footer={
                c && (
                    <div className="flex justify-end gap-3">
                        {puedeAsignar && (
                            <Button className="flex items-center gap-1.5" onClick={() => onAsignar(c)}><UserCog size={14} /> {c.idVendedor ? "Reasignar responsable" : "Asignar responsable"}</Button>
                        )}
                        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                    </div>
                )
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            {!perfil && !error && <p className="text-sm py-6 text-center" style={{ color: COLORS.muted }}>Cargando perfil...</p>}

            {perfil && pestana === "resumen" && (
                <>
                    <DetailGrid
                        title="Datos de la empresa"
                        items={[
                            { label: "Empresa", value: c.empresa },
                            { label: "Sector", value: c.sector },
                            { label: "Contacto", value: c.contacto },
                            { label: "Teléfono y correo", value: [c.telefono, c.correo].filter(Boolean).join(" · ") },
                            { label: "Dirección", value: c.direccion, wide: true },
                            { label: "Tamaño de la flota", value: c.tamanoFlota },
                            { label: "Responsable comercial", value: c.vendedor ? `${c.vendedor}${c.vendedorActivo ? "" : " (inactivo)"}` : "Sin asignar" },
                            ...(c.idProspectoOrigen ? [{ label: "Prospecto de origen", value: `PR-${String(c.idProspectoOrigen).padStart(4, "0")}` }] : []),
                            ...(!c.activo ? [{ label: "Motivo de la inactivación", value: c.motivoInactivacion, wide: true }] : []),
                        ]}
                    />
                    <Seccion titulo="Ventas" seccion={perfil.ventas} render={(v) => (<>
                        <strong>{v.descripcion}</strong> · {dinero(v.monto, v.moneda)}<Sub>{v.origen} · {fechaCorta(v.fecha)}</Sub></>)} />
                    <Seccion titulo="Responsables anteriores" seccion={perfil.responsables} render={(r) => (<>
                        <strong>{r.vendedorAnterior ?? "Sin responsable"}</strong> → <strong>{r.vendedorNuevo}</strong>
                        <Sub>{fechaHora(r.fecha)} · {r.usuario}{r.motivo ? ` · ${r.motivo}` : ""}{r.seguimientosMovidos > 0 ? ` · ${r.seguimientosMovidos} seguimiento(s) trasladado(s)` : ""}</Sub></>)} />
                </>
            )}

            {perfil && pestana === "contactos" && (
                <Seccion titulo="Contactos" seccion={perfil.contactos} render={(k) => (<>
                    <strong>{k.nombre}</strong>{k.esPrincipal ? " · principal" : ""}{!k.activo ? " · inactivo" : ""}
                    <Sub>{[k.cargo, k.telefono, k.correo].filter(Boolean).join(" · ")}</Sub></>)} />
            )}

            {perfil && pestana === "alquiler" && (
                <>
                    <Seccion titulo="Equipos en alquiler" seccion={perfil.equipos} render={(e) => (<>
                        <strong>{e.numeroSerie}</strong> · {e.marca} {e.modelo}<Sub>{e.categoria} · {e.estado} · contrato CT-{String(e.idContrato).padStart(4, "0")} desde {fechaCorta(e.fechaAsignacion)}</Sub></>)} />
                    <Seccion titulo="Contratos" seccion={perfil.contratos} render={(k) => (<>
                        <strong>CT-{String(k.idContrato).padStart(4, "0")}</strong> <StatusBadge value={k.estado} /> · {dinero(k.montoMensual, k.moneda)} al mes
                        <Sub>{fechaCorta(k.fechaInicio)} a {fechaCorta(k.fechaVencimiento)} · {k.cantidadEquipos} equipo(s)</Sub></>)} />
                </>
            )}

            {perfil && pestana === "servicio" && (
                <>
                    <Seccion titulo="Boletas de servicio técnico" seccion={perfil.tickets} render={(t) => (<>
                        <strong>Boleta {t.numeroBoleta}</strong> · {t.tipoServicio} <StatusBadge value={t.estado} /><Sub>Recibida el {fechaHora(t.fechaRecepcion)}</Sub></>)} />
                    <Seccion titulo="Frecuencias" seccion={perfil.frecuencias} render={(f) => (<>
                        <strong>{f.frecuencia ?? "Frecuencia sin asignar"}</strong>{f.banda ? ` · ${f.banda}` : ""} <StatusBadge value={f.estado} />
                        <Sub>Equipo {f.numeroSerie}{f.fechaVencimiento ? ` · vence el ${fechaCorta(f.fechaVencimiento)}` : ""}</Sub></>)} />
                </>
            )}

            {perfil && pestana === "facturacion" && (
                <>
                    <Seccion titulo="Facturas" seccion={perfil.facturas} render={(f) => (<>
                        <strong>{f.numeroFactura}</strong> · {f.tipo} · {dinero(f.total, f.moneda)} <StatusBadge value={f.estadoCobro} /><Sub>{fechaCorta(f.fecha)} · {f.estado}</Sub></>)} />
                    <Seccion titulo="Cotizaciones" seccion={perfil.cotizaciones} render={(q) => (<>
                        <strong>COT-{String(q.idCotizacion).padStart(4, "0")}</strong> · {dinero(q.monto, q.moneda)} <StatusBadge value={q.estado} /><Sub>{fechaCorta(q.fecha)} · versión {q.version}</Sub></>)} />
                </>
            )}

            {perfil && pestana === "comercial" && (
                <>
                    <Seccion titulo="Seguimientos" seccion={perfil.seguimientos} render={(s) => (<>
                        <strong>{s.tipo}</strong> · {s.motivo} <StatusBadge value={s.estado} /><Sub>{fechaHoraLocal(s.fechaHora)} · {s.responsable} · prioridad {s.prioridad.toLowerCase()}</Sub></>)} />
                    <Seccion titulo="Interacciones" seccion={perfil.interacciones} render={(i) => (<>
                        <strong>{i.tipo}</strong>{i.contacto ? ` con ${i.contacto}` : ""} · {i.detalle}<Sub>{fechaHoraLocal(i.fecha)} · {i.usuario}{i.resultado ? ` · ${i.resultado}` : ""}</Sub></>)} />
                    <Seccion titulo="Notas" seccion={perfil.notas} render={(n) => (<>
                        {n.texto}<Sub>{n.categoria} · {n.autor} · {fechaHora(n.fecha)}</Sub></>)} />
                </>
            )}
        </Modal>
    );
}
