import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../Modal";
import ConfirmModal from "../ConfirmModal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/ticketsService";
import { equipoVacio, mensajeError, TIPOS_SERVICIO } from "./helpers";

export default function EntradaTicketModal({ boleta, soloAccesorios = false, onClose, onSaved }) {
    const [clientes, setClientes] = useState([]);
    const [datos, setDatos] = useState(() => boleta ? { ...boleta, equipos: boleta.equipos.map(e => ({ ...e, accesorios: [...e.accesorios] })) }
        : { solicitud: crypto.randomUUID(), idCliente: null, empresa: "", contacto: "", telefono: "", cargo: "", correo: "", tipoServicio: "", equipos: [equipoVacio()] });
    const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false);
    const [confirmacion, setConfirmacion] = useState(null); const [intento, setIntento] = useState(false);
    useEffect(() => { let vigente = true; api.clientes().then(c => vigente && setClientes(c)).catch(e => vigente && setError(e.message)); return () => { vigente = false; }; }, []);
    function campo(key, value) { setDatos(d => ({ ...d, [key]: value })); }
    function empresa(value) {
        const cliente = clientes.find(c => c.empresa.trim().toLowerCase() === value.trim().toLowerCase());
        setDatos(d => ({ ...d, empresa: value, idCliente: cliente?.idCliente ?? null,
            ...(cliente ? { contacto: cliente.contacto ?? "", telefono: cliente.telefono ?? "", correo: cliente.correo ?? "", cargo: cliente.cargo ?? "" }
                : d.idCliente != null ? { contacto: "", telefono: "", correo: "", cargo: "" } : {}) }));
    }
    function equipo(indice, key, value) { setDatos(d => ({ ...d, equipos: d.equipos.map((e, i) => i === indice ? { ...e, [key]: value, ...(key === "tipo" ? { especialidad: value === "Repetidora" ? "Repetidoras" : "Radios" } : {}) } : e) })); }
    async function guardar(body) {
        setGuardando(true); setError("");
        try {
            const resultado = boleta ? await api.editar(boleta.idTicket, { ...body, version: boleta.version }) : await api.registrar(body);
            onSaved(resultado); onClose();
        } catch (e) {
            if (e.codigo === "ALQUILER_OTRO_CLIENTE") setConfirmacion({ body, mensaje: e.message });
            else setError(mensajeError(e));
        } finally { setGuardando(false); }
    }
    function enviar(e) {
        e.preventDefault(); setIntento(true);
        const series = datos.equipos.map(equipo => equipo.numeroSerie.trim().toLowerCase());
        if (new Set(series).size !== series.length) { setError("No se puede registrar dos veces el mismo número de serie en una boleta."); return; }
        if (["Reparación", "Revisión diagnóstica"].includes(datos.tipoServicio) && datos.equipos.some(e => e.problema.trim().length < 10)) {
            setError("La descripción de la falla debe tener al menos 10 caracteres para generar la reparación."); return;
        }
        guardar(datos);
    }
    const clase = (value, obligatorio = true) => `${inputClass} w-full ${intento && obligatorio && !String(value ?? "").trim() ? "border-red-500" : ""}`;
    return (<>
        <Modal open title={boleta ? `Editar boleta ${boleta.numeroBoleta}` : "Registrar boleta de entrada"} subtitle="Una visita puede incluir varios equipos del mismo cliente." onClose={() => { if (!guardando) { if (confirmacion) setConfirmacion(null); else onClose(); } }} width="max-w-4xl"
            footer={<><Button variant="ghost" disabled={guardando} onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit" form="entrada-ticket" disabled={guardando}>{guardando ? "Guardando..." : boleta ? "Guardar cambios" : "Registrar boleta"}</Button></>}>
            {error && <Notice tone="error">{error}</Notice>}
            <form id="entrada-ticket" onSubmit={enviar} onInvalid={() => setIntento(true)} className="space-y-6">
                <fieldset disabled={guardando || soloAccesorios} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <legend className="font-semibold mb-3">Cliente y contacto</legend>
                    <FieldLabel label="Empresa o cliente *"><input list="clientes-ticket" className={clase(datos.empresa)} style={inputStyle} value={datos.empresa} required maxLength={150} onChange={e => empresa(e.target.value)} /><datalist id="clientes-ticket">{clientes.map(c => <option key={c.idCliente} value={c.empresa} />)}</datalist></FieldLabel>
                    <FieldLabel label="Nombre completo de contacto *"><input className={clase(datos.contacto)} style={inputStyle} value={datos.contacto} required maxLength={150} onChange={e => campo("contacto", e.target.value)} /></FieldLabel>
                    <FieldLabel label="Teléfono de contacto *"><input type="tel" className={clase(datos.telefono)} style={inputStyle} value={datos.telefono} required maxLength={20} onChange={e => campo("telefono", e.target.value)} /></FieldLabel>
                    <FieldLabel label="Correo electrónico"><input type="email" className={clase(datos.correo, false)} style={inputStyle} value={datos.correo ?? ""} maxLength={150} onChange={e => campo("correo", e.target.value)} /></FieldLabel>
                    <FieldLabel label="Cargo"><input className={clase(datos.cargo, false)} style={inputStyle} value={datos.cargo ?? ""} maxLength={100} onChange={e => campo("cargo", e.target.value)} /></FieldLabel>
                    <FieldLabel label="Tipo de servicio *"><select className={clase(datos.tipoServicio)} style={inputStyle} value={datos.tipoServicio} required disabled={!!boleta && (boleta.estado !== "Creada" || !!boleta.idTecnicoAsignado)} onChange={e => campo("tipoServicio", e.target.value)}><option value="">Seleccionar...</option>{TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}</select></FieldLabel>
                </fieldset>
                <section className="space-y-4">
                    <h3 className="font-semibold">Equipos de esta visita</h3>
                    {datos.equipos.map((item, i) => (<fieldset key={i} className="border border-[#E3E3E3] rounded-xl p-4 space-y-3" disabled={guardando}>
                        <div className="flex items-center justify-between"><h4 className="font-medium">Equipo {i + 1}</h4>{!soloAccesorios && datos.equipos.length > 1 && <Button aria-label={`Quitar equipo ${i + 1}`} variant="danger" onClick={() => campo("equipos", datos.equipos.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[["marca", "Marca *", 100], ["modelo", "Modelo *", 100], ["numeroSerie", "Número de serie *", 50]].map(([key, label, max]) => <FieldLabel key={key} label={label}><input className={clase(item[key])} style={inputStyle} required maxLength={max} value={item[key]} disabled={soloAccesorios} onChange={e => equipo(i, key, e.target.value)} /></FieldLabel>)}
                            <FieldLabel label="Tipo de equipo *"><select className={inputClass + " w-full"} style={inputStyle} value={item.tipo} disabled={soloAccesorios} onChange={e => equipo(i, "tipo", e.target.value)}>{["Portátil", "Móvil", "Base", "Repetidora"].map(t => <option key={t}>{t}</option>)}</select></FieldLabel>
                        </div>
                        <div><p className="text-xs text-[#6E6E6E] mb-2">Accesorios entregados</p><div className="flex flex-wrap gap-4">{["Antena", "Batería", "Cargador", "Otros"].map(a => <label key={a} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={item.accesorios.includes(a)} onChange={e => equipo(i, "accesorios", e.target.checked ? [...item.accesorios, a] : item.accesorios.filter(v => v !== a))} />{a}</label>)}</div></div>
                        <FieldLabel label="Descripción de la falla *"><textarea className={clase(item.problema)} style={inputStyle} value={item.problema} required maxLength={5000} rows={3} disabled={soloAccesorios} onChange={e => equipo(i, "problema", e.target.value)} /></FieldLabel>
                    </fieldset>))}
                    {!soloAccesorios && <Button onClick={() => campo("equipos", [...datos.equipos, equipoVacio()])}><Plus size={14} className="inline mr-2" />Agregar otro equipo</Button>}
                </section>
            </form>
        </Modal>
        <ConfirmModal open={!!confirmacion} title="Equipo alquilado a otro cliente" message={confirmacion?.mensaje} confirmLabel={guardando ? "Guardando..." : "Continuar de todas formas"} onCancel={() => !guardando && setConfirmacion(null)} onConfirm={() => { if (!guardando) { const body = confirmacion.body; setConfirmacion(null); guardar({ ...body, confirmarAlquilerOtroCliente: true }); } }} />
    </>);
}
