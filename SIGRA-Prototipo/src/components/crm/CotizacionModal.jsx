import { useMemo, useState } from "react";
import {
    Edit3,
    FileText,
    LoaderCircle,
    Plus,
    Trash2,
} from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { actualizarCotizacion } from "../../services/cotizacionesService";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
    redTint: "#FCEBEB",
};

const SIGUIENTES_ESTADOS = {
    Borrador: ["Enviada", "Anulada"],
    Enviada: ["En negociación", "Anulada"],
    "En negociación": ["Aprobada", "Anulada"],
};

const moneda = (valor) =>
    new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2,
    }).format(valor);

function lineaVacia() {
    return { idProducto: "", descripcion: "", cantidad: 1, precioUnitario: 0 };
}

// Fecha local (no UTC): `toISOString()` se Adelanta un día en la tarde, lo que
// bloqueaba guardar un borrador con la fecha de hoy entre las 6 p. m. y medianoche.
function fechaHoy() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

function erroresDeLineas(lineas) {
    if (!lineas.length) return "Agregá al menos una línea.";
    if (
        lineas.some(
            (linea) =>
                !linea.idProducto ||
                Number(linea.cantidad) <= 0 ||
                Number(linea.precioUnitario) < 0
        )
    ) {
        return "Revisá el producto, la cantidad y el precio de cada línea.";
    }
    return "";
}

function LineasForm({ lineas, productos = [], onChange }) {
    function actualizar(indice, campo, valor) {
        onChange(
            lineas.map((linea, posicion) => {
                if (posicion !== indice) return linea;
                if (campo !== "idProducto") return { ...linea, [campo]: valor };
                const producto = productos.find(
                    (item) => item.idProducto === Number(valor)
                );
                return {
                    ...linea,
                    idProducto: valor,
                    descripcion: producto?.descripcion ?? "",
                    precioUnitario: producto?.precioUnitario ?? 0,
                };
            })
        );
    }

    return (
        <div className="space-y-3">
            {lineas.map((linea, indice) => (
                <div
                    key={indice}
                    className="grid gap-2 rounded-xl p-3 md:grid-cols-[minmax(0,1.5fr)_90px_140px_24px]"
                    style={{ backgroundColor: "#FAFCF9", border: `1px solid ${COLORS.border}` }}
                >
                    <select
                        value={linea.idProducto}
                        onChange={(evento) => actualizar(indice, "idProducto", evento.target.value)}
                        className="rounded-lg bg-white px-3 py-2 text-sm"
                        style={{ border: `1px solid ${COLORS.border}` }}
                        aria-label={`Producto de línea ${indice + 1}`}
                    >
                        <option value="">Producto o servicio</option>
                        {productos.map((producto) => (
                            <option key={producto.idProducto} value={producto.idProducto}>
                                {producto.descripcion}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={linea.cantidad}
                        onChange={(evento) => actualizar(indice, "cantidad", evento.target.value)}
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{ border: `1px solid ${COLORS.border}` }}
                        aria-label={`Cantidad de línea ${indice + 1}`}
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.precioUnitario}
                        onChange={(evento) => actualizar(indice, "precioUnitario", evento.target.value)}
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{ border: `1px solid ${COLORS.border}` }}
                        aria-label={`Precio de línea ${indice + 1}`}
                    />
                    <button
                        type="button"
                        onClick={() =>
                            onChange(
                                lineas.length === 1
                                    ? lineas
                                    : lineas.filter((_, posicion) => posicion !== indice)
                            )
                        }
                        className="self-center rounded-lg p-1"
                        style={{ color: COLORS.red }}
                        aria-label={`Eliminar línea ${indice + 1}`}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}

export function CotizacionDetalleModal({
    cotizacion,
    prospecto,
    onClose,
    onEdit,
    onChangeState,
    onDeactivate,
    busy,
}) {
    if (!cotizacion) return null;
    const siguientesEstados = SIGUIENTES_ESTADOS[cotizacion.estado] ?? [];

    return (
        <Modal
            open
            onClose={onClose}
            title={`Cotización COT-${cotizacion.idCotizacion}`}
            subtitle="Detalle completo de la cotización"
            icon={FileText}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-2">
                    {cotizacion.estado === "Borrador" && cotizacion.activa && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
                            style={{ backgroundColor: COLORS.green }}
                        >
                            <Edit3 size={15} />
                            Editar borrador
                        </button>
                    )}
                    {cotizacion.activa && siguientesEstados.map((estado) => (
                        <button
                            key={estado}
                            type="button"
                            onClick={() => onChangeState(estado)}
                            disabled={busy}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{
                                border: `1px solid ${estado === "Anulada" ? COLORS.red : COLORS.green}`,
                                color: estado === "Anulada" ? COLORS.red : COLORS.green,
                            }}
                        >
                            {estado === "Anulada" ? "Anular" : `Cambiar a ${estado}`}
                        </button>
                    ))}
                    {cotizacion.estado === "Anulada" && cotizacion.activa && (
                        <button
                            type="button"
                            onClick={onDeactivate}
                            disabled={busy}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{ border: `1px solid ${COLORS.red}`, color: COLORS.red }}
                        >
                            Desactivar
                        </button>
                    )}
                </div>
            }
        >
            <div className="grid gap-3 sm:grid-cols-3 mb-5">
                <Info label="Prospecto" value={prospecto || `#${cotizacion.idProspecto}`} />
                <Info label="Fecha" value={cotizacion.fecha} />
                <div>
                    <p className="text-xs" style={{ color: COLORS.muted }}>Estado</p>
                    <StatusBadge value={cotizacion.estado} />
                </div>
            </div>
            <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                <table className="w-full text-sm">
                    <thead style={{ backgroundColor: COLORS.greenTint }}>
                        <tr>
                            <th className="px-3 py-3 text-left">Producto o servicio</th>
                            <th className="px-3 py-3 text-right">Cantidad</th>
                            <th className="px-3 py-3 text-right">Precio</th>
                            <th className="px-3 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(cotizacion.lineas ?? []).map((linea, indice) => (
                            <tr key={`${linea.idProducto}-${indice}`} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                <td className="px-3 py-3">{linea.descripcion || `Producto #${linea.idProducto}`}</td>
                                <td className="px-3 py-3 text-right">{linea.cantidad}</td>
                                <td className="px-3 py-3 text-right">{moneda(linea.precioUnitario)}</td>
                                <td className="px-3 py-3 text-right font-medium">{moneda(linea.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: COLORS.greenTint }}>
                <span className="text-sm" style={{ color: COLORS.muted }}>Monto total</span>
                <strong className="text-xl" style={{ color: COLORS.charcoal }}>{moneda(cotizacion.monto)}</strong>
            </div>
        </Modal>
    );
}

