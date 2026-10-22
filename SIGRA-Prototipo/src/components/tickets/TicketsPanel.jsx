import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../DataTable";
import StatusBadge from "../StatusBadge";
import { Button, Notice, Paginacion, Tabs } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/ticketsService";
import EntradaTicketModal from "./EntradaTicketModal";
import DetalleTicketModal from "./DetalleTicketModal";
import TicketsReportes from "./TicketsReportes";
import { ESTADOS, fecha, gestion, mensajeError, recepcion, tecnico, TIPOS_SERVICIO } from "./helpers";

const columnas = [{ key: "numeroBoleta", label: "Boleta", render: (b) => `Boleta ${b.numeroBoleta}` }, { key: "empresa", label: "Cliente" }, { key: "tecnicoTexto", label: "Técnico responsable" }, { key: "tipoServicio", label: "Servicio" }, { key: "estado", label: "Estado" }, { key: "etapaTexto", label: "Etapa de reparación" }, { key: "recepcionTexto", label: "Recepción física" }, { key: "fechaTexto", label: "Fecha de ingreso" }];
const inicialFiltro = { texto: "", idCliente: "", idTecnico: "", tipoServicio: "", estado: "", resolucion: "", desde: "", hasta: "", sinRecepcionFisica: false, incluirInactivos: false };

