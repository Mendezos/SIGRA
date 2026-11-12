import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { DonutCard, KpiCard } from "../charts/Graficos";
import DataTable from "../DataTable";
import { Button, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { listarCategorias } from "../../services/inventarioService";
import ContratoDetalleModal from "./ContratoDetalleModal";
import ContratoFormModal from "./ContratoFormModal";
import { dinero, fechaCorta } from "./helpers";

const columnas = [
    { key: "codigo", label: "Contrato" },
    { key: "empresa", label: "Empresa cliente" },
    { key: "equipos", label: "Equipos" },
    { key: "inicio", label: "Inicio" },
    { key: "vencimiento", label: "Vence" },
    { key: "monto", label: "Precio mensual" },
    { key: "vendedor", label: "Responsable" },
    { key: "estado", label: "Estado" },
];

const COLORES_ESTADO = {
    Borrador: "#8B8FA3",
    Activo: "#5EB453",
    Renovado: "#3B82A0",
    "Por vencer (90 días)": "#E0C14B",
    "Por vencer (30 días)": "#E08A26",
    Vencido: "#C0392B",
    Cancelado: "#9A9A9A",
};

function Resumen({ todos }) {
    const conteo = {};
    todos.forEach((c) => { conteo[c.estado] = (conteo[c.estado] ?? 0) + 1; });
    const datos = Object.entries(conteo).map(([name, value]) => ({ name, value }));
    const porVencer = (conteo["Por vencer (90 días)"] ?? 0) + (conteo["Por vencer (30 días)"] ?? 0);
    const vigentes = (conteo.Activo ?? 0) + porVencer;

    const tarjetas = [
        { titulo: "Contratos vigentes", valor: vigentes, color: COLORS.greenDark },
        { titulo: "Borradores por firmar", valor: conteo.Borrador ?? 0 },
        { titulo: "Por vencer (90 días)", valor: porVencer },
        { titulo: "Vencidos", valor: conteo.Vencido ?? 0, color: COLORS.red },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
                {tarjetas.map((t) => (
                    <KpiCard key={t.titulo} titulo={t.titulo} valor={t.valor} color={t.color} />
                ))}
            </div>

            <DonutCard titulo="Contratos por estado" datos={datos} colores={COLORES_ESTADO} vacio="Sin contratos todavía" />
        </div>
    );
}

const filtrosVacios = { texto: "", estado: "", moneda: "", idCategoria: "", venceDesde: "", venceHasta: "", idVendedor: "" };

export default function ContratosTab({ canRegister, canAsignarRadio, canRenovar, canEditar, canCancelar, canVerAuditoria, esAdmin, abrirId, onAbierto }) {
    const [contratos, setContratos] = useState([]);
    const [todos, setTodos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [filtros, setFiltros] = useState(filtrosVacios);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [mensajeDetalle, setMensajeDetalle] = useState("");

    useEffect(() => {
        listarCategorias().then(setCategorias).catch(() => setCategorias([]));
        api.listarVendedores().then(setVendedores).catch(() => setVendedores([]));
    }, []);

    const cargar = useCallback(async () => {
        try {
            const [filtrados, completos] = await Promise.all([
                api.listarContratos({ ...filtros, texto: filtros.texto.trim() }),
                api.listarContratos(),
            ]);
            setContratos(filtrados);
            setTodos(completos);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los contratos.");
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        let activo = true;
        const espera = setTimeout(() => activo && cargar(), 250);
        return () => {
            activo = false;
            clearTimeout(espera);
        };
    }, [cargar]);

    const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    const hayFiltros = Object.values(filtros).some(Boolean);
    const selectClase = "px-3 py-2.5 rounded-lg text-sm bg-white";
    const selectEstilo = (valor) => ({ ...inputStyle, color: valor ? COLORS.charcoal : COLORS.muted });

    // Llegada desde una notificación de la campana: abre el detalle de ese contrato.
    useEffect(() => {
        if (!abrirId) return undefined;
        let activo = true;
        api.obtenerContrato(abrirId)
            .then((d) => activo && setDetalle(d))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo abrir el contrato."))
            .finally(() => activo && onAbierto?.());
        return () => {
            activo = false;
        };
    }, [abrirId, onAbierto]);

    const filas = useMemo(
        () =>
            contratos.map((c) => ({
                id: c.idContrato,
                codigo: api.codigoContrato(c.idContrato),
                empresa: c.empresa,
                equipos: c.cantidadEquipos === 1 ? c.series : `${c.cantidadEquipos} equipos`,
                inicio: fechaCorta(c.fechaInicio),
                vencimiento: fechaCorta(c.fechaVencimiento),
                monto: dinero(c.montoMensual, c.moneda),
                vendedor: c.vendedor,
                estado: c.estado,
            })),
        [contratos]
    );

    async function abrirDetalle(fila) {
        setError("");
        try {
            setMensajeDetalle("");
            setDetalle(await api.obtenerContrato(fila.id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir el contrato.");
        }
    }

    function alRegistrar(nuevo) {
        setRegistrando(false);
        const texto = "Contrato registrado como borrador. Actívelo con el documento firmado para asignar los equipos.";
        setMensaje(texto);
        setMensajeDetalle(texto);
        setDetalle(nuevo);
        cargar();
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {!cargando && <Resumen todos={todos} />}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[16rem] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                    <input
                        value={filtros.texto}
                        onChange={cambiar("texto")}
                        placeholder="Buscar por cliente, código o serie..."
                        aria-label="Buscar contratos"
                        className={`${inputClass} pl-9`}
                        style={inputStyle}
                    />
                </div>

                <select value={filtros.estado} onChange={cambiar("estado")} aria-label="Filtrar por estado" className={selectClase} style={selectEstilo(filtros.estado)}>
                    <option value="">Todos los estados</option>
                    {api.ESTADOS_CONTRATO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>

                <select value={filtros.moneda} onChange={cambiar("moneda")} aria-label="Filtrar por moneda" className={selectClase} style={selectEstilo(filtros.moneda)}>
                    <option value="">Todas las monedas</option>
                    <option value="CRC">Colones</option>
                    <option value="USD">Dólares</option>
                </select>

                <select value={filtros.idCategoria} onChange={cambiar("idCategoria")} aria-label="Filtrar por tipo de equipo" className={selectClase} style={selectEstilo(filtros.idCategoria)}>
                    <option value="">Todos los tipos de equipo</option>
                    {categorias.map((c) => <option key={c.idCategoria ?? c.id} value={c.idCategoria ?? c.id}>{c.nombre}</option>)}
                </select>

                {vendedores.length > 0 && (
                    <select value={filtros.idVendedor} onChange={cambiar("idVendedor")} aria-label="Filtrar por responsable" className={selectClase} style={selectEstilo(filtros.idVendedor)}>
                        <option value="">Todos los responsables</option>
                        {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                    </select>
                )}

                <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
                    Vence desde
                    <input type="date" value={filtros.venceDesde} onChange={cambiar("venceDesde")} aria-label="Vence desde" className={selectClase} style={inputStyle} />
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
                    hasta
                    <input type="date" value={filtros.venceHasta} min={filtros.venceDesde} onChange={cambiar("venceHasta")} aria-label="Vence hasta" className={selectClase} style={inputStyle} />
                </label>

                {hayFiltros && <Button variant="ghost" onClick={() => setFiltros(filtrosVacios)}>Limpiar filtros</Button>}

                {canRegister && (
                    <Button variant="primary" className="ml-auto flex items-center gap-1.5" onClick={() => { setMensaje(""); setRegistrando(true); }}>
                        <Plus size={15} /> Registrar contrato
                    </Button>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando contratos...</p>
            ) : (
                <DataTable
                    cardMax={6}
                    columns={columnas}
                    rows={filas}
                    onRowClick={abrirDetalle}
                    showSearch={false}
                    showEstadoFilter={false}
                    hideInactiveToggle
                    emptyMessage="No se encontró ningún contrato con los filtros ingresados."
                />
            )}

            {registrando && <ContratoFormModal esAdmin={esAdmin} onClose={() => setRegistrando(false)} onSaved={alRegistrar} />}

            <ContratoDetalleModal
                key={detalle?.contrato.idContrato ?? "sin-detalle"}
                detalle={detalle}
                mensaje={mensajeDetalle}
                esAdmin={esAdmin}
                canAsignarRadio={canAsignarRadio}
                canRenovar={canRenovar}
                canEditar={canEditar}
                canCancelar={canCancelar}
                canVerAuditoria={canVerAuditoria}
                onClose={() => setDetalle(null)}
                onChanged={(nuevo) => { setDetalle(nuevo); cargar(); }}
            />
        </div>
    );
}