function Info({ label, value }) {
    return (
        <div>
            <p className="text-xs" style={{ color: COLORS.muted }}>{label}</p>
            <p className="mt-1 text-sm font-medium" style={{ color: COLORS.charcoal }}>{value}</p>
        </div>
    );
}

export function CotizacionEdicionModal({ cotizacion, prospecto, productos = [], onClose, onSaved }) {
    const idProspecto = String(cotizacion?.idProspecto ?? "");
    const [fecha, setFecha] = useState(cotizacion?.fecha ?? "");
    const [lineas, setLineas] = useState(cotizacion?.lineas ?? [lineaVacia()]);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const total = useMemo(
        () =>
            lineas.reduce(
                (suma, linea) =>
                    suma + Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0),
                0
            ),
        [lineas]
    );

    async function guardar(evento) {
        evento.preventDefault();
        const errorLineas = erroresDeLineas(lineas);
        if (!idProspecto) {
            setError("Seleccioná un prospecto.");
            return;
        }
        if (errorLineas) {
            setError(errorLineas);
            return;
        }
        setGuardando(true);
        setError("");
        try {
            const actualizada = await actualizarCotizacion(cotizacion.idCotizacion, {
                idProspecto: Number(idProspecto),
                fecha,
                lineas: lineas.map((linea) => ({
                    ...linea,
                    idProducto: Number(linea.idProducto),
                    cantidad: Number(linea.cantidad),
                    precioUnitario: Number(linea.precioUnitario),
                })),
            });
            onSaved(actualizada);
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

    if (!cotizacion) return null;

    return (
        <Modal
            open
            onClose={onClose}
            title={`Editar COT-${cotizacion.idCotizacion}`}
            subtitle={`Borrador de ${prospecto || `prospecto #${cotizacion.idProspecto}`}`}
            icon={Edit3}
            width="max-w-2xl"
            footer={
                <div className="flex items-center justify-between gap-3">
                    <strong style={{ color: COLORS.charcoal }}>{moneda(total)}</strong>
                    <button
                        type="submit"
                        form="editar-cotizacion"
                        disabled={guardando}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        style={{ backgroundColor: COLORS.green }}
                    >
                        {guardando && <LoaderCircle size={15} className="animate-spin" />}
                        Guardar cambios
                    </button>
                </div>
            }
        >
            <form id="editar-cotizacion" onSubmit={guardar} className="space-y-5">
                {error && (
                    <div className="rounded-lg px-3 py-2 text-sm" role="alert" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                        {error}
                    </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                        Prospecto
                        <input
                            value={prospecto || `Prospecto #${idProspecto}`}
                            readOnly
                            className="mt-1 w-full rounded-lg bg-gray-50 px-3 py-2 text-sm"
                            style={{ border: `1px solid ${COLORS.border}` }}
                        />
                    </label>
                    <label className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                        Fecha
                        <input
                            type="date"
                            min={fechaHoy()}
                            value={fecha}
                            onChange={(evento) => setFecha(evento.target.value)}
                            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                            style={{ border: `1px solid ${COLORS.border}` }}
                        />
                    </label>
                </div>
                <LineasForm lineas={lineas} productos={productos} onChange={setLineas} />
                <button
                    type="button"
                    onClick={() => setLineas((actuales) => [...actuales, lineaVacia()])}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{ border: `1px solid ${COLORS.green}`, color: COLORS.green }}
                >
                    <Plus size={15} />
                    Agregar línea
                </button>
            </form>
        </Modal>
    );
}
