import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import DataTable from "./DataTable";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import { Button, FieldLabel, Notice, Pill } from "./ui";
import { COLORS, inputClass, inputStyle } from "./uiTheme";
import * as api from "../services/rolesService";
import { ApiError } from "../services/apiClient";

const NOMBRE_ADMIN = "Administrador del sistema";
const ID_MODULO_USUARIOS = 1;

const ACCIONES = [
    { key: "lectura", label: "Lectura" },
    { key: "escritura", label: "Escritura" },
    { key: "edicion", label: "Edición" },
    { key: "eliminacion", label: "Eliminación" },
];

const columnas = [
    {
        key: "nombre",
        label: "Nombre",
        nowrap: true,
        render: (r) => <span style={{ fontWeight: 600 }}>{r.nombre}</span>,
    },
    {
        key: "descripcion",
        label: "Descripción",
        render: (r) => r.descripcion || <span style={{ color: COLORS.muted }}>Sin descripción</span>,
    },
    { key: "usuarios", label: "Cuentas", nowrap: true, align: "center", render: (r) => String(r.usuarios ?? 0) },
    { key: "accesoTexto", label: "Módulos con acceso", nowrap: true, align: "center" },
    {
        key: "estado",
        label: "Estado",
        nowrap: true,
        render: (r) => <Pill tone={r.activo ? "positive" : "negative"}>{r.estado}</Pill>,
    },
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

function combinarPermisos(modulos, actuales) {
    return permisosVacios(modulos).map((base) => {
        const existente = actuales.find((p) => p.idModulo === base.idModulo);
        return existente ? { ...base, ...existente } : base;
    });
}

const instantanea = (form) => JSON.stringify(form);

export default function RolesPanel({ user, onChanged }) {
    const [roles, setRoles] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");

    // Formulario único para crear y editar: { idRol|null, nombre, descripcion, activo, permisos }
    const [form, setForm] = useState(null);
    const [formInicial, setFormInicial] = useState("");
    const [cargandoForm, setCargandoForm] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorForm, setErrorForm] = useState("");
    const [confirmarDescartar, setConfirmarDescartar] = useState(false);

    const esAdministrador = user.role === NOMBRE_ADMIN;

    async function cargarRoles() {
        setCargando(true);
        setError("");

        try {
            const [data, modulosData] = await Promise.all([api.listarRoles(), api.listarModulos()]);

            setRoles(
                data.map((r) => ({
                    ...r,
                    id: r.idRol,
                    estado: r.activo ? "Activo" : "Inactivo",
                    accesoTexto: `${r.modulosConAcceso} de ${modulosData.length}`,
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

    const esRolAdmin = form?.nombreOriginal === NOMBRE_ADMIN;
    const hayCambios = !!form && instantanea({ ...form, nombreOriginal: undefined }) !== formInicial;

    function abrirNuevo() {
        const nuevo = {
            idRol: null,
            nombreOriginal: "",
            nombre: "",
            descripcion: "",
            activo: true,
            permisos: permisosVacios(modulos),
        };

        setAviso("");
        setErrorForm("");
        setForm(nuevo);
        setFormInicial(instantanea({ ...nuevo, nombreOriginal: undefined }));
    }

    async function abrirEdicion(rol) {
        setAviso("");
        setErrorForm("");
        setCargandoForm(true);

        const base = {
            idRol: rol.idRol,
            nombreOriginal: rol.nombre,
            nombre: rol.nombre,
            descripcion: rol.descripcion || "",
            activo: rol.activo,
            permisos: permisosVacios(modulos),
        };

        setForm(base);
        setFormInicial("");

        try {
            const actuales = await api.obtenerPermisosRol(rol.idRol);
            const completo = { ...base, permisos: combinarPermisos(modulos, actuales) };

            setForm(completo);
            setFormInicial(instantanea({ ...completo, nombreOriginal: undefined }));
        } catch (e) {
            setErrorForm(e instanceof ApiError ? e.message : "No se pudieron cargar los permisos del rol.");
        } finally {
            setCargandoForm(false);
        }
    }

    function cerrarForm(forzar = false) {
        if (guardando) return;

        if (!forzar && hayCambios) {
            setConfirmarDescartar(true);
            return;
        }

        setConfirmarDescartar(false);
        setForm(null);
        setErrorForm("");
    }

    function actualizarCampo(campo, valor) {
        setForm((f) => ({ ...f, [campo]: valor }));
    }

    function bloqueada(idModulo) {
        return esRolAdmin && idModulo === ID_MODULO_USUARIOS;
    }

    function actualizarCasilla(idModulo, accion, valor) {
        if (bloqueada(idModulo)) return;

        setForm((f) => ({
            ...f,
            permisos: f.permisos.map((p) => (p.idModulo === idModulo ? { ...p, [accion]: valor } : p)),
        }));
    }

    function marcarColumna(accion, valor) {
        setForm((f) => ({
            ...f,
            permisos: f.permisos.map((p) => (bloqueada(p.idModulo) ? p : { ...p, [accion]: valor })),
        }));
    }

    function marcarFila(idModulo, valor) {
        if (bloqueada(idModulo)) return;

        setForm((f) => ({
            ...f,
            permisos: f.permisos.map((p) => (
                p.idModulo === idModulo
                    ? { ...p, lectura: valor, escritura: valor, edicion: valor, eliminacion: valor }
                    : p
            )),
        }));
    }

    async function guardar(e) {
        e.preventDefault();
        if (guardando || cargandoForm) return;

        const nombre = form.nombre.trim();
        if (!nombre) {
            setErrorForm("El nombre del rol es obligatorio.");
            return;
        }

        setGuardando(true);
        setErrorForm("");

        const datos = {
            nombre,
            descripcion: form.descripcion.trim(),
            activo: form.activo,
            permisos: form.permisos,
        };

        try {
            const guardado = form.idRol === null
                ? await api.crearRol(datos)
                : await api.guardarRol(form.idRol, datos);

            setForm(null);
            setAviso(form.idRol === null
                ? `El rol "${guardado.nombre}" se creó correctamente.`
                : `El rol "${guardado.nombre}" se guardó correctamente.`);
            await cargarRoles();
            onChanged?.();
        } catch (err) {
            const detalle = err instanceof ApiError ? [err.message, ...err.errores].join(" ") : "No se pudo guardar el rol.";
            setErrorForm(detalle);
        } finally {
            setGuardando(false);
        }
    }

    const permisosCompletos = form?.permisos ?? [];

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Roles internos y permisos por módulo. Se muestran todos los roles, activos e inactivos.
                </p>
                <Button variant="primary" onClick={abrirNuevo} disabled={cargando || modulos.length === 0}>
                    + Nuevo rol
                </Button>
            </div>

            {error && <Notice tone="error">{error}</Notice>}
            {aviso && <Notice>{aviso}</Notice>}

            <DataTable
                columns={columnas}
                rows={roles}
                onRowClick={abrirEdicion}
                loading={cargando}
                searchPlaceholder="Buscar rol..."
                initialShowInactive
                hideInactiveToggle
                emptyMessage="No hay roles registrados."
            />

            <Modal
                open={!!form}
                title={form?.idRol === null ? "Nuevo rol" : form?.nombreOriginal}
                subtitle={form?.idRol === null
                    ? "Defina el nombre, el estado y los permisos. Todo se guarda con un solo botón."
                    : "Edite los datos y permisos del rol y guarde todo con un solo botón."}
                icon={ShieldCheck}
                onClose={() => cerrarForm()}
                width="max-w-3xl"
                footer={form && (
                    <>
                        <Button variant="ghost" onClick={() => cerrarForm()} disabled={guardando}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            form="rol-form"
                            disabled={guardando || cargandoForm || (form.idRol !== null && !hayCambios)}
                        >
                            {guardando ? "Guardando..." : "Guardar"}
                        </Button>
                    </>
                )}
            >
                {form && (
                    <form onSubmit={guardar} id="rol-form">
                        {errorForm && <Notice tone="error">{errorForm}</Notice>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <FieldLabel label="Nombre del rol *">
                                <input
                                    className={inputClass}
                                    style={inputStyle}
                                    value={form.nombre}
                                    onChange={(e) => actualizarCampo("nombre", e.target.value)}
                                    maxLength={100}
                                    required
                                    disabled={esRolAdmin || guardando}
                                />
                            </FieldLabel>

                            <FieldLabel label="Descripción">
                                <textarea
                                    className={inputClass}
                                    style={inputStyle}
                                    value={form.descripcion}
                                    onChange={(e) => actualizarCampo("descripcion", e.target.value)}
                                    maxLength={250}
                                    rows={2}
                                    disabled={guardando}
                                />
                            </FieldLabel>
                        </div>

                        <label
                            className="flex items-start gap-3 rounded-xl p-4 mb-6 cursor-pointer"
                            style={{
                                border: `1px solid ${COLORS.border}`,
                                backgroundColor: form.activo ? COLORS.greenTint : "#FAFAFA",
                                opacity: esRolAdmin ? 0.7 : 1,
                            }}
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={form.activo}
                                onChange={(e) => actualizarCampo("activo", e.target.checked)}
                                disabled={esRolAdmin || guardando}
                                style={{ accentColor: COLORS.green }}
                            />
                            <span>
                                <span className="block text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                                    Rol activo
                                </span>
                                <span className="block text-xs mt-0.5" style={{ color: COLORS.muted }}>
                                    {esRolAdmin
                                        ? "El rol Administrador del sistema no se puede desactivar ni renombrar."
                                        : "Un rol inactivo no se puede asignar a nuevas cuentas; las cuentas que ya lo tienen lo conservan."}
                                </span>
                            </span>
                        </label>

                        <h3
                            className="text-xs uppercase tracking-wide mb-3"
                            style={{ color: COLORS.muted, fontWeight: 600 }}
                        >
                            Permisos por módulo
                        </h3>

                        {cargandoForm ? (
                            <p className="text-sm" style={{ color: COLORS.muted }}>Cargando permisos...</p>
                        ) : (
                            <div
                                className="rounded-xl overflow-x-auto"
                                style={{ border: `1px solid ${COLORS.border}` }}
                            >
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ backgroundColor: COLORS.greenTint }}>
                                            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>
                                                Módulo
                                            </th>
                                            {ACCIONES.map((a) => {
                                                const todos = permisosCompletos.length > 0 && permisosCompletos.every((p) => p[a.key]);

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
                                            <th className="text-center px-2 py-3 text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>
                                                Todo
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modulos.map((modulo) => {
                                            const fila = permisosCompletos.find((p) => p.idModulo === modulo.idModulo);
                                            const completo = ACCIONES.every((a) => fila?.[a.key]);

                                            return (
                                                <tr key={modulo.idModulo} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                                    <td className="px-4 py-2.5">
                                                        {modulo.nombre}
                                                        {bloqueada(modulo.idModulo) && (
                                                            <span className="block text-xs" style={{ color: COLORS.muted }}>
                                                                Siempre con acceso total
                                                            </span>
                                                        )}
                                                    </td>
                                                    {ACCIONES.map((a) => (
                                                        <td key={a.key} className="text-center py-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!fila?.[a.key]}
                                                                disabled={bloqueada(modulo.idModulo) || guardando}
                                                                aria-label={`${a.label}: ${modulo.nombre}`}
                                                                onChange={(e) =>
                                                                    actualizarCasilla(modulo.idModulo, a.key, e.target.checked)
                                                                }
                                                                style={{ accentColor: COLORS.green }}
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="text-center py-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={completo}
                                                            disabled={bloqueada(modulo.idModulo) || guardando}
                                                            aria-label={`Todos los permisos: ${modulo.nombre}`}
                                                            onChange={(e) => marcarFila(modulo.idModulo, e.target.checked)}
                                                            style={{ accentColor: COLORS.green }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </form>
                )}
            </Modal>

            <ConfirmModal
                open={confirmarDescartar}
                title="¿Descartar los cambios?"
                message="Hay cambios sin guardar en este rol. Si cierra ahora se perderán."
                confirmLabel="Descartar cambios"
                cancelLabel="Seguir editando"
                tone="danger"
                onConfirm={() => cerrarForm(true)}
                onCancel={() => setConfirmarDescartar(false)}
            />
        </div>
    );
}
