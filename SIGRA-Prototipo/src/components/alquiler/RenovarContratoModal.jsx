import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import SelectorEquipo from "./SelectorEquipo";
import { dinero, fechaCorta } from "./helpers";

export default function RenovarContratoModal({ detalle, onClose, onSaved }) {
    const { contrato, equipos } = detalle;
    const [disponibles, setDisponibles] = useState([]);
    // La renovación empieza después de que termine el contrato vigente (por defecto, al día siguiente).
    const vencimiento = new Date(String(contrato.fechaVencimiento).slice(0, 10) + "T00:00:00");
    const diaSiguiente = new Date(vencimiento.getTime() + 24 * 60 * 60 * 1000);
    const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const fechaMinimaISO = aISO(diaSiguiente);
    const [nuevoInicio, setNuevoInicio] = useState(fechaMinimaISO);
    const [nuevaFecha, setNuevaFecha] = useState("");
    const [nuevoMonto, setNuevoMonto] = useState("");
    const [observacion, setObservacion] = useState("");
    const [retirar, setRetirar] = useState([]);
    const [series, setSeries] = useState([]);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        api.listarEquiposDisponibles()
            .then((lista) => activo && setDisponibles(lista))
            .catch(() => {});
        return () => {
            activo = false;
        };
    }, []);

    function alternarRetiro(idEquipo) {
        setRetirar((lista) => (lista.includes(idEquipo) ? lista.filter((x) => x !== idEquipo) : [...lista, idEquipo]));
    }

    function agregarSerie(serie) {
        if (!serie || series.some((s) => s.toLowerCase() === serie.toLowerCase())) return;
        setSeries((lista) => [...lista, serie]);
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            const nuevo = await api.renovarContrato(contrato.idContrato, {
                nuevaFechaInicio: nuevoInicio || null,
                nuevaFechaVencimiento: nuevaFecha || null,
                nuevoMonto: nuevoMonto === "" ? null : Number(nuevoMonto),
                observacion: observacion || null,
                seriesAgregar: series,
                idsRetirar: retirar,
            });
            onSaved(nuevo);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo renovar el contrato.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={RefreshCw}
            title={`Renovar contrato ${api.codigoContrato(contrato.idContrato)}`}
            subtitle={`${contrato.empresa} · vence el ${fechaCorta(contrato.fechaVencimiento)} · ${dinero(contrato.montoMensual, contrato.moneda)} al mes`}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-renovar" disabled={guardando}>
                        {guardando ? "Creando..." : "Crear borrador de renovación"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-renovar" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 rounded-lg px-4 py-3 text-sm space-y-1" style={{ backgroundColor: COLORS.greenTint, color: COLORS.charcoal }}>
                    <p className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>Vencimiento actual: <strong>{fechaCorta(contrato.fechaVencimiento)}</strong></span>
                        <span>Precio mensual actual: <strong>{dinero(contrato.montoMensual, contrato.moneda)}</strong></span>
                    </p>
                    <p style={{ color: COLORS.muted }}>
                        La renovación crea un contrato nuevo en borrador. Se completa al activarlo con el documento firmado: entonces este contrato pasa a Renovado.
                    </p>
                </div>
                <FieldLabel label="Inicio de la renovación *">
                    <input type="date" value={nuevoInicio} min={fechaMinimaISO} onChange={(e) => setNuevoInicio(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Nueva fecha de vencimiento *">
                    <input type="date" value={nuevaFecha} min={nuevoInicio || fechaMinimaISO} onChange={(e) => setNuevaFecha(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label={`Nuevo precio mensual (${contrato.moneda}), si cambia`}>
                    <input type="number" min="0" step="0.01" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} placeholder={String(contrato.montoMensual)} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                        Equipos que el cliente ya no desea mantener (quedan Disponibles)
                    </span>
                    <ul className="flex flex-col gap-1.5">
                        {equipos.map((e) => (
                            <li key={e.idEquipo}>
                                <label className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 cursor-pointer" style={{ border: `1px solid ${COLORS.border}` }}>
                                    <input type="checkbox" checked={retirar.includes(e.idEquipo)} onChange={() => alternarRetiro(e.idEquipo)} style={{ accentColor: COLORS.red }} />
                                    <span style={{ fontWeight: 600, color: COLORS.charcoal }}>{e.numeroSerie}</span>
                                    <span className="text-xs" style={{ color: COLORS.muted }}>{e.marca} {e.modelo}</span>
                                    {retirar.includes(e.idEquipo) && <span className="ml-auto text-xs" style={{ color: COLORS.red }}>Se retira</span>}
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Equipos nuevos que se agregan</span>
                    <SelectorEquipo disponibles={disponibles} excluidas={series} onAgregar={agregarSerie} />
                    {series.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {series.map((s) => (
                                <li key={s} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}>
                                    {s}
                                    <button type="button" aria-label={`Quitar ${s}`} onClick={() => setSeries((l) => l.filter((x) => x !== s))}><X size={12} /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="sm:col-span-2">
                    <FieldLabel label="Motivo o observación (obligatorio si cambian los equipos)">
                        <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}
