import { useEffect, useState } from "react";
import DataTable from "./DataTable";
import RecordForm from "./RecordForm";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import {
    Button,
    DetailGrid,
    FieldLabel,
    Notice,
    SubTabs,
} from "./ui";
import { COLORS, inputClass, inputStyle } from "./uiTheme";
import { MODULES } from "../data/modules";
import { MODULE_KEY_TO_ID } from "../data/roleCapabilities";
import * as api from "../services/cuentasService";
import { desbloquearCuenta } from "../services/adminService";

const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Unión libre", "Divorciado/a", "Viudo/a"];

const GRADOS_ACADEMICOS = [
    "Primaria",
    "Secundaria",
    "Técnico",
    "Diplomado",
    "Bachillerato universitario",
    "Licenciatura",
    "Maestría",
    "Doctorado",
];

const fecha = (value) => value
    ? new Date(value).toLocaleString("es-CR", {
        timeZone: "America/Costa_Rica",
    })
    : "Sin registro";

const fechaCorta = (value) => value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-CR")
    : "";

const colones = (value) => value != null
    ? new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(value)
    : "";

const campos = [
    { key: "nombre", label: "Nombre completo", required: true, maxLength: 150 },
    { key: "correo", label: "Correo corporativo", type: "email", required: true, maxLength: 150 },
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", required: true },
    { key: "telefono", label: "Teléfono", type: "tel", required: true, maxLength: 20 },
    { key: "direccion", label: "Dirección", type: "textarea", required: true, maxLength: 300 },
    { key: "estadoCivil", label: "Estado civil", type: "select", options: ESTADOS_CIVILES, required: true },
    { key: "gradoAcademico", label: "Grado académico", type: "select", options: GRADOS_ACADEMICOS, required: true },
    { key: "salario", label: "Salario", type: "number", min: 0, step: "0.01", required: true },
];

const columnas = [
    { key: "nombre", label: "Nombre" },
    { key: "cedula", label: "Cédula" },
    { key: "correo", label: "Correo" },
    { key: "telefono", label: "Teléfono" },
    { key: "rol", label: "Rol" },
    { key: "estado", label: "Estado" },
    { key: "bloqueo", label: "Bloqueo" },
    { key: "ultimoAccesoTexto", label: "Último acceso" },
];

const columnasAuditoria = [
    { key: "fechaTexto", label: "Fecha" },
    { key: "autor", label: "Responsable" },
    { key: "accionTexto", label: "Acción" },
    { key: "entidad", label: "Entidad" },
    { key: "idEntidad", label: "Registro" },
    { key: "resumenTexto", label: "Detalle" },
];

const ACCIONES_AUDITORIA = {
    LOGIN_EXITOSO: "Inicio de sesión exitoso",
    LOGIN_FALLIDO: "Intento de inicio de sesión fallido",
    LOGIN_BLOQUEADO: "Intento con cuenta bloqueada",
    LOGIN_CUENTA_INACTIVA: "Intento con cuenta inactiva",
    CUENTA_BLOQUEADA: "Cuenta bloqueada",
    CUENTA_DESBLOQUEADA: "Cuenta desbloqueada",
    CUENTA_CREADA: "Cuenta creada",
    CUENTA_EDITADA: "Cuenta editada",
    CUENTA_DESACTIVADA: "Cuenta inactivada",
    CUENTA_REACTIVADA: "Cuenta reactivada",
    CUENTA_ROL_CAMBIADO: "Cambio de rol",
    PASSWORD_CAMBIADA: "Contraseña cambiada",
    PERFIL_ACTUALIZADO: "Perfil actualizado",
    ROL_CREADO: "Rol creado",
    ROL_EDITADO: "Rol editado",
    ROL_ACTIVADO: "Rol activado",
    ROL_DESACTIVADO: "Rol desactivado",
    PERMISOS_DEFINIDOS: "Permisos actualizados",
    CambioRol: "Cambio de rol",
    Creacion: "Cuenta creada",
};

