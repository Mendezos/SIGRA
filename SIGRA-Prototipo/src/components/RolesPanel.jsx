import { useEffect, useState } from "react";
import DataTable from "./DataTable";
import Modal from "./Modal";
import {
    Button,
    FieldLabel,
    Notice,
} from "./ui";
import { COLORS, inputClass, inputStyle } from "./uiTheme";
import * as api from "../services/rolesService";
import { ApiError } from "../services/apiClient";

const columnas = [
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

        let activo = true;
        Promise.resolve().then(() => {
            if (activo) cargarRoles();
        });

        return () => {
            activo = false;
        };
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
        setError("");
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
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo crear el rol.");
        } finally {
            setGuardando(false);
        }
    }

    async function guardarTodo() {
        setGuardando(true);
        setError("");
        try {
            await api.editarRol(seleccionado.idRol, nombreEdicion, descripcionEdicion);
            await api.definirPermisosRol(seleccionado.idRol, permisos);
            setSeleccionado(null);
            setPermisos([]);
            setAviso("Rol y permisos guardados correctamente.");
            await cargarRoles();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar el rol.");
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
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado del rol.");
        } finally {
            setGuardando(false);
        }
    }

    function actualizarCasilla(idModulo, accion, valor) {
        setPermisos((prev) =>
            prev.map((p) => (p.idModulo === idModulo ? { ...p, [accion]: valor } : p))
        );
    }

    function marcarColumna(accion, valor) {
        setPermisos((prev) => prev.map((p) => ({ ...p, [accion]: valor })));
    }

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Roles internos y permisos por módulo.
                </p>
                <Button variant="primary" onClick={() => setModoCreacion(true)}>
                    + Nuevo rol
                </Button>
            </div>

            {error && !seleccionado && !modoCreacion && <Notice tone="error">{error}</Notice>}
            {aviso && !seleccionado && <Notice>{aviso}</Notice>}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando roles...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={roles}
                    onRowClick={abrirDetalle}
                    searchPlaceholder="Buscar rol..."
                    initialShowInactive
                    hideInactiveToggle
                />
            )}

            <Modal
                open={modoCreacion}
                title="Nuevo rol"
                subtitle="Definí el nombre y una descripción breve. Los permisos se asignan después."
                onClose={() => setModoCreacion(false)}
            >
                <form onSubmit={crearRol} className="flex flex-col gap-4">
                    {error && <Notice tone="error">{error}</Notice>}

                    <FieldLabel label="Nombre del rol">
                        <input
                            className={inputClass}
                            style={inputStyle}
                            value={nombreNuevo}
                            onChange={(e) => setNombreNuevo(e.target.value)}
                            required
                            maxLength={100}
                        />
                    </FieldLabel>

                    <FieldLabel label="Descripción (opcional)">
                        <textarea
                            className={inputClass}
                            style={inputStyle}
                            value={descripcionNueva}
                            onChange={(e) => setDescripcionNueva(e.target.value)}
                            maxLength={250}
                            rows={3}
                        />
                    </FieldLabel>

                    <div className="flex justify-end gap-3 mt-2">
                        <Button variant="ghost" onClick={() => setModoCreacion(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={guardando}>
                            Crear rol
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={!!seleccionado}
                title={seleccionado ? seleccionado.nombre : ""}
                subtitle={seleccionado ? `Estado actual: ${seleccionado.activo ? "Activo" : "Inactivo"}` : ""}
                onClose={cerrarDetalle}
                width="max-w-3xl"
                footer={seleccionado && (
                    <>
                        <Button
                            variant={seleccionado.activo ? "danger" : "secondary"}
                            onClick={alternarEstado}
                            disabled={guardando}
                            className="mr-auto"
                        >
                            {seleccionado.activo ? "Desactivar rol" : "Activar rol"}
                        </Button>
                        <Button variant="ghost" onClick={cerrarDetalle}>Cancelar</Button>
                        <Button
                            variant="primary"
                            onClick={guardarTodo}
                            disabled={guardando || cargandoPermisos}
                        >
                            {guardando ? "Guardando..." : "Guardar"}
                        </Button>
                    </>
                )}
            >
                {seleccionado && (
                    <div>
                        {error && <Notice tone="error">{error}</Notice>}
                        {aviso && <Notice>{aviso}</Notice>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <FieldLabel label="Nombre">
                                <input
                                    className={inputClass}
                                    style={inputStyle}
                                    value={nombreEdicion}
                                    onChange={(e) => setNombreEdicion(e.target.value)}
                                    maxLength={100}
                                />
                            </FieldLabel>
                            <FieldLabel label="Descripción">
                                <textarea
                                    className={inputClass}
                                    style={inputStyle}
                                    value={descripcionEdicion}
                                    onChange={(e) => setDescripcionEdicion(e.target.value)}
                                    maxLength={250}
                                    rows={2}
                                />
                            </FieldLabel>
                        </div>

                        <h3
                            className="text-xs uppercase tracking-wide mb-3"
                            style={{ color: COLORS.muted, fontWeight: 600 }}
                        >
                            Permisos por módulo
                        </h3>

                        {cargandoPermisos ? (
                            <p className="text-sm" style={{ color: COLORS.muted }}>Cargando permisos...</p>
                        ) : (
                            <div
                                className="rounded-xl overflow-hidden"
                                style={{ border: `1px solid ${COLORS.border}` }}
                            >
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ backgroundColor: COLORS.greenTint }}>
                                            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>
                                                Módulo
                                            </th>
                                            {ACCIONES.map((a) => {
                                                const todos = permisos.length > 0 && permisos.every((p) => p[a.key]);

                                                return (
                                                    <th key={a.key} className="text-center px-2 py-3 text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>
                                                        <label className="flex flex-col items-center gap-1 cursor-pointer">
                                                            {a.label}
                                                            <input
                                                                type="checkbox"
                                                                checked={todos}
                                                                onChange={(e) => marcarColumna(a.key, e.target.checked)}
                                                                aria-label={`Marcar todos: ${a.label}`}
                                                                style={{ accentColor: COLORS.green }}
                                                            />
                                                        </label>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modulos.map((modulo) => {
                                            const fila = permisos.find((p) => p.idModulo === modulo.idModulo);
                                            return (
                                                <tr key={modulo.idModulo} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                                    <td className="px-4 py-2.5">{modulo.nombre}</td>
                                                    {ACCIONES.map((a) => (
                                                        <td key={a.key} className="text-center py-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!fila?.[a.key]}
                                                                onChange={(e) =>
                                                                    actualizarCasilla(modulo.idModulo, a.key, e.target.checked)
                                                                }
                                                                style={{ accentColor: COLORS.green }}
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
                    </div>
                )}
            </Modal>
        </div>
    );
}
