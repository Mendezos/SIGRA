import { useEffect, useMemo, useState } from "react";
import { Eye, FileMinus2, LoaderCircle, Plus } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { formatearFechaCorta, formatearFechaHora } from "../../utils/format";
import { listarFacturas } from "../../services/facturasService";
import { listarNotasCredito, registrarNotaCredito } from "../../services/notasCreditoService";

function fechaLocal() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

// La nota no tiene columna de moneda: hereda la de su factura.
function dinero(valor, moneda = "CRC") {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: moneda === "USD" ? "USD" : "CRC" }).format(valor ?? 0);
}

// Fecha sin hora (las fechas de emisión son DATE). Los valores vacíos del servidor no deben verse como 01/01/0001.
function fechaDia(valor) {
    const texto = String(valor ?? "");
    if (!texto || texto.startsWith("0001-")) return "Sin registro";
    return formatearFechaCorta(texto);
}

// Casilla del resumen del ajuste.
function Dato({ label, value, destacado }) {
    return (
        <div
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: destacado ? COLORS.greenTint : "#FAFCF9", border: `1px solid ${COLORS.border}` }}
        >
            <p className="text-xs" style={{ color: COLORS.muted }}>{label}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: destacado ? COLORS.greenDark : COLORS.charcoal }}>{value}</p>
        </div>
    );
}

