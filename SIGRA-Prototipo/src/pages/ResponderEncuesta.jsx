import { useEffect, useState } from "react";
import { obtenerEncuestaPublica, responderEncuesta } from "../services/encuestasService";
import { Button, Notice } from "../components/ui";
import { COLORS } from "../components/uiTheme";

export default function ResponderEncuesta() {
    const token = window.location.pathname.split("/").pop();
    const [encuesta, setEncuesta] = useState(null);
    const [calificacion, setCalificacion] = useState("");
    const [comentario, setComentario] = useState("");
    const [mensaje, setMensaje] = useState(null);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        obtenerEncuestaPublica(token)
            .then(setEncuesta)
            .catch((error) => setMensaje({ tone: "error", text: error.message }));
    }, [token]);

    async function enviar(event) {
        event.preventDefault();
        setEnviando(true);
        try {
            const resultado = await responderEncuesta(token, {
                calificacion: Number(calificacion),
                comentario,
            });
            setMensaje({ tone: "success", text: resultado.mensaje });
            setEncuesta(null);
        } catch (error) {
            setMensaje({ tone: "error", text: error.message });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-white">
            <section className="w-full max-w-lg rounded-2xl p-6" style={{ border: `1px solid ${COLORS.border}` }}>
                <h1 className="text-2xl font-semibold" style={{ color: COLORS.charcoal }}>Encuesta de satisfacción</h1>
                {mensaje && <div className="mt-4"><Notice tone={mensaje.tone}>{mensaje.text}</Notice></div>}
                {encuesta && (
                    <form onSubmit={enviar} className="mt-6 space-y-5">
                        <p className="text-sm" style={{ color: COLORS.muted }}>
                            Factura {encuesta.numeroFactura} · {encuesta.cliente}
                        </p>
                        <label className="block text-sm">
                            <span className="block mb-2 font-medium">¿Qué tan satisfecho estás? (1 a 5)</span>
                            <select
                                required
                                value={calificacion}
                                onChange={(event) => setCalificacion(event.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg"
                                style={{ border: `1px solid ${COLORS.border}` }}
                            >
                                <option value="">Seleccionar calificación...</option>
                                {[1, 2, 3, 4, 5].map((valor) => <option key={valor} value={valor}>{valor} / 5</option>)}
                            </select>
                        </label>
                        <label className="block text-sm">
                            <span className="block mb-2 font-medium">Comentario (opcional)</span>
                            <textarea
                                maxLength={1000}
                                value={comentario}
                                onChange={(event) => setComentario(event.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg"
                                style={{ border: `1px solid ${COLORS.border}` }}
                                rows={4}
                            />
                        </label>
                        <Button variant="primary" type="submit" disabled={enviando}>
                            {enviando ? "Enviando..." : "Enviar respuesta"}
                        </Button>
                    </form>
                )}
            </section>
        </main>
    );
}
