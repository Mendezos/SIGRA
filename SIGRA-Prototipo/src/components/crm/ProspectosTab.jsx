import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import DataTable from "../DataTable";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmProspectosService";
import { fechaLocal, puedeCrearCrm, puedeEditarCrm } from "./helpers";
import ProspectoDescartarModal from "./ProspectoDescartarModal";
import ProspectoDetalleModal from "./ProspectoDetalleModal";
import ProspectoFormModal from "./ProspectoFormModal";
import ProspectoReactivarModal from "./ProspectoReactivarModal";

const FILTROS_VACIOS = { empresa: "", sector: "", fuente: "", estado: "", idVendedor: "", desde: "", hasta: "" };
const hayCriterios = (f) => Object.values(f).some((v) => String(v).trim() !== "");

const columnas = [
    { key: "codigo", label: "Identificador", cardTitle: true },
    { key: "empresa", label: "Empresa" },
    { key: "sector", label: "Sector" },
    { key: "fuente", label: "Fuente" },
    { key: "estado", label: "Estado" },
    { key: "vendedor", label: "Vendedor" },
    { key: "ingreso", label: "Fecha de ingreso" },
    { key: "contacto", label: "Contacto" },
    { key: "telefono", label: "Teléfono" },
    { key: "correo", label: "Correo" },
    {
        key: "ver",
        label: "Detalle",
        render: () => (
            <span className="text-xs" style={{ color: COLORS.greenDark, fontWeight: 600 }}>
                Ver detalle
            </span>
        ),
    },
];

