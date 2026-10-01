import { useEffect, useState } from "react";
import DataTable from "./DataTable";
import Modal from "./Modal";
import * as api from "../services/rolesService";
import { ApiError } from "../services/apiClient";

const COLORS = {
    green: "#5EB453",
    greenDark: "#4CA23D",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const control = "border rounded-lg px-3 py-2 text-sm w-full";
const button = "px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50";

const columnas = [
    { key: "idRol", label: "ID" },
    { key: "nombre", label: "Nombre" },
    { key: "descripcion", label: "Descripción" },
    { key: "estado", label: "Estado" },
];

const ACCIONES = [
    { key: "lectura", label: "Lectura" },
    { key: "escritura", label: "Escritura" },
    { key: "edicion", label: "Edición" },
    { key: "eliminacion", label: "Eliminación" },
];

function permisosVacios(modulos) {
    return modulos.map((m) => ({
        idModulo: m.idModulo,
        lectura: false,
        escritura: false,
        edicion: false,
        eliminacion: false,
    }));
}

export default function RolesPanel({ user }) {
    const [roles, setRoles] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");

    const [modoCreacion, setModoCreacion] = useState(false);
    const [nombreNuevo, setNombreNuevo] = useState("");
    const [descripcionNueva, setDescripcionNueva] = useState("");

    const [seleccionado, setSeleccionado] = useState(null);
    const [nombreEdicion, setNombreEdicion] = useState("");
    const [descripcionEdicion, setDescripcionEdicion] = useState("");
    const [permisos, setPermisos] = useState([]);
    const [cargandoPermisos, setCargandoPermisos] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const esAdministrador = user.role === "Administrador del sistema";

    async function cargarRoles() {
        setCargando(true);
        setError("");
        try {
            const [data, modulosData] = await Promise.all([api.listarRoles(), api.listarModulos()]);
            setRoles(
                data.map((r) => ({
                    ...r,
                    estado: r.activo ? "Activo" : "Inactivo",
                }))
            );
            setModulos(modulosData);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los roles.");
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        if (!esAdministrador) return;
        cargarRoles();
    }, [esAdministrador]);

    if (!esAdministrador) {
        return (
            <p className="text-sm" style={{ color: COLORS.muted }}>
                Solo el Administrador del sistema puede gestionar roles y permisos.
            </p>
        );
    }

    async function abrirDetalle(rol) {
        setSeleccionado(rol);
        setNombreEdicion(rol.nombre);
        setDescripcionEdicion(rol.descripcion || "");
        setAviso("");
        setError("");
        setCargandoPermisos(true);
        try {
            const actuales = await api.obtenerPermisosRol(rol.idRol);
            const base = permisosVacios(modulos);
            const combinado = base.map((m) => {
                const existente = actuales.find((p) => p.idModulo === m.idModulo);
                return existente ? { ...m, ...existente } : m;
            });
            setPermisos(combinado);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los permisos del rol.");
        } finally {
            setCargandoPermisos(false);
        }
    }

    function cerrarDetalle() {
        setSeleccionado(null);
        setPermisos([]);
    }

    async function crearRol(e) {
        e.preventDefault();
        setGuardando(true);
        setError("");
        try {
            await api.crearRol(nombreNuevo, descripcionNueva);
            setNombreNuevo("");
            setDescripcionNueva("");
            setModoCreacion(false);
            setAviso("Rol creado correctamente.");
            await cargarRoles();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo crear el rol.");
        } finally {
            setGuardando(false);
        }
    }

    async function guardarNombre() {
        setGuardando(true);
        setError("");
        try {
            await api.editarRol(seleccionado.idRol, nombreEdicion, descripcionEdicion);
            setAviso("Rol actualizado correctamente.");
            await cargarRoles();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo editar el rol.");
        } finally {
            setGuardando(false);
        }
    }

    async function alternarEstado() {
        setGuardando(true);
        setError("");
        try {
            const actualizado = await api.cambiarEstadoRol(seleccionado.idRol, !seleccionado.activo);
            setSeleccionado((prev) => ({ ...prev, activo: actualizado.activo }));
            setAviso(actualizado.activo ? "Rol activado." : "Rol desactivado.");
            await cargarRoles();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cambiar el estado del rol.");
        } finally {
            setGuardando(false);
        }
    }

    function actualizarCasilla(idModulo, accion, valor) {
        setPermisos((prev) =>
            prev.map((p) => (p.idModulo === idModulo ? { ...p, [accion]: valor } : p))
        );
    }

    async function guardarPermisos() {
        setGuardando(true);
        setError("");
        try {
            await api.definirPermisosRol(seleccionado.idRol, permisos);
            setAviso("Permisos guardados correctamente.");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron guardar los permisos.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Roles internos y permisos por módulo.
                </p>
                <button
                    type="button"
                    className={button}
                    style={{ backgroundColor: COLORS.green, color: "#FFFFFF" }}
                    onClick={() => setModoCreacion(true)}
                >
                    + Nuevo rol
                </button>
            </div>

            {error && !seleccionado && (
                <p className="text-sm mb-3" style={{ color: "#C0392B" }}>{error}</p>
            )}
            {aviso && !seleccionado && (
                <p className="text-sm mb-3" style={{ color: COLORS.greenDark }}>{aviso}</p>
            )}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando roles...</p>
            ) : (
                <DataTable columns={columnas} rows={roles} onRowClick={abrirDetalle} searchPlaceholder="Buscar rol..." />
            )}

            <Modal open={modoCreacion} title="Nuevo rol" onClose={() => setModoCreacion(false)}>
                <form onSubmit={crearRol}>
                    <label className="text-xs" style={{ color: COLORS.muted }}>Nombre del rol</label>
                    <input
                        className={control}
                        value={nombreNuevo}
                        onChange={(e) => setNombreNuevo(e.target.value)}
                        required
                        maxLength={100}
                    />
                    <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Descripción (opcional)</label>
                    <textarea
                        className={control}
                        value={descripcionNueva}
                        onChange={(e) => setDescripcionNueva(e.target.value)}
                        maxLength={250}
                        rows={2}
                    />
                    {error && <p className="text-sm mt-2" style={{ color: "#C0392B" }}>{error}</p>}
                    <div className="flex justify-end gap-3 mt-5">
                        <button type="button" className={button} onClick={() => setModoCreacion(false)}>Cancelar</button>
                        <button type="submit" className={button} style={{ backgroundColor: COLORS.green, color: "#FFFFFF" }} disabled={guardando}>
                            Crear rol
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={!!seleccionado}
                title={seleccionado ? `Rol: ${seleccionado.nombre}` : ""}
                subtitle={seleccionado ? `Estado actual: ${seleccionado.activo ? "Activo" : "Inactivo"}` : ""}
                onClose={cerrarDetalle}
                width="max-w-2xl"
            >
                {seleccionado && (
                    <div>
                        {error && <p className="text-sm mb-3" style={{ color: "#C0392B" }}>{error}</p>}
                        {aviso && <p className="text-sm mb-3" style={{ color: COLORS.greenDark }}>{aviso}</p>}

                        <div className="mb-6">
                            <div className="flex items-end gap-3 mb-3">
                                <div className="flex-1">
                                    <label className="text-xs" style={{ color: COLORS.muted }}>Nombre</label>
                                    <input
                                        className={control}
                                        value={nombreEdicion}
                                        onChange={(e) => setNombreEdicion(e.target.value)}
                                        maxLength={100}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={button}
                                    style={{ backgroundColor: seleccionado.activo ? "#FCEBEB" : COLORS.greenTint, color: seleccionado.activo ? "#C0392B" : COLORS.greenDark }}
                                    onClick={alternarEstado}
                                    disabled={guardando}
                                >
                                    {seleccionado.activo ? "Desactivar" : "Activar"}
                                </button>
                            </div>
                            <label className="text-xs" style={{ color: COLORS.muted }}>Descripción</label>
                            <textarea
                                className={control}
                                value={descripcionEdicion}
                                onChange={(e) => setDescripcionEdicion(e.target.value)}
                                maxLength={250}
                                rows={2}
                            />
                            <div className="flex justify-end mt-3">
                                <button type="button" className={button} onClick={guardarNombre} disabled={guardando}>
                                    Guardar cambios
                                </button>
                            </div>
                        </div>

                        <p className="font-medium mb-2" style={{ color: COLORS.charcoal }}>Permisos por módulo</p>

                        {cargandoPermisos ? (
                            <p className="text-sm" style={{ color: COLORS.muted }}>Cargando permisos...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                            <th className="text-left py-2">Módulo</th>
                                            {ACCIONES.map((a) => (
                                                <th key={a.key} className="text-center py-2">{a.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modulos.map((modulo) => {
                                            const fila = permisos.find((p) => p.idModulo === modulo.idModulo);
                                            return (
                                                <tr key={modulo.idModulo} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                                    <td className="py-2">{modulo.nombre}</td>
                                                    {ACCIONES.map((a) => (
                                                        <td key={a.key} className="text-center py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!fila?.[a.key]}
                                                                onChange={(e) =>
                                                                    actualizarCasilla(modulo.idModulo, a.key, e.target.checked)
                                                                }
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end mt-5">
                            <button
                                type="button"
                                className={button}
                                style={{ backgroundColor: COLORS.green, color: "#FFFFFF" }}
                                onClick={guardarPermisos}
                                disabled={guardando || cargandoPermisos}
                            >
                                Guardar permisos
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
