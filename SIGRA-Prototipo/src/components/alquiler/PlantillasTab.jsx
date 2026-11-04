import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import DataTable from "../DataTable";
import { Button, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { listarCategorias } from "../../services/inventarioService";
import PlantillaDetalleModal from "./PlantillaDetalleModal";
import PlantillaFormModal from "./PlantillaFormModal";
import { fechaCorta } from "./helpers";

const columnas = [
    { key: "codigo", label: "Plantilla" },
    { key: "nombre", label: "Nombre" },
    { key: "tipo", label: "Tipo de equipo" },
    { key: "version", label: "Versión vigente" },
    { key: "creada", label: "Creada" },
    { key: "estado", label: "Estado" },
];


export default function PlantillasTab({ canAdministrar }) {
    const [plantillas, setPlantillas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [texto, setTexto] = useState("");
    const [idCategoria, setIdCategoria] = useState("");
    const [estado, setEstado] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [detalle, setDetalle] = useState(null);

    useEffect(() => {
        listarCategorias().then(setCategorias).catch(() => setCategorias([]));
    }, []);

    const cargar = useCallback(async () => {
        try {
            setPlantillas(await api.listarPlantillas({ texto: texto.trim(), idCategoria, estado }));
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar las plantillas.");
        } finally {
            setCargando(false);
        }
    }, [texto, idCategoria, estado]);

    useEffect(() => {
        let activo = true;
        const espera = setTimeout(() => activo && cargar(), 250);
        return () => { activo = false; clearTimeout(espera); };
    }, [cargar]);

    const filas = useMemo(
        () => plantillas.map((p) => ({
            id: p.id,
            codigo: api.codigoPlantilla(p.id),
            nombre: p.nombre,
            tipo: p.tipoEquipo,
            version: `Versión ${p.versionActual}`,
            creada: fechaCorta(p.fechaCreacion),
            estado: p.activa ? "Activa" : "Inactiva",
        })),
        [plantillas]
    );

    async function abrirDetalle(fila) {
        setError("");
        try {
            setDetalle(await api.obtenerPlantilla(fila.id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir la plantilla.");
        }
    }

    function alRegistrar(nueva) {
        setRegistrando(false);
        setMensaje("Plantilla registrada. Quedó en su versión 1.");
        setDetalle(nueva);
        cargar();
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[16rem] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                    <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre..." aria-label="Buscar plantillas" className={`${inputClass} pl-9`} style={inputStyle} />
                </div>

                <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} aria-label="Filtrar por tipo de equipo" className="px-3 py-2.5 rounded-lg text-sm bg-white" style={{ ...inputStyle, color: idCategoria ? COLORS.charcoal : COLORS.muted }}>
                    <option value="">Todos los tipos de equipo</option>
                    {categorias.map((c) => <option key={c.idCategoria ?? c.id} value={c.idCategoria ?? c.id}>{c.nombre}</option>)}
                </select>

                <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado" className="px-3 py-2.5 rounded-lg text-sm bg-white" style={{ ...inputStyle, color: estado ? COLORS.charcoal : COLORS.muted }}>
                    <option value="">Todos los estados</option>
                    <option value="Activa">Activas</option>
                    <option value="Inactiva">Inactivas</option>
                </select>

                {canAdministrar && (
                    <Button variant="primary" className="ml-auto flex items-center gap-1.5" onClick={() => { setMensaje(""); setRegistrando(true); }}>
                        <Plus size={15} /> Nueva plantilla
                    </Button>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando plantillas...</p>
            ) : (
                <DataTable
                    cardMax={6}
                    columns={columnas}
                    rows={filas}
                    onRowClick={abrirDetalle}
                    showSearch={false}
                    showEstadoFilter={false}
                    hideInactiveToggle
                    emptyMessage="No se encontraron plantillas con los filtros especificados."
                />
            )}

            {registrando && <PlantillaFormModal categorias={categorias} onClose={() => setRegistrando(false)} onSaved={alRegistrar} />}

            <PlantillaDetalleModal
                key={detalle?.id ?? "sin-detalle"}
                detalle={detalle}
                categorias={categorias}
                canAdministrar={canAdministrar}
                onClose={() => setDetalle(null)}
                onChanged={(nuevo) => { setDetalle(nuevo); cargar(); }}
            />
        </div>
    );
}