// Pestaña «Prospectos» del CRM: CRMGPSC-001 a 004.
export default function ProspectosTab({ user, target }) {
    const puedeCrear = puedeCrearCrm(user);
    const puedeEditar = puedeEditarCrm(user);
    const [prospectos, setProspectos] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [aplicados, setAplicados] = useState(FILTROS_VACIOS);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [avisoTono, setAvisoTono] = useState("success");
    const [formulario, setFormulario] = useState(null); // { prospecto? }
    const [detalleId, setDetalleId] = useState(target?.id ? Number(target.id) : null);
    const [nonceVisto, setNonceVisto] = useState(target?.nonce);
    const [version, setVersion] = useState(0);
    const [descartando, setDescartando] = useState(null);
    const [reactivando, setReactivando] = useState(null);

    // Llegada desde una notificación con el módulo ya abierto: se abre el detalle durante el render.
    if (target && target.nonce !== nonceVisto) {
        setNonceVisto(target.nonce);
        if (target.id) setDetalleId(Number(target.id));
    }

    const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);

    // Los criterios se aplican una fracción de segundo después de dejar de escribir.
    useEffect(() => {
        const espera = setTimeout(() => setAplicados(filtros), 350);
        return () => clearTimeout(espera);
    }, [filtros]);

    useEffect(() => {
        let activo = true;
        catalogos
            .listarVendedores()
            .then((lista) => activo && setVendedores(lista))
            .catch(() => activo && setVendedores([]));
        return () => {
            activo = false;
        };
    }, []);

    const cargar = useCallback(async () => {
        if (aplicados.desde && aplicados.hasta && aplicados.desde > aplicados.hasta) {
            setProspectos([]);
            setError(api.MENSAJE_RANGO_INVALIDO);
            setCargando(false);
            return;
        }
        try {
            setProspectos(await api.listarProspectos({ ...aplicados, idVendedor: aplicados.idVendedor || undefined }));
            setError("");
        } catch (e) {
            setProspectos([]);
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los prospectos.");
        } finally {
            setCargando(false);
        }
    }, [aplicados]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar, version]);

    const hayFiltros = hayCriterios(aplicados);
    const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

    function limpiar() {
        setFiltros(FILTROS_VACIOS);
        setAplicados(FILTROS_VACIOS);
    }

    function avisar(texto, tono = "success") {
        setMensaje(texto);
        setAvisoTono(tono);
    }

    function guardado(prospecto, texto) {
        setFormulario(null);
        setVersion((v) => v + 1);
        avisar(texto);
    }

    function accionHecha(resultado) {
        setDescartando(null);
        setReactivando(null);
        setVersion((v) => v + 1);
        avisar(resultado.mensaje, resultado.resultado === "SinCambios" ? "warning" : "success");
    }

    // «Abrir el existente (editar)» desde la pantalla de coincidencias: abre la edición del prospecto coincidente.
    async function abrirExistente(idProspecto) {
        try {
            const d = await api.obtenerProspecto(idProspecto);
            const p = d.prospecto;
            if (p.estado === "Convertido" || p.estado === "Descartado") {
                setFormulario(null);
                setDetalleId(idProspecto);
                return;
            }
            setFormulario({ prospecto: p });
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir el prospecto existente.");
        }
    }

    const filas = useMemo(
        () =>
            prospectos.map((p) => ({
                id: p.idProspecto,
                codigo: api.codigoProspecto(p.idProspecto),
                empresa: p.empresa,
                sector: p.sector || "—",
                fuente: p.fuente || "—",
                estado: p.estado,
                vendedor: p.vendedor ? `${p.vendedor}${p.vendedorActivo ? "" : " (inactivo)"}` : "—",
                ingreso: fechaLocal(p.fechaIngreso),
                contacto: p.contacto || "—",
                telefono: p.telefono || "—",
                correo: p.correo || "—",
            })),
        [prospectos],
    );

    const resumen = useMemo(
        () => [
            { label: "Prospectos en la lista", value: prospectos.length },
            { label: "En etapa Nuevo", value: prospectos.filter((p) => p.estado === "Nuevo").length },
            { label: "En seguimiento (cotizados o en negociación)", value: prospectos.filter((p) => p.estado === "Cotización enviada" || p.estado === "En negociación").length },
            { label: "Descartados", value: prospectos.filter((p) => p.estado === "Descartado").length },
        ],
        [prospectos],
    );

    return (
        <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {resumen.map((m) => (
                    <div key={m.label} className="rounded-lg p-4" style={{ backgroundColor: COLORS.greenTint }}>
                        <p className="text-xs mb-1" style={{ color: COLORS.muted }}>
                            {m.label}
                        </p>
                        <p className="text-2xl" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                            {m.value}
                        </p>
                    </div>
                ))}
            </div>

            {mensaje && <Notice tone={avisoTono}>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <FieldLabel label="Empresa">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                            <input value={filtros.empresa} onChange={set("empresa")} placeholder="Nombre de la empresa" className={inputClass} style={{ ...inputStyle, paddingLeft: "2.1rem" }} />
                        </div>
                    </FieldLabel>
                    <FieldLabel label="Sector">
                        <select value={filtros.sector} onChange={set("sector")} className={inputClass} style={inputStyle}>
                            <option value="">Todos los sectores</option>
                            {catalogos.SECTORES_EMPRESA.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Fuente">
                        <select value={filtros.fuente} onChange={set("fuente")} className={inputClass} style={inputStyle}>
                            <option value="">Todas las fuentes</option>
                            {catalogos.FUENTES_PROSPECTO.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Estado">
                        <select value={filtros.estado} onChange={set("estado")} className={inputClass} style={inputStyle}>
                            <option value="">Todos los estados</option>
                            {catalogos.ESTADOS_PROSPECTO.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Vendedor">
                        <select value={filtros.idVendedor} onChange={set("idVendedor")} className={inputClass} style={inputStyle}>
                            <option value="">Todos los vendedores</option>
                            {vendedores.map((v) => (
                                <option key={v.idUsuario} value={v.idUsuario}>
                                    {v.nombre}
                                </option>
                            ))}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Ingreso desde">
                        <input type="date" value={filtros.desde} onChange={set("desde")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <FieldLabel label="Ingreso hasta">
                        <input type="date" value={filtros.hasta} onChange={set("hasta")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <div className="flex items-end gap-3">
                        {hayFiltros || hayCriterios(filtros) ? (
                            <Button className="flex items-center gap-1.5" onClick={limpiar}>
                                <X size={14} /> Limpiar filtros
                            </Button>
                        ) : null}
                        {puedeCrear && (
                            <Button variant="primary" className="flex items-center gap-1.5 ml-auto" onClick={() => setFormulario({})}>
                                <Plus size={14} /> Nuevo prospecto
                            </Button>
                        )}
                    </div>
                </div>
                {rangoInvalido && (
                    <p role="alert" className="text-xs mt-2" style={{ color: COLORS.red }}>
                        {api.MENSAJE_RANGO_INVALIDO}
                    </p>
                )}
                {hayFiltros && !error && (
                    <p className="text-sm mt-3" style={{ color: COLORS.charcoal }} aria-live="polite">
                        <strong>{prospectos.length}</strong> prospecto(s) encontrado(s)
                    </p>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Cargando prospectos...
                </p>
            ) : (
                <DataTable
                    layout="table"
                    columns={columnas}
                    rows={filas}
                    showSearch={false}
                    showEstadoFilter={false}
                    onRowClick={(fila) => setDetalleId(fila.id)}
                    paginationResetKey={JSON.stringify(aplicados)}
                    emptyMessage={hayFiltros ? api.MENSAJE_SIN_PROSPECTOS : "Todavía no hay prospectos registrados."}
                />
            )}

            {detalleId && (
                <ProspectoDetalleModal
                    idProspecto={detalleId}
                    version={version}
                    puedeEditar={puedeEditar}
                    onClose={() => setDetalleId(null)}
                    onEditar={(p) => setFormulario({ prospecto: p })}
                    onDescartar={setDescartando}
                    onReactivar={setReactivando}
                />
            )}

            {formulario && (
                <ProspectoFormModal
                    key={formulario.prospecto?.idProspecto ?? "nuevo"}
                    user={user}
                    prospecto={formulario.prospecto}
                    onClose={() => setFormulario(null)}
                    onSaved={guardado}
                    onAbrirExistente={abrirExistente}
                />
            )}

            {descartando && <ProspectoDescartarModal prospecto={descartando} onClose={() => setDescartando(null)} onHecho={accionHecha} />}
            {reactivando && <ProspectoReactivarModal prospecto={reactivando} onClose={() => setReactivando(null)} onHecho={accionHecha} />}
        </div>
    );
}
