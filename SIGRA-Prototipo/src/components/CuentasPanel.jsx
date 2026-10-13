import { useCallback, useEffect, useState } from "react";
import DataTable from "./DataTable";
import { Plus, RefreshCw, Check, Minus, ShieldCheck } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RecordForm from "./RecordForm";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import RolesPanel from "./RolesPanel";
import { MODULES } from "../data/modules";
import { MODULE_KEY_TO_ID } from "../data/roleCapabilities";
import * as api from "../services/cuentasService";
import { desbloquearCuenta } from "../services/adminService";
import {
    ACCIONES_AUDITORIA,
    ENTIDADES_AUDITORIA,
    camposDetalle,
    etiquetaCampo,
    formatearAccion,
    formatearEntidad,
    formatearValor,
    leerDetalle,
    resumirDetalle,
} from "../utils/auditoria";

const control = "border border-[#E3E3E3] rounded-lg px-3 py-2 text-sm bg-white text-[#323232]";
const button = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const primaryButton = `${button} bg-[#5EB453] text-white hover:bg-[#4CA23D]`;
const secondaryButton = `${button} border border-[#E3E3E3] text-[#6E6E6E] hover:bg-[#FAFAFA]`;
const roleButton = `${button} border border-[#5EB453] bg-[#EAF6E8] text-[#4CA23D] hover:bg-[#DFF0DC]`;
const dangerButton = `${button} border border-[#E3E3E3] text-[#C0392B] hover:bg-[#FCEBEB]`;
const estadoOptions = ["Activo", "Inactivo"];

const esEstadoCivilRetirado = (valor) => String(valor ?? "").trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "union libre";

const fecha = (value) => value
    ? new Date(value).toLocaleString("es-CR", {
        timeZone: "America/Costa_Rica",
    })
    : "Sin registro";

const campos = [
    { key: "nombre", label: "Nombre completo", required: true, maxLength: 150 },
    { key: "correo", label: "Correo corporativo", type: "email", required: true, maxLength: 150 },
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", required: true },
    { key: "telefono", label: "Teléfono", type: "tel", required: true, maxLength: 20 },
    { key: "direccion", label: "Dirección", type: "textarea", required: true, maxLength: 300 },
    {
        key: "estadoCivil", label: "Estado civil", type: "select", required: true,
        options: ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Separado/a"],
    },
    {
        key: "gradoAcademico", label: "Grado académico", type: "select", required: true,
        options: [
            "Sin estudios formales", "Primaria completa", "Secundaria completa",
            "Técnico", "Diplomado", "Bachillerato universitario",
            "Licenciatura", "Maestría", "Doctorado",
        ],
    },
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
    { key: "entidadTexto", label: "Entidad" },
    { key: "cuentaTexto", label: "Cuenta afectada" },
    { key: "accionTexto", label: "Acción" },
    {
        key: "antesTexto", label: "Anterior",
        cellClassName: "whitespace-pre-wrap min-w-[24rem] max-w-[32rem] break-words align-top",
    },
    {
        key: "despuesTexto", label: "Nuevo",
        cellClassName: "whitespace-pre-wrap min-w-[24rem] max-w-[32rem] break-words align-top",
    },
];

