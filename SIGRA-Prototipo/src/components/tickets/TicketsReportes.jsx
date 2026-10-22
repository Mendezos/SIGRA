import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DataTable from "../DataTable";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/ticketsService";
import { etiquetaCampo, formatearValor, leerDetalle } from "../../utils/auditoria";
import { ESTADOS_GARANTIA, fecha, mensajeError } from "./helpers";

const titulos = { historial: "Historial de boletas", indicadores: "Indicadores por técnico", garantias: "Bitácora de garantías", carga: "Carga de trabajo y configuración", auditoria: "Auditoría de boletas" };
const acciones = { TICKET_CREADO: "Boleta registrada", TICKET_RECIBIR: "Recepción física confirmada", TICKET_ASIGNAR: "Técnico asignado", TICKET_INICIAR: "Trabajo iniciado", TICKET_CANCELAR: "Servicio cancelado", TICKET_EDITAR: "Datos actualizados", TICKET_DERIVAR: "Derivada a reparación", TICKET_BORRADOR: "Avance guardado", TICKET_FACTURA: "Factura confirmada", TICKET_CERRAR: "Boleta cerrada", TICKET_INACTIVAR: "Boleta inactivada", GARANTIA_SEGUIMIENTO: "Seguimiento de garantía" };
const CAMPOS = { empresa: "Cliente", contacto: "Contacto", telefono: "Teléfono", correo: "Correo", cargo: "Cargo", tipoServicio: "Servicio", estado: "Estado", activo: "Activo", tecnico: "Técnico", recibidoPor: "Recibido por", fechaRecepcionFisica: "Recepción física", fechaInicio: "Inicio", fechaCierre: "Cierre", fechaEstimada: "Plazo estimado", facturaEmitida: "Factura emitida", motivo: "Motivo", trabajo: "Trabajo técnico", equipos: "Equipos", numeroBoleta: "Boleta", registradoPor: "Registrado por", criterioAsignacion: "Criterio de asignación" };
const CAMPOS_TRABAJO = { servicioRealizado: "Servicio realizado", detallesTrabajo: "Detalles del trabajo", observaciones: "Observaciones", hallazgos: "Hallazgos", acciones: "Acciones realizadas", etapa: "Etapa", repuesto: "Repuesto pendiente", resolucion: "Resolución", tieneCobro: "Aplica cobro", numeroFactura: "Factura", monto: "Monto", justificacionTecnica: "Justificación técnica", proveedor: "Proveedor", casoProveedor: "Caso del proveedor" };
const horas = value => value == null ? "Sin datos" : `${Number(value).toFixed(2)} h`;
const porcentaje = value => value == null ? "Sin datos" : `${Number(value).toFixed(1)} %`;

