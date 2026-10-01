import { useEffect, useState } from "react";
import DataTable from "./DataTable";
import Modal from "./Modal";
import * as api from "../services/usuariosService";
import { ApiError } from "../services/apiClient";

const COLORS = {
    green: "#5EB453",
    greenDark: "#4CA23D",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
};

const control = "border rounded-lg px-3 py-2 text-sm w-full";
const button = "px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50";

const columnas = [
    { key: "nombre", label: "Nombre" },
    { key: "rol", label: "Rol" },
    { key: "correo", label: "Correo" },
    { key: "estado", label: "Estado" },
];

const FORM_VACIO = { nombre: "", correo: "", telefono: "", idRol: "", password: "", confirmar: "" };

function estadoDe(usuario) {
    if (!usuario.activo) return "Inactivo";
    return usuario.bloqueada ? "Bloqueado" : "Activo";
}

function ErrorBox({ error }) {
    if (!error) return null;
    return (
        <div className="text-sm mb-3" style={{ color: COLORS.red }}>
            <p>{error.mensaje}</p>
            {error.errores.length > 0 && (
                <ul className="list-disc pl-5 mt-1 text-xs">
                    {error.errores.map((detalle) => (
                        <li key={detalle}>{detalle}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function aError(e, mensajePorDefecto) {
    return e instanceof ApiError
        ? { mensaje: e.message, errores: e.errores }
        : { mensaje: mensajePorDefecto, errores: [] };
}

export default function UsuariosPanel({ user }) {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);

    const [modoCreacion, setModoCreacion] = useState(false);
    const [form, setForm] = useState(FORM_VACIO);

    const [seleccionado, setSeleccionado] = useState(null);
    const [passwordNueva, setPasswordNueva] = useState("");
    const [passwordConfirmar, setPasswordConfirmar] = useState("");

    const esAdministrador = user.role === "Administrador del sistema";
    const puedeGestionar = esAdministrador || user.role === "Gerente";

    async function cargar() {
        setCargando(true);
        setError(null);
        try {
            const [data, rolesData] = await Promise.all([api.listarUsuarios(), api.listarRolesAsignables()]);
            setUsuarios(data.map((u) => ({ ...u, id: u.idUsuario, estado: estadoDe(u) })));
            setRoles(rolesData);
        } catch (e) {
            setError(aError(e, "No se pudieron cargar los usuarios."));
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        if (!puedeGestionar) return;

        let activo = true;

        Promise.resolve().then(() => {
            if (activo) cargar();
        });

        return () => {
            activo = false;
        };
    }, [puedeGestionar]);

    if (!puedeGestionar) {
        return (
            <p className="text-sm" style={{ color: COLORS.muted }}>
                Solo el Administrador del sistema o el Gerente pueden gestionar las cuentas de usuario.
            </p>
        );
    }

    function abrirCreacion() {
        setForm(FORM_VACIO);
        setError(null);
        setAviso("");
        setModoCreacion(true);
    }

    function abrirDetalle(usuario) {
        setSeleccionado(usuario);
        setPasswordNueva("");
        setPasswordConfirmar("");
        setError(null);
        setAviso("");
    }

    function actualizarCampo(campo, valor) {
        setForm((prev) => ({ ...prev, [campo]: valor }));
    }

    async function crearUsuario(e) {
        e.preventDefault();
        setError(null);

        if (form.password !== form.confirmar) {
            setError({ mensaje: "Las contraseñas no coinciden.", errores: [] });
            return;
        }

        setGuardando(true);
        try {
            await api.crearUsuario({ ...form, idRol: Number(form.idRol) });
            setModoCreacion(false);
            setAviso("Usuario creado correctamente.");
            await cargar();
        } catch (e) {
            setError(aError(e, "No se pudo crear el usuario."));
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarPassword(e) {
        e.preventDefault();
        setError(null);
        setAviso("");

        if (passwordNueva !== passwordConfirmar) {
            setError({ mensaje: "Las contraseñas no coinciden.", errores: [] });
            return;
        }

        setGuardando(true);
        try {
            await api.cambiarPasswordUsuario(seleccionado.idUsuario, passwordNueva);
            setPasswordNueva("");
            setPasswordConfirmar("");
            setAviso("Contraseña actualizada. El usuario debe iniciar sesión de nuevo.");
        } catch (e) {
            setError(aError(e, "No se pudo cambiar la contraseña."));
        } finally {
            setGuardando(false);
        }
    }

    const esMiCuenta = seleccionado?.idUsuario === user.idUsuario;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Cuentas de usuario del sistema.
                </p>
                <button
                    type="button"
                    className={button}
                    style={{ backgroundColor: COLORS.green, color: "#FFFFFF" }}
                    onClick={abrirCreacion}
                >
                    + Nuevo usuario
                </button>
            </div>

            {!seleccionado && !modoCreacion && <ErrorBox error={error} />}
            {aviso && !seleccionado && (
                <p className="text-sm mb-3" style={{ color: COLORS.greenDark }}>{aviso}</p>
            )}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando usuarios...</p>
            ) : (
                <DataTable columns={columnas} rows={usuarios} onRowClick={abrirDetalle} searchPlaceholder="Buscar usuario..." />
            )}

            <Modal open={modoCreacion} title="Nuevo usuario" onClose={() => setModoCreacion(false)}>
                <form onSubmit={crearUsuario}>
                    <label className="text-xs" style={{ color: COLORS.muted }}>Nombre completo</label>
                    <input
                        className={control}
                        value={form.nombre}
                        onChange={(e) => actualizarCampo("nombre", e.target.value)}
                        required
                        maxLength={150}
                    />
                    <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Correo corporativo</label>
                    <input
                        type="email"
                        className={control}
                        value={form.correo}
                        onChange={(e) => actualizarCampo("correo", e.target.value)}
                        required
                        maxLength={150}
                    />
                    <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Teléfono (opcional)</label>
                    <input
                        type="tel"
                        className={control}
                        value={form.telefono}
                        onChange={(e) => actualizarCampo("telefono", e.target.value)}
                        maxLength={20}
                    />
                    <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Rol</label>
                    <select
                        className={control}
                        value={form.idRol}
                        onChange={(e) => actualizarCampo("idRol", e.target.value)}
                        required
                    >
                        <option value="">Seleccione un rol</option>
                        {roles.map((rol) => (
                            <option key={rol.idRol} value={rol.idRol}>{rol.nombre}</option>
                        ))}
                    </select>
                    <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Contraseña inicial</label>
                    <input
                        type="password"
                        className={control}
                        value={form.password}
                        onChange={(e) => actualizarCampo("password", e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Confirmar contraseña</label>
                    <input
                        type="password"
                        className={control}
                        value={form.confirmar}
                        onChange={(e) => actualizarCampo("confirmar", e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                        Debe cumplir la política de seguridad: longitud mínima, mayúscula, minúscula, número y carácter especial.
                    </p>
                    <div className="mt-3">
                        <ErrorBox error={error} />
                    </div>
                    <div className="flex justify-end gap-3 mt-5">
                        <button type="button" className={button} onClick={() => setModoCreacion(false)}>Cancelar</button>
                        <button type="submit" className={button} style={{ backgroundColor: COLORS.green, color: "#FFFFFF" }} disabled={guardando}>
                            Crear usuario
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={!!seleccionado}
                title={seleccionado ? seleccionado.nombre : ""}
                subtitle={seleccionado ? `${seleccionado.rol} · ${seleccionado.estado}` : ""}
                onClose={() => setSeleccionado(null)}
            >
                {seleccionado && (
                    <div>
                        <p className="text-sm" style={{ color: COLORS.charcoal }}>{seleccionado.correo}</p>
                        <p className="text-sm mb-5" style={{ color: COLORS.muted }}>
                            Teléfono: {seleccionado.telefono || "—"}
                        </p>

                        {esAdministrador && !esMiCuenta && (
                            <form onSubmit={cambiarPassword}>
                                <p className="font-medium mb-2" style={{ color: COLORS.charcoal }}>Cambiar contraseña</p>
                                <ErrorBox error={error} />
                                {aviso && <p className="text-sm mb-3" style={{ color: COLORS.greenDark }}>{aviso}</p>}
                                <label className="text-xs" style={{ color: COLORS.muted }}>Nueva contraseña</label>
                                <input
                                    type="password"
                                    className={control}
                                    value={passwordNueva}
                                    onChange={(e) => setPasswordNueva(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <label className="text-xs mt-3 block" style={{ color: COLORS.muted }}>Confirmar contraseña</label>
                                <input
                                    type="password"
                                    className={control}
                                    value={passwordConfirmar}
                                    onChange={(e) => setPasswordConfirmar(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <div className="flex justify-end mt-5">
                                    <button type="submit" className={button} style={{ backgroundColor: COLORS.green, color: "#FFFFFF" }} disabled={guardando}>
                                        Guardar contraseña
                                    </button>
                                </div>
                            </form>
                        )}

                        {esAdministrador && esMiCuenta && (
                            <p className="text-sm" style={{ color: COLORS.muted }}>
                                Para cambiar su propia contraseña use la opción "Mi perfil".
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
