import { useEffect, useState } from "react";
import {
    AlertCircle,
    Eye,
    FilePlus2,
    Pencil,
    LoaderCircle,
    Plus,
    Trash2,
} from "lucide-react";
import StatusBadge from "../StatusBadge";
import ConfirmModal from "../ConfirmModal";
import Modal from "../Modal";
import {
    listarCotizaciones,
    registrarCotizacion,
    cambiarEstadoCotizacion,
    desactivarCotizacion,
} from "../../services/cotizacionesService";
import { listarProspectos } from "../../services/crmProspectosService";
import { listarModelos } from "../../services/inventarioService";
import {
    CotizacionDetalleModal,
    CotizacionEdicionModal,
} from "./CotizacionModal";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
    redTint: "#FCEBEB",
};

function nuevaLinea() {
    return {
        idProducto: "",
        descripcion: "",
        cantidad: 1,
        precioUnitario: 0,
    };
}

function formatoMoneda(valor) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2,
    }).format(valor);
}

function fechaHoy() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

export default function CotizacionesPanel() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [prospectos, setProspectos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [idProspecto, setIdProspecto] = useState("");
    const [fecha, setFecha] = useState(fechaHoy);
    const [lineas, setLineas] = useState([nuevaLinea()]);
    const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
    const [modoModal, setModoModal] = useState(null);
    const [operandoEstado, setOperandoEstado] = useState(false);
    const [confirmacion, setConfirmacion] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [registrarAbierto, setRegistrarAbierto] = useState(false);

    const total = lineas.reduce(
        (suma, linea) =>
            suma +
            Number(linea.cantidad || 0) *
                Number(linea.precioUnitario || 0),
        0
    );

    const cotizacionesVisibles = cotizaciones.filter((cotizacion) => {
        const texto = busqueda.trim().toLowerCase();
        const prospecto = prospectos.find((p) => p.id === cotizacion.idProspecto)?.nombre ?? `Prospecto #${cotizacion.idProspecto}`;
        return !texto || [cotizacion.idCotizacion, prospecto, cotizacion.fecha, cotizacion.estado]
            .some((valor) => String(valor ?? "").toLowerCase().includes(texto));
    });

    useEffect(() => {
        let vigente = true;

        Promise.all([listarCotizaciones(), listarProspectos(), listarModelos()])
            .then(([datos, prospectosReales, modelos]) => {
                if (!vigente) return;
                setCotizaciones(datos);
                setProspectos(prospectosReales.map((prospecto) => ({
                    id: prospecto.idProspecto,
                    nombre: prospecto.empresa,
                })));
                setProductos(modelos.map((modelo) => ({
                    idProducto: modelo.idModelo,
                    descripcion: `${modelo.marca} ${modelo.modelo}`,
                    precioUnitario: 0,
                })));
                setError("");
            })
            .catch((excepcion) => {
                if (vigente) setError(excepcion.message);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, []);

    function actualizarLinea(indice, campo, valor) {
        setLineas((actuales) =>
            actuales.map((linea, posicion) => {
                if (posicion !== indice) return linea;

                if (campo === "idProducto") {
                    const producto = productos.find(
                        (item) => item.idProducto === Number(valor)
                    );
                    return {
                        ...linea,
                        idProducto: valor,
                        descripcion: producto?.descripcion ?? "",
                        precioUnitario: producto?.precioUnitario ?? 0,
                    };
                }

                return { ...linea, [campo]: valor };
            })
        );
    }

    function agregarLinea() {
        setLineas((actuales) => [...actuales, nuevaLinea()]);
    }

    function abrirDetalle(cotizacion) {
        setCotizacionSeleccionada(cotizacion);
        setModoModal("detalle");
    }

    function abrirEdicion(cotizacion) {
        setCotizacionSeleccionada(cotizacion);
        setModoModal("edicion");
    }

    function cerrarModal() {
        setCotizacionSeleccionada(null);
        setModoModal(null);
    }

    function actualizarCotizacionEnLista(actualizada) {
        setCotizaciones((actuales) =>
            actuales.map((cotizacion) =>
                cotizacion.idCotizacion === actualizada.idCotizacion
                    ? actualizada
                    : cotizacion
            )
        );
        cerrarModal();
        setMensaje(`Cotización #${actualizada.idCotizacion} actualizada correctamente.`);
    }

    async function cambiarEstado(estado) {
        if (!cotizacionSeleccionada) return;
        setConfirmacion({
            tipo: "estado",
            estado,
            cotizacion: cotizacionSeleccionada,
        });
    }

    async function desactivar() {
        if (!cotizacionSeleccionada) return;
        setConfirmacion({
            tipo: "desactivar",
            cotizacion: cotizacionSeleccionada,
        });
    }

    async function confirmarAccion() {
        if (!confirmacion?.cotizacion) return;
        setOperandoEstado(true);
        setError("");
        try {
            const actualizada = confirmacion.tipo === "estado"
                ? await cambiarEstadoCotizacion(
                    confirmacion.cotizacion.idCotizacion,
                    confirmacion.estado
                )
                : await desactivarCotizacion(confirmacion.cotizacion.idCotizacion);
            setCotizacionSeleccionada(actualizada);
            setCotizaciones((actuales) =>
                actuales.map((cotizacion) =>
                    cotizacion.idCotizacion === actualizada.idCotizacion
                        ? actualizada
                        : cotizacion
                )
            );
            setMensaje(
                confirmacion.tipo === "estado"
                    ? `Cotización COT-${actualizada.idCotizacion}: estado ${actualizada.estado}.`
                    : `Cotización COT-${actualizada.idCotizacion} desactivada.`
            );
            setConfirmacion(null);
        } catch (excepcion) {
            setError(excepcion.message);
        } finally {
            setOperandoEstado(false);
        }
    }

    function quitarLinea(indice) {
        setLineas((actuales) =>
            actuales.length === 1
                ? actuales
                : actuales.filter((_, posicion) => posicion !== indice)
        );
    }

    async function guardar(evento) {
        evento.preventDefault();
        setMensaje("");
        setError("");

        if (!idProspecto) {
            setError("Seleccioná un prospecto.");
            return;
        }

        if (
            lineas.some(
                (linea) =>
                    !linea.idProducto ||
                    Number(linea.cantidad) <= 0 ||
                    Number(linea.precioUnitario) < 0
            )
        ) {
            setError("Revisá el producto, la cantidad y el precio de cada línea.");
            return;
        }

        setGuardando(true);
        try {
            const creada = await registrarCotizacion({
                idProspecto: Number(idProspecto),
                fecha,
                lineas: lineas.map((linea) => ({
                    ...linea,
                    idProducto: Number(linea.idProducto),
                    cantidad: Number(linea.cantidad),
                    precioUnitario: Number(linea.precioUnitario),
                })),
            });
            setCotizaciones((actuales) => [creada, ...actuales]);
            setIdProspecto("");
            setFecha(fechaHoy());
            setLineas([nuevaLinea()]);
            setMensaje(`Cotización #${creada.idCotizacion} registrada como borrador.`);
            setRegistrarAbierto(false);
        } catch (excepcion) {
            setError(
                excepcion.errores?.length
                    ? `${excepcion.message} ${excepcion.errores.join(" ")}`
                    : excepcion.message
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold" style={{ color: COLORS.charcoal }}>Cotizaciones registradas</h2>
                    <p className="text-sm" style={{ color: COLORS.muted }}>Registrá y administrá las cotizaciones de tus prospectos.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setRegistrarAbierto(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap"
                    style={{ backgroundColor: COLORS.green }}
                >
                    <Plus size={16} /> Registrar cotización
                </button>
            </div>
            {registrarAbierto && <Modal
                open
                onClose={() => setRegistrarAbierto(false)}
                title="Registrar cotización"
                subtitle="Creá un borrador con los productos y servicios solicitados."
                icon={FilePlus2}
                width="max-w-4xl"
            >
            <section
                className="rounded-2xl p-5"
                style={{
                    background: `linear-gradient(135deg, ${COLORS.greenTint} 0%, #FFFFFF 68%)`,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: "0 12px 30px rgba(50,80,50,0.06)",
                }}
            >
                <div className="flex justify-end mb-5">
                    <span
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: "white", color: COLORS.green }}
                    >
                        Paso 1 · Borrador
                    </span>
                </div>

                {(error || mensaje) && (
                    <div
                        role={error ? "alert" : "status"}
                        className="mb-4 rounded-lg px-3 py-2 text-sm"
                        style={{
                            backgroundColor: error ? COLORS.redTint : "white",
                            color: error ? COLORS.red : COLORS.charcoal,
                        }}
                    >
                        {error || mensaje}
                    </div>
                )}

                <form onSubmit={guardar} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                            Prospecto
                            <select
                                value={idProspecto}
                                onChange={(evento) => setIdProspecto(evento.target.value)}
                                className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white"
                                style={{ border: `1px solid ${COLORS.border}` }}
                            >
                                <option value="">Seleccioná un prospecto</option>
                                {prospectos.map((prospecto) => (
                                    <option key={prospecto.id} value={prospecto.id}>
                                        {prospecto.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                            Fecha
                            <input
                                type="date"
                                min={fechaHoy()}
                                value={fecha}
                                onChange={(evento) => setFecha(evento.target.value)}
                                className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white"
                                style={{ border: `1px solid ${COLORS.border}` }}
                            />
                        </label>
                    </div>

                    <div className="overflow-x-auto rounded-xl bg-white" style={{ border: `1px solid ${COLORS.border}` }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>
                                    <th className="text-left px-3 py-3 font-medium">Producto o servicio</th>
                                    <th className="text-left px-3 py-3 font-medium">Cantidad</th>
                                    <th className="text-left px-3 py-3 font-medium">Precio unitario</th>
                                    <th className="text-right px-3 py-3 font-medium">Total</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {lineas.map((linea, indice) => (
                                    <tr key={indice} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                        <td className="px-3 py-2 min-w-[220px]">
                                            <select
                                                value={linea.idProducto}
                                                onChange={(evento) =>
                                                    actualizarLinea(indice, "idProducto", evento.target.value)
                                                }
                                                className="w-full rounded-lg px-2 py-2 bg-white"
                                                style={{ border: `1px solid ${COLORS.border}` }}
                                            >
                                                <option value="">Seleccioná un producto</option>
                                                {productos.map((producto) => (
                                                    <option key={producto.idProducto} value={producto.idProducto}>
                                                        {producto.descripcion}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 w-28">
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={linea.cantidad}
                                                onChange={(evento) =>
                                                    actualizarLinea(indice, "cantidad", evento.target.value)
                                                }
                                                className="w-full rounded-lg px-2 py-2"
                                                style={{ border: `1px solid ${COLORS.border}` }}
                                            />
                                        </td>
                                        <td className="px-3 py-2 w-44">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={linea.precioUnitario}
                                                onChange={(evento) =>
                                                    actualizarLinea(indice, "precioUnitario", evento.target.value)
                                                }
                                                className="w-full rounded-lg px-2 py-2"
                                                style={{ border: `1px solid ${COLORS.border}` }}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">
                                            {formatoMoneda(Number(linea.cantidad) * Number(linea.precioUnitario))}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => quitarLinea(indice)}
                                                aria-label="Quitar línea"
                                                className="p-2 rounded-lg"
                                                style={{ color: COLORS.red }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={agregarLinea}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                            style={{ color: COLORS.green, border: `1px solid ${COLORS.green}` }}
                        >
                            <Plus size={16} />
                            Agregar línea
                        </button>
                        <div className="text-right">
                            <p className="text-xs" style={{ color: COLORS.muted }}>Monto total</p>
                            <p className="text-xl font-semibold" style={{ color: COLORS.charcoal }}>
                                {formatoMoneda(total)}
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            style={{ backgroundColor: COLORS.green }}
                        >
                            {guardando && <LoaderCircle size={16} className="animate-spin" />}
                            Registrar borrador
                        </button>
                    </div>
                </form>
            </section>
            </Modal>}

            <section>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: COLORS.charcoal }}>
                            Cotizaciones registradas
                        </h2>
                        <p className="text-sm" style={{ color: COLORS.muted }}>
                            Datos obtenidos del servicio de cotizaciones.
                        </p>
                    </div>
                    {cargando && <LoaderCircle size={20} className="animate-spin" style={{ color: COLORS.green }} />}
                </div>
                <input
                    className="mb-3 w-full rounded-lg bg-white px-3 py-2.5 text-sm"
                    style={{ border: `1px solid ${COLORS.border}` }}
                    placeholder="Buscar cotización, prospecto o estado"
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                    aria-label="Buscar cotizaciones"
                />

                {!cargando && cotizacionesVisibles.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted }}>
                        <AlertCircle size={22} className="mx-auto mb-2" />
                        Todavía no hay cotizaciones registradas.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: COLORS.greenTint, color: COLORS.charcoal }}>
                                    <th className="text-left px-4 py-3">Código</th>
                                    <th className="text-left px-4 py-3">Prospecto</th>
                                    <th className="text-left px-4 py-3">Fecha</th>
                                    <th className="text-left px-4 py-3">Estado</th>
                                    <th className="text-right px-4 py-3">Monto</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cotizacionesVisibles.map((cotizacion) => (
                                    <tr key={cotizacion.idCotizacion} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                        <td className="px-4 py-3 font-medium">COT-{cotizacion.idCotizacion}</td>
                                        <td className="px-4 py-3">
                                            {prospectos.find((p) => p.id === cotizacion.idProspecto)?.nombre ??
                                                `Prospecto #${cotizacion.idProspecto}`}
                                        </td>
                                        <td className="px-4 py-3">{cotizacion.fecha}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge value={cotizacion.estado} />
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {formatoMoneda(cotizacion.monto)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirDetalle(cotizacion)}
                                                    className="rounded-lg p-2 hover:bg-[#EAF6E8]"
                                                    style={{ color: COLORS.green }}
                                                    aria-label={`Ver detalle de cotización ${cotizacion.idCotizacion}`}
                                                    title="Ver detalle"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {cotizacion.estado === "Borrador" && cotizacion.activa && (
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirEdicion(cotizacion)}
                                                        className="rounded-lg p-2 hover:bg-[#EAF6E8]"
                                                        style={{ color: COLORS.charcoal }}
                                                        aria-label={`Editar cotización ${cotizacion.idCotizacion}`}
                                                        title="Editar borrador"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {!cotizacion.activa && (
                                                    <span
                                                        className="self-center rounded-full px-2 py-1 text-xs"
                                                        style={{ backgroundColor: "#F3F4F3", color: COLORS.muted }}
                                                    >
                                                        Inactiva
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {modoModal === "detalle" && (
                <CotizacionDetalleModal
                    cotizacion={cotizacionSeleccionada}
                    prospecto={
                        prospectos.find(
                            (prospecto) =>
                                prospecto.id === cotizacionSeleccionada?.idProspecto
                        )?.nombre
                    }
                    productos={productos}
                    onClose={cerrarModal}
                    onEdit={() => setModoModal("edicion")}
                    onChangeState={cambiarEstado}
                    onDeactivate={desactivar}
                    busy={operandoEstado}
                />
            )}

            {modoModal === "edicion" && (
                <CotizacionEdicionModal
                    cotizacion={cotizacionSeleccionada}
                    prospecto={
                        prospectos.find(
                            (prospecto) =>
                                prospecto.id === cotizacionSeleccionada?.idProspecto
                        )?.nombre
                    }
                    productos={productos}
                    onClose={cerrarModal}
                    onSaved={actualizarCotizacionEnLista}
                />
            )}

            <ConfirmModal
                open={!!confirmacion}
                title={
                    confirmacion?.tipo === "desactivar"
                        ? "Desactivar cotización"
                        : `Cambiar a ${confirmacion?.estado ?? ""}`
                }
                message={
                    confirmacion?.tipo === "desactivar"
                        ? `La cotización COT-${confirmacion?.cotizacion?.idCotizacion} está anulada. Se conservará el registro, pero dejará de estar activa. ¿Querés continuar?`
                        : `¿Querés cambiar la cotización COT-${confirmacion?.cotizacion?.idCotizacion} de ${confirmacion?.cotizacion?.estado} a ${confirmacion?.estado}?`
                }
                confirmLabel={
                    confirmacion?.tipo === "desactivar"
                        ? "Desactivar cotización"
                        : `Cambiar a ${confirmacion?.estado ?? "nuevo estado"}`
                }
                cancelLabel="Cancelar"
                tone={
                    confirmacion?.tipo === "desactivar" ||
                    confirmacion?.estado === "Anulada"
                        ? "danger"
                        : "default"
                }
                busy={operandoEstado}
                onCancel={() => {
                    if (!operandoEstado) setConfirmacion(null);
                }}
                onConfirm={confirmarAccion}
            />
        </div>
    );
}
