import { useCallback, useEffect, useState } from "react";
import { History, Search } from "lucide-react";
import Modal from "../Modal";
import { Button, DetailGrid, FieldLabel, Notice, Paginacion, Pill } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { listarVendedores } from "../../services/crmCatalogosService";
import * as api from "../../services/crmAuditoriaService";
import { fechaHoraLocal } from "./helpers";

const guion = (v) => (v ? v : "—");

// Detalle de un evento del historial con los demás movimientos de la misma empresa.
function DetalleEvento({ id, onClose }) {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        api.obtenerEventoAuditoriaCrm(id)
            .then((d) => activo && setDatos(d))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el detalle del evento."));
        return () => {
            activo = false;
        };
    }, [id]);

    const ev = datos?.evento;
    return (
        <Modal
            open
            onClose={onClose}
            icon={History}
            title={ev ? `Evento ${ev.idAuditoria}` : "Detalle del evento"}
            subtitle={ev ? `${api.nombreEntidad(ev.entidad)} · ${api.nombreAccion(ev.accion)}` : ""}
            width="max-w-2xl"
            footer={<div className="flex justify-end"><Button variant="primary" onClick={onClose}>Cerrar</Button></div>}
        >
            {error && <Notice tone="error">{error}</Notice>}
            {!datos && !error && <p className="text-sm" style={{ color: COLORS.muted }}>Cargando detalle...</p>}
            {ev && (
                <>
                    <DetailGrid
                        items={[
                            { label: "Identificador", value: String(ev.idAuditoria) },
                            { label: "Fecha y hora", value: fechaHoraLocal(ev.fecha) },
                            { label: "Entidad", value: api.nombreEntidad(ev.entidad) },
                            { label: "Registro afectado", value: ev.idEntidad ? `${api.nombreEntidad(ev.entidad)} #${ev.idEntidad}` : "" },
                            { label: "Empresa", value: ev.empresa },
                            { label: "Vendedor responsable", value: ev.vendedor },
                            { label: "Acción", value: api.nombreAccion(ev.accion) },
                            { label: "Autor", value: ev.autor },
                            { label: "Cambio registrado (valor anterior y nuevo)", value: ev.detalle, wide: true },
                        ]}
                    />
                    <h3 className="text-xs uppercase mt-5 mb-2" style={{ color: COLORS.muted }}>Movimientos relacionados de la misma empresa</h3>
                    {datos.relacionados.length === 0 ? (
                        <p className="text-sm" style={{ color: COLORS.muted }}>Este evento no tiene otros movimientos relacionados.</p>
                    ) : (
                        <ul className="space-y-2">
                            {datos.relacionados.map((r) => (
                                <li key={r.idAuditoria} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.border }}>
                                    <span className="font-medium">{api.nombreAccion(r.accion)}</span>
                                    <span style={{ color: COLORS.muted }}> · {api.nombreEntidad(r.entidad)} · {r.autor} · {fechaHoraLocal(r.fecha)}</span>
                                    {r.detalle && <p className="mt-1 break-words">{r.detalle}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </Modal>
    );
}

// Pestaña «Historial de cambios» (CRMGPSC-026): solo la ve el administrador.
export default function AuditoriaCrmTab() {
    const [filtros, setFiltros] = useState(api.FILTROS_AUDITORIA_VACIOS);
    const [aplicados, setAplicados] = useState(api.FILTROS_AUDITORIA_VACIOS);
    const [pagina, setPagina] = useState(1);
    const [tamano, setTamano] = useState(10);
    const [datos, setDatos] = useState(null);
    const [vendedores, setVendedores] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [detalle, setDetalle] = useState(null);

    const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);
    const set = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value });

    useEffect(() => {
        let activo = true;
        listarVendedores().then((v) => activo && setVendedores(Array.isArray(v) ? v : [])).catch(() => {});
        return () => {
            activo = false;
        };
    }, []);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setDatos(await api.consultarAuditoriaCrm(aplicados, pagina, tamano));
            setError("");
        } catch (e) {
            setDatos(null);
            setError(e instanceof ApiError ? e.message : "No se pudo consultar el historial del CRM.");
        } finally {
            setCargando(false);
        }
    }, [aplicados, pagina, tamano]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    function buscar() {
        if (rangoInvalido) return;
        setPagina(1);
        setAplicados(filtros);
    }

    function limpiar() {
        setFiltros(api.FILTROS_AUDITORIA_VACIOS);
        setAplicados(api.FILTROS_AUDITORIA_VACIOS);
        setPagina(1);
    }

    const hayFiltros = Object.values(aplicados).some(Boolean);

    return (
        <section className="mt-6">
            <h2 className="text-lg font-semibold mb-1">Historial de cambios del CRM</h2>
            <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Qué se registró, modificó, descartó, convirtió o reasignó en prospectos, clientes, contactos, notas, interacciones y seguimientos.</p>

            <div className="rounded-lg border p-4 mb-5" style={{ borderColor: COLORS.border }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FieldLabel label="Entidad">
                        <select value={filtros.entidad} onChange={set("entidad")} className={inputClass} style={inputStyle}>
                            <option value="">Todas</option>
                            {api.ENTIDADES_AUDITORIA.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Identificador del registro">
                        <input type="number" min="1" value={filtros.idEntidad} onChange={set("idEntidad")} className={inputClass} style={inputStyle} placeholder="Ej. 7" />
                    </FieldLabel>
                    <FieldLabel label="Empresa">
                        <input type="text" value={filtros.empresa} onChange={set("empresa")} className={inputClass} style={inputStyle} placeholder="Nombre de la empresa" />
                    </FieldLabel>
                    <FieldLabel label="Vendedor responsable">
                        <select value={filtros.idVendedor} onChange={set("idVendedor")} className={inputClass} style={inputStyle}>
                            <option value="">Todos</option>
                            {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Acción">
                        <input type="text" value={filtros.accion} onChange={set("accion")} className={inputClass} style={inputStyle} placeholder="Ej. PROSPECTO_EDITADO" />
                    </FieldLabel>
                    <FieldLabel label="Desde">
                        <input type="date" value={filtros.desde} onChange={set("desde")} aria-invalid={rangoInvalido || undefined} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <FieldLabel label="Hasta">
                        <input type="date" value={filtros.hasta} onChange={set("hasta")} aria-invalid={rangoInvalido || undefined} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <div className="flex items-end gap-2">
                        <Button variant="primary" onClick={buscar} disabled={rangoInvalido}><Search size={14} className="inline mr-2" />Buscar</Button>
                        <Button onClick={limpiar} disabled={!hayFiltros && !Object.values(filtros).some(Boolean)}>Limpiar</Button>
                    </div>
                </div>
                {rangoInvalido && <p className="mt-3 text-sm" style={{ color: COLORS.danger ?? "#C0392B" }}>La fecha inicial no puede ser posterior a la final. Corrija el rango de fechas.</p>}
            </div>

            {error && <Notice tone="error">{error}</Notice>}

            {datos && datos.items.length === 0 && !error && (
                <p className="text-sm py-8 text-center" style={{ color: COLORS.muted }}>
                    {hayFiltros ? "No hay movimientos dentro de los filtros aplicados." : "Todavía no hay movimientos registrados en el CRM."}
                </p>
            )}

            {datos && datos.items.length > 0 && (
                <>
                    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: COLORS.border }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left" style={{ background: "#F6F6F6", color: COLORS.muted }}>
                                    {["Identificador", "Fecha y hora", "Entidad", "Registro afectado", "Empresa", "Acción", "Cambio registrado", "Autor", ""].map((t) => (
                                        <th key={t} className="px-3 py-2 font-medium whitespace-nowrap">{t}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {datos.items.map((e) => (
                                    <tr key={e.idAuditoria} className="border-t align-top" style={{ borderColor: COLORS.border }}>
                                        <td className="px-3 py-2 whitespace-nowrap">{e.idAuditoria}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{fechaHoraLocal(e.fecha)}</td>
                                        <td className="px-3 py-2">{api.nombreEntidad(e.entidad)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{e.idEntidad ? `#${e.idEntidad}` : "—"}</td>
                                        <td className="px-3 py-2">{guion(e.empresa)}</td>
                                        <td className="px-3 py-2"><Pill tone="neutral">{api.nombreAccion(e.accion)}</Pill></td>
                                        <td className="px-3 py-2 max-w-sm"><span className="line-clamp-3 break-words">{guion(e.detalle)}</span></td>
                                        <td className="px-3 py-2 whitespace-nowrap">{e.autor}</td>
                                        <td className="px-3 py-2"><Button onClick={() => setDetalle(e.idAuditoria)}>Ver detalle</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Paginacion
                        total={datos.total}
                        page={datos.pagina}
                        pageSize={tamano}
                        onPageChange={setPagina}
                        onPageSizeChange={(n) => { setTamano(n); setPagina(1); }}
                        sizes={[10, 25, 50]}
                        loading={cargando}
                        itemLabel="eventos"
                    />
                </>
            )}

            {detalle && <DetalleEvento id={detalle} onClose={() => setDetalle(null)} />}
        </section>
    );
}
