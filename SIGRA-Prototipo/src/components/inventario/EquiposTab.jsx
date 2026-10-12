import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import DataTable from "../DataTable";
import { Button, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/inventarioService";
import EquipoFormModal from "./EquipoFormModal";
import EquipoFichaModal from "./EquipoFichaModal";

const columnas = [
    { key: "serie", label: "Número de serie" },
    { key: "equipo", label: "Equipo" },
    { key: "categoria", label: "Categoría" },
    { key: "estado", label: "Estado" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "cantidad", label: "Cantidad" },
];

export default function EquiposTab({ canWrite, onChanged }) {
    const [equipos, setEquipos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [ficha, setFicha] = useState(null);
    const [registrando, setRegistrando] = useState(false);

    const [serieBuscada, setSerieBuscada] = useState("");
    const [buscando, setBuscando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const [lista, cats] = await Promise.all([api.listarEquipos(), api.listarCategorias()]);
            setEquipos(lista);
            setCategorias(cats);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar el inventario.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    const filas = useMemo(
        () =>
            equipos
                .filter((e) => !categoriaFiltro || String(e.idCategoria) === categoriaFiltro)
                .map((e) => ({
                    id: e.idEquipo,
                    serie: e.numeroSerie,
                    equipo: `${e.marca} ${e.modelo}`,
                    categoria: e.categoria,
                    estado: e.estado,
                    ubicacion: e.ubicacion,
                    cantidad: categorias.find((c) => c.idCategoria === e.idCategoria)?.manejaCantidad ? e.cantidad : null,
                })),
        [equipos, categoriaFiltro, categorias]
    );

    async function abrirFicha(fila) {
        setError("");
        try {
            setFicha(await api.obtenerFichaPorId(fila.id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir la ficha del equipo.");
        }
    }

    async function buscarPorSerie(e) {
        e.preventDefault();
        if (!serieBuscada.trim()) return;
        setError("");
        setMensaje("");
        setBuscando(true);
        try {
            setFicha(await api.obtenerFichaPorSerie(serieBuscada.trim()));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo consultar el equipo.");
        } finally {
            setBuscando(false);
        }
    }

    function alRegistrar(nueva) {
        setRegistrando(false);
        setMensaje(`El equipo ${nueva.equipo.numeroSerie} se registró correctamente con estado Disponible.`);
        setFicha(nueva);
        cargar();
        onChanged?.();
    }

    function alCambiar(actualizada) {
        setFicha(actualizada);
        cargar();
        onChanged?.();
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <form onSubmit={buscarPorSerie} className="relative flex-1 min-w-[16rem] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                    <input
                        value={serieBuscada}
                        onChange={(e) => setSerieBuscada(e.target.value)}
                        placeholder="Consultar ficha por número de serie y presionar Enter"
                        aria-label="Consultar ficha por número de serie"
                        disabled={buscando}
                        className={`${inputClass} pl-9`}
                        style={inputStyle}
                    />
                </form>

                <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    aria-label="Filtrar por categoría"
                    className="px-3 py-2.5 rounded-lg text-sm bg-white"
                    style={{ ...inputStyle, color: categoriaFiltro ? COLORS.charcoal : COLORS.muted }}
                >
                    <option value="">Todas las categorías</option>
                    {categorias.map((c) => (
                        <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>
                    ))}
                </select>

                {canWrite && (
                    <Button variant="primary" className="ml-auto flex items-center gap-1.5" onClick={() => setRegistrando(true)}>
                        <Plus size={15} /> Registrar equipo
                    </Button>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando inventario...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={abrirFicha}
                    searchPlaceholder="Buscar por serie, equipo, categoría o ubicación..."
                    hideInactiveToggle
                />
            )}

            <EquipoFormModal open={registrando} onClose={() => setRegistrando(false)} onSaved={alRegistrar} />

            <EquipoFichaModal
                key={ficha?.equipo.idEquipo ?? "sin-ficha"}
                ficha={ficha}
                canWrite={canWrite}
                onClose={() => setFicha(null)}
                onChanged={alCambiar}
            />
        </div>
    );
}