const ETIQUETAS_CAMPO = {
    nombre: "Nombre",
    correo: "Correo",
    cedula: "Cédula",
    fechaNacimiento: "Fecha de nacimiento",
    telefono: "Teléfono",
    direccion: "Dirección",
    estadoCivil: "Estado civil",
    gradoAcademico: "Grado académico",
    salario: "Salario",
    rol: "Rol",
    activo: "Estado",
    bloqueada: "Bloqueo",
    fechaCreacion: "Fecha de creación",
    ultimoAcceso: "Último acceso",
};

const CAMPOS_OCULTOS = ["idUsuario", "idRol"];

function nombreAccion(accion) {
    if (!accion) return "";
    if (ACCIONES_AUDITORIA[accion]) return ACCIONES_AUDITORIA[accion];

    const texto = accion.replace(/_/g, " ").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function etiquetaCampo(key) {
    if (ETIQUETAS_CAMPO[key]) return ETIQUETAS_CAMPO[key];

    const texto = key.replace(/([A-Z])/g, " $1").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function valorCampo(key, valor) {
    if (valor === null || valor === undefined || valor === "") return "Sin registro";
    if (key === "activo") return valor ? "Activo" : "Inactivo";
    if (key === "bloqueada") return valor ? "Bloqueada" : "Sin bloqueo";
    if (key === "salario") return colones(valor);
    if (key === "fechaNacimiento") return fechaCorta(valor);
    if (key === "fechaCreacion" || key === "ultimoAcceso") return fecha(valor);

    return String(valor);
}

function leerDetalle(detalle) {
    try {
        return JSON.parse(detalle);
    } catch {
        return null;
    }
}

function camelCase(objeto) {
    return Object.fromEntries(
        Object.entries(objeto ?? {}).map(([key, valor]) => [
            key.charAt(0).toLowerCase() + key.slice(1),
            valor,
        ])
    );
}

function cambiosDe(detalle) {
    const datos = leerDetalle(detalle);

    if (!datos || typeof datos !== "object" || (!datos.antes && !datos.despues)) return null;

    const antes = camelCase(datos.antes);
    const despues = camelCase(datos.despues);
    const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
        .filter((key) => !CAMPOS_OCULTOS.includes(key));

    const cambios = claves
        .filter((key) => JSON.stringify(antes[key] ?? null) !== JSON.stringify(despues[key] ?? null))
        .map((key) => ({ key, antes: antes[key], despues: despues[key] }));

    return { cambios, motivo: datos.motivo, esCreacion: !datos.antes };
}

function resumirDetalle(detalle) {
    const info = cambiosDe(detalle);

    if (info) {
        if (info.motivo) return `Motivo: ${info.motivo}`;
        if (info.esCreacion) return "Cuenta nueva con todos sus datos";

        return info.cambios.length === 0
            ? "Sin cambios en los datos"
            : `${info.cambios.length} campo(s) modificado(s)`;
    }

    if (!detalle) return "—";

    return detalle.length > 60 ? `${detalle.slice(0, 60)}…` : detalle;
}

function conOpcionActual(campo, valorActual) {
    if (!campo.options || !valorActual || campo.options.includes(valorActual)) {
        return campo;
    }

    return { ...campo, options: [valorActual, ...campo.options] };
}

function PermisosRol({ rol }) {
    if (!rol) return null;

    const acciones = ["lectura", "escritura", "edicion", "eliminacion"];

    return (
        <div
            className="my-5 rounded-xl p-4"
            style={{ backgroundColor: COLORS.greenTint }}
        >
            <p className="text-sm font-semibold mb-2" style={{ color: COLORS.charcoal }}>
                Permisos del rol seleccionado
            </p>
            {(rol.permisos ?? []).length === 0 && (
                <p className="text-sm">Este rol no tiene permisos asignados.</p>
            )}
            {(rol.permisos ?? []).map((permiso) => {
                const modulo = MODULES.find(
                    (m) => MODULE_KEY_TO_ID[m.id] === permiso.idModulo
                );
                const concedidos = acciones.filter((a) => permiso[a]);

                return (
                    <p key={permiso.idModulo} className="text-sm py-0.5">
                        <span style={{ fontWeight: 600 }}>
                            {modulo?.label ?? `Módulo ${permiso.idModulo}`}:
                        </span>
                        {" "}{concedidos.join(", ") || "Sin acceso"}
                    </p>
                );
            })}
        </div>
    );
}

const thClass = "text-left px-4 py-2.5 text-xs uppercase tracking-wide";

function Chip({ tone, children }) {
    const palette = tone === "old"
        ? { backgroundColor: COLORS.redTint, color: COLORS.red }
        : { backgroundColor: COLORS.greenTint, color: COLORS.greenDark };

    return (
        <span className="px-2 py-0.5 rounded-md text-xs" style={palette}>
            {children}
        </span>
    );
}

function DetalleAuditoria({ registro }) {
    const info = cambiosDe(registro.detalle);

    return (
        <>
            <DetailGrid
                items={[
                    { label: "Acción", value: nombreAccion(registro.accion) },
                    { label: "Fecha y hora", value: fecha(registro.fecha) },
                    { label: "Responsable", value: registro.autor },
                    { label: "Entidad", value: registro.entidad },
                    { label: "N.º de registro", value: registro.idEntidad != null ? String(registro.idEntidad) : "" },
                    { label: "Módulo", value: registro.modulo },
                ]}
            />

            {info?.motivo && (
                <div
                    className="rounded-xl p-4 mb-5 text-sm"
                    style={{ backgroundColor: "#FBF3DE", color: "#9C7A17" }}
                >
                    <b>Motivo:</b> {info.motivo}
                </div>
            )}

            <section>
                <h3
                    className="text-xs uppercase tracking-wide mb-3"
                    style={{ color: COLORS.muted, fontWeight: 600 }}
                >
                    {!info ? "Detalle" : info.esCreacion ? "Datos registrados" : "Cambios realizados"}
                </h3>

                {!info && (
                    <p
                        className="text-sm rounded-xl p-4"
                        style={{ backgroundColor: "#F7F7F7", color: COLORS.charcoal }}
                    >
                        {registro.detalle || "Esta acción no tiene información adicional."}
                    </p>
                )}

                {info && info.cambios.length === 0 && (
                    <p className="text-sm" style={{ color: COLORS.muted }}>
                        Esta acción no modificó ningún dato de la cuenta.
                    </p>
                )}

                {info && info.cambios.length > 0 && (
                    <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${COLORS.border}` }}
                    >
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: COLORS.greenTint, color: COLORS.muted }}>
                                    <th className={thClass}>Campo</th>
                                    {!info.esCreacion && <th className={thClass}>Antes</th>}
                                    <th className={thClass}>{info.esCreacion ? "Valor" : "Después"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {info.cambios.map((c) => (
                                    <tr key={c.key} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                        <td className="px-4 py-2.5" style={{ fontWeight: 600 }}>
                                            {etiquetaCampo(c.key)}
                                        </td>
                                        {!info.esCreacion && (
                                            <td className="px-4 py-2.5">
                                                <Chip tone="old">{valorCampo(c.key, c.antes)}</Chip>
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5">
                                            <Chip tone="new">{valorCampo(c.key, c.despues)}</Chip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}

export default function CuentasPanel({ user }) {
    const [tab, setTab] = useState("cuentas");
    const [cuentas, setCuentas] = useState([]);
    const [roles, setRoles] = useState([]);
    const [auditoria, setAuditoria] = useState([]);
    const [seleccionada, setSeleccionada] = useState(null);
    const [registroAuditoria, setRegistroAuditoria] = useState(null);
    const [modo, setModo] = useState(null);
    const [idRol, setIdRol] = useState("");
    const [pendiente, setPendiente] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");

    const [filtros, setFiltros] = useState({
        nombre: "", cedula: "", correo: "",
        idRol: "", activo: "", bloqueada: "",
    });

    const [filtrosAuditoria, setFiltrosAuditoria] = useState({
        entidad: "", idEntidad: "", idUsuarioAfectado: "",
        idAutor: "", desde: "", hasta: "", accion: "",
    });

    const administrador = user.role === "Administrador del sistema";

    useEffect(() => {
        if (!administrador) return;

        let vigente = true;

        Promise.all([api.listarCuentas(), api.listarRoles()])
            .then(([lista, catalogo]) => {
                if (vigente) {
                    setCuentas(lista);
                    setRoles(catalogo);
                }
            })
            .catch((e) => {
                if (vigente) {
                    setError(e.message);
                }
            })
            .finally(() => {
                if (vigente) {
                    setCargando(false);
                }
            });

        return () => {
            vigente = false;
        };
    }, [administrador]);

    if (!administrador) {
        return <p className="text-sm">La administración de cuentas está disponible para el administrador.</p>;
    }

    const rolSeleccionado = roles.find((r) => r.idRol === Number(idRol));

    const rolField = {
        key: "idRol",
        label: "Rol",
        type: "select",
        required: true,
        options: roles.map((r) => ({ value: r.idRol, label: r.nombre })),
    };

    const camposEdicion = campos.map((campo) =>
        conOpcionActual(campo, seleccionada?.[campo.key])
    );

    const camposFormulario = modo === "crear" ? [
        { key: "cedula", label: "Cédula", required: true, maxLength: 20 },
        ...campos,
        rolField,
        {
            key: "estado", label: "Estado inicial", type: "select",
            required: true, options: ["Activo", "Inactivo"],
        },
        {
            key: "password", label: "Contraseña inicial",
            type: "password", required: true,
        },
    ] : modo === "inactivar" ? [
        {
            key: "motivo", label: "Motivo de inactivación",
            type: "textarea", required: true, maxLength: 500,
        },
    ] : modo === "desbloquear" ? [
        {
            key: "motivo", label: "Motivo del desbloqueo",
            type: "textarea", required: true, maxLength: 500,
        },
    ] : camposEdicion;

    const filas = cuentas.filter((cuenta) =>
        ["nombre", "cedula", "correo"].every((key) =>
            String(cuenta[key] ?? "").toLowerCase()
                .includes(filtros[key].trim().toLowerCase())
        )
        && (!filtros.idRol || cuenta.idRol === Number(filtros.idRol))
        && (!filtros.activo || cuenta.activo === (filtros.activo === "true"))
        && (!filtros.bloqueada || cuenta.bloqueada === (filtros.bloqueada === "true"))
    ).map((cuenta) => ({
        ...cuenta,
        id: cuenta.idUsuario,
        estado: cuenta.activo ? "Activo" : "Inactivo",
        bloqueo: cuenta.bloqueada ? "Bloqueada" : "Sin bloqueo",
        ultimoAccesoTexto: fecha(cuenta.ultimoAcceso),
    }));

    const rolesFiltro = [...new Map([
        ...cuentas.map((c) => ({ idRol: c.idRol, nombre: c.rol })),
        ...roles,
    ].map((r) => [r.idRol, r])).values()];

    function abrir(tipo) {
        setError("");
        setAviso("");
        setPendiente(null);
        setModo(tipo);
        setIdRol("");
    }

    async function actualizarLista() {
        setCargando(true);
        setError("");

        try {
            const [lista, catalogo] = await Promise.all([
                api.listarCuentas(), api.listarRoles(),
            ]);
            setCuentas(lista);
            setRoles(catalogo);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }

    function preparar(values) {
        const datos = { ...values };

        if (modo === "crear" || modo === "editar") {
            datos.salario = Number(datos.salario);

            if (!Number.isFinite(datos.salario) || datos.salario < 0) {
                setError("El salario debe ser mayor o igual a cero.");
                return;
            }
        }

        if (modo === "crear") {
            datos.idRol = Number(datos.idRol);
            datos.activo = datos.estado === "Activo";
            delete datos.estado;
        }

        if (modo === "rol" || modo === "reactivar") {
            if (!rolSeleccionado) {
                setError("Seleccioná un rol activo.");
                return;
            }
            datos.idRol = rolSeleccionado.idRol;
        }

        if (modo === "rol" && datos.idRol === seleccionada.idRol) {
            setError("Seleccioná un rol diferente al actual.");
            return;
        }

        setPendiente({ tipo: modo, datos });
    }

    async function guardar() {
        if (!pendiente || guardando) return;

        setGuardando(true);
        setError("");

        try {
            const { tipo, datos } = pendiente;
            const id = seleccionada?.idUsuario;

            if (tipo === "crear") await api.crearCuenta(datos);
            else if (tipo === "editar") await api.editarCuenta(id, datos);
            else if (tipo === "rol") await api.cambiarRol(id, datos);
            else if (tipo === "desbloquear") await desbloquearCuenta(id, datos.motivo);
            else {
                await api.cambiarEstado(id, {
                    ...datos,
                    activo: tipo === "reactivar",
                });
            }

            setPendiente(null);
            setModo(null);
            setSeleccionada(null);
            setAviso("Los cambios se guardaron correctamente.");

            try {
                const [lista, catalogo] = await Promise.all([
                    api.listarCuentas(), api.listarRoles(),
                ]);
                setCuentas(lista);
                setRoles(catalogo);
            } catch {
                setError("El cambio se guardó, pero el listado no se pudo actualizar.");
            }
        } catch (e) {
            setError([e.message, ...(e.errores ?? [])].join(" "));
            setPendiente(null);
        } finally {
            setGuardando(false);
        }
    }

    async function consultarAuditoria() {
        setCargando(true);
        setError("");
        setRegistroAuditoria(null);

        try {
            setAuditoria(await api.listarAuditoria(filtrosAuditoria));
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }

    function filtroTexto(key, label, type = "text", state = filtros, setState = setFiltros) {
        return (
            <FieldLabel key={key} label={label}>
                <input
                    type={type}
                    min={type === "number" ? 1 : undefined}
                    className={inputClass}
                    style={inputStyle}
                    value={state[key]}
                    onChange={(e) => setState({ ...state, [key]: e.target.value })}
                />
            </FieldLabel>
        );
    }

    function filtroSelect(key, label, opciones) {
        return (
            <FieldLabel key={key} label={label}>
                <select
                    className={inputClass}
                    style={inputStyle}
                    value={filtros[key]}
                    onChange={(e) => setFiltros({ ...filtros, [key]: e.target.value })}
                >
                    <option value="">Todos</option>
                    {opciones.map(([value, text]) => (
                        <option key={value} value={value}>{text}</option>
                    ))}
                </select>
            </FieldLabel>
        );
    }

    const tituloModo = {
        crear: "Registrar cuenta",
        editar: "Editar datos",
        inactivar: "Inactivar cuenta",
        reactivar: "Reactivar cuenta",
        rol: "Cambiar rol",
        desbloquear: "Desbloquear cuenta",
    }[modo];

    return (
        <div>
            <SubTabs
                tabs={[
                    { key: "cuentas", label: "Listado de cuentas" },
                    { key: "auditoria", label: "Bitácora" },
                ]}
                active={tab}
                onSelect={(key) => {
                    setTab(key);
                    if (key === "auditoria") consultarAuditoria();
                }}
            />

            {aviso && <Notice>{aviso}</Notice>}
            {error && !modo && <Notice tone="error">{error}</Notice>}
            {cargando && (
                <p role="status" className="text-sm mb-3" style={{ color: COLORS.muted }}>
                    Cargando...
                </p>
            )}

            {tab === "cuentas" ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {filtroTexto("nombre", "Nombre")}
                        {filtroTexto("cedula", "Cédula")}
                        {filtroTexto("correo", "Correo")}
                        {filtroSelect(
                            "idRol", "Rol",
                            rolesFiltro.map((r) => [r.idRol, r.nombre])
                        )}
                        {filtroSelect("activo", "Estado", [["true", "Activas"], ["false", "Inactivas"]])}
                        {filtroSelect("bloqueada", "Bloqueo", [["true", "Bloqueadas"], ["false", "Sin bloqueo"]])}
                    </div>

                    <div className="flex gap-2 mb-5">
                        <Button
                            variant="primary"
                            disabled={cargando || roles.length === 0}
                            onClick={() => {
                                setSeleccionada(null);
                                abrir("crear");
                            }}
                        >
                            + Registrar cuenta
                        </Button>
                        <Button disabled={cargando} onClick={actualizarLista}>
                            Actualizar lista
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <DataTable
                            columns={columnas}
                            rows={filas}
                            onRowClick={setSeleccionada}
                            initialShowInactive
                            hideInactiveToggle
                        />
                    </div>
                </>
            ) : (
                <>
                    <form
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            consultarAuditoria();
                        }}
                    >
                        {[
                            ["entidad", "Entidad", "text"],
                            ["idEntidad", "N.º de registro", "number"],
                            ["idUsuarioAfectado", "N.º usuario afectado", "number"],
                            ["idAutor", "N.º responsable", "number"],
                            ["accion", "Acción", "text"],
                            ["desde", "Desde", "date"],
                            ["hasta", "Hasta", "date"],
                        ].map(([key, label, type]) =>
                            filtroTexto(key, label, type, filtrosAuditoria, setFiltrosAuditoria)
                        )}
                        <div className="flex items-end">
                            <Button variant="primary" type="submit" disabled={cargando}>
                                Consultar
                            </Button>
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <DataTable
                            columns={columnasAuditoria}
                            rows={auditoria.map((a) => ({
                                ...a,
                                id: a.idAuditoria,
                                fechaTexto: fecha(a.fecha),
                                accionTexto: nombreAccion(a.accion),
                                resumenTexto: resumirDetalle(a.detalle),
                            }))}
                            onRowClick={setRegistroAuditoria}
                        />
                    </div>
                </>
            )}

            <Modal
                open={!!seleccionada && !modo}
                title={seleccionada?.nombre}
                subtitle={seleccionada ? `${seleccionada.rol} · ${seleccionada.correo}` : ""}
                onClose={() => setSeleccionada(null)}
                width="max-w-3xl"
                footer={seleccionada && (
                    <>
                        <Button onClick={() => abrir("editar")}>Editar datos</Button>
                        <Button disabled={!seleccionada.activo} onClick={() => abrir("rol")}>
                            Cambiar rol
                        </Button>
                        {seleccionada.bloqueada && (
                            <Button onClick={() => abrir("desbloquear")}>Desbloquear</Button>
                        )}
                        <Button
                            variant={seleccionada.activo ? "danger" : "primary"}
                            onClick={() => abrir(seleccionada.activo ? "inactivar" : "reactivar")}
                        >
                            {seleccionada.activo ? "Inactivar" : "Reactivar"}
                        </Button>
                    </>
                )}
            >
                {seleccionada && (
                    <>
                        <DetalleGeneral cuenta={seleccionada} />
                    </>
                )}
            </Modal>

            <Modal
                open={!!modo}
                title={tituloModo}
                subtitle={modo && modo !== "crear" ? seleccionada?.nombre : undefined}
                onClose={() => {
                    if (!guardando) {
                        setModo(null);
                        setPendiente(null);
                    }
                }}
                width="max-w-3xl"
            >
                {error && <Notice tone="error">{error}</Notice>}
                {guardando && (
                    <p role="status" className="text-sm mb-3" style={{ color: COLORS.muted }}>
                        Guardando...
                    </p>
                )}

                {(modo === "rol" || modo === "reactivar") ? (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        preparar({});
                    }}>
                        <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
                            Rol anterior: <b style={{ color: COLORS.charcoal }}>{seleccionada?.rol}</b>
                        </p>
                        <FieldLabel label="Nuevo rol">
                            <select
                                className={inputClass}
                                style={inputStyle}
                                required value={idRol} disabled={guardando}
                                onChange={(e) => setIdRol(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {roles.map((r) => (
                                    <option key={r.idRol} value={r.idRol}>{r.nombre}</option>
                                ))}
                            </select>
                        </FieldLabel>

                        <PermisosRol rol={rolSeleccionado} />

                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="ghost" onClick={() => setModo(null)}>Cancelar</Button>
                            <Button variant="primary" type="submit" disabled={guardando || !rolSeleccionado}>
                                Continuar
                            </Button>
                        </div>
                    </form>
                ) : modo && (
                    <RecordForm
                        key={`${modo}-${seleccionada?.idUsuario ?? "nueva"}`}
                        fields={camposFormulario}
                        initialValues={modo === "crear"
                            ? { estado: "Activo", salario: "0" }
                            : {
                                ...seleccionada,
                                fechaNacimiento:
                                    seleccionada?.fechaNacimiento?.slice(0, 10) ?? "",
                            }}
                        onSubmit={preparar}
                        onCancel={() => setModo(null)}
                        submitLabel="Continuar"
                        disabled={guardando}
                    />
                )}
            </Modal>

            <ConfirmModal
                open={!!pendiente}
                title="Confirmar cambio"
                confirmLabel={guardando ? "Guardando..." : "Confirmar"}
                message={
                    pendiente?.tipo === "rol" || pendiente?.tipo === "reactivar"
                        ? `Se asignará el rol ${rolSeleccionado?.nombre} a ${seleccionada?.nombre}. Se cerrarán sus sesiones anteriores.`
                        : pendiente?.tipo === "inactivar"
                            ? `Se inactivará la cuenta de ${seleccionada?.nombre} y se cerrarán sus sesiones.`
                            : pendiente?.tipo === "desbloquear"
                                ? `Se desbloqueará la cuenta de ${seleccionada?.nombre}.`
                                : "¿Confirmás que los datos son correctos?"
                }
                onConfirm={guardar}
                onCancel={() => {
                    if (!guardando) setPendiente(null);
                }}
            />

            <Modal
                open={!!registroAuditoria}
                title="Detalle de auditoría"
                subtitle={registroAuditoria ? nombreAccion(registroAuditoria.accion) : ""}
                onClose={() => setRegistroAuditoria(null)}
                width="max-w-3xl"
            >
                {registroAuditoria && (
                    <DetalleAuditoria registro={registroAuditoria} />
                )}
            </Modal>
        </div>
    );
}

function DetalleGeneral({ cuenta }) {
    return (
        <>
            <DetailGrid
                title="Datos personales"
                items={[
                    { label: "Nombre completo", value: cuenta.nombre },
                    { label: "Cédula", value: cuenta.cedula },
                    { label: "Fecha de nacimiento", value: fechaCorta(cuenta.fechaNacimiento) },
                    { label: "Estado civil", value: cuenta.estadoCivil },
                    { label: "Grado académico", value: cuenta.gradoAcademico },
                    { label: "Teléfono", value: cuenta.telefono },
                    { label: "Correo corporativo", value: cuenta.correo },
                    { label: "Dirección", value: cuenta.direccion, wide: true },
                ]}
            />
            <DetailGrid
                title="Cuenta y acceso"
                items={[
                    { label: "Rol", value: cuenta.rol },
                    { label: "Salario", value: colones(cuenta.salario) },
                    { label: "Estado", value: cuenta.activo ? "Activo" : "Inactivo" },
                    { label: "Bloqueo", value: cuenta.bloqueada ? "Bloqueada" : "Sin bloqueo" },
                    { label: "Fecha de creación", value: cuenta.fechaCreacion ? fecha(cuenta.fechaCreacion) : "" },
                    { label: "Último acceso", value: cuenta.ultimoAcceso ? fecha(cuenta.ultimoAcceso) : "" },
                ]}
            />
        </>
    );
}