function PermisosRol({ rol }) {
    if (!rol) return null;

    const acciones = [
        ["lectura", "Consultar"], ["escritura", "Crear"],
        ["edicion", "Editar"], ["eliminacion", "Eliminar"],
    ];
    const permisos = rol.permisos ?? [];
    const disponibles = permisos.filter((permiso) => acciones.some(([key]) => permiso[key])).length;

    return (
        <section className="my-5 p-4 border border-[#E3E3E3] rounded-xl bg-[#FAFAFA]"
            aria-label="Accesos del rol seleccionado">
            <div className="flex items-start gap-3 mb-4">
                <span className="p-2 rounded-lg bg-[#EAF6E8] text-[#4CA23D] shrink-0">
                    <ShieldCheck size={18} aria-hidden="true" />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-[#323232]">Qué podrá hacer esta cuenta</h3>
                    <p className="text-xs text-[#6E6E6E] mt-1">
                        El rol {rol.nombre} da acceso a {disponibles} {disponibles === 1 ? "sección" : "secciones"}.
                    </p>
                </div>
            </div>
            {permisos.length === 0 ? (
                <p className="text-sm text-[#6E6E6E]">Este rol no tiene permisos asignados.</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[#4CA23D]">
                            <Check size={13} aria-hidden="true" /> Permitido
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[#6E6E6E]">
                            <Minus size={13} aria-hidden="true" /> No permitido
                        </span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
                        {permisos.map((permiso) => {
                            const modulo = MODULES.find((m) => MODULE_KEY_TO_ID[m.id] === permiso.idModulo);
                            const tieneAcceso = acciones.some(([key]) => permiso[key]);
                            return (
                                <li key={permiso.idModulo} className="p-3 border border-[#E3E3E3] rounded-lg bg-white">
                                    <p className="text-sm font-medium text-[#323232] mb-3">
                                        {modulo?.label ?? "Sección no disponible"}
                                    </p>
                                    {tieneAcceso ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {acciones.map(([key, label]) => (
                                                <span key={key}
                                                    aria-label={`${label}: ${permiso[key] ? "permitido" : "no permitido"}`}
                                                    className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${permiso[key] ? "bg-[#EAF6E8] text-[#4CA23D]" : "bg-[#F1F1F1] text-[#6E6E6E]"}`}>
                                                    {permiso[key] ? <Check size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[#6E6E6E]">Sin acceso a esta sección</p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}

function DetalleAuditoria({ detalle }) {
    const datos = leerDetalle(detalle);

    if (!datos || (!datos.antes && !datos.despues)) {
        const texto = typeof datos === "string" ? datos
            : datos && typeof datos === "object" ? resumirDetalle(datos)
                : detalle;
        return <p className="whitespace-pre-wrap break-words text-sm text-[#6E6E6E] bg-[#FAFAFA] border border-[#E3E3E3] rounded-xl p-4">{
            texto && texto !== "Sin registro" ? texto
                : "Este registro no contiene valores anteriores y nuevos."
        }</p>;
    }

    const antes = datos.antes ?? {};
    const despues = datos.despues ?? {};
    const claves = [...new Set([...camposDetalle(antes), ...camposDetalle(despues)])];

    return (
        <div className="space-y-4">
            {datos.motivo && (
                <div className="rounded-lg bg-[#EAF6E8] px-4 py-3">
                    <p className="text-xs text-[#6E6E6E] mb-1">Motivo</p>
                    <p className="text-sm text-[#323232] break-words">{datos.motivo}</p>
                </div>
            )}
            {claves.length === 0 ? <p>No hay cambios de datos para mostrar.</p> : (
                <div className="overflow-auto rounded-xl border border-[#E3E3E3] max-h-[45vh]"
                    tabIndex={0} role="region" aria-label="Detalle de cambios con desplazamiento horizontal">
                    <table className="w-full min-w-[700px] text-sm text-[#323232]">
                        <thead className="sticky top-0 bg-[#EAF6E8]">
                            <tr>
                                {["Campo", "Anterior", "Nuevo"].map((label) => (
                                    <th key={label} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#6E6E6E] font-semibold">{label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {claves.map((key) => {
                                const anterior = formatearValor(key, antes[key]);
                                const nuevo = formatearValor(key, despues[key]);
                                return (
                                    <tr key={key} className="border-t border-[#E3E3E3]">
                                        <td className="px-4 py-3 align-top text-xs text-[#6E6E6E]">{etiquetaCampo(key)}</td>
                                        <td className="px-4 py-3 whitespace-pre-wrap break-words align-top">{anterior}</td>
                                        <td className={`px-4 py-3 whitespace-pre-wrap break-words align-top ${anterior !== nuevo ? "bg-[#EAF6E8] text-[#4CA23D] font-medium" : ""}`}>{nuevo}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
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
        idRol: "", bloqueada: "",
    });

    const [filtrosAuditoria, setFiltrosAuditoria] = useState({
        entidad: "", idUsuarioAfectado: "",
        idAutor: "", desde: "", hasta: "", accion: "",
    });
    const [consultaAuditoria, setConsultaAuditoria] = useState(0);

    const administrador = user.role === "Administrador del sistema";

    const actualizarLista = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        if (!aviso) return;

        const temporizador = window.setTimeout(() => setAviso(""), 3000);
        return () => window.clearTimeout(temporizador);
    }, [aviso]);

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
        return <p>La administración de cuentas está disponible para el administrador.</p>;
    }

    const rolSeleccionado = roles.find((r) => r.idRol === Number(idRol));
    const resumen = [
        { label: "Total de cuentas", value: cuentas.length },
        { label: "Cuentas activas", value: cuentas.filter((cuenta) => cuenta.activo).length },
        { label: "Cuentas bloqueadas", value: cuentas.filter((cuenta) => cuenta.bloqueada).length },
    ];

    const rolField = {
        key: "idRol",
        label: "Rol",
        type: "select",
        required: true,
        options: roles.map((r) => ({ value: r.idRol, label: r.nombre })),
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
    ] : campos.map((campo) => {
        const valorAnterior = seleccionada?.[campo.key];
        if (campo.key === "estadoCivil" && esEstadoCivilRetirado(valorAnterior)) return campo;
        // Conserva los valores de cuentas creadas antes de incorporar los catálogos.
        return campo.type === "select" && valorAnterior && !campo.options.includes(valorAnterior)
            ? { ...campo, options: [...campo.options, valorAnterior] }
            : campo;
    });

    const filas = cuentas.filter((cuenta) =>
        (!filtros.idRol || cuenta.idRol === Number(filtros.idRol))
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

    const filasAuditoria = auditoria.map((registro) => {
        const detalle = leerDetalle(registro.detalle);
        const cuenta = cuentas.find((c) => c.idUsuario === registro.idUsuarioAfectado);
        return {
            ...registro,
            id: registro.idAuditoria,
            fechaTexto: fecha(registro.fecha),
            entidadTexto: formatearEntidad(registro.entidad),
            cuentaTexto: detalle?.despues?.Nombre ?? detalle?.despues?.nombre
                ?? detalle?.antes?.Nombre ?? detalle?.antes?.nombre
                ?? cuenta?.nombre ?? "Sin cuenta asociada",
            accionTexto: formatearAccion(registro.accion),
            antesTexto: resumirDetalle(detalle?.antes),
            despuesTexto: resumirDetalle(detalle?.despues),
        };
    });

    const responsables = [...new Map([
        ...cuentas.map((c) => ({ id: c.idUsuario, nombre: c.nombre })),
        ...auditoria.filter((a) => a.idAutor != null)
            .map((a) => ({ id: a.idAutor, nombre: a.autor })),
    ].map((responsable) => [responsable.id, responsable])).values()]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const entidadesFiltro = [...new Set([
        ...Object.keys(ENTIDADES_AUDITORIA), ...auditoria.map((a) => a.entidad),
    ])].filter(Boolean);
    const accionesFiltro = [...new Set([
        ...Object.keys(ACCIONES_AUDITORIA), ...auditoria.map((a) => a.accion),
    ])].filter(Boolean).sort((a, b) => formatearAccion(a).localeCompare(formatearAccion(b), "es"));

    function abrir(tipo) {
        setError("");
        setAviso("");
        setPendiente(null);
        setModo(tipo);
        setIdRol("");
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
            setConsultaAuditoria((consulta) => consulta + 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="space-y-4 min-w-0">
            <section aria-label="Resumen de cuentas" className="mb-8">
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {resumen.map((indicador) => (
                        <div key={indicador.label} className="rounded-lg p-4 bg-[#EAF6E8]">
                            <dt className="text-xs mb-1 text-[#6E6E6E]">{indicador.label}</dt>
                            <dd className="text-2xl font-semibold text-[#323232]">{indicador.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            <nav className="flex items-center gap-1 mb-6 border-b border-[#E3E3E3]" aria-label="Secciones de usuarios y accesos">
                <button className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === "cuentas" ? "border-[#5EB453] text-[#5EB453] font-semibold" : "border-transparent text-[#6E6E6E] font-normal"}`}
                    aria-pressed={tab === "cuentas"} onClick={() => setTab("cuentas")}>
                    Cuentas
                </button>
                <button className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === "auditoria" ? "border-[#5EB453] text-[#5EB453] font-semibold" : "border-transparent text-[#6E6E6E] font-normal"}`}
                    aria-pressed={tab === "auditoria"} onClick={() => {
                    setTab("auditoria");
                    consultarAuditoria();
                }}>
                    Bitácora
                </button>
                <button className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === "roles" ? "border-[#5EB453] text-[#5EB453] font-semibold" : "border-transparent text-[#6E6E6E] font-normal"}`}
                    aria-pressed={tab === "roles"} onClick={() => {
                        setTab("roles");
                        setAviso("");
                        setError("");
                    }}>
                    Roles y permisos
                </button>
            </nav>

            {aviso && <p role="status" className="text-green-700">{aviso}</p>}
            {error && !modo && <p role="alert" className="text-red-700">{error}</p>}
            {cargando && <p role="status">Cargando...</p>}

            {tab === "cuentas" ? (
                <>
                    <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                        <button className={primaryButton}
                            disabled={cargando || roles.length === 0}
                            onClick={() => {
                                setSeleccionada(null);
                                abrir("crear");
                            }}
                        >
                            <Plus size={16} />
                            Registrar cuenta
                        </button>
                    </div>

                    <DataTable key="cuentas" columns={columnas} rows={filas}
                        onRowClick={setSeleccionada} initialShowInactive initialEstadoFilter="Activo"
                        pagination paginationResetKey={filtros} searchVisibleColumns
                        searchPlaceholder="Buscar cuentas por nombre, cédula o correo..."
                        showInactiveToggle={false} statusOptions={estadoOptions}
                        tableClassName="min-w-[1000px]"
                        toolbarContent={<>
                            <select className={control} aria-label="Filtrar por rol"
                                value={filtros.idRol}
                                onChange={(e) => setFiltros({ ...filtros, idRol: e.target.value })}>
                                <option value="">Todos los roles</option>
                                {rolesFiltro.map((r) => (
                                    <option key={r.idRol} value={r.idRol}>{r.nombre}</option>
                                ))}
                            </select>
                            <select className={control} aria-label="Filtrar por bloqueo"
                                value={filtros.bloqueada}
                                onChange={(e) => setFiltros({ ...filtros, bloqueada: e.target.value })}>
                                <option value="">Todos los bloqueos</option>
                                <option value="true">Bloqueadas</option>
                                <option value="false">Sin bloqueo</option>
                            </select>
                        </>} />
                </>
            ) : tab === "roles" ? (
                <RolesPanel user={user} onRolesChange={actualizarLista} />
            ) : (
                <>
                    <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => {
                        e.preventDefault();
                        consultarAuditoria();
                    }}>
                        {[
                            ["entidad", "Entidad", entidadesFiltro.map((entidad) => ({
                                value: entidad, label: formatearEntidad(entidad),
                            }))],
                            ["idUsuarioAfectado", "Cuenta afectada", cuentas.map((cuenta) => ({
                                value: cuenta.idUsuario, label: `${cuenta.nombre} (${cuenta.correo})`,
                            }))],
                            ["idAutor", "Responsable", responsables.map((responsable) => ({
                                value: responsable.id, label: responsable.nombre,
                            }))],
                            ["accion", "Acción", accionesFiltro.map((accion) => ({
                                value: accion, label: formatearAccion(accion),
                            }))],
                        ].map(([key, label, options]) => (
                            <label key={key} className="text-xs text-[#6E6E6E] space-y-1.5 min-w-0">
                                {label}
                                <select className={`${control} block max-w-full`}
                                    value={filtrosAuditoria[key]}
                                    onChange={(e) => setFiltrosAuditoria({
                                        ...filtrosAuditoria, [key]: e.target.value,
                                    })}
                                >
                                    <option value="">Todos</option>
                                    {options.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>
                        ))}
                        {[
                            ["desde", "Desde", "date"],
                            ["hasta", "Hasta", "date"],
                        ].map(([key, label, type]) => (
                            <label key={key} className="text-xs text-[#6E6E6E] space-y-1.5">
                                {label}
                                <input className={`${control} block`} type={type}
                                    value={filtrosAuditoria[key]}
                                    onChange={(e) => setFiltrosAuditoria({
                                        ...filtrosAuditoria, [key]: e.target.value,
                                    })}
                                />
                            </label>
                        ))}
                        <button className={primaryButton} disabled={cargando}>Consultar</button>
                    </form>

                    <DataTable key="auditoria" columns={columnasAuditoria}
                        rows={filasAuditoria} onRowClick={setRegistroAuditoria}
                        pagination paginationResetKey={consultaAuditoria} searchVisibleColumns
                        searchPlaceholder="Buscar en la bitácora..."
                        tableClassName="min-w-[1400px]" tableContainerClassName="max-h-[60vh]" />
                </>
            )}

            <Modal open={!!seleccionada && !modo}
                title={seleccionada?.nombre}
                subtitle="Detalle de cuenta"
                onClose={() => setSeleccionada(null)}
                width="max-w-2xl"
            >
                {seleccionada && (
                    <>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                                { key: "cedula", label: "Cédula" },
                                ...campos,
                                { key: "rol", label: "Rol" },
                                { key: "estado", label: "Estado" },
                                { key: "bloqueo", label: "Bloqueo" },
                                { key: "ultimoAccesoTexto", label: "Último acceso" },
                            ].map((f) => (
                                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : "min-w-0"}>
                                    <dt className="text-xs mb-1 text-[#6E6E6E]">{f.label}</dt>
                                    <dd className="text-sm text-[#323232] break-words">
                                        {f.key === "estado" ? <StatusBadge value={seleccionada.estado} />
                                            : formatearValor(f.key, seleccionada[f.key])}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex flex-wrap items-center justify-end gap-3 mt-7 pt-5 border-t border-[#E3E3E3]">
                            <button className={`${button} text-[#6E6E6E]`} onClick={() => setSeleccionada(null)}>
                                Cerrar
                            </button>
                            <button className={seleccionada.activo ? dangerButton : roleButton}
                                onClick={() => abrir(
                                    seleccionada.activo ? "inactivar" : "reactivar"
                                )}
                            >
                                {seleccionada.activo ? "Inactivar" : "Reactivar"}
                            </button>
                            <button className={roleButton} disabled={!seleccionada.activo}
                                onClick={() => abrir("rol")}
                            >
                                Cambiar rol
                            </button>
                            {seleccionada.bloqueada && (
                                <button className={roleButton} onClick={() => abrir("desbloquear")}>
                                    Desbloquear
                                </button>
                            )}
                            <button className={primaryButton} onClick={() => abrir("editar")}>
                                Editar datos
                            </button>
                        </div>
                    </>
                )}
            </Modal>

            <Modal open={!!modo}
                title={{
                    crear: "Registrar cuenta",
                    editar: "Editar datos",
                    inactivar: "Inactivar cuenta",
                    reactivar: "Reactivar cuenta",
                    rol: "Cambiar rol",
                    desbloquear: "Desbloquear cuenta",
                }[modo]}
                subtitle={modo === "crear" ? "Completá los datos y seleccioná el rol de la nueva cuenta." : seleccionada?.nombre}
                onClose={() => {
                    if (!guardando) {
                        setModo(null);
                        setPendiente(null);
                    }
                }}
                width="max-w-3xl"
            >
                {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
                {guardando && <p role="status">Guardando...</p>}
                {modo === "editar" && esEstadoCivilRetirado(seleccionada?.estadoCivil) && (
                    <p className="text-sm text-[#6E6E6E] mb-4">
                        El estado civil registrado ya no está disponible. Seleccioná una opción del listado.
                    </p>
                )}

                {(modo === "rol" || modo === "reactivar") ? (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        preparar({});
                    }}>
                        <div className="bg-[#FAFAFA] rounded-lg border border-[#E3E3E3] p-4 mb-5">
                            <p className="text-xs text-[#6E6E6E] mb-1">Rol actual</p>
                            <p className="text-sm text-[#323232]">{seleccionada?.rol}</p>
                        </div>
                        <label className="block text-xs text-[#6E6E6E] space-y-1.5">
                            Nuevo rol <span className="text-[#C0392B]">*</span>
                            <select className={`${control} block w-full`}
                                required value={idRol} disabled={guardando}
                                onChange={(e) => setIdRol(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {roles.map((r) => (
                                    <option key={r.idRol} value={r.idRol}>{r.nombre}</option>
                                ))}
                            </select>
                        </label>

                        <PermisosRol rol={rolSeleccionado} />

                        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-[#E3E3E3]">
                            <button type="button" className={`${button} text-[#6E6E6E]`}
                                disabled={guardando} onClick={() => setModo(null)}>
                                Cancelar
                            </button>
                            <button className={primaryButton}
                                disabled={guardando || !rolSeleccionado}
                            >
                                Continuar
                            </button>
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
                                estadoCivil: esEstadoCivilRetirado(seleccionada?.estadoCivil)
                                    ? "" : seleccionada?.estadoCivil ?? "",
                            }}
                        onSubmit={preparar}
                        onCancel={() => setModo(null)}
                        submitLabel="Continuar"
                        disabled={guardando}
                    />
                )}
            </Modal>

            <ConfirmModal open={!!pendiente}
                title="Confirmar cambio"
                variant={pendiente?.tipo === "inactivar" ? "danger" : "primary"}
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

            <Modal open={!!registroAuditoria}
                title={formatearAccion(registroAuditoria?.accion)}
                subtitle="Detalle de bitácora"
                onClose={() => setRegistroAuditoria(null)}
                width="max-w-3xl"
            >
                {registroAuditoria && (
                    <>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                                ["Responsable", registroAuditoria.autor],
                                ["Fecha", fecha(registroAuditoria.fecha)],
                                ["Entidad", registroAuditoria.entidadTexto],
                                ["Cuenta afectada", registroAuditoria.cuentaTexto],
                            ].map(([label, value]) => (
                                <div key={label} className="min-w-0">
                                    <dt className="text-xs mb-1 text-[#6E6E6E]">{label}</dt>
                                    <dd className="text-sm text-[#323232] break-words">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="mt-6 pt-5 border-t border-[#E3E3E3]">
                            <h3 className="text-sm font-medium text-[#323232] mb-4">Cambios del registro</h3>
                            <DetalleAuditoria detalle={registroAuditoria.detalle} />
                        </div>
                        <div className="flex justify-end mt-7 pt-5 border-t border-[#E3E3E3]">
                            <button className={secondaryButton} onClick={() => setRegistroAuditoria(null)}>
                                Cerrar
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
