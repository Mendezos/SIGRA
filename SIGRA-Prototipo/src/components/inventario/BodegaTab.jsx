import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../DataTable";
import Modal from "../Modal";
import { Button, FieldLabel, Notice, SubTabs } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/inventarioService";

const TIPOS = [
    { key: "accesorios", label: "Accesorios por modelo", singular: "accesorio", ejemplo: "Antena, cargador, audífono, clip" },
    { key: "repuestos", label: "Repuestos en bodega", singular: "repuesto", ejemplo: "Pantalla, botón PTT, placa" },
];

const columnas = [
    { key: "modelo", label: "Modelo compatible" },
    { key: "categoria", label: "Categoría" },
    { key: "nombre", label: "Nombre" },
    { key: "cantidad", label: "Cantidad en bodega" },
];

function ArticuloModal({ tipo, articulo, modelos, onClose, onSaved }) {
    const editando = !!articulo;
    const [idModelo, setIdModelo] = useState(articulo ? String(articulo.idModelo) : "");
    const [nombre, setNombre] = useState(articulo?.nombre ?? "");
    const [cantidad, setCantidad] = useState(articulo ? String(articulo.cantidad) : "");
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);
        setGuardando(true);
        const datos = {
            idModelo: idModelo ? Number(idModelo) : null,
            nombre,
            cantidad: cantidad === "" ? null : Number(cantidad),
        };
        try {
            if (editando) await api.editarArticulo(tipo.key, articulo.id, datos);
            else await api.crearArticulo(tipo.key, datos);
            onSaved(editando ? `El ${tipo.singular} se actualizó correctamente.` : `El ${tipo.singular} se registró correctamente.`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={editando ? `Editar ${tipo.singular}` : `Registrar ${tipo.singular}`}
            subtitle={`Ejemplos: ${tipo.ejemplo}.`}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-articulo" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {errores.length > 0 && (
                        <ul className="list-disc ml-4 mt-1">{errores.map((x) => <li key={x}>{x}</li>)}</ul>
                    )}
                </Notice>
            )}
            <form id="form-articulo" onSubmit={guardar} className="grid grid-cols-1 gap-4">
                <FieldLabel label="Modelo de equipo compatible *">
                    <select value={idModelo} onChange={(e) => setIdModelo(e.target.value)} disabled={editando} className={inputClass} style={inputStyle}>
                        <option value="" disabled>Seleccionar...</option>
                        {modelos.map((m) => (
                            <option key={m.idModelo} value={m.idModelo}>{m.marca} {m.modelo} ({m.categoria})</option>
                        ))}
                    </select>
                </FieldLabel>
                <FieldLabel label="Nombre *">
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Cantidad disponible en bodega *">
                    <input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
            </form>
        </Modal>
    );
}

export default function BodegaTab({ canWrite }) {
    const [tipoKey, setTipoKey] = useState("accesorios");
    const [articulos, setArticulos] = useState([]);
    const [modelos, setModelos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modal, setModal] = useState(null);

    const tipo = TIPOS.find((t) => t.key === tipoKey);

    const cargar = useCallback(async (clave) => {
        try {
            const [lista, mods] = await Promise.all([api.listarArticulos(clave), api.listarModelos()]);
            setArticulos(lista);
            setModelos(mods);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar la bodega.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => {
            if (!activo) return;
            setCargando(true);
            cargar(tipoKey);
        });
        return () => {
            activo = false;
        };
    }, [cargar, tipoKey]);

    const filas = useMemo(() => articulos.map((a) => ({ ...a, cantidad: String(a.cantidad) })), [articulos]);

    function abrirEdicion(fila) {
        if (!canWrite) return;
        setMensaje("");
        setModal({ articulo: articulos.find((a) => a.id === fila.id) });
    }

    function alGuardar(texto) {
        setModal(null);
        setMensaje(texto);
        cargar(tipoKey);
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SubTabs
                    tabs={TIPOS}
                    active={tipoKey}
                    onSelect={(clave) => { setTipoKey(clave); setMensaje(""); }}
                />
                {canWrite && (
                    <Button variant="primary" className="flex items-center gap-1.5 mb-5" onClick={() => { setMensaje(""); setModal({ articulo: null }); }}>
                        <Plus size={15} /> Registrar {tipo.singular}
                    </Button>
                )}
            </div>

            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando...</p>
            ) : (
                <DataTable
                    key={tipoKey}
                    columns={columnas}
                    rows={filas}
                    onRowClick={abrirEdicion}
                    searchPlaceholder={`Buscar ${tipo.singular}...`}
                    hideInactiveToggle
                />
            )}

            {modal && (
                <ArticuloModal
                    key={modal.articulo?.id ?? "nuevo"}
                    tipo={tipo}
                    articulo={modal.articulo}
                    modelos={modelos}
                    onClose={() => setModal(null)}
                    onSaved={alGuardar}
                />
            )}
        </div>
    );
}
