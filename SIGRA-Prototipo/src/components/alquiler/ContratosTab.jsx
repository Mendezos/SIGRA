import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { DonutCard, KpiCard } from "../charts/Graficos";
import DataTable from "../DataTable";
import { Button, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import ContratoDetalleModal from "./ContratoDetalleModal";
import ContratoFormModal from "./ContratoFormModal";
import { colones, fechaCorta } from "./helpers";

const columnas = [
    { key: "codigo", label: "Contrato" },
    { key: "empresa", label: "Empresa cliente" },
    { key: "equipos", label: "Equipos" },
    { key: "inicio", label: "Inicio" },
    { key: "vencimiento", label: "Vence" },
    { key: "monto", label: "Monto mensual" },
    { key: "vendedor", label: "Vendedor" },
    { key: "estado", label: "Estado" },
];

const COLORES_ESTADO = {
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
    const vigentes = (conteo.Activo ?? 0) + (conteo.Renovado ?? 0);
    const porVencer = (conteo["Por vencer (90 días)"] ?? 0) + (conteo["Por vencer (30 días)"] ?? 0);

    const tarjetas = [
        { titulo: "Contratos vigentes", valor: vigentes, color: COLORS.greenDark },
        { titulo: "Por vencer (90 días)", valor: porVencer },
        { titulo: "Vencidos", valor: conteo.Vencido ?? 0, color: COLORS.red },
        { titulo: "Cancelados", valor: conteo.Cancelado ?? 0 },
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

export default function ContratosTab({ canRegister, canAsignarRadio, canRenovar, canCancelar, canVerAuditoria }) {
    const [contratos, setContratos] = useState([]);
    const [todos, setTodos] = useState([]);
    const [texto, setTexto] = useState("");
    const [estado, setEstado] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [mensajeDetalle, setMensajeDetalle] = useState("");

    const cargar = useCallback(async () => {
        try {
            const [filtrados, completos] = await Promise.all([
                api.listarContratos({ texto: texto.trim(), estado }),
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
    }, [texto, estado]);

    useEffect(() => {
        let activo = true;
        const espera = setTimeout(() => activo && cargar(), 250);
        return () => {
            activo = false;
            clearTimeout(espera);
        };
    }, [cargar]);

    const filas = useMemo(
        () =>
            contratos.map((c) => ({
                id: c.idContrato,
                codigo: api.codigoContrato(c.idContrato),
                empresa: c.empresa,
                equipos: c.cantidadEquipos === 1 ? c.series : `${c.cantidadEquipos} equipos`,
                inicio: fechaCorta(c.fechaInicio),
                vencimiento: fechaCorta(c.fechaVencimiento),
                monto: colones(c.montoMensual),
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
        setMensaje("Contrato registrado exitosamente.");
        setMensajeDetalle("Contrato registrado exitosamente.");
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
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder="Buscar por empresa, código o serie..."
                        aria-label="Buscar contratos"
                        className={`${inputClass} pl-9`}
                        style={inputStyle}
                    />
                </div>

                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    aria-label="Filtrar por estado"
                    className="px-3 py-2.5 rounded-lg text-sm bg-white"
                    style={{ ...inputStyle, color: estado ? COLORS.charcoal : COLORS.muted }}
                >
                    <option value="">Todos los estados</option>
                    {api.ESTADOS_CONTRATO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>

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
                    emptyMessage="No se encontraron contratos con los criterios de búsqueda ingresados."
                />
            )}

            {registrando && <ContratoFormModal onClose={() => setRegistrando(false)} onSaved={alRegistrar} />}

            <ContratoDetalleModal
                key={detalle?.contrato.idContrato ?? "sin-detalle"}
                detalle={detalle}
                mensaje={mensajeDetalle}
                canAsignarRadio={canAsignarRadio}
                canRenovar={canRenovar}
                canCancelar={canCancelar}
                canVerAuditoria={canVerAuditoria}
                onClose={() => setDetalle(null)}
                onChanged={(nuevo) => { setDetalle(nuevo); cargar(); }}
            />
        </div>
    );
}
