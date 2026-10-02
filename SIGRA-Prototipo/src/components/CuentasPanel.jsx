import { useEffect, useState } from "react";
import DataTable from "./DataTable";
import RecordForm from "./RecordForm";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import { MODULES } from "../data/modules";
import { MODULE_KEY_TO_ID } from "../data/roleCapabilities";
import * as api from "../services/cuentasService";

const control = "border rounded-lg px-3 py-2 text-sm";
const button = `${control} disabled:opacity-50`;

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
    { key: "estadoCivil", label: "Estado civil", required: true, maxLength: 50 },
    { key: "gradoAcademico", label: "Grado académico", required: true, maxLength: 100 },
    { key: "salario", label: "Salario", type: "number", min: 0, step: "0.01", required: true },
];

const columnas = [
    { key: "idUsuario", label: "ID" },
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
    { key: "idAuditoria", label: "ID" },
    { key: "fechaTexto", label: "Fecha" },
    { key: "autor", label: "Responsable" },
    { key: "entidad", label: "Entidad" },
    { key: "idEntidad", label: "Registro" },
    { key: "accion", label: "Acción" },
    { key: "antesTexto", label: "Anterior" },
    { key: "despuesTexto", label: "Nuevo" },
];

function leerDetalle(detalle) {
    try {
        return JSON.parse(detalle);
    } catch {
        return null;
    }
}

function resumir(valor) {
    return valor ? JSON.stringify(valor).slice(0, 100) : "Sin registro";
}

function PermisosRol({ rol }) {
    if (!rol) return null;

    const acciones = ["lectura", "escritura", "edicion", "eliminacion"];

    return (
        <div className="my-4">
            <p className="font-medium mb-2">Permisos del rol seleccionado</p>
            {(rol.permisos ?? []).length === 0 && (
                <p>Este rol no tiene permisos asignados.</p>
            )}
            {(rol.permisos ?? []).map((permiso) => {
                const modulo = MODULES.find(
                    (m) => MODULE_KEY_TO_ID[m.id] === permiso.idModulo
                );
                const concedidos = acciones.filter((a) => permiso[a]);

                return (
                    <p key={permiso.idModulo} className="text-sm">
                        {modulo?.label ?? `Módulo ${permiso.idModulo}`}:
                        {" "}{concedidos.join(", ") || "Sin acceso"}
                    </p>
                );
            })}
        </div>
    );
}