export default function TicketsPanel({ user }) {
    const [numeroAuditoria, setNumeroAuditoria] = useState(null);
    const [tab, setTab] = useState("boletas"); const [filtro, setFiltro] = useState(inicialFiltro); const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1); const [tamanoPagina, setTamano] = useState(12); const [datos, setDatos] = useState({ items: [], total: 0 });
    const [resumen, setResumen] = useState(null); const [clientes, setClientes] = useState([]); const [tecnicos, setTecnicos] = useState([]);
    const [error, setError] = useState(""); const [aviso, setAviso] = useState(""); const [cargando, setCargando] = useState(false); const [recarga, setRecarga] = useState(0);
    const [creando, setCreando] = useState(false); const [detalle, setDetalle] = useState(null);
    const consulta = JSON.stringify({ ...filtro, texto: busqueda });
    useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3000); return () => clearTimeout(t); }, [aviso]);
    useEffect(() => { const t = setTimeout(() => setBusqueda(filtro.texto), 300); return () => clearTimeout(t); }, [filtro.texto]);
    useEffect(() => { let vivo = true; Promise.all([api.clientes(), api.tecnicos()]).then(([c, t]) => { if (vivo) { setClientes(c); setTecnicos(t); } }).catch(e => vivo && setError(e.message)); return () => { vivo = false; }; }, [recarga]);
    useEffect(() => {
        let vivo = true;
        Promise.resolve().then(async () => {
            if (!vivo) return; setCargando(true); setError("");
            try { const [lista, stats] = await Promise.all([api.listar({ ...JSON.parse(consulta), pagina, tamanoPagina }), api.resumen()]); if (vivo) { setDatos(lista); setResumen(stats); setPagina(p => Math.min(p, Math.max(1, Math.ceil(lista.total / tamanoPagina)))); } }
            catch (e) { if (vivo) setError(mensajeError(e)); }
            finally { if (vivo) setCargando(false); }
        });
        return () => { vivo = false; };
    }, [consulta, pagina, tamanoPagina, recarga]);
    const actualizar = useCallback(() => setRecarga(r => r + 1), []);
    function cambiarFiltro(key, value) { setFiltro(f => ({ ...f, [key]: value })); setPagina(1); }
    async function abrir(row) { setError(""); try { setDetalle(await api.obtener(row.idTicket)); } catch (e) { setError(e.message); } }
    function guardado(boleta) { setAviso(`La boleta ${boleta.numeroBoleta} se guardó correctamente.`); actualizar(); }
    const tabs = [{ key: "boletas", label: "Boletas" }, { key: "historial", label: "Historial" },
        ...((gestion(user) || user.role === "Gerente") ? [{ key: "indicadores", label: "Indicadores" }] : []),
        ...(gestion(user) ? [{ key: "garantias", label: "Garantías" }, { key: "carga", label: "Carga y configuración" }] : []),
        ...(user.role === "Administrador del sistema" ? [{ key: "auditoria", label: "Auditoría" }] : [])];
    return <div className="min-w-0 space-y-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" aria-label="Resumen de servicio técnico">{[["Boletas abiertas", resumen?.abiertas], ["En proceso", resumen?.enProceso], ["Cerradas este mes", resumen?.cerradasMes]].map(([label, value]) => <div key={label} className="rounded-lg p-4 bg-[#EAF6E8]"><dt className="text-xs text-[#6E6E6E] mb-1">{label}</dt><dd className="text-2xl font-semibold text-[#323232]">{value ?? "—"}</dd></div>)}</dl>
        <Tabs tabs={tabs} active={tab} onSelect={(clave) => { setTab(clave); setError(""); }} label="Secciones de servicio técnico" />
        {aviso && <Notice>{aviso}</Notice>}{error && <Notice tone="error">{error}</Notice>}
        {tab === "boletas" ? <>
            <div className="flex flex-wrap justify-end gap-3">{recepcion(user) && <Button variant="primary" onClick={() => setCreando(true)}><Plus size={14} className="inline mr-2" />Registrar boleta</Button>}</div>
            <form className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 items-end rounded-lg border border-[#E3E3E3] bg-[#FAFCF9] p-3" onSubmit={e => { e.preventDefault(); actualizar(); }}>
                <input aria-label="Buscar boletas" placeholder="Buscar boleta, código, cliente, contacto o serie..." className={inputClass + " xl:col-span-2 px-3 py-2 text-xs"} style={inputStyle} value={filtro.texto} onChange={e => cambiarFiltro("texto", e.target.value)} />
                {[["estado", "Todos los estados", ESTADOS.map(v => [v, v])], ["tipoServicio", "Todos los servicios", TIPOS_SERVICIO.map(v => [v, v])], ["idCliente", "Todos los clientes", clientes.map(c => [c.idCliente, c.empresa])], ["idTecnico", "Todos los técnicos", tecnicos.map(t => [t.idUsuario, t.nombre])], ["resolucion", "Todas las resoluciones", ["Reparado", "No reparado", "Garantía", "Mantenimiento realizado"].map(v => [v, v])]].map(([key, label, opciones]) => <select key={key} aria-label={label} className={inputClass + " min-w-0 px-3 py-2 text-xs"} style={inputStyle} value={filtro[key]} disabled={key === "idTecnico" && tecnico(user) && !filtro.sinRecepcionFisica} onChange={e => cambiarFiltro(key, e.target.value)}><option value="">{label}</option>{opciones.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>)}
                <div className="sm:col-span-2 xl:col-span-4 flex flex-wrap items-end gap-x-4 gap-y-2">
                    {[["desde", "Desde"], ["hasta", "Hasta"]].map(([key, label]) => <label key={key} className="text-[11px] text-[#6E6E6E]">{label}<input aria-label={label} type="date" className={inputClass + " mt-1 px-3 py-2 text-xs"} style={inputStyle} value={filtro[key]} onChange={e => cambiarFiltro(key, e.target.value)} /></label>)}
                    {tecnico(user) && <label className="flex items-center gap-2 pb-2 text-xs text-[#6E6E6E]"><input type="checkbox" checked={filtro.sinRecepcionFisica} onChange={e => cambiarFiltro("sinRecepcionFisica", e.target.checked)} />Pendientes de recepción física</label>}
                    {gestion(user) && <label className="flex items-center gap-2 pb-2 text-xs text-[#6E6E6E]"><input type="checkbox" checked={filtro.incluirInactivos} onChange={e => cambiarFiltro("incluirInactivos", e.target.checked)} />Incluir inactivas</label>}
                </div>
            </form>
            {cargando && <p role="status" className="text-sm text-[#6E6E6E]">Cargando boletas...</p>}
            <DataTable columns={columnas} rows={datos.items.map(b => ({ ...b, id: b.idTicket, tecnicoTexto: b.tecnico ?? b.estadoAsignacion ?? "Sin asignar", etapaTexto: b.esReparacion ? <StatusBadge value={b.trabajo.etapa} /> : "—", recepcionTexto: b.fechaRecepcionFisica ? "Confirmada" : "Pendiente", fechaTexto: fecha(b.fechaRecepcion) }))} onRowClick={abrir} pagination={false} showCount={false} showSearch={false} showEstadoFilter={false} hideInactiveToggle initialShowInactive emptyMessage="No se encontraron boletas con esos filtros." tableClassName="min-w-[1100px]" />
            <Paginacion sizes={[12, 24, 48]} total={datos.total} page={pagina} pageSize={tamanoPagina} loading={cargando} itemLabel="boletas" onPageChange={setPagina} onPageSizeChange={(n) => { setTamano(n); setPagina(1); }} />
        </> : <TicketsReportes key={tab} tab={tab} numeroInicial={numeroAuditoria} user={user} clientes={clientes} tecnicos={tecnicos} onChanged={actualizar} />}
        {creando && <EntradaTicketModal onClose={() => setCreando(false)} onSaved={guardado} />}
        {detalle && <DetalleTicketModal inicial={detalle} user={user} onClose={() => setDetalle(null)} onChanged={guardado} onVerAuditoria={() => { setNumeroAuditoria(detalle.numeroBoleta); setDetalle(null); setTab("auditoria"); }} />}
    </div>;
}
