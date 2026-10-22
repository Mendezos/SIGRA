import { useEffect, useState } from "react";
import {
    Activity, CalendarPlus, Cake, GraduationCap, Heart, IdCard, Lock, Mail, MapPin,
    Phone, RefreshCw, ScrollText, ShieldCheck, UserCog, UserPlus, UserRound, Wallet, X, KeyRound, Clock,
} from "lucide-react";
import DataTable from "./DataTable";
import RecordForm from "./RecordForm";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import {
    Button,
    DetailGrid,
    FieldLabel,
    Notice,
    Pill,
    SubTabs,
} from "./ui";
import { COLORS, inputClass, inputStyle } from "./uiTheme";
import { MODULES } from "../data/modules";
import { MODULE_KEY_TO_ID } from "../data/roleCapabilities";
import * as api from "../services/cuentasService";
import { desbloquearCuenta } from "../services/adminService";
import {
    ACCIONES_AUDITORIA,
    ENTIDADES_AUDITORIA,
    formatearColones,
    formatearFechaCorta,
    formatearFechaHora,
    nombreAccion,
    nombreEntidad,
} from "../utils/format";

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

const ACCIONES_FILTRO = [
    "LOGIN_EXITOSO", "LOGIN_FALLIDO", "LOGIN_BLOQUEADO", "LOGIN_CUENTA_INACTIVA", "LOGOUT",
    "CUENTA_BLOQUEADA", "CUENTA_DESBLOQUEADA", "CUENTA_CREADA", "CUENTA_EDITADA",
    "CUENTA_DESACTIVADA", "CUENTA_REACTIVADA", "ROL_CAMBIADO",
    "PASSWORD_CAMBIADA", "PASSWORD_RESTABLECIDA", "RECUPERACION_SOLICITADA", "PERFIL_ACTUALIZADO",
    "ROL_CREADO", "ROL_EDITADO", "ROL_ACTIVADO", "ROL_DESACTIVADO", "PERMISOS_DEFINIDOS",
    "POLITICA_ACTUALIZADA",
].filter((codigo) => ACCIONES_AUDITORIA[codigo]);

const hoy = () => new Date().toISOString().slice(0, 10);

// Convierte valores antiguos de la BD (texto libre) a una opción de la lista.
function opcionDeLista(valor, opciones) {
    const texto = String(valor ?? "").trim().toLowerCase();
    if (!texto) return "";

    const exacta = opciones.find((o) => o.toLowerCase() === texto);
    if (exacta) return exacta;

    // "Soltero" -> "Soltero/a", "Casado" -> "Casado/a", etc.
    return opciones.find((o) => o.toLowerCase().split("/")[0] === texto) ?? "";
}

const campos = [
    { key: "nombre", label: "Nombre completo", required: true, maxLength: 150 },
    { key: "correo", label: "Correo corporativo", type: "email", required: true, maxLength: 150 },
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", required: true, max: hoy() },
    { key: "telefono", label: "Teléfono", type: "tel", required: true, maxLength: 20 },
    { key: "direccion", label: "Dirección", type: "textarea", required: true, maxLength: 300 },
    { key: "estadoCivil", label: "Estado civil", type: "select", options: ESTADOS_CIVILES, required: true },
    { key: "gradoAcademico", label: "Grado académico", type: "select", options: GRADOS_ACADEMICOS, required: true },
    { key: "salario", label: "Salario (₡)", type: "number", min: 0, step: "0.01", required: true },
];

const columnasAuditoria = [
    { key: "fechaTexto", label: "Fecha y hora", nowrap: true },
    { key: "autor", label: "Responsable", nowrap: true },
    { key: "accionTexto", label: "Acción" },
    { key: "entidadTexto", label: "Tipo", nowrap: true },
    { key: "objetivo", label: "Afectado", nowrap: true },
    { key: "resumenTexto", label: "Detalle" },
];

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