export default function NotasCreditoPanel() {
    const [notas, setNotas] = useState([]);
    const [facturas, setFacturas] = useState([]);
    const [facturaId, setFacturaId] = useState("");
    const [fecha, setFecha] = useState(fechaLocal());
    const [motivo, setMotivo] = useState("");
    const [monto, setMonto] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [registrarAbierto, setRegistrarAbierto] = useState(false);

    async function cargar() {
        setCargando(true);
        try {
            const [notasCargadas, facturasCargadas] = await Promise.all([
                listarNotasCredito(),
                listarFacturas(),
            ]);
            setNotas(notasCargadas);
            setFacturas(facturasCargadas.filter((factura) => factura.estadoCobro !== "Anulada"));
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudieron cargar las notas de crédito." });
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let vigente = true;
        Promise.all([listarNotasCredito(), listarFacturas()])
            .then(([notasCargadas, facturasCargadas]) => {
                if (!vigente) return;
                setNotas(notasCargadas);
                setFacturas(facturasCargadas.filter((factura) => factura.estadoCobro !== "Anulada"));
            })
            .catch((error) => {
                if (vigente) setMensaje({ tone: "error", text: error.message || "No se pudieron cargar las notas de crédito." });
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => { vigente = false; };
    }, []);

    const facturaSeleccionada = facturas.find((factura) => factura.idFactura === Number(facturaId));
    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return notas.filter((nota) => !texto || [nota.numero, nota.factura, nota.cliente]
            .some((valor) => String(valor ?? "").toLowerCase().includes(texto)));
    }, [notas, busqueda]);

    // Alcance del ajuste: cuánto de la factura cubre la nota y qué saldo queda.
    const cobertura = detalle?.facturaTotal > 0 ? (detalle.monto / detalle.facturaTotal) * 100 : null;
    const saldoTrasAjuste = detalle?.facturaTotal != null ? Math.max(0, detalle.facturaTotal - detalle.monto) : null;

    async function guardar(evento) {
        evento.preventDefault();
        setGuardando(true);
        setMensaje(null);
        try {
            await registrarNotaCredito({
                idFactura: Number(facturaId),
                fechaEmision: fecha,
                motivo,
                monto: Number(monto),
            });
            setFacturaId("");
            setFecha(fechaLocal());
            setMotivo("");
            setMonto("");
            setMensaje({ tone: "success", text: "Nota de crédito registrada correctamente." });
            setRegistrarAbierto(false);
            await cargar();
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudo registrar la nota de crédito." });
        } finally {
            setGuardando(false);
        }
    }

    const inputClass = "w-full rounded-lg bg-white px-3 py-2.5 text-sm";
    const inputStyle = { border: `1px solid ${COLORS.border}`, color: COLORS.charcoal };

    return (
        <section>
            {mensaje && <Notice tone={mensaje.tone}>{mensaje.text}</Notice>}
            <div className="mb-5 flex items-center justify-between gap-3">
                <div><h2 className="text-lg font-semibold" style={{ color: COLORS.charcoal }}>Notas de crédito registradas</h2><p className="mt-1 text-sm" style={{ color: COLORS.muted }}>Consultá los ajustes aplicados a las facturas.</p></div>
                <Button variant="primary" onClick={() => setRegistrarAbierto(true)} className="inline-flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Registrar nota de crédito</Button>
            </div>
            <div>
                {registrarAbierto && <Modal open onClose={() => setRegistrarAbierto(false)} title="Registrar nota de crédito" subtitle="Aplicá un ajuste a una factura registrada." icon={FileMinus2} width="max-w-xl">
                    <form onSubmit={guardar} className="h-fit rounded-xl p-1">
                    <div className="space-y-4">
                        <FieldLabel label="Factura asociada">
                            <select required disabled={cargando || facturas.length === 0} className={inputClass} style={inputStyle} value={facturaId} onChange={(evento) => { setFacturaId(evento.target.value); setMonto(""); }}>
                                <option value="">{cargando ? "Cargando facturas..." : facturas.length === 0 ? "No hay facturas disponibles" : "Seleccioná una factura"}</option>
                                {facturas.map((factura) => <option key={factura.idFactura} value={factura.idFactura}>{factura.numero} · {factura.cliente} · {dinero(factura.total)}</option>)}
                            </select>
                        </FieldLabel>
                        {!cargando && facturas.length === 0 && <p className="text-xs" style={{ color: COLORS.muted }}>Registrá una factura no anulada en la pestaña Facturas para poder asociarla.</p>}
                        <FieldLabel label="Fecha de emisión">
                            <input required type="date" max={fechaLocal()} className={inputClass} style={inputStyle} value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
                        </FieldLabel>
                        <FieldLabel label={`Monto${facturaSeleccionada ? ` (máx. ${dinero(facturaSeleccionada.total)})` : ""}`}>
                            <input required min="0.01" max={facturaSeleccionada?.total} step="0.01" type="number" className={inputClass} style={inputStyle} value={monto} onChange={(evento) => setMonto(evento.target.value)} />
                        </FieldLabel>
                        <FieldLabel label="Motivo">
                            <textarea required rows="4" className={inputClass} style={inputStyle} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Describí el motivo del ajuste" />
                        </FieldLabel>
                    </div>
                    <Button type="submit" variant="primary" className="mt-5 w-full" disabled={guardando}>{guardando ? "Guardando..." : "Registrar nota de crédito"}</Button>
                    </form>
                </Modal>}

                <div>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div><h2 className="text-base font-semibold" style={{ color: COLORS.charcoal }}>Notas de crédito registradas</h2><p className="mt-1 text-xs" style={{ color: COLORS.muted }}>{visibles.length} registros</p></div>
                        <input className="rounded-lg bg-white px-3 py-2 text-sm" style={inputStyle} placeholder="Buscar nota, factura o cliente" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
                    </div>
                    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                        <table className="w-full text-sm"><thead><tr className="text-left" style={{ backgroundColor: COLORS.greenTint, color: COLORS.charcoal }}><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Factura</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Monto</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Detalle</th></tr></thead>
                            <tbody>{visibles.map((nota) => <tr key={nota.idNotaCredito} style={{ borderTop: `1px solid ${COLORS.border}` }}><td className="px-4 py-3 font-medium">{nota.numero}</td><td className="px-4 py-3">{nota.factura}</td><td className="px-4 py-3">{nota.cliente}</td><td className="px-4 py-3">{dinero(nota.monto, nota.facturaMoneda)}</td><td className="px-4 py-3"><StatusBadge value={nota.estado} /></td><td className="px-4 py-3"><Button onClick={() => setDetalle(nota)} className="inline-flex items-center gap-1.5 px-3 py-2"><Eye size={15} /> Ver detalle</Button></td></tr>)}</tbody>
                        </table>
                        {!cargando && visibles.length === 0 && <p className="py-8 text-center text-sm" style={{ color: COLORS.muted }}>No hay notas de crédito registradas.</p>}
                        {cargando && <div className="flex justify-center py-8"><LoaderCircle className="animate-spin" size={20} color={COLORS.green} /></div>}
                    </div>
                </div>
            </div>
            <Modal
                open={Boolean(detalle)}
                onClose={() => setDetalle(null)}
                title={detalle?.numero ?? "Detalle de nota de crédito"}
                subtitle={detalle ? `Ajuste sobre la factura ${detalle.factura}` : "Información completa del ajuste"}
                icon={Eye}
                width="max-w-2xl"
                headerExtra={detalle ? <StatusBadge value={detalle.estado} /> : null}
                footer={<Button onClick={() => setDetalle(null)}>Cerrar</Button>}
            >
                {detalle && (
                    <div className="space-y-5 text-sm">
                        {detalle.facturaEstado === "Anulada" && (
                            <Notice tone="warning">
                                La factura {detalle.factura} está anulada: revisá el ajuste antes de aplicarlo.
                            </Notice>
                        )}

                        {/* Resumen del ajuste: monto, alcance y saldo resultante. */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Dato label="Monto de la nota" value={dinero(detalle.monto, detalle.facturaMoneda)} destacado />
                            <Dato label="Total de la factura" value={dinero(detalle.facturaTotal, detalle.facturaMoneda)} />
                            <Dato label="Saldo tras el ajuste" value={saldoTrasAjuste != null ? dinero(saldoTrasAjuste, detalle.facturaMoneda) : "Sin dato"} />
                            <Dato label="Cobertura" value={cobertura != null ? `${cobertura.toFixed(1)}%` : "Sin dato"} />
                        </div>

                        {cobertura != null && (
                            <div>
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span style={{ color: COLORS.muted }}>Cobertura del total de la factura</span>
                                    <strong style={{ color: COLORS.greenDark }}>{cobertura.toFixed(1)}%</strong>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: COLORS.greenTint }}>
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, cobertura)}%`, backgroundColor: COLORS.green }} />
                                </div>
                            </div>
                        )}

                        <DetailGrid
                            title="Datos de la nota"
                            items={[
                                { label: "Número de nota", value: detalle.numero },
                                { label: "Fecha de emisión", value: fechaDia(detalle.fechaEmision) },
                                { label: "Estado", value: <StatusBadge value={detalle.estado} /> },
                                { label: "Registrada por", value: detalle.usuarioRegistra || "Sin registro" },
                                { label: "Fecha de registro", value: detalle.fechaRegistro ? formatearFechaHora(detalle.fechaRegistro) : "Sin registro" },
                            ]}
                        />

                        <DetailGrid
                            title="Factura asociada"
                            items={[
                                { label: "Factura", value: detalle.factura },
                                { label: "Cliente", value: detalle.cliente },
                                { label: "Tipo", value: detalle.facturaTipo },
                                { label: "Fecha de emisión", value: fechaDia(detalle.facturaFechaEmision) },
                                { label: "Estado de la factura", value: detalle.facturaEstado },
                                { label: "Estado de cobro", value: detalle.facturaEstadoCobro },
                                { label: "Total de la factura", value: dinero(detalle.facturaTotal, detalle.facturaMoneda) },
                                ...(detalle.facturaMontoPendiente != null
                                    ? [{ label: "Saldo pendiente de cobro", value: dinero(detalle.facturaMontoPendiente, detalle.facturaMoneda) }]
                                    : []),
                            ]}
                        />

                        <div>
                            <h3
                                className="flex items-center gap-2 text-xs uppercase tracking-wide mb-2"
                                style={{ color: COLORS.greenDark, fontWeight: 600 }}
                            >
                                <span className="inline-block w-1 h-3.5 rounded-full" style={{ backgroundColor: COLORS.green }} />
                                Motivo del ajuste
                            </h3>
                            <p className="rounded-xl px-4 py-3" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}>
                                {detalle.motivo}
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    );
}