export default function TicketsReportes({ tab, user, clientes, onChanged, numeroInicial }) {
    const [filtro, setFiltro] = useState({ idCliente: "", numeroSerie: "", numeroBoleta: numeroInicial ?? "", idUsuario: "", proveedor: "", desde: "", hasta: "" });
    const [responsables, setResponsables] = useState([]);
    const [filtroCarga, setFiltroCarga] = useState("");
    const [datos, setDatos] = useState([]); const [metricas, setMetricas] = useState({ tecnicos: [], motivos: [] }); const [config, setConfig] = useState(null);
    const [error, setError] = useState(""); const [aviso, setAviso] = useState(""); const [ocupado, setOcupado] = useState(false);
    const [seleccionada, setSeleccionada] = useState(null); const [estado, setEstado] = useState("En trámite"); const [nota, setNota] = useState("");
    useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3000); return () => clearTimeout(t); }, [aviso]);
    useEffect(() => {
        let activo = true;
        Promise.resolve().then(async () => {
            if (!activo) return; setOcupado(true);
            try {
                if (tab === "auditoria") { const [cuentas, auditoria] = await Promise.all([api.responsablesAuditoria(), api.auditoria({ numeroBoleta: numeroInicial })]); if (activo) { setResponsables(cuentas); setDatos(auditoria); } }
                else if (tab === "carga") { const [t, c] = await Promise.all([api.tecnicos(), api.configuracion()]); if (activo) { setDatos(t); setConfig(c); } }
                else if (tab === "indicadores") { const m = await api.indicadores({}); if (activo) setMetricas(m); }
                else { const d = await ({ historial: api.historial, garantias: api.garantias, auditoria: api.auditoria })[tab]({}); if (activo) setDatos(d); }
            } catch (e) { if (activo) setError(e.message); }
            finally { if (activo) setOcupado(false); }
        });
        return () => { activo = false; };
    }, [tab, numeroInicial]);
    async function cargar(e) {
        e?.preventDefault(); setOcupado(true); setError("");
        try {
            if (tab === "indicadores") setMetricas(await api.indicadores({ desde: filtro.desde, hasta: filtro.hasta }));
            else if (tab === "carga") { const [t, c] = await Promise.all([api.tecnicos(), api.configuracion()]); setDatos(t); setConfig(c); }
            else setDatos(await ({ historial: api.historial, garantias: api.garantias, auditoria: api.auditoria })[tab](filtro));
        } catch (err) { setError(mensajeError(err)); } finally { setOcupado(false); }
    }
    async function exportar(formato) {
        setOcupado(true); setError("");
        try { const blob = tab === "garantias" ? await api.exportarGarantias(filtro, formato) : await api.exportarHistorial(filtro, formato); api.descargar(blob, `${tab}-servicio-tecnico.${formato === "pdf" ? "pdf" : "xlsx"}`); }
        catch (e) { setError(e.message); } finally { setOcupado(false); }
    }
    async function seguimiento(e) {
        e.preventDefault(); setOcupado(true); setError("");
        try { await api.agregarSeguimiento(seleccionada.idGarantia, { estado, nota }); setSeleccionada(null); setNota(""); setAviso("El seguimiento se guardó correctamente."); await cargar(); }
        catch (err) { setError(err.message); } finally { setOcupado(false); }
    }
    async function guardarConfig(e) {
        e.preventDefault(); setOcupado(true); setError("");
        try { await api.guardarConfiguracion({ cargaMaxima: Number(config.cargaMaxima), diasHabilesEstimados: Number(config.diasHabilesEstimados) }); setAviso("La configuración se guardó correctamente."); onChanged(); await cargar(); }
        catch (err) { setError(err.message); } finally { setOcupado(false); }
    }
    async function especialidades(t, lista) {
        setOcupado(true); setError("");
        try { await api.guardarEspecialidades(t.idUsuario, lista); setAviso("Las especialidades se guardaron correctamente."); onChanged(); await cargar(); }
        catch (err) { setError(err.message); } finally { setOcupado(false); }
    }
    function valorAuditoria(key, value) {
        if (key === "equipos" && Array.isArray(value)) return value.map(e => `${e.marca} ${e.modelo} · ${e.numeroSerie}. ${e.accesorios?.join(", ") || "Sin accesorios"}. ${e.problema ?? ""}`).join("\n");
        if (key === "trabajo" && value && typeof value === "object") return Object.entries(value).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${CAMPOS_TRABAJO[k] ?? etiquetaCampo(k) ?? k}: ${formatearValor(k, v)}`).join("\n");
        if (key.startsWith("fecha") && value) return fecha(value);
        return formatearValor(key, value);
    }
    const columnas = tab === "historial" ? [{ key: "fechaTexto", label: "Fecha" }, { key: "numeroBoleta", label: "Boleta" }, { key: "empresa", label: "Cliente" }, { key: "numeroSerie", label: "Serie" }, { key: "tipoServicio", label: "Servicio" }, { key: "tecnico", label: "Técnico" }, { key: "resolucion", label: "Resolución" }, { key: "observaciones", label: "Observaciones", cellClassName: "min-w-64 whitespace-pre-wrap" }]
        : tab === "garantias" ? [{ key: "fechaTexto", label: "Fecha" }, { key: "numeroBoleta", label: "Boleta" }, { key: "empresa", label: "Cliente" }, { key: "numeroSerie", label: "Equipo / serie" }, { key: "proveedor", label: "Proveedor" }, { key: "casoProveedor", label: "Caso del proveedor" }, { key: "estado", label: "Estado del caso" }]
        : [{ key: "fechaTexto", label: "Fecha" }, { key: "numeroBoleta", label: "Boleta" }, { key: "usuario", label: "Responsable" }, { key: "accionTexto", label: "Acción" }];
    return <section className="space-y-4">
        <h2 className="font-semibold text-[#323232]">{titulos[tab]}</h2>{error && <Notice tone="error">{error}</Notice>}{aviso && <Notice>{aviso}</Notice>}
        {tab !== "carga" && <form className="flex flex-wrap items-end gap-3" onSubmit={cargar}>
            {["historial", "garantias"].includes(tab) && <FieldLabel label="Cliente"><select className={inputClass} style={inputStyle} value={filtro.idCliente} onChange={e => setFiltro(f => ({ ...f, idCliente: e.target.value }))}><option value="">Todos los clientes</option>{clientes.map(c => <option key={c.idCliente} value={c.idCliente}>{c.empresa}</option>)}</select></FieldLabel>}
            {tab === "historial" && <FieldLabel label="Número de serie"><input className={inputClass} style={inputStyle} value={filtro.numeroSerie} onChange={e => setFiltro(f => ({ ...f, numeroSerie: e.target.value }))} /></FieldLabel>}
            {tab === "garantias" && <FieldLabel label="Proveedor"><input className={inputClass} style={inputStyle} value={filtro.proveedor} onChange={e => setFiltro(f => ({ ...f, proveedor: e.target.value }))} /></FieldLabel>}
            {tab === "auditoria" && <><FieldLabel label="Número de boleta"><input type="number" min="1" className={inputClass} style={inputStyle} value={filtro.numeroBoleta} onChange={e => setFiltro(f => ({ ...f, numeroBoleta: e.target.value }))} /></FieldLabel><FieldLabel label="Responsable"><select className={inputClass} style={inputStyle} value={filtro.idUsuario} onChange={e => setFiltro(f => ({ ...f, idUsuario: e.target.value }))}><option value="">Todos</option>{responsables.map(t => <option key={t.idUsuario} value={t.idUsuario}>{t.nombre}</option>)}</select></FieldLabel></>}
            {[["desde", "Desde"], ["hasta", "Hasta"]].map(([key, label]) => <FieldLabel key={key} label={label}><input type="date" className={inputClass} style={inputStyle} value={filtro[key]} onChange={e => setFiltro(f => ({ ...f, [key]: e.target.value }))} /></FieldLabel>)}
            <Button variant="primary" type="submit" disabled={ocupado}>{ocupado ? "Consultando..." : "Consultar"}</Button>
            {["historial", "garantias"].includes(tab) && <><Button disabled={ocupado} onClick={() => exportar("pdf")}>Exportar PDF</Button><Button disabled={ocupado} onClick={() => exportar("excel")}>Exportar Excel</Button></>}
        </form>}
        {tab === "indicadores" ? <>
            <p className="text-xs text-[#6E6E6E]">Éxito: boletas reparadas / total de boletas cerradas. Atención: desde el primer inicio hasta el cierre. Atención activa: descuenta esperas de repuestos.</p>
            <DataTable layout="table" columns={[{ key: "tecnico", label: "Técnico" }, { key: "cerradas", label: "Cerradas" }, { key: "reparadas", label: "Reparadas" }, { key: "exito", label: "Tasa de éxito" }, { key: "tiempo", label: "Atención promedio" }, { key: "activo", label: "Atención activa promedio" }]} rows={metricas.tecnicos.map(t => ({ ...t, id: t.idTecnico, exito: porcentaje(t.tasaExito), tiempo: horas(t.promedioHoras), activo: horas(t.promedioHorasActivas) }))} showSearch={false} hideInactiveToggle emptyMessage="No hay boletas cerradas en el periodo seleccionado." />
            {metricas.tecnicos.length > 0 && <div className="h-72"><ResponsiveContainer><BarChart data={metricas.tecnicos}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tecnico" /><YAxis domain={[0, 100]} /><Tooltip formatter={v => `${Number(v).toFixed(1)} %`} /><Bar dataKey="tasaExito" name="Tasa de éxito" fill="#5EB453" /></BarChart></ResponsiveContainer></div>}
            <h3 className="font-medium">Motivos frecuentes de no reparación</h3><DataTable layout="table" columns={[{ key: "motivo", label: "Motivo", cellClassName: "whitespace-pre-wrap" }, { key: "cantidad", label: "Boletas" }]} rows={metricas.motivos} showSearch={false} hideInactiveToggle emptyMessage="No hay resoluciones de no reparación en el periodo." />
        </> : tab === "carga" ? <>
            {config && <form className="flex flex-wrap items-end gap-3 rounded-xl bg-[#EAF6E8] p-4" onSubmit={guardarConfig}><FieldLabel label="Carga máxima recomendada"><input type="number" min="1" max="1000" required className={inputClass} style={inputStyle} value={config.cargaMaxima} onChange={e => setConfig(c => ({ ...c, cargaMaxima: e.target.value }))} /></FieldLabel><FieldLabel label="Plazo estimado en días hábiles"><input type="number" min="1" max="365" required className={inputClass} style={inputStyle} value={config.diasHabilesEstimados} onChange={e => setConfig(c => ({ ...c, diasHabilesEstimados: e.target.value }))} /></FieldLabel><Button type="submit" variant="primary" disabled={ocupado}>Guardar configuración</Button></form>}
            <label className="text-sm block">Filtrar técnico<input aria-label="Filtrar técnico" className={inputClass + " block mt-1 sm:w-80"} style={inputStyle} value={filtroCarga} onChange={e => setFiltroCarga(e.target.value)} /></label>
            <div className="overflow-auto rounded-xl border border-[#E3E3E3]"><table className="w-full text-sm"><thead className="bg-[#EAF6E8]"><tr>{["Técnico", "Asignadas", "En proceso", "Total abiertas", "Especialidades"].map(c => <th className="text-left p-3" key={c}>{c}</th>)}</tr></thead><tbody>{datos.filter(t => t.nombre.toLocaleLowerCase().includes(filtroCarga.toLocaleLowerCase())).map(t => <tr key={t.idUsuario} className={`border-t border-[#E3E3E3] ${t.totalAbiertas > Number(config?.cargaMaxima ?? 5) ? "bg-red-50 text-red-700" : ""}`}><td className="p-3">{t.nombre}</td><td className="p-3">{t.asignadas}</td><td className="p-3">{t.enProceso}</td><td className="p-3">{t.totalAbiertas}</td><td className="p-3"><div className="flex flex-wrap gap-3">{["Radios", "Repetidoras"].map(s => <label key={s} className="flex items-center gap-2"><input type="checkbox" disabled={ocupado} checked={t.especialidades.includes(s)} onChange={e => especialidades(t, e.target.checked ? [...t.especialidades, s] : t.especialidades.filter(v => v !== s))} />{s}</label>)}</div>{t.especialidades.length === 0 && <p className="text-xs text-[#6E6E6E] mt-1">Configurá una especialidad para habilitar la asignación automática.</p>}</td></tr>)}</tbody></table></div>
            {datos.length > 0 && <div className="h-72"><ResponsiveContainer><BarChart data={datos}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nombre" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="totalAbiertas" name="Boletas abiertas" fill="#5EB453" /></BarChart></ResponsiveContainer></div>}
        </> : <DataTable layout="table" columns={columnas} rows={datos.map((d, i) => ({ ...d, id: d.idGarantia ?? d.idAuditoria ?? i, fechaTexto: fecha(d.fecha), accionTexto: acciones[d.accion] ?? d.accion }))} showSearch={false} hideInactiveToggle showEstadoFilter={false} onRowClick={tab === "historial" ? undefined : d => { setSeleccionada(d); setEstado(d.estado ?? "En trámite"); setNota(""); }} tableClassName="min-w-[950px]" emptyMessage="No hay registros para la consulta seleccionada." />}
        <Modal open={!!seleccionada} title={tab === "garantias" ? `Garantía - boleta ${seleccionada?.numeroBoleta}` : `Auditoría - boleta ${seleccionada?.numeroBoleta}`} onClose={() => setSeleccionada(null)} width="max-w-3xl">
            {seleccionada && tab === "garantias" ? <div className="space-y-4"><p className="text-sm">{seleccionada.empresa} · {seleccionada.numeroSerie} · {seleccionada.proveedor} · Caso {seleccionada.casoProveedor}</p><p className="text-sm text-[#6E6E6E]">Registro original: {fecha(seleccionada.fecha)}. El seguimiento agrega nuevas entradas.</p>{seleccionada.seguimiento.map((s, i) => <div key={i} className="rounded-lg bg-[#FAFAFA] p-3"><p className="text-sm font-medium">{s.estado} · {s.usuario} · {fecha(s.fecha)}</p><p className="text-sm whitespace-pre-wrap mt-1">{s.nota}</p></div>)}{error && <Notice tone="error">{error}</Notice>}<form onSubmit={seguimiento} className="space-y-3"><FieldLabel label="Nuevo estado del caso"><select className={inputClass + " w-full"} style={inputStyle} value={estado} onChange={e => setEstado(e.target.value)}>{ESTADOS_GARANTIA.map(s => <option key={s}>{s}</option>)}</select></FieldLabel><FieldLabel label="Nota de seguimiento *"><textarea className={inputClass + " w-full"} style={inputStyle} required rows={3} maxLength={1000} value={nota} onChange={e => setNota(e.target.value)} /></FieldLabel><Button type="submit" variant="primary" disabled={ocupado}>Agregar seguimiento</Button></form></div> : seleccionada && <div><p className="text-sm mb-4">{seleccionada.usuario} · {fecha(seleccionada.fecha)} · {acciones[seleccionada.accion] ?? seleccionada.accion}</p><div className="overflow-auto"><table className="w-full text-sm min-w-[650px]"><thead className="bg-[#EAF6E8]"><tr>{["Campo", "Anterior", "Nuevo"].map(c => <th key={c} className="text-left p-3">{c}</th>)}</tr></thead><tbody>{(() => { const info = leerDetalle(seleccionada.detalle); return [...new Set([...Object.keys(info?.antes ?? {}), ...Object.keys(info?.despues ?? {})])].filter(k => CAMPOS[k]).map(k => <tr key={k} className="border-b border-[#E3E3E3]"><td className="p-3">{CAMPOS[k]}</td><td className="p-3 whitespace-pre-wrap">{valorAuditoria(k, info?.antes?.[k])}</td><td className="p-3 whitespace-pre-wrap">{valorAuditoria(k, info?.despues?.[k])}</td></tr>); })()}</tbody></table>{seleccionada.accion === "GARANTIA_SEGUIMIENTO" && <p className="text-sm p-3">{leerDetalle(seleccionada.detalle)?.estadoGarantia}: {leerDetalle(seleccionada.detalle)?.nota}</p>}</div></div>}
        </Modal>
        {tab === "historial" && user.role === "Recepcionista" && <p className="text-xs text-[#6E6E6E]">Seleccioná un cliente o equipo para exportar su historial.</p>}
    </section>;
}
