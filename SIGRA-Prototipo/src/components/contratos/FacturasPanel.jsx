import { useEffect, useMemo, useState } from "react";
import { Eye, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import {
    cambiarEstadoCobro,
    listarFacturas,
    registrarFactura,
} from "../../services/facturasService";
import { listarClientes } from "../../services/crmClientesService";

function fechaLocal() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

const HOY = fechaLocal();
const ESTADOS = ["Pendiente", "Pagada", "Irregular"];

function lineaVacia() {
    return { descripcion: "", cantidad: "1", precioUnitario: "" };
}

function dinero(valor) {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(valor);
}

export default function FacturasPanel() {
    const [facturas, setFacturas] = useState([]);
    const [clientesDisponibles, setClientesDisponibles] = useState([]);
    const [form, setForm] = useState({
        cliente: "",
        tipo: "Venta",
        fechaEmision: HOY,
        lineas: [lineaVacia()],
    });
    const [filtro, setFiltro] = useState("Todas");
    const [busqueda, setBusqueda] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState("Todos");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [facturaDetalle, setFacturaDetalle] = useState(null);
    const [facturaAcciones, setFacturaAcciones] = useState(null);
    const [registrarAbierto, setRegistrarAbierto] = useState(false);
    const [cobroForm, setCobroForm] = useState({
        estadoCobro: "Pendiente",
        fechaPago: "",
        metodoPago: "",
        referenciaPago: "",
        fechaEsperadaPago: "",
        montoPendiente: "",
        proximaFechaRevision: "",
        observacion: "",
        motivo: "",
    });

    async function cargar() {
        setCargando(true);
        try {
            setFacturas(await listarFacturas());
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudieron cargar las facturas." });
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let vigente = true;
        Promise.all([listarFacturas(), listarClientes({ estado: "Activo" })])
            .then(([datos, clientesReales]) => {
                if (!vigente) return;
                setFacturas(datos);
                setClientesDisponibles(clientesReales);
                setForm((actual) => ({
                    ...actual,
                    cliente: actual.cliente || String(clientesReales[0]?.idCliente ?? ""),
                }));
            })
            .catch((error) => {
                if (vigente) setMensaje({ tone: "error", text: error.message || "No se pudieron cargar las facturas." });
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => { vigente = false; };
    }, []);

    const subtotal = useMemo(
        () => form.lineas.reduce((total, linea) => total + Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0), 0),
        [form.lineas],
    );
    const impuesto = subtotal * 0.13;
    const total = subtotal + impuesto;
    const visibles = facturas.filter((factura) => {
        const coincideEstado = filtro === "Todas" || factura.estadoCobro === filtro;
        const texto = busqueda.trim().toLowerCase();
        const coincideTipo = tipoFiltro === "Todos" || factura.tipo === tipoFiltro;
        return coincideEstado && coincideTipo && (!texto ||
            [factura.numero, factura.cliente]
                .some((valor) => String(valor ?? "").toLowerCase().includes(texto)));
    });

    function actualizarLinea(indice, campo, valor) {
        setForm((actual) => ({
            ...actual,
            lineas: actual.lineas.map((linea, posicion) =>
                posicion === indice ? { ...linea, [campo]: valor } : linea),
        }));
    }

    async function guardar(event) {
        event.preventDefault();
        setMensaje(null);
        setGuardando(true);
        try {
            await registrarFactura({
                ...form,
                lineas: form.lineas.map((linea) => ({
                    ...linea,
                    cantidad: Number(linea.cantidad),
                    precioUnitario: Number(linea.precioUnitario),
                })),
            });
            setForm({ cliente: String(clientesDisponibles[0]?.idCliente ?? ""), tipo: "Venta", fechaEmision: HOY, lineas: [lineaVacia()] });
            setMensaje({ tone: "success", text: "Factura registrada correctamente." });
            setRegistrarAbierto(false);
            await cargar();
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudo registrar la factura." });
        } finally {
            setGuardando(false);
        }
    }

    function abrirGestionCobro(factura) {
        setFacturaAcciones(factura);
        setCobroForm({
            estadoCobro: factura.estadoCobro === "Pagada" ? "Pagada" : "Pendiente",
            fechaPago: factura.fechaPago ?? "",
            metodoPago: factura.metodoPago ?? "",
            referenciaPago: factura.referenciaPago ?? "",
            fechaEsperadaPago: factura.fechaEsperadaPago ?? "",
            montoPendiente: factura.montoPendiente ?? "",
            proximaFechaRevision: factura.proximaFechaRevision ?? "",
            observacion: factura.observacionCobro ?? "",
            motivo: factura.motivoIrregularidad ?? "",
        });
    }

    async function guardarEstadoCobro(event) {
        event.preventDefault();
        const factura = facturaAcciones;
        const datos = {
            estadoCobro: cobroForm.estadoCobro,
            observacion: cobroForm.observacion,
        };

        if (cobroForm.estadoCobro === "Pagada") {
            datos.fechaPago = cobroForm.fechaPago || null;
            datos.metodoPago = cobroForm.metodoPago;
            datos.referenciaPago = cobroForm.referenciaPago;
        } else if (cobroForm.estadoCobro === "Pendiente") {
            datos.fechaEsperadaPago = cobroForm.fechaEsperadaPago || null;
        } else {
            datos.motivo = cobroForm.motivo;
            datos.montoPendiente = cobroForm.montoPendiente
                ? Number(cobroForm.montoPendiente)
                : null;
            datos.proximaFechaRevision = cobroForm.proximaFechaRevision || null;
        }

        try {
            await cambiarEstadoCobro(factura.idFactura, datos);
            setFacturaAcciones(null);
            await cargar();
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudo actualizar el estado." });
        }
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm bg-white";
    const inputStyle = { border: `1px solid ${COLORS.border}`, color: COLORS.charcoal };

    return (
        <section>
            {mensaje && (!registrarAbierto || mensaje.tone !== "error") && (
                <Notice tone={mensaje.tone}>{mensaje.text}</Notice>
            )}
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold" style={{ color: COLORS.charcoal }}>Facturas registradas</h2>
                    <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>Consultá y gestioná los estados de cobro.</p>
                </div>
                <Button variant="primary" onClick={() => setRegistrarAbierto(true)} className="inline-flex items-center gap-2 whitespace-nowrap">
                    <Plus size={16} /> Registrar factura
                </Button>
            </div>
            <div>
                {registrarAbierto && <Modal open onClose={() => setRegistrarAbierto(false)} title="Registrar factura" subtitle="Venta, servicio o alquiler" icon={Plus} width="max-w-3xl">
                    <form onSubmit={guardar} className="rounded-xl p-1">
                        {mensaje?.tone === "error" && (
                            <Notice tone="error">{mensaje.text}</Notice>
                        )}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-base font-semibold" style={{ color: COLORS.charcoal }}>Registrar factura</h2>
                            <p className="text-xs mt-1" style={{ color: COLORS.muted }}>Venta, servicio o alquiler</p>
                        </div>
                        <Plus size={18} color={COLORS.green} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldLabel label="Cliente">
                            <select className={inputClass} style={inputStyle} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}>
                                {clientesDisponibles.map((cliente) => (
                                    <option key={cliente.idCliente} value={cliente.idCliente}>{cliente.empresa}</option>
                                ))}
                            </select>
                        </FieldLabel>
                        <FieldLabel label="Tipo">
                            <select className={inputClass} style={inputStyle} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                                <option>Venta</option><option>Servicio</option><option>Alquiler</option>
                            </select>
                        </FieldLabel>
                        <FieldLabel label="Fecha de emisión">
                            <input required type="date" max={HOY} className={inputClass} style={inputStyle} value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} />
                        </FieldLabel>
                    </div>
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>Líneas</span>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                                style={{ color: COLORS.green, border: `1px solid ${COLORS.green}` }}
                                onClick={() => setForm({ ...form, lineas: [...form.lineas, lineaVacia()] })}
                            >
                                <Plus size={16} />
                                Agregar línea
                            </button>
                        </div>
                        {form.lineas.map((linea, indice) => (
                            <div key={indice} className="grid grid-cols-[1fr_70px_100px_28px] gap-2 mb-2 items-end">
                                <input required placeholder="Descripción" className={inputClass} style={inputStyle} value={linea.descripcion} onChange={(e) => actualizarLinea(indice, "descripcion", e.target.value)} />
                                <input required min="0.01" step="0.01" type="number" placeholder="Cant." className={inputClass} style={inputStyle} value={linea.cantidad} onChange={(e) => actualizarLinea(indice, "cantidad", e.target.value)} />
                                <input required min="0" step="0.01" type="number" placeholder="Precio" className={inputClass} style={inputStyle} value={linea.precioUnitario} onChange={(e) => actualizarLinea(indice, "precioUnitario", e.target.value)} />
                                <button type="button" aria-label="Eliminar línea" disabled={form.lineas.length === 1} onClick={() => setForm({ ...form, lineas: form.lineas.filter((_, posicion) => posicion !== indice) })}><Trash2 size={16} color={form.lineas.length === 1 ? "#E8A6A1" : COLORS.red} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="border-t mt-5 pt-4 text-sm space-y-1" style={{ borderColor: COLORS.border }}>
                        <div className="flex justify-between"><span>Subtotal</span><strong>{dinero(subtotal)}</strong></div>
                        <div className="flex justify-between"><span>Impuesto (13%)</span><strong>{dinero(impuesto)}</strong></div>
                        <div className="flex justify-between text-base pt-1"><span>Total</span><strong style={{ color: COLORS.greenDark }}>{dinero(total)}</strong></div>
                    </div>
                    <Button type="submit" variant="primary" className="w-full mt-5" disabled={guardando}>{guardando ? "Guardando..." : "Registrar factura"}</Button>
                    </form>
                </Modal>}

                <div>
                    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                        <div><h2 className="text-base font-semibold" style={{ color: COLORS.charcoal }}>Facturas registradas</h2><p className="text-xs mt-1" style={{ color: COLORS.muted }}>{visibles.length} registros</p></div>
                        <div className="flex flex-wrap gap-2">
                            <input
                                className="px-3 py-2 rounded-lg text-sm bg-white min-w-[220px]"
                                style={inputStyle}
                                placeholder="Buscar por factura o cliente"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                aria-label="Buscar facturas"
                            />
                            <select className="px-3 py-2 rounded-lg text-sm bg-white" style={inputStyle} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}><option>Todos</option><option>Venta</option><option>Servicio</option><option>Alquiler</option></select>
                            <select className="px-3 py-2 rounded-lg text-sm bg-white" style={inputStyle} value={filtro} onChange={(e) => setFiltro(e.target.value)}><option>Todas</option>{ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}</select>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                        <table className="w-full text-sm"><thead><tr className="text-left" style={{ backgroundColor: COLORS.greenTint, color: COLORS.charcoal }}><th className="px-4 py-3">Factura</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Cobro</th><th className="px-4 py-3 min-w-[190px]">Acción</th></tr></thead>
                            <tbody>{visibles.map((factura) => <tr key={factura.idFactura} style={{ borderTop: `1px solid ${COLORS.border}` }}><td className="px-4 py-3 font-medium">{factura.numero}</td><td className="px-4 py-3">{factura.cliente}</td><td className="px-4 py-3">{factura.tipo}</td><td className="px-4 py-3">{dinero(factura.total)}</td><td className="px-4 py-3"><StatusBadge value={factura.estadoCobro} /></td>                            <td className="px-4 py-3 whitespace-nowrap"><div className="flex items-center gap-2"><Button className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2" onClick={() => setFacturaDetalle(factura)} aria-label={`Ver detalle de ${factura.numero}`} title="Ver detalle"><Eye size={15} /> <span>Detalle</span></Button><Button className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2" onClick={() => abrirGestionCobro(factura)} aria-label={`Gestionar cobro de ${factura.numero}`} title="Gestionar cobro"><MoreHorizontal size={15} /> <span>Gestionar cobro</span></Button></div></td></tr>)}</tbody>
                        </table>
                        {!cargando && visibles.length === 0 && <p className="text-sm text-center py-8" style={{ color: COLORS.muted }}>No hay facturas para este filtro.</p>}
                    </div>
                </div>
            </div>
            <Modal
                open={Boolean(facturaDetalle)}
                onClose={() => setFacturaDetalle(null)}
                title={facturaDetalle?.numero ?? "Detalle de factura"}
                subtitle="Información completa de la factura"
                icon={Eye}
                footer={<Button onClick={() => setFacturaDetalle(null)}>Cerrar</Button>}
            >
                {facturaDetalle && <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3"><div><p style={{ color: COLORS.muted }}>Cliente</p><strong>{facturaDetalle.cliente}</strong></div><div><p style={{ color: COLORS.muted }}>Tipo</p><strong>{facturaDetalle.tipo}</strong></div><div><p style={{ color: COLORS.muted }}>Emisión</p><strong>{facturaDetalle.fechaEmision}</strong></div><div><p style={{ color: COLORS.muted }}>Estado</p><StatusBadge value={facturaDetalle.estadoCobro} /></div></div>
                    <div className="rounded-lg p-3" style={{ backgroundColor: "#FAFCF9" }}>{facturaDetalle.lineas?.map((linea, indice) => <div key={indice} className="flex justify-between border-b last:border-0 py-2" style={{ borderColor: COLORS.border }}><span>{linea.descripcion} x {linea.cantidad}</span><strong>{dinero(linea.total ?? linea.cantidad * linea.precioUnitario)}</strong></div>)}</div>
                    <div className="text-right space-y-1"><div>Subtotal: <strong>{dinero(facturaDetalle.subtotal)}</strong></div><div>Impuesto: <strong>{dinero(facturaDetalle.impuesto)}</strong></div><div className="text-base">Total: <strong style={{ color: COLORS.greenDark }}>{dinero(facturaDetalle.total)}</strong></div></div>
                </div>}
            </Modal>
            <Modal open={Boolean(facturaAcciones)} onClose={() => setFacturaAcciones(null)} title={`Gestionar cobro · ${facturaAcciones?.numero ?? ""}`} subtitle="Seleccioná el estado y completá la información correspondiente" icon={MoreHorizontal} width="max-w-xl">
                <form onSubmit={guardarEstadoCobro} className="space-y-4">
                    <FieldLabel label="Estado de cobro">
                        <select className={inputClass} style={inputStyle} value={cobroForm.estadoCobro} onChange={(e) => setCobroForm({ ...cobroForm, estadoCobro: e.target.value })}>
                            {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
                        </select>
                    </FieldLabel>
                    {cobroForm.estadoCobro === "Pagada" && <div className="grid gap-4 sm:grid-cols-2">
                        <FieldLabel label="Fecha de pago"><input required type="date" max={HOY} className={inputClass} style={inputStyle} value={cobroForm.fechaPago} onChange={(e) => setCobroForm({ ...cobroForm, fechaPago: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Método de pago"><select required className={inputClass} style={inputStyle} value={cobroForm.metodoPago} onChange={(e) => setCobroForm({ ...cobroForm, metodoPago: e.target.value })}><option value="">Seleccioná un método</option><option>Transferencia bancaria</option><option>Tarjeta</option><option>Efectivo</option><option>Cheque</option><option>Sinpe Móvil</option></select></FieldLabel>
                        <FieldLabel label="Referencia"><input required className={inputClass} style={inputStyle} value={cobroForm.referenciaPago} onChange={(e) => setCobroForm({ ...cobroForm, referenciaPago: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Observación"><input className={inputClass} style={inputStyle} value={cobroForm.observacion} onChange={(e) => setCobroForm({ ...cobroForm, observacion: e.target.value })} /></FieldLabel>
                    </div>}
                    {cobroForm.estadoCobro === "Pendiente" && <div className="grid gap-4 sm:grid-cols-2">
                        <FieldLabel label="Fecha esperada de pago"><input required type="date" className={inputClass} style={inputStyle} value={cobroForm.fechaEsperadaPago} onChange={(e) => setCobroForm({ ...cobroForm, fechaEsperadaPago: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Observación"><input className={inputClass} style={inputStyle} value={cobroForm.observacion} onChange={(e) => setCobroForm({ ...cobroForm, observacion: e.target.value })} /></FieldLabel>
                    </div>}
                    {cobroForm.estadoCobro === "Irregular" && <div className="grid gap-4 sm:grid-cols-2">
                        <FieldLabel label="Motivo"><input required className={inputClass} style={inputStyle} value={cobroForm.motivo} onChange={(e) => setCobroForm({ ...cobroForm, motivo: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Monto pendiente"><input required min="0.01" step="0.01" type="number" className={inputClass} style={inputStyle} value={cobroForm.montoPendiente} onChange={(e) => setCobroForm({ ...cobroForm, montoPendiente: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Próxima fecha de revisión"><input required type="date" className={inputClass} style={inputStyle} value={cobroForm.proximaFechaRevision} onChange={(e) => setCobroForm({ ...cobroForm, proximaFechaRevision: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Observación"><input className={inputClass} style={inputStyle} value={cobroForm.observacion} onChange={(e) => setCobroForm({ ...cobroForm, observacion: e.target.value })} /></FieldLabel>
                    </div>}
                    <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: COLORS.border }}>
                        <Button type="button" onClick={() => setFacturaAcciones(null)}>Cancelar</Button>
                        <Button type="submit" variant="primary">Guardar estado</Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