function etiquetaCampo(key) {
    if (ETIQUETAS_CAMPO[key]) return ETIQUETAS_CAMPO[key];

    const texto = key.replace(/([A-Z])/g, " $1").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function valorCampo(key, valor) {
    if (valor === null || valor === undefined || valor === "") return "Sin registro";
    if (key === "activo") return valor ? "Activo" : "Inactivo";
    if (key === "bloqueada") return valor ? "Bloqueada" : "Sin bloqueo";
    if (key === "salario") return formatearColones(valor);
    if (key === "fechaNacimiento") return formatearFechaCorta(valor);
    if (key === "fechaCreacion" || key === "ultimoAcceso") return formatearFechaHora(valor);

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

    return detalle.length > 70 ? `${detalle.slice(0, 70)}…` : detalle;
}

function PermisosRol({ rol }) {
    if (!rol) return null;

    const acciones = ["lectura", "escritura", "edicion", "eliminacion"];
    const nombres = { lectura: "lectura", escritura: "escritura", edicion: "edición", eliminacion: "eliminación" };

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
                const concedidos = acciones.filter((a) => permiso[a]).map((a) => nombres[a]);

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
                    { label: "Fecha y hora", value: formatearFechaHora(registro.fecha) },
                    { label: "Responsable", value: registro.autor },
                    { label: "Tipo de registro", value: nombreEntidad(registro.entidad) },
                    { label: "Afectado", value: registro.objetivo },
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

const PESTANAS_CUENTA = [
    { key: "personal", label: "Datos personales" },
    { key: "acceso", label: "Cuenta y acceso" },
];

function DetalleGeneral({ cuenta, pestana }) {
    if (pestana === "acceso") {
        return (
            <DetailGrid
                items={[
                    { icon: ShieldCheck, label: "Rol", value: cuenta.rol },
                    { icon: Wallet, label: "Salario", value: formatearColones(cuenta.salario, "") },
                    { icon: Activity, label: "Estado", value: cuenta.activo ? "Activo" : "Inactivo" },
                    {
                        icon: Lock,
                        label: "Bloqueo",
                        value: cuenta.bloqueada
                            ? `Bloqueada hasta ${formatearFechaHora(cuenta.bloqueadoHasta)}`
                            : "Sin bloqueo",
                    },
                    { icon: KeyRound, label: "Intentos fallidos de acceso", value: String(cuenta.intentosFallidos ?? 0) },
                    { icon: CalendarPlus, label: "Fecha de creación", value: formatearFechaHora(cuenta.fechaCreacion, "") },
                    { icon: Clock, label: "Último acceso", value: formatearFechaHora(cuenta.ultimoAcceso, ""), wide: true },
                ]}
            />
        );
    }

    return (
        <DetailGrid
            items={[
                { icon: UserRound, label: "Nombre completo", value: cuenta.nombre },
                { icon: IdCard, label: "Cédula", value: cuenta.cedula },
                { icon: Cake, label: "Fecha de nacimiento", value: formatearFechaCorta(cuenta.fechaNacimiento, "") },
                { icon: Heart, label: "Estado civil", value: cuenta.estadoCivil },
                { icon: GraduationCap, label: "Grado académico", value: cuenta.gradoAcademico },
                { icon: Phone, label: "Teléfono", value: cuenta.telefono },
                { icon: Mail, label: "Correo corporativo", value: cuenta.correo },
                { icon: MapPin, label: "Dirección", value: cuenta.direccion },
            ]}
        />
    );
}

function DetalleCuentaModal({ cuenta, open, onClose, abrir }) {
    const [pestana, setPestana] = useState("personal");

    return (
        <Modal
            open={open}
            title={cuenta.nombre}
            subtitle={`${cuenta.rol} · ${cuenta.correo}`}
            icon={UserRound}
            onClose={onClose}
            width="max-w-3xl"
            headerExtra={<Pill tone={cuenta.activo ? "positive" : "negative"}>{cuenta.activo ? "Activo" : "Inactivo"}</Pill>}
            tabs={PESTANAS_CUENTA}
            activeTab={pestana}
            onTabChange={setPestana}
            footer={(
                <>
                    <Button onClick={() => abrir("editar")}>Editar datos</Button>
                    <Button disabled={!cuenta.activo} onClick={() => abrir("rol")}>
                        Cambiar rol
                    </Button>
                    {cuenta.bloqueada && (
                        <Button onClick={() => abrir("desbloquear")}>Desbloquear</Button>
                    )}
                    <Button
                        variant={cuenta.activo ? "danger" : "primary"}
                        onClick={() => abrir(cuenta.activo ? "inactivar" : "reactivar")}
                    >
                        {cuenta.activo ? "Inactivar" : "Reactivar"}
                    </Button>
                </>
            )}
        >
            <DetalleGeneral cuenta={cuenta} pestana={pestana} />
        </Modal>
    );
}

const columnasCuentas = [
    {
        key: "nombre",
        label: "Nombre",
        nowrap: true,
        render: (c) => <span style={{ fontWeight: 600 }}>{c.nombre}</span>,
    },
    { key: "cedula", label: "Cédula", nowrap: true },
    { key: "correo", label: "Correo", nowrap: true },
    { key: "telefono", label: "Teléfono", nowrap: true },
    { key: "rol", label: "Rol", nowrap: true },
    {
        key: "estadoTexto",
        label: "Estado",
        render: (c) => (
            <Pill tone={c.activo ? "positive" : "negative"}>{c.activo ? "Activo" : "Inactivo"}</Pill>
        ),
    },
    {
        key: "bloqueoTexto",
        label: "Bloqueo",
        render: (c) => (
            <span title={c.bloqueada ? `Hasta ${formatearFechaHora(c.bloqueadoHasta)}` : undefined}>
                <Pill tone={c.bloqueada ? "warning" : "neutral"}>
                    {c.bloqueada ? "Bloqueada" : "Sin bloqueo"}
                </Pill>
            </span>
        ),
    },
    { key: "fechaNacimientoTexto", label: "Nacimiento", nowrap: true },
    { key: "estadoCivil", label: "Estado civil", nowrap: true },
    { key: "gradoAcademico", label: "Grado académico", nowrap: true },
    {
        key: "direccion",
        label: "Dirección",
        render: (c) => (
            <span className="block max-w-[16rem] truncate" title={c.direccion ?? undefined}>
                {c.direccion || "—"}
            </span>
        ),
    },
    { key: "salarioTexto", label: "Salario", nowrap: true, align: "right" },
    { key: "fechaCreacionTexto", label: "Creación", nowrap: true },
    { key: "ultimoAccesoTexto", label: "Último acceso", nowrap: true },
];

const FILTROS_INICIALES = { texto: "", idRol: "", activo: "", bloqueada: "" };

const FILTROS_AUDITORIA_INICIALES = {
    accion: "", entidad: "", idAutor: "", idUsuarioAfectado: "", desde: "", hasta: "",
};

export default function CuentasPanel({ user, onChanged }) {
    const [tab, setTab] = useState("cuentas");
    const [roles, setRoles] = useState([]);
    const [seleccionada, setSeleccionada] = useState(null);
    const [registroAuditoria, setRegistroAuditoria] = useState(null);
    const [modo, setModo] = useState(null);
    const [idRol, setIdRol] = useState("");
    const [pendiente, setPendiente] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [version, setVersion] = useState(0);

    // Cuentas (paginadas en el servidor)
    const [filtros, setFiltros] = useState(FILTROS_INICIALES);
    const [textoAplicado, setTextoAplicado] = useState("");
    const [pagina, setPagina] = useState(1);
    const [tamano, setTamano] = useState(10);
    const [datos, setDatos] = useState({ items: [], total: 0 });
    const [cargando, setCargando] = useState(true);
    const [errorLista, setErrorLista] = useState("");

    // Bitácora (paginada en el servidor)
    const [filtrosAuditoria, setFiltrosAuditoria] = useState(FILTROS_AUDITORIA_INICIALES);
    const [paginaAuditoria, setPaginaAuditoria] = useState(1);
    const [tamanoAuditoria, setTamanoAuditoria] = useState(10);
    const [datosAuditoria, setDatosAuditoria] = useState({ items: [], total: 0 });
    const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
    const [errorAuditoria, setErrorAuditoria] = useState("");
    const [opcionesCuentas, setOpcionesCuentas] = useState([]);

    const administrador = user.role === "Administrador del sistema";

    // Catálogo de roles
    useEffect(() => {
        if (!administrador) return;

        let vigente = true;

        api.listarRoles()
            .then((catalogo) => {
                if (vigente) setRoles(catalogo);
            })
            .catch((e) => {
                if (vigente) setErrorLista(e.message);
            });

        return () => {
            vigente = false;
        };
    }, [administrador, version]);

    // La búsqueda por texto espera a que se deje de escribir.
    useEffect(() => {
        const espera = setTimeout(() => {
            setTextoAplicado(filtros.texto.trim());
            setPagina(1);
        }, 350);

        return () => clearTimeout(espera);
    }, [filtros.texto]);

    // Listado de cuentas
    useEffect(() => {
        if (!administrador || tab !== "cuentas") return;

        let vigente = true;

        Promise.resolve()
            .then(() => {
                if (!vigente) return null;
                setCargando(true);
                setErrorLista("");

                return api.listarCuentas({
                    texto: textoAplicado,
                    idRol: filtros.idRol,
                    activo: filtros.activo,
                    bloqueada: filtros.bloqueada,
                    pagina,
                    tamanoPagina: tamano,
                });
            })
            .then((resultado) => {
                if (!vigente || !resultado) return;

                setDatos(resultado);
                if (resultado.pagina !== pagina) setPagina(resultado.pagina);
            })
            .catch((e) => {
                if (vigente) setErrorLista(e.message);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [administrador, tab, textoAplicado, filtros.idRol, filtros.activo, filtros.bloqueada, pagina, tamano, version]);

    // Opciones de personas para filtrar la bitácora por nombre
    useEffect(() => {
        if (!administrador || tab !== "auditoria") return;

        let vigente = true;

        api.listarOpcionesCuentas()
            .then((lista) => {
                if (vigente) setOpcionesCuentas(lista);
            })
            .catch(() => {});

        return () => {
            vigente = false;
        };
    }, [administrador, tab, version]);

    const rangoInvalido = !!filtrosAuditoria.desde
        && !!filtrosAuditoria.hasta
        && filtrosAuditoria.desde > filtrosAuditoria.hasta;

    // Bitácora
    useEffect(() => {
        if (!administrador || tab !== "auditoria" || rangoInvalido) return;

        let vigente = true;

        Promise.resolve()
            .then(() => {
                if (!vigente) return null;
                setCargandoAuditoria(true);
                setErrorAuditoria("");

                return api.listarAuditoria({
                    ...filtrosAuditoria,
                    pagina: paginaAuditoria,
                    tamanoPagina: tamanoAuditoria,
                });
            })
            .then((resultado) => {
                if (!vigente || !resultado) return;

                setDatosAuditoria(resultado);
                if (resultado.pagina !== paginaAuditoria) setPaginaAuditoria(resultado.pagina);
            })
            .catch((e) => {
                if (vigente) setErrorAuditoria(e.message);
            })
            .finally(() => {
                if (vigente) setCargandoAuditoria(false);
            });

        return () => {
            vigente = false;
        };
    }, [administrador, tab, rangoInvalido, filtrosAuditoria, paginaAuditoria, tamanoAuditoria, version]);

    if (!administrador) {
        return <p className="text-sm">La administración de cuentas está disponible para el administrador.</p>;
    }

    const rolesActivos = roles.filter((r) => r.activo);
    const rolSeleccionado = roles.find((r) => r.idRol === Number(idRol));

    const rolField = {
        key: "idRol",
        label: "Rol",
        type: "select",
        required: true,
        options: rolesActivos.map((r) => ({ value: r.idRol, label: r.nombre })),
    };

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
    ] : campos;

    const filas = datos.items.map((cuenta) => ({
        ...cuenta,
        id: cuenta.idUsuario,
        fechaNacimientoTexto: formatearFechaCorta(cuenta.fechaNacimiento, "—"),
        salarioTexto: formatearColones(cuenta.salario, "—"),
        fechaCreacionTexto: formatearFechaHora(cuenta.fechaCreacion, "—"),
        ultimoAccesoTexto: formatearFechaHora(cuenta.ultimoAcceso, "Sin registro"),
    }));

    const filasAuditoria = datosAuditoria.items.map((a) => ({
        ...a,
        id: a.idAuditoria,
        fechaTexto: formatearFechaHora(a.fecha),
        accionTexto: nombreAccion(a.accion),
        entidadTexto: nombreEntidad(a.entidad),
        objetivo: a.objetivo || "—",
        resumenTexto: resumirDetalle(a.detalle),
    }));

    function abrir(tipo) {
        setError("");
        setAviso("");
        setPendiente(null);
        setModo(tipo);
        setIdRol("");
    }

    function cerrarFormulario() {
        if (guardando) return;

        setModo(null);
        setPendiente(null);
        setError("");
    }

    function valoresIniciales() {
        if (modo === "crear") return { estado: "Activo", salario: "0" };

        return {
            ...seleccionada,
            telefono: seleccionada?.telefono ?? "",
            direccion: seleccionada?.direccion ?? "",
            fechaNacimiento: seleccionada?.fechaNacimiento?.slice(0, 10) ?? "",
            estadoCivil: opcionDeLista(seleccionada?.estadoCivil, ESTADOS_CIVILES),
            gradoAcademico: opcionDeLista(seleccionada?.gradoAcademico, GRADOS_ACADEMICOS),
            salario: seleccionada?.salario != null ? String(seleccionada.salario) : "",
        };
    }

    function preparar(values) {
        const datosForm = { ...values };

        if (modo === "crear" || modo === "editar") {
            datosForm.salario = Number(datosForm.salario);

            if (!Number.isFinite(datosForm.salario) || datosForm.salario < 0) {
                setError("El salario debe ser mayor o igual a cero.");
                return;
            }
        }

        if (modo === "crear") {
            datosForm.idRol = Number(datosForm.idRol);
            datosForm.activo = datosForm.estado === "Activo";
            delete datosForm.estado;
        }

        if (modo === "rol" || modo === "reactivar") {
            if (!rolSeleccionado || !rolSeleccionado.activo) {
                setError("Seleccione un rol activo.");
                return;
            }
            datosForm.idRol = rolSeleccionado.idRol;
        }

        if (modo === "rol" && datosForm.idRol === seleccionada.idRol) {
            setError("Seleccione un rol diferente al actual.");
            return;
        }

        setError("");
        setPendiente({ tipo: modo, datos: datosForm });
    }

    async function guardar() {
        if (!pendiente || guardando) return;

        setGuardando(true);
        setError("");

        try {
            const { tipo, datos: cambios } = pendiente;
            const id = seleccionada?.idUsuario;
            let mensaje = "Los cambios se guardaron correctamente.";

            if (tipo === "crear") await api.crearCuenta(cambios);
            else if (tipo === "editar") await api.editarCuenta(id, cambios);
            else if (tipo === "rol") await api.cambiarRol(id, cambios);
            else if (tipo === "desbloquear") {
                const respuesta = await desbloquearCuenta(id, cambios.motivo);
                mensaje = respuesta?.mensaje ?? "Cuenta desbloqueada correctamente.";
            } else {
                await api.cambiarEstado(id, {
                    ...cambios,
                    activo: tipo === "reactivar",
                });
            }

            setPendiente(null);
            setModo(null);
            setSeleccionada(null);
            setAviso(mensaje);
            setVersion((v) => v + 1);
            onChanged?.();
        } catch (e) {
            setError([e.message, ...(e.errores ?? [])].join(" "));
            setPendiente(null);
        } finally {
            setGuardando(false);
        }
    }

    function cambiarFiltro(key, value) {
        setFiltros((f) => ({ ...f, [key]: value }));
        if (key !== "texto") setPagina(1);
    }

    function cambiarFiltroAuditoria(key, value) {
        setFiltrosAuditoria((f) => ({ ...f, [key]: value }));
        setPaginaAuditoria(1);
    }

    const hayFiltros = Object.values(filtros).some(Boolean);
    const hayFiltrosAuditoria = Object.values(filtrosAuditoria).some(Boolean);

    function filtroSelect(key, label, opciones, state, onChange) {
        return (
            <FieldLabel key={key} label={label}>
                <select
                    className={inputClass}
                    style={inputStyle}
                    value={state[key]}
                    onChange={(e) => onChange(key, e.target.value)}
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

    const iconoModo = {
        crear: UserPlus,
        editar: UserCog,
        inactivar: UserCog,
        reactivar: UserCog,
        rol: UserCog,
        desbloquear: Lock,
    }[modo];

    const confirmacion = {
        rol: `Se asignará el rol ${rolSeleccionado?.nombre} a ${seleccionada?.nombre}. Se cerrarán sus sesiones anteriores.`,
        reactivar: `Se reactivará la cuenta de ${seleccionada?.nombre} con el rol ${rolSeleccionado?.nombre}.`,
        inactivar: `Se inactivará la cuenta de ${seleccionada?.nombre} y se cerrarán sus sesiones.`,
        desbloquear: `Se desbloqueará la cuenta de ${seleccionada?.nombre}.`,
    }[pendiente?.tipo] ?? "¿Confirmás que los datos son correctos?";

    return (
        <div>
            <SubTabs
                tabs={[
                    { key: "cuentas", label: "Listado de cuentas" },
                    { key: "auditoria", label: "Bitácora" },
                ]}
                active={tab}
                onSelect={setTab}
            />

            {aviso && <Notice>{aviso}</Notice>}

            {tab === "cuentas" ? (
                <>
                    {errorLista && <Notice tone="error">{errorLista}</Notice>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <FieldLabel label="Buscar">
                            <input
                                type="search"
                                className={inputClass}
                                style={inputStyle}
                                placeholder="Nombre, cédula, correo o teléfono"
                                value={filtros.texto}
                                maxLength={150}
                                onChange={(e) => cambiarFiltro("texto", e.target.value)}
                            />
                        </FieldLabel>
                        {filtroSelect("idRol", "Rol", roles.map((r) => [r.idRol, r.activo ? r.nombre : `${r.nombre} (inactivo)`]), filtros, cambiarFiltro)}
                        {filtroSelect("activo", "Estado", [["true", "Activas"], ["false", "Inactivas"]], filtros, cambiarFiltro)}
                        {filtroSelect("bloqueada", "Bloqueo", [["true", "Bloqueadas"], ["false", "Sin bloqueo"]], filtros, cambiarFiltro)}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                        <Button
                            variant="primary"
                            disabled={rolesActivos.length === 0}
                            onClick={() => {
                                setSeleccionada(null);
                                abrir("crear");
                            }}
                        >
                            + Registrar cuenta
                        </Button>
                        <Button onClick={() => setVersion((v) => v + 1)} disabled={cargando}>
                            <span className="inline-flex items-center gap-2">
                                <RefreshCw size={14} className={cargando ? "animate-spin" : ""} />
                                Actualizar lista
                            </span>
                        </Button>
                        {hayFiltros && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setFiltros(FILTROS_INICIALES);
                                    setTextoAplicado("");
                                    setPagina(1);
                                }}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <X size={14} /> Limpiar filtros
                                </span>
                            </Button>
                        )}
                    </div>

                    <DataTable
                        columns={columnasCuentas}
                        rows={filas}
                        onRowClick={setSeleccionada}
                        loading={cargando}
                        stickyFirstColumn
                        compact
                        serverPagination={{
                            page: pagina,
                            pageSize: tamano,
                            total: datos.total,
                            onPageChange: setPagina,
                            onPageSizeChange: (n) => {
                                setTamano(n);
                                setPagina(1);
                            },
                        }}
                        emptyMessage="No hay cuentas que coincidan con los filtros."
                    />
                </>
            ) : (
                <>
                    {errorAuditoria && <Notice tone="error">{errorAuditoria}</Notice>}
                    {rangoInvalido && (
                        <Notice tone="error">La fecha inicial no puede ser posterior a la final.</Notice>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {filtroSelect("idAutor", "Responsable", opcionesCuentas.map((o) => [o.idUsuario, o.nombre]), filtrosAuditoria, cambiarFiltroAuditoria)}
                        {filtroSelect("idUsuarioAfectado", "Cuenta afectada", opcionesCuentas.map((o) => [o.idUsuario, o.nombre]), filtrosAuditoria, cambiarFiltroAuditoria)}
                        {filtroSelect("accion", "Acción", ACCIONES_FILTRO.map((a) => [a, nombreAccion(a)]), filtrosAuditoria, cambiarFiltroAuditoria)}
                        {filtroSelect("entidad", "Tipo de registro", Object.entries(ENTIDADES_AUDITORIA), filtrosAuditoria, cambiarFiltroAuditoria)}
                        <FieldLabel label="Desde">
                            <input
                                type="date"
                                className={inputClass}
                                style={inputStyle}
                                value={filtrosAuditoria.desde}
                                max={filtrosAuditoria.hasta || undefined}
                                onChange={(e) => cambiarFiltroAuditoria("desde", e.target.value)}
                            />
                        </FieldLabel>
                        <FieldLabel label="Hasta">
                            <input
                                type="date"
                                className={inputClass}
                                style={inputStyle}
                                value={filtrosAuditoria.hasta}
                                min={filtrosAuditoria.desde || undefined}
                                onChange={(e) => cambiarFiltroAuditoria("hasta", e.target.value)}
                            />
                        </FieldLabel>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                        <Button onClick={() => setVersion((v) => v + 1)} disabled={cargandoAuditoria}>
                            <span className="inline-flex items-center gap-2">
                                <RefreshCw size={14} className={cargandoAuditoria ? "animate-spin" : ""} />
                                Actualizar
                            </span>
                        </Button>
                        {hayFiltrosAuditoria && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setFiltrosAuditoria(FILTROS_AUDITORIA_INICIALES);
                                    setPaginaAuditoria(1);
                                }}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <X size={14} /> Limpiar filtros
                                </span>
                            </Button>
                        )}
                    </div>

                    <DataTable
                        columns={columnasAuditoria}
                        rows={filasAuditoria}
                        onRowClick={setRegistroAuditoria}
                        loading={cargandoAuditoria}
                        compact
                        serverPagination={{
                            page: paginaAuditoria,
                            pageSize: tamanoAuditoria,
                            total: datosAuditoria.total,
                            onPageChange: setPaginaAuditoria,
                            onPageSizeChange: (n) => {
                                setTamanoAuditoria(n);
                                setPaginaAuditoria(1);
                            },
                        }}
                        emptyMessage="No hay movimientos que coincidan con los filtros."
                    />
                </>
            )}

            {seleccionada && (
                <DetalleCuentaModal
                    key={seleccionada.idUsuario}
                    cuenta={seleccionada}
                    open={!modo}
                    onClose={() => setSeleccionada(null)}
                    abrir={abrir}
                />
            )}

            <Modal
                open={!!modo}
                title={tituloModo}
                subtitle={modo && modo !== "crear" ? seleccionada?.nombre : undefined}
                icon={iconoModo}
                tone={modo === "inactivar" ? "danger" : "default"}
                onClose={cerrarFormulario}
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
                                    <option key={r.idRol} value={r.idRol} disabled={!r.activo}>
                                        {r.nombre}
                                        {!r.activo ? " (inactivo)" : ""}
                                        {r.idRol === seleccionada?.idRol ? " (actual)" : ""}
                                    </option>
                                ))}
                            </select>
                        </FieldLabel>

                        <PermisosRol rol={rolSeleccionado} />

                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="ghost" onClick={cerrarFormulario}>Cancelar</Button>
                            <Button variant="primary" type="submit" disabled={guardando || !rolSeleccionado}>
                                Continuar
                            </Button>
                        </div>
                    </form>
                ) : modo && (
                    <RecordForm
                        key={`${modo}-${seleccionada?.idUsuario ?? "nueva"}`}
                        fields={camposFormulario}
                        initialValues={valoresIniciales()}
                        onSubmit={preparar}
                        onCancel={cerrarFormulario}
                        submitLabel="Continuar"
                        disabled={guardando}
                    />
                )}
            </Modal>

            <ConfirmModal
                open={!!pendiente}
                title="Confirmar cambio"
                tone={pendiente?.tipo === "inactivar" ? "danger" : "default"}
                confirmLabel={guardando ? "Guardando..." : "Confirmar"}
                busy={guardando}
                message={confirmacion}
                onConfirm={guardar}
                onCancel={() => {
                    if (!guardando) setPendiente(null);
                }}
            />

            <Modal
                open={!!registroAuditoria}
                title="Detalle de la bitácora"
                subtitle={registroAuditoria ? nombreAccion(registroAuditoria.accion) : ""}
                icon={ScrollText}
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
