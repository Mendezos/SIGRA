import { useState } from "react";
import Modal from "../Modal";
import ConfirmModal from "../ConfirmModal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/ticketsService";
import { ETAPAS, mensajeError, RESOLUCIONES, trabajoVacio } from "./helpers";

export default function TrabajoTicketModal({ boleta, onClose, onSaved }) {
    const [trabajo, setTrabajo] = useState({ ...trabajoVacio, ...boleta.trabajo, monto: boleta.trabajo.monto ?? "" });
    const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false); const [confirmar, setConfirmar] = useState(null);
    const [version, setVersion] = useState(boleta.version); const [facturada, setFacturada] = useState(boleta.facturaEmitida);
    const cubierto = boleta.equipos.length > 0 && boleta.equipos.every(e => e.cubiertoPorContrato);
    const garantia = trabajo.resolucion === "Garantía" || trabajo.servicioRealizado === "Garantía aplicada";
    const cobra = !garantia && (trabajo.tieneCobro || (boleta.esReparacion && trabajo.resolucion === "Reparado" && !cubierto));
    function campo(key, value) { setTrabajo(t => ({ ...t, [key]: value })); }
    function body() { return { version, trabajo: { ...trabajo, tieneCobro: cobra, monto: trabajo.monto === "" ? null : Number(trabajo.monto) } }; }
    async function guardar(operacion) {
        setGuardando(true); setError(""); setConfirmar(null);
        try {
            let actual;
            if (operacion === "borrador") actual = await api.guardarTrabajo(boleta.idTicket, body());
            else if (operacion === "factura") {
                actual = await api.guardarTrabajo(boleta.idTicket, body());
                setVersion(actual.version);
                actual = await api.operar(boleta.idTicket, "factura", { version: actual.version, numeroFactura: trabajo.numeroFactura, monto: Number(trabajo.monto) });
            } else actual = await api.operar(boleta.idTicket, "cerrar", body());
            setVersion(actual.version); setFacturada(actual.facturaEmitida); onSaved(actual);
            if (operacion !== "factura") onClose();
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    }
    function pedirCierre(e) { e.preventDefault(); setConfirmar("cerrar"); }
    function texto(key, label, required = false) {
        return <FieldLabel label={label}><textarea className={inputClass + " w-full"} style={inputStyle} rows={3} maxLength={5000} value={trabajo[key] ?? ""} required={required} disabled={guardando || facturada} onChange={e => campo(key, e.target.value)} /></FieldLabel>;
    }
    return (<>
        <Modal open title={`Trabajo técnico - boleta ${boleta.numeroBoleta}`} subtitle="Guardá avances como borrador o confirmá el cierre definitivo." onClose={() => { if (!guardando) { if (confirmar) setConfirmar(null); else onClose(); } }} width="max-w-3xl"
            footer={<><Button variant="ghost" disabled={guardando} onClick={onClose}>Cancelar</Button>{!facturada && <Button disabled={guardando} onClick={() => guardar("borrador")}>Guardar borrador</Button>}<Button variant="primary" disabled={guardando} type="submit" form="trabajo-ticket">{guardando ? "Guardando..." : "Cerrar boleta"}</Button></>}>
            {error && <Notice tone="error">{error}</Notice>}
            {facturada && <Notice>La factura está confirmada. Los datos están protegidos; podés completar el cierre.</Notice>}
            <form id="trabajo-ticket" onSubmit={pedirCierre} className="space-y-4">
                <fieldset disabled={guardando || facturada} className="space-y-4">
                    {boleta.esReparacion ? <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldLabel label="Etapa de reparación"><select className={inputClass + " w-full"} style={inputStyle} value={trabajo.etapa} onChange={e => campo("etapa", e.target.value)}>{ETAPAS.map(v => <option key={v}>{v}</option>)}</select></FieldLabel>
                            <FieldLabel label="Resolución final *"><select className={inputClass + " w-full"} style={inputStyle} required value={trabajo.resolucion ?? ""} onChange={e => campo("resolucion", e.target.value)}><option value="">Seleccionar...</option>{RESOLUCIONES.map(v => <option key={v}>{v}</option>)}</select></FieldLabel>
                        </div>
                        {texto("hallazgos", "Hallazgos técnicos *", true)}{texto("acciones", "Acciones realizadas")}
                        {trabajo.etapa === "En espera de repuesto" && <FieldLabel label="Repuesto pendiente *"><input className={inputClass + " w-full"} style={inputStyle} required maxLength={300} value={trabajo.repuesto ?? ""} onChange={e => campo("repuesto", e.target.value)} /></FieldLabel>}
                        {trabajo.resolucion === "No reparado" && <FieldLabel label="Justificación técnica *"><textarea className={inputClass + " w-full"} style={inputStyle} required minLength={15} maxLength={5000} rows={3} value={trabajo.justificacionTecnica ?? ""} onChange={e => campo("justificacionTecnica", e.target.value)} /></FieldLabel>}
                    </> : <FieldLabel label="Servicio realizado *"><select className={inputClass + " w-full"} style={inputStyle} required value={trabajo.servicioRealizado ?? ""} onChange={e => campo("servicioRealizado", e.target.value)}><option value="">Seleccionar...</option>{["Mantenimiento estándar", "Reparación", "Garantía aplicada"].map(v => <option key={v}>{v}</option>)}</select></FieldLabel>}
                    {texto("detallesTrabajo", "Detalles del trabajo" + (!boleta.esReparacion ? " *" : ""), !boleta.esReparacion)}
                    {texto("observaciones", "Observaciones generales")}
                    {garantia ? <section className="p-4 bg-[#EAF6E8] rounded-xl space-y-3"><p className="text-sm">El caso quedará registrado automáticamente en la bitácora de garantías.</p><div className="grid sm:grid-cols-2 gap-3">{[["proveedor", "Proveedor *", 150], ["casoProveedor", "Número de caso del proveedor *", 100]].map(([key, label, max]) => <FieldLabel key={key} label={label}><input className={inputClass + " w-full"} style={inputStyle} required maxLength={max} value={trabajo[key] ?? ""} onChange={e => campo(key, e.target.value)} /></FieldLabel>)}</div></section> : <section className="border border-[#E3E3E3] rounded-xl p-4 space-y-3">
                        {cubierto && <p className="text-sm text-[#4CA23D]">Los equipos tienen cobertura de reparación por contrato. La factura es necesaria si hay un cobro adicional.</p>}
                        <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={cobra} disabled={boleta.esReparacion && trabajo.resolucion === "Reparado" && !cubierto} onChange={e => campo("tieneCobro", e.target.checked)} />Este servicio tiene un cobro</label>
                        {cobra && <div className="grid sm:grid-cols-2 gap-3"><FieldLabel label="Número de factura *"><input className={inputClass + " w-full"} style={inputStyle} required maxLength={30} value={trabajo.numeroFactura ?? ""} onChange={e => campo("numeroFactura", e.target.value)} /></FieldLabel><FieldLabel label="Monto en colones *"><input className={inputClass + " w-full"} style={inputStyle} type="number" required min="0.01" max="9999999999.99" step="0.01" value={trabajo.monto} onChange={e => campo("monto", e.target.value)} /></FieldLabel></div>}
                        {cobra && <Button onClick={() => { const form = document.getElementById("trabajo-ticket"); if (form.reportValidity()) setConfirmar("factura"); }}>Confirmar factura emitida</Button>}
                    </section>}
                </fieldset>
            </form>
        </Modal>
        <ConfirmModal open={!!confirmar} title={confirmar === "factura" ? "Confirmar factura emitida" : "Cerrar boleta"}
            message={confirmar === "factura" ? "Confirmá que la factura ya fue emitida. Los datos quedarán protegidos y su corrección corresponderá a facturación." : "Se guardará la resolución final de todos los equipos y la boleta quedará de solo lectura."}
            confirmLabel={guardando ? "Guardando..." : "Confirmar"} onCancel={() => !guardando && setConfirmar(null)} onConfirm={() => !guardando && guardar(confirmar)} />
    </>);
}
