import { useEffect, useState } from "react";
import { Building2, Edit3, Power, RotateCcw, UserCog } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmClientesService";
import { obtenerHistorialCliente } from "../../services/encuestasService";
import { fechaCorta, fechaHora } from "../inventario/helpers";
import { fechaHoraLocal, fechaLocal } from "./helpers";

const PESTANAS = [
    { key: "resumen", label: "Resumen" },
    { key: "contactos", label: "Contactos" },
    { key: "alquiler", label: "Alquiler" },
    { key: "servicio", label: "Servicio técnico" },
    { key: "facturacion", label: "Facturación" },
    { key: "historial", label: "Historial financiero" },
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
export default function ClientePerfilModal({ idCliente, version = 0, puedeAsignar, puedeEditar, onClose, onAsignar }) {
    const [cargado, setCargado] = useState(null);
    const [error, setError] = useState("");
    const [pestana, setPestana] = useState("resumen");
    const [modoOperacion, setModoOperacion] = useState(null);
    const [operando, setOperando] = useState(false);
    const [operacionError, setOperacionError] = useState("");
    const [recarga, setRecarga] = useState(0);
    const [formulario, setFormulario] = useState({});
    const [motivo, setMotivo] = useState("");
    const [historialFinanciero, setHistorialFinanciero] = useState(null);
    const [historialClienteId, setHistorialClienteId] = useState(null);
    const [historialError, setHistorialError] = useState("");

    useEffect(() => {
        let activo = true;
        api.obtenerPerfil(idCliente)
            .then((p) => activo && (setCargado({ idCliente, version: `${version}-${recarga}`, perfil: p }), setError("")))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el perfil del cliente."));
        return () => { activo = false; };
    }, [idCliente, version, recarga]);

    useEffect(() => {
        if (pestana !== "historial") return undefined;
        let activo = true;
        obtenerHistorialCliente(idCliente)
            .then((datos) => {
                if (!activo) return;
                setHistorialFinanciero(datos);
                setHistorialClienteId(idCliente);
                setHistorialError("");
            })
            .catch((e) => activo && setHistorialError(e instanceof ApiError ? e.message : "No se pudo cargar el historial financiero."));
        return () => { activo = false; };
    }, [idCliente, pestana]);

    const perfil = cargado?.idCliente === idCliente ? cargado.perfil : null;
    const c = perfil?.cliente;

    function abrirEdicion() {
        setFormulario({
            empresa: c?.empresa ?? "",
            contacto: c?.contacto ?? "",
            correo: c?.correo ?? "",
            telefono: c?.telefono ?? "",
            sector: c?.sector ?? "",
            direccion: c?.direccion ?? "",
            tamanoFlota: c?.tamanoFlota ?? "",
        });
        setOperacionError("");
        setModoOperacion("editar");
    }

    async function guardarEdicion(evento) {
        evento.preventDefault();
        setOperando(true);
        setOperacionError("");
        try {
            await api.editarCliente(idCliente, {
                empresa: formulario.empresa,
                contacto: formulario.contacto || null,
                correo: formulario.correo || null,
                telefono: formulario.telefono || null,
                sector: formulario.sector || null,
                direccion: formulario.direccion || null,
                tamanoFlota: formulario.tamanoFlota === "" ? null : Number(formulario.tamanoFlota),
            });
            setModoOperacion(null);
            setRecarga((n) => n + 1);
        } catch (e) {
            setOperacionError(e instanceof ApiError ? e.message : "No se pudieron guardar los datos.");
        } finally {
            setOperando(false);
        }
    }

    async function guardarEstado(evento) {
        evento.preventDefault();
        setOperando(true);
        setOperacionError("");
        try {
            const resultado = await api.cambiarEstadoCliente(idCliente, { activo: !c.activo, motivo: motivo || null });
            if (resultado.obligaciones?.length) {
                setOperacionError(resultado.mensaje);
                return;
            }
            setModoOperacion(null);
            setMotivo("");
            setRecarga((n) => n + 1);
        } catch (e) {
            setOperacionError(e instanceof ApiError ? e.message : "No se pudo cambiar el estado del cliente.");
        } finally {
            setOperando(false);
        }
    }

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
                        {puedeEditar && <Button variant="secondary" className="flex items-center gap-1.5" onClick={abrirEdicion}><Edit3 size={14} /> Editar datos</Button>}
                        {puedeEditar && c.activo && (
                            <Button variant="danger" className="flex items-center gap-1.5" onClick={() => { setOperacionError(""); setMotivo(""); setModoOperacion("estado"); }}>
                                <Power size={14} /> Desactivar
                            </Button>
                        )}
                        {puedeEditar && !c.activo && (
                            <Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setOperacionError(""); setMotivo(""); setModoOperacion("estado"); }}>
                                <RotateCcw size={14} /> Reactivar
                            </Button>
                        )}
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

            {perfil && modoOperacion === "editar" && (
                <form onSubmit={guardarEdicion} className="space-y-4">
                    <h3 className="font-semibold">Editar datos comerciales</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {[
                            ["empresa", "Empresa", true],
                            ["contacto", "Contacto principal", false],
                            ["correo", "Correo", false],
                            ["telefono", "Teléfono", false],
                            ["sector", "Sector", false],
                            ["tamanoFlota", "Tamaño de flota", false],
                        ].map(([campo, etiqueta, requerido]) => (
                            <label key={campo} className="text-sm">
                                <span className="block mb-1">{etiqueta}{requerido ? " *" : ""}</span>
                                <input
                                    required={requerido}
                                    type={campo === "tamanoFlota" ? "number" : campo === "correo" ? "email" : "text"}
                                    min={campo === "tamanoFlota" ? "0" : undefined}
                                    value={formulario[campo] ?? ""}
                                    onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })}
                                    className="w-full rounded-lg px-3 py-2"
                                    style={{ border: `1px solid ${COLORS.border}` }}
                                />
                            </label>
                        ))}
                    </div>
                    <label className="text-sm block">
                        <span className="block mb-1">Dirección</span>
                        <textarea value={formulario.direccion ?? ""} onChange={(e) => setFormulario({ ...formulario, direccion: e.target.value })} className="w-full rounded-lg px-3 py-2" style={{ border: `1px solid ${COLORS.border}` }} rows={2} />
                    </label>
                    {operacionError && <Notice tone="error">{operacionError}</Notice>}
                    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModoOperacion(null)}>Cancelar</Button><Button type="submit" variant="primary" disabled={operando}>{operando ? "Guardando..." : "Guardar cambios"}</Button></div>
                </form>
            )}

            {perfil && modoOperacion === "estado" && (
                <form onSubmit={guardarEstado} className="space-y-4">
                    <h3 className="font-semibold">{c.activo ? "Desactivar cliente" : "Reactivar cliente"}</h3>
                    <p className="text-sm" style={{ color: COLORS.muted }}>
                        {c.activo ? "Se comprobarán contratos activos y facturas con cobro pendiente antes de desactivar." : "La reactivación conserva el historial comercial."}
                    </p>
                    {c.activo && <label className="text-sm block"><span className="block mb-1">Motivo *</span><textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full rounded-lg px-3 py-2" style={{ border: `1px solid ${COLORS.border}` }} rows={3} /></label>}
                    {operacionError && <Notice tone="error">{operacionError}</Notice>}
                    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModoOperacion(null)}>Cancelar</Button><Button type="submit" variant={c.activo ? "dangerSolid" : "primary"} disabled={operando}>{operando ? "Procesando..." : c.activo ? "Desactivar cliente" : "Reactivar cliente"}</Button></div>
                </form>
            )}

            {perfil && !modoOperacion && pestana === "resumen" && (
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

            {perfil && !modoOperacion && pestana === "contactos" && (
                <Seccion titulo="Contactos" seccion={perfil.contactos} render={(k) => (<>
                    <strong>{k.nombre}</strong>{k.esPrincipal ? " · principal" : ""}{!k.activo ? " · inactivo" : ""}
                    <Sub>{[k.cargo, k.telefono, k.correo].filter(Boolean).join(" · ")}</Sub></>)} />
            )}

            {perfil && !modoOperacion && pestana === "alquiler" && (
                <>
                    <Seccion titulo="Equipos en alquiler" seccion={perfil.equipos} render={(e) => (<>
                        <strong>{e.numeroSerie}</strong> · {e.marca} {e.modelo}<Sub>{e.categoria} · {e.estado} · contrato CT-{String(e.idContrato).padStart(4, "0")} desde {fechaCorta(e.fechaAsignacion)}</Sub></>)} />
                    <Seccion titulo="Contratos" seccion={perfil.contratos} render={(k) => (<>
                        <strong>CT-{String(k.idContrato).padStart(4, "0")}</strong> <StatusBadge value={k.estado} /> · {dinero(k.montoMensual, k.moneda)} al mes
                        <Sub>{fechaCorta(k.fechaInicio)} a {fechaCorta(k.fechaVencimiento)} · {k.cantidadEquipos} equipo(s)</Sub></>)} />
                </>
            )}

            {perfil && !modoOperacion && pestana === "servicio" && (
                <>
                    <Seccion titulo="Boletas de servicio técnico" seccion={perfil.tickets} render={(t) => (<>
                        <strong>Boleta {t.numeroBoleta}</strong> · {t.tipoServicio} <StatusBadge value={t.estado} /><Sub>Recibida el {fechaHora(t.fechaRecepcion)}</Sub></>)} />
                    <Seccion titulo="Frecuencias" seccion={perfil.frecuencias} render={(f) => (<>
                        <strong>{f.frecuencia ?? "Frecuencia sin asignar"}</strong>{f.banda ? ` · ${f.banda}` : ""} <StatusBadge value={f.estado} />
                        <Sub>Equipo {f.numeroSerie}{f.fechaVencimiento ? ` · vence el ${fechaCorta(f.fechaVencimiento)}` : ""}</Sub></>)} />
                </>
            )}

            {perfil && !modoOperacion && pestana === "facturacion" && (
                <>
                    <Seccion titulo="Facturas" seccion={perfil.facturas} render={(f) => (<>
                        <strong>{f.numeroFactura}</strong> · {f.tipo} · {dinero(f.total, f.moneda)} <StatusBadge value={f.estadoCobro} /><Sub>{fechaCorta(f.fecha)} · {f.estado}</Sub></>)} />
                    <Seccion titulo="Cotizaciones" seccion={perfil.cotizaciones} render={(q) => (<>
                        <strong>COT-{String(q.idCotizacion).padStart(4, "0")}</strong> · {dinero(q.monto, q.moneda)} <StatusBadge value={q.estado} /><Sub>{fechaCorta(q.fecha)} · versión {q.version}</Sub></>)} />
                </>
            )}

            {perfil && !modoOperacion && pestana === "historial" && (
                <div className="space-y-6">
                    {historialError && <Notice tone="error">{historialError}</Notice>}
                    {historialClienteId !== idCliente && !historialError && <p className="text-sm" style={{ color: COLORS.muted }}>Cargando historial financiero...</p>}
                    {historialFinanciero && historialClienteId === idCliente && (
                        <>
                            <Seccion titulo="Contratos" seccion={{ visible: true, items: historialFinanciero.contratos, mensaje: "No hay contratos registrados." }} render={(contrato) => (<>
                                <strong>CT-{String(contrato.idContrato).padStart(4, "0")}</strong> · <StatusBadge value={contrato.estado} /> · {dinero(contrato.montoMensual, contrato.moneda)}
                                <Sub>{fechaCorta(contrato.fechaInicio)} a {fechaCorta(contrato.fechaVencimiento)}</Sub>
                            </>)} />
                            <Seccion titulo="Facturas" seccion={{ visible: true, items: historialFinanciero.facturas, mensaje: "No hay facturas registradas." }} render={(factura) => (<>
                                <strong>{factura.numeroFactura}</strong> · {factura.tipo} · {dinero(factura.total, factura.moneda)} <StatusBadge value={factura.estadoCobro} />
                                <Sub>{fechaCorta(factura.fecha)}</Sub>
                            </>)} />
                            <Seccion titulo="Encuestas de satisfacción" seccion={{ visible: true, items: historialFinanciero.encuestas, mensaje: "No hay encuestas registradas." }} render={(encuesta) => (<>
                                <strong>{encuesta.numeroFactura}</strong> · <StatusBadge value={encuesta.estado} /> · {encuesta.calificacion ? `${encuesta.calificacion}/5` : "Sin respuesta"}
                                <Sub>{fechaCorta(encuesta.fechaEnvio)}{encuesta.comentario ? ` · ${encuesta.comentario}` : ""}</Sub>
                            </>)} />
                        </>
                    )}
                </div>
            )}

            {perfil && !modoOperacion && pestana === "comercial" && (
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