function DetalleAuditoria({ detalle }) {
    const datos = leerDetalle(detalle);

    if (!datos || (!datos.antes && !datos.despues)) {
        return <p>{detalle || "Este registro histórico no contiene valores anteriores y nuevos."}</p>;
    }

    const antes = datos.antes ?? {};
    const despues = datos.despues ?? {};
    const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];

    return (
        <div className="overflow-x-auto">
            {datos.motivo && <p className="mb-3">Motivo: {datos.motivo}</p>}
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        <th className="text-left p-2">Campo</th>
                        <th className="text-left p-2">Anterior</th>
                        <th className="text-left p-2">Nuevo</th>
                    </tr>
                </thead>
                <tbody>
                    {claves.map((key) => (
                        <tr key={key} className="border-t">
                            <td className="p-2">{key}</td>
                            <td className="p-2">{String(antes[key] ?? "Sin registro")}</td>
                            <td className="p-2">{String(despues[key] ?? "Sin registro")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
        return <p>La administración de cuentas está disponible para el administrador.</p>;
    }

    const rolSeleccionado = roles.find((r) => r.idRol === Number(idRol));

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
    ] : campos;

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

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <button className={button} onClick={() => setTab("cuentas")}>
                    Cuentas
                </button>
                <button className={button} onClick={() => {
                    setTab("auditoria");
                    consultarAuditoria();
                }}>
                    Bitácora
                </button>
            </div>

            {aviso && <p role="status" className="text-green-700">{aviso}</p>}
            {error && !modo && <p role="alert" className="text-red-700">{error}</p>}
            {cargando && <p role="status">Cargando...</p>}

            {tab === "cuentas" ? (
                <>
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["nombre", "Nombre"],
                            ["cedula", "Cédula"],
                            ["correo", "Correo"],
                        ].map(([key, label]) => (
                            <label key={key} className="text-sm">
                                {label}
                                <input className={`${control} block`}
                                    value={filtros[key]}
                                    onChange={(e) => setFiltros({
                                        ...filtros, [key]: e.target.value,
                                    })}
                                />
                            </label>
                        ))}

                        <label className="text-sm">
                            Rol
                            <select className={`${control} block`}
                                value={filtros.idRol}
                                onChange={(e) => setFiltros({
                                    ...filtros, idRol: e.target.value,
                                })}
                            >
                                <option value="">Todos</option>
                                {rolesFiltro.map((r) => (
                                    <option key={r.idRol} value={r.idRol}>{r.nombre}</option>
                                ))}
                            </select>
                        </label>

                        {[
                            ["activo", "Estado", "Activas", "Inactivas"],
                            ["bloqueada", "Bloqueo", "Bloqueadas", "Sin bloqueo"],
                        ].map(([key, label, yes, no]) => (
                            <label key={key} className="text-sm">
                                {label}
                                <select className={`${control} block`}
                                    value={filtros[key]}
                                    onChange={(e) => setFiltros({
                                        ...filtros, [key]: e.target.value,
                                    })}
                                >
                                    <option value="">Todos</option>
                                    <option value="true">{yes}</option>
                                    <option value="false">{no}</option>
                                </select>
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button className={`${button} bg-green-100`}
                            disabled={cargando || roles.length === 0}
                            onClick={() => {
                                setSeleccionada(null);
                                abrir("crear");
                            }}
                        >
                            Registrar cuenta
                        </button>
                        <button className={button} disabled={cargando}
                            onClick={actualizarLista}
                        >
                            Actualizar lista
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <DataTable columns={columnas} rows={filas}
                            onRowClick={setSeleccionada} initialShowInactive />
                    </div>
                </>
            ) : (
                <>
                    <form className="flex flex-wrap gap-3" onSubmit={(e) => {
                        e.preventDefault();
                        consultarAuditoria();
                    }}>
                        {[
                            ["entidad", "Entidad", "text"],
                            ["idEntidad", "ID del registro", "number"],
                            ["idUsuarioAfectado", "ID usuario afectado", "number"],
                            ["idAutor", "ID responsable", "number"],
                            ["accion", "Acción", "text"],
                            ["desde", "Desde", "date"],
                            ["hasta", "Hasta", "date"],
                        ].map(([key, label, type]) => (
                            <label key={key} className="text-sm">
                                {label}
                                <input className={`${control} block`} type={type}
                                    min={type === "number" ? 1 : undefined}
                                    value={filtrosAuditoria[key]}
                                    onChange={(e) => setFiltrosAuditoria({
                                        ...filtrosAuditoria, [key]: e.target.value,
                                    })}
                                />
                            </label>
                        ))}
                        <button className={button} disabled={cargando}>Consultar</button>
                    </form>

                    <div className="overflow-x-auto">
                        <DataTable columns={columnasAuditoria}
                            rows={auditoria.map((a) => {
                                const detalle = leerDetalle(a.detalle);
                                return {
                                    ...a,
                                    id: a.idAuditoria,
                                    fechaTexto: fecha(a.fecha),
                                    antesTexto: resumir(detalle?.antes),
                                    despuesTexto: resumir(detalle?.despues),
                                };
                            })}
                            onRowClick={setRegistroAuditoria}
                        />
                    </div>
                </>
            )}

            <Modal open={!!seleccionada && !modo}
                title={seleccionada?.nombre}
                onClose={() => setSeleccionada(null)}
                width="max-w-3xl"
            >
                {seleccionada && (
                    <>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                { key: "idUsuario", label: "ID" },
                                { key: "cedula", label: "Cédula" },
                                ...campos,
                                { key: "rol", label: "Rol" },
                                { key: "estado", label: "Estado" },
                                { key: "bloqueo", label: "Bloqueo" },
                                { key: "ultimoAccesoTexto", label: "Último acceso" },
                            ].map((f) => (
                                <div key={f.key}>
                                    <dt className="font-medium">{f.label}</dt>
                                    <dd>{String(seleccionada[f.key] ?? "Sin registro")}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex flex-wrap gap-2 mt-5">
                            <button className={button} onClick={() => abrir("editar")}>
                                Editar datos
                            </button>
                            <button className={button} disabled={!seleccionada.activo}
                                onClick={() => abrir("rol")}
                            >
                                Cambiar rol
                            </button>
                            <button className={button}
                                onClick={() => abrir(
                                    seleccionada.activo ? "inactivar" : "reactivar"
                                )}
                            >
                                {seleccionada.activo ? "Inactivar" : "Reactivar"}
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
                }[modo]}
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

                {(modo === "rol" || modo === "reactivar") ? (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        preparar({});
                    }}>
                        <p className="mb-3">
                            Cuenta: {seleccionada?.nombre}.
                            Rol anterior: {seleccionada?.rol}.
                        </p>
                        <label>
                            Nuevo rol
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

                        <button className={button}
                            disabled={guardando || !rolSeleccionado}
                        >
                            Continuar
                        </button>
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

            <ConfirmModal open={!!pendiente}
                title="Confirmar cambio"
                confirmLabel={guardando ? "Guardando..." : "Confirmar"}
                message={
                    pendiente?.tipo === "rol" || pendiente?.tipo === "reactivar"
                        ? `Se asignará el rol ${rolSeleccionado?.nombre} a ${seleccionada?.nombre}. Se cerrarán sus sesiones anteriores.`
                        : pendiente?.tipo === "inactivar"
                            ? `Se inactivará la cuenta de ${seleccionada?.nombre} y se cerrarán sus sesiones.`
                            : "¿Confirmás que los datos son correctos?"
                }
                onConfirm={guardar}
                onCancel={() => {
                    if (!guardando) setPendiente(null);
                }}
            />

            <Modal open={!!registroAuditoria}
                title="Detalle de auditoría"
                onClose={() => setRegistroAuditoria(null)}
                width="max-w-3xl"
            >
                {registroAuditoria && (
                    <>
                        <p className="mb-3">
                            {registroAuditoria.autor} ·
                            {" "}{fecha(registroAuditoria.fecha)} ·
                            {" "}{registroAuditoria.accion}
                        </p>
                        <DetalleAuditoria detalle={registroAuditoria.detalle} />
                    </>
                )}
            </Modal>
        </div>
    );
}