import { useEffect, useState } from "react";
import Modal from "../Modal";
import ConfirmModal from "../ConfirmModal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/ticketsService";
import EntradaTicketModal from "./EntradaTicketModal";
import TrabajoTicketModal from "./TrabajoTicketModal";
import { abierta, fecha, gestion, mensajeError, propio, recepcion, tecnico } from "./helpers";

export default function DetalleTicketModal({ inicial, user, onClose, onChanged, onVerAuditoria }) {
    const [boleta, setBoleta] = useState(inicial); const [error, setError] = useState(""); const [aviso, setAviso] = useState("");
    const [ocupado, setOcupado] = useState(false); const [modo, setModo] = useState(null); const [pendiente, setPendiente] = useState(null);
    const [tecnicos, setTecnicos] = useState([]); const [idTecnico, setIdTecnico] = useState(""); const [fechaEstimada, setFechaEstimada] = useState("");
    const [motivo, setMotivo] = useState(""); const [correo, setCorreo] = useState(inicial.correo ?? ""); const [correoConfirmado, setCorreoConfirmado] = useState(false);
    useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3000); return () => clearTimeout(t); }, [aviso]);
    const editable = abierta(boleta) && !boleta.facturaEmitida;
    function actualizado(actual) { setBoleta(actual); onChanged(actual); setAviso("Los cambios se guardaron correctamente."); }
    async function accion(operacion, datos = {}) {
        setOcupado(true); setError(""); setPendiente(null);
        try { actualizado(await api.operar(boleta.idTicket, operacion, { version: boleta.version, ...datos })); setModo(null); }
        catch (e) {
            if (e.codigo === "CARGA_MAXIMA") setPendiente({ operacion, datos: { ...datos, confirmarSobrecarga: true }, mensaje: e.message });
            else setError(mensajeError(e));
        } finally { setOcupado(false); }
    }
    function cerrarAccion() {
        if (ocupado) return;
        if (pendiente) setPendiente(null);
        else setModo(null);
    }
    async function abrirAsignacion() {
        setError(""); setIdTecnico(""); setFechaEstimada(""); setModo("asignar");
        try { setTecnicos(await api.tecnicos()); } catch (e) { setError(e.message); }
    }
    async function documento(imprimir = false) {
        setOcupado(true); setError("");
        const ventana = imprimir ? window.open("", "_blank") : null;
        try {
            const blob = await api.comprobante(boleta.idTicket);
            if (!imprimir) api.descargar(blob, `comprobante-boleta-${boleta.numeroBoleta}.pdf`);
            else if (ventana) {
                const url = URL.createObjectURL(blob); ventana.location.href = url;
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } else setError("El navegador bloqueó la vista previa. Podés descargar el PDF e imprimirlo.");
        } catch (e) { ventana?.close(); setError(e.message); }
        finally { setOcupado(false); }
    }
    async function enviar(e) {
        e.preventDefault(); setOcupado(true); setError("");
        try { const respuesta = await api.enviarComprobante(boleta.idTicket, { correo, confirmado: correoConfirmado }); setAviso(respuesta.mensaje); setModo(null); }
        catch (e) { setError(e.message); } finally { setOcupado(false); }
    }
    return (<>
        <Modal open={!modo} title={`Boleta ${boleta.numeroBoleta}`} subtitle={boleta.empresa} width="max-w-4xl" onClose={() => { if (!ocupado) { if (pendiente) setPendiente(null); else onClose(); } }}
            footer={<><Button variant="ghost" onClick={onClose} disabled={ocupado}>Cerrar</Button>{editable && (recepcion(user) || propio(user, boleta)) && <Button variant="primary" onClick={() => setModo("editar")}>Editar datos</Button>}{propio(user, boleta) && boleta.estado === "En proceso" && <Button variant="primary" onClick={() => setModo("trabajo")}>Trabajo y cierre</Button>}</>}>
            {error && <Notice tone="error">{error}</Notice>}{aviso && <Notice>{aviso}</Notice>}
            <div className="flex flex-wrap gap-3 items-center mb-5"><StatusBadge value={boleta.estado} />{!boleta.activo && <span className="text-red-700 text-sm">Inactiva</span>}{boleta.esReparacion && <span className="text-sm bg-[#EAF6E8] rounded-full px-3 py-1">Reparación</span>}{boleta.facturaEmitida && <span className="text-sm text-[#6E6E6E]">Factura emitida · Datos protegidos</span>}</div>
            <DetailGrid title="Cliente y recepción" items={[{ label: "Contacto", value: boleta.contacto }, { label: "Teléfono", value: boleta.telefono }, { label: "Correo", value: boleta.correo }, { label: "Cargo", value: boleta.cargo }, { label: "Servicio solicitado", value: boleta.tipoServicio }, { label: "Fecha de ingreso", value: fecha(boleta.fechaRecepcion) }, { label: "Registrado por", value: boleta.registradoPor }, { label: "Recepción física", value: boleta.fechaRecepcionFisica ? `${boleta.recibidoPor} · ${fecha(boleta.fechaRecepcionFisica)}` : "Pendiente de confirmación" }, { label: "Técnico responsable", value: boleta.tecnico ?? boleta.estadoAsignacion ?? "Sin asignar" }, { label: "Plazo estimado", value: boleta.fechaEstimada ? fecha(boleta.fechaEstimada) : "Desde la recepción física confirmada" }]} />
            <section className="rounded-xl bg-[#FAFAFA] p-4 mb-5"><p className="text-xs text-[#6E6E6E] mb-1">Código de seguimiento</p><p className="font-mono text-sm break-all">{boleta.codigoSeguimiento}</p><Button className="mt-2" onClick={async () => { try { await navigator.clipboard.writeText(boleta.codigoSeguimiento); setAviso("Código copiado."); } catch { setError("No se pudo copiar. Seleccioná el código para copiarlo."); } }}>Copiar código</Button></section>
            <section className="mb-5"><h3 className="text-xs uppercase text-[#6E6E6E] mb-3">Equipos de esta visita</h3><div className="space-y-3">{boleta.equipos.map((e, i) => <div key={e.idTicketEquipo ?? i} className="border border-[#E3E3E3] rounded-lg p-3"><p className="font-medium text-sm">{e.marca} {e.modelo} · {e.numeroSerie}</p><p className="text-xs text-[#6E6E6E] mt-1">{e.tipo} · Accesorios: {e.accesorios.join(", ") || "Sin accesorios"}</p><p className="text-sm mt-2 whitespace-pre-wrap">{e.problema}</p>{e.cubiertoPorContrato && <p className="text-xs text-[#4CA23D] mt-2">Reparación cubierta por contrato</p>}</div>)}</div></section>
            {boleta.trabajo && <DetailGrid title="Trabajo técnico" items={[{ label: "Etapa", value: boleta.esReparacion ? boleta.trabajo.etapa : boleta.trabajo.servicioRealizado }, { label: "Resolución", value: boleta.trabajo.resolucion }, { label: "Hallazgos", value: boleta.trabajo.hallazgos, wide: true }, { label: "Acciones realizadas", value: boleta.trabajo.acciones, wide: true }, { label: "Detalles del trabajo", value: boleta.trabajo.detallesTrabajo, wide: true }, { label: "Observaciones", value: boleta.trabajo.observaciones, wide: true }, { label: "Repuesto pendiente", value: boleta.trabajo.repuesto }, { label: "Factura", value: boleta.trabajo.numeroFactura }, { label: "Monto", value: boleta.trabajo.monto != null ? new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(boleta.trabajo.monto) : null }, { label: "Justificación técnica", value: boleta.trabajo.justificacionTecnica, wide: true }, { label: "Proveedor", value: boleta.trabajo.proveedor }, { label: "Caso de garantía", value: boleta.trabajo.casoProveedor }]} />}
            {boleta.motivo && <Notice tone="error">Motivo: {boleta.motivo}</Notice>}
            <section className="border-t border-[#E3E3E3] pt-4 space-y-3">
                <div className="flex flex-wrap gap-2"><Button disabled={ocupado} onClick={() => documento(true)}>Vista previa / imprimir</Button><Button disabled={ocupado} onClick={() => documento()}>Descargar comprobante</Button>{recepcion(user) && <Button disabled={ocupado} onClick={() => { setCorreoConfirmado(false); setModo("correo"); }}>Enviar / reenviar por correo</Button>}</div>
                {editable && <div className="flex flex-wrap gap-2">
                    {tecnico(user) && !boleta.fechaRecepcionFisica && <Button variant="primary" disabled={ocupado} onClick={() => setPendiente({ operacion: "recepcion-fisica", mensaje: "Confirmá que estás recibiendo físicamente todos los equipos de esta boleta. Tu nombre y la fecha quedarán registrados." })}>Confirmar recepción física</Button>}
                    {gestion(user) && <Button variant="primary" disabled={ocupado || (!boleta.esReparacion && boleta.estado === "En proceso")} onClick={abrirAsignacion}>{boleta.idTecnicoAsignado ? "Reasignar técnico" : "Asignar técnico"}</Button>}
                    {propio(user, boleta) && boleta.estado === "Asignada" && <Button variant="primary" disabled={ocupado || !boleta.fechaRecepcionFisica} onClick={() => setPendiente({ operacion: "iniciar", mensaje: "Se registrará el inicio del trabajo con tu usuario y la hora actual." })}>Iniciar trabajo</Button>}
                    {propio(user, boleta) && boleta.estado === "En proceso" && !boleta.esReparacion && <Button disabled={ocupado} onClick={() => setPendiente({ operacion: "derivar-reparacion", mensaje: "Se generará la reparación con los mismos equipos, número y código de seguimiento. La asignación se revisará según especialidad y carga." })}>Derivar a reparación</Button>}
                    {recepcion(user) && ["Creada", "Asignada"].includes(boleta.estado) && <Button variant="danger" disabled={ocupado} onClick={() => { setMotivo(""); setModo("cancelar"); }}>Cancelar servicio</Button>}
                    {gestion(user) && <Button variant="danger" disabled={ocupado} onClick={() => { setMotivo(""); setModo("inactivar"); }}>Inactivar boleta</Button>}
                </div>}
            </section>
            <details className="mt-5 border-t border-[#E3E3E3] pt-4"><summary className="cursor-pointer text-sm font-medium">Historial de estados y asignaciones</summary><div className="mt-3 space-y-2">{boleta.estados.map((e, i) => <p key={`estado-${i}`} className="text-sm">{e.estado} · {e.usuario} · {fecha(e.fecha)}</p>)}{boleta.asignaciones.map((a, i) => <div key={`asignacion-${i}`} className="p-3 rounded-lg bg-[#FAFAFA] text-sm"><p>{a.tecnico} · {a.automatica ? "Asignación automática" : `Asignación por ${a.usuario}`} · {fecha(a.fecha)}</p><p className="text-xs text-[#6E6E6E] mt-1">{a.criterio}</p></div>)}</div></details>
            {user.role === "Administrador del sistema" && <Button className="mt-4" onClick={onVerAuditoria}>Ver auditoría de esta boleta</Button>}
            <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Cambios de datos</summary><div className="mt-2 space-y-2">{boleta.ediciones.length ? boleta.ediciones.map((e, i) => <p key={i} className="text-sm">{e.resumen} · {e.usuario} · {fecha(e.fecha)}</p>) : <p className="text-sm text-[#6E6E6E]">No hay ediciones registradas.</p>}</div></details>
        </Modal>
        {modo === "editar" && <EntradaTicketModal boleta={boleta} soloAccesorios={tecnico(user)} onClose={() => setModo(null)} onSaved={actualizado} />}
        {modo === "trabajo" && <TrabajoTicketModal boleta={boleta} onClose={() => setModo(null)} onSaved={actualizado} />}
        <Modal open={modo === "asignar"} title="Asignar técnico" onClose={cerrarAccion} footer={<><Button variant="ghost" onClick={() => setModo(null)}>Cancelar</Button><Button variant="primary" type="submit" form="asignar-ticket" disabled={ocupado}>Asignar</Button></>}>
            {error && <Notice tone="error">{error}</Notice>}<form id="asignar-ticket" className="space-y-4" onSubmit={e => { e.preventDefault(); accion("asignacion", { idTecnico: Number(idTecnico), fechaEstimada: fechaEstimada || null }); }}><FieldLabel label="Técnico responsable *"><select className={inputClass + " w-full"} style={inputStyle} value={idTecnico} required onChange={e => setIdTecnico(e.target.value)}><option value="">Seleccionar...</option>{tecnicos.map(t => <option key={t.idUsuario} value={t.idUsuario}>{t.nombre} · {t.totalAbiertas} boletas abiertas</option>)}</select></FieldLabel><FieldLabel label="Fecha estimada (opcional)"><input type="date" className={inputClass + " w-full"} style={inputStyle} value={fechaEstimada} onChange={e => setFechaEstimada(e.target.value)} /></FieldLabel></form>
        </Modal>
        <Modal open={["cancelar", "inactivar"].includes(modo)} title={modo === "cancelar" ? "Cancelar servicio" : "Inactivar boleta"} onClose={cerrarAccion} footer={<><Button variant="ghost" onClick={() => setModo(null)}>Volver</Button><Button variant="danger" type="submit" form="motivo-ticket" disabled={ocupado}>Continuar</Button></>}>
            <form id="motivo-ticket" onSubmit={e => { e.preventDefault(); setPendiente({ operacion: modo, datos: { motivo }, mensaje: `${modo === "cancelar" ? "Se cancelará el servicio" : "Se inactivará esta boleta"} conservando su historial. Motivo: ${motivo}` }); }}><FieldLabel label="Motivo *"><textarea className={inputClass + " w-full"} style={inputStyle} value={motivo} required maxLength={500} rows={4} onChange={e => setMotivo(e.target.value)} /></FieldLabel></form>
        </Modal>
        <Modal open={modo === "correo"} title="Enviar comprobante original" onClose={cerrarAccion} footer={<><Button variant="ghost" onClick={() => setModo(null)}>Cancelar</Button><Button variant="primary" type="submit" form="correo-ticket" disabled={ocupado || !correoConfirmado}>{ocupado ? "Enviando..." : "Enviar comprobante"}</Button></>}>
            {error && <Notice tone="error">{error}</Notice>}<form id="correo-ticket" className="space-y-4" onSubmit={enviar}><FieldLabel label="Correo del destinatario *"><input type="email" className={inputClass + " w-full"} style={inputStyle} required maxLength={150} value={correo} onChange={e => { setCorreo(e.target.value); setCorreoConfirmado(false); }} /></FieldLabel><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={correoConfirmado} onChange={e => setCorreoConfirmado(e.target.checked)} />Confirmo que esta dirección es correcta</label><Button onClick={() => documento(true)} disabled={ocupado}>Vista previa / imprimir</Button></form>
        </Modal>
        <ConfirmModal open={!!pendiente} title="Confirmar operación" message={pendiente?.mensaje} variant={["cancelar", "inactivar"].includes(pendiente?.operacion) ? "danger" : "primary"} confirmLabel={ocupado ? "Guardando..." : "Confirmar"} onCancel={() => !ocupado && setPendiente(null)} onConfirm={() => !ocupado && accion(pendiente.operacion, pendiente.datos)} />
    </>);
}
