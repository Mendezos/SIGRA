import { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Mail } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { listarEncuestas, reenviarEncuesta } from "../../services/encuestasService";

const ESTADOS = ["Todos", "Pendiente", "Enviada", "Respondida"];

function fecha(valor) {
    return valor ? new Date(valor).toLocaleDateString("es-CR") : "—";
}

export default function EncuestasPanel() {
    const [encuestas, setEncuestas] = useState([]);
    const [estado, setEstado] = useState("Todos");
    const [busqueda, setBusqueda] = useState("");
    const [detalle, setDetalle] = useState(null);
    const [mensaje, setMensaje] = useState(null);

    async function cargar() {
        try {
            setEncuestas(await listarEncuestas());
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudieron cargar las encuestas." });
        }
    }

    useEffect(() => {
        let vigente = true;
        listarEncuestas()
            .then((datos) => {
                if (vigente) setEncuestas(datos);
            })
            .catch((error) => {
                if (vigente) {
                    setMensaje({
                        tone: "error",
                        text: error.message || "No se pudieron cargar las encuestas.",
                    });
                }
            });
        return () => {
            vigente = false;
        };
    }, []);

    const visibles = encuestas.filter((encuesta) => {
        const texto = busqueda.trim().toLowerCase();
        return (estado === "Todos" || encuesta.estado === estado) &&
            (!texto ||
                [encuesta.numeroFactura, encuesta.cliente]
                    .some((valor) => String(valor ?? "").toLowerCase().includes(texto)));
    });

    const resumen = useMemo(() => {
        const respondidas = encuestas.filter((item) => item.calificacion);
        const promedio = respondidas.length
            ? respondidas.reduce((total, item) => total + item.calificacion, 0) / respondidas.length
            : 0;
        return {
            total: encuestas.length,
            respondidas: respondidas.length,
            promedio,
            bajas: encuestas.filter((item) => item.alertaBajaSatisfaccion).length,
        };
    }, [encuestas]);

    async function reenviar(encuesta) {
        try {
            const resultado = await reenviarEncuesta(encuesta.idEncuesta);
            setMensaje({ tone: "success", text: resultado.mensaje });
            await cargar();
        } catch (error) {
            setMensaje({ tone: "error", text: error.message || "No se pudo reenviar la encuesta." });
        }
    }

    return (
        <section>
            {mensaje && <Notice tone={mensaje.tone}>{mensaje.text}</Notice>}
            <div className="mb-5">
                <h2 className="text-lg font-semibold" style={{ color: COLORS.charcoal }}>
                    Encuestas de satisfacción
                </h2>
                <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>
                    Seguimiento de encuestas enviadas después de ventas facturadas.
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                    ["Enviadas", resumen.total],
                    ["Respondidas", resumen.respondidas],
                    ["Promedio", resumen.promedio ? `${resumen.promedio.toFixed(1)}/5` : "—"],
                    ["Alertas", resumen.bajas],
                ].map(([label, valor]) => (
                    <div key={label} className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.border}` }}>
                        <p className="text-xs" style={{ color: COLORS.muted }}>{label}</p>
                        <p className="text-xl font-semibold mt-1" style={{ color: COLORS.charcoal }}>{valor}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <input
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Buscar por factura o cliente"
                    className="flex-1 min-w-56 px-3 py-2.5 rounded-lg text-sm"
                    style={{ border: `1px solid ${COLORS.border}` }}
                />
                <select
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                    className="px-3 py-2.5 rounded-lg text-sm"
                    style={{ border: `1px solid ${COLORS.border}` }}
                >
                    {ESTADOS.map((opcion) => <option key={opcion}>{opcion}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ backgroundColor: COLORS.greenTint }}>
                            <th className="text-left p-3">Factura</th>
                            <th className="text-left p-3">Cliente</th>
                            <th className="text-left p-3">Envío</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-left p-3">Calificación</th>
                            <th className="text-right p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((encuesta) => (
                            <tr key={encuesta.idEncuesta} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                <td className="p-3">{encuesta.numeroFactura}</td>
                                <td className="p-3">{encuesta.cliente}</td>
                                <td className="p-3">{fecha(encuesta.fechaEnvio)}</td>
                                <td className="p-3">{encuesta.estado}</td>
                                <td className="p-3">{encuesta.calificacion ? `${encuesta.calificacion}/5` : "Pendiente"}</td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="secondary" onClick={() => setDetalle(encuesta)} title="Ver detalle">
                                            <Eye size={15} />
                                        </Button>
                                        {encuesta.estado !== "Respondida" && (
                                            <Button variant="secondary" onClick={() => reenviar(encuesta)} title="Reenviar encuesta">
                                                <Mail size={15} />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {detalle && (
                <Modal open onClose={() => setDetalle(null)} title={`Detalle ${detalle.numeroFactura}`} icon={BarChart3}>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div><dt style={{ color: COLORS.muted }}>Cliente</dt><dd>{detalle.cliente}</dd></div>
                        <div><dt style={{ color: COLORS.muted }}>Correo</dt><dd>{detalle.correoCliente}</dd></div>
                        <div><dt style={{ color: COLORS.muted }}>Fecha de envío</dt><dd>{fecha(detalle.fechaEnvio)}</dd></div>
                        <div><dt style={{ color: COLORS.muted }}>Vencimiento</dt><dd>{fecha(detalle.fechaVencimiento)}</dd></div>
                        <div><dt style={{ color: COLORS.muted }}>Calificación</dt><dd>{detalle.calificacion ? `${detalle.calificacion}/5` : "Pendiente"}</dd></div>
                        <div className="col-span-2"><dt style={{ color: COLORS.muted }}>Comentario</dt><dd>{detalle.comentario || "—"}</dd></div>
                    </dl>
                </Modal>
            )}
        </section>
    );
}
