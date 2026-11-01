import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import SelectorEquipo from "./SelectorEquipo";
import { hoyISO } from "./helpers";

const CATEGORIAS_RADIO = ["Radio portátil", "Radio móvil"];

export default function AsignarRadioModal({ idContratoInicial, onClose, onSaved }) {
    const [contratos, setContratos] = useState([]);
    const [disponibles, setDisponibles] = useState([]);
    const [idContrato, setIdContrato] = useState(idContratoInicial ? String(idContratoInicial) : "");
    const [serie, setSerie] = useState("");
    const [fecha, setFecha] = useState(hoyISO());
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        Promise.all([api.listarContratos({ estado: "Activo" }), api.listarEquiposDisponibles()])
            .then(([lista, equipos]) => {
                if (!activo) return;
                setContratos(lista);
                setDisponibles(equipos);
            })
            .catch((e) => activo && setError(e.message ?? "No se pudieron cargar los contratos y equipos."));
        return () => {
            activo = false;
        };
    }, []);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);
        setGuardando(true);
        try {
            const detalle = await api.agregarRadio({
                idContrato: idContrato ? Number(idContrato) : null,
                numeroSerie: serie,
                fechaAsignacion: fecha || null,
            });
            onSaved(detalle, serie.trim());
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo asignar el radio.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={Radio}
            title="Asignar radio a un contrato"
            subtitle="Se crea la ficha del radio vinculada al contrato y el equipo pasa a Alquilado."
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-asignar-radio" disabled={guardando}>
                        {guardando ? "Guardando..." : "Asignar radio"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {errores.length > 0 && (
                        <ul className="list-disc ml-4 mt-1">{errores.map((x) => <li key={x}>{x}</li>)}</ul>
                    )}
                </Notice>
            )}
            <form id="form-asignar-radio" onSubmit={guardar} className="grid grid-cols-1 gap-4">
                <FieldLabel label="Contrato *">
                    <select
                        value={idContrato}
                        onChange={(e) => setIdContrato(e.target.value)}
                        disabled={!!idContratoInicial}
                        className={inputClass}
                        style={inputStyle}
                    >
                        <option value="">Seleccionar...</option>
                        {contratos.map((c) => (
                            <option key={c.idContrato} value={c.idContrato}>
                                {api.codigoContrato(c.idContrato)} · {c.empresa}
                            </option>
                        ))}
                    </select>
                </FieldLabel>
                <div>
                    <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: "#6E6E6E", fontWeight: 600 }}>Radio disponible *</span>
                    <SelectorEquipo disponibles={disponibles} categoriasPermitidas={CATEGORIAS_RADIO} valor={serie} onCambiar={setSerie} />
                </div>
                <FieldLabel label="Fecha de asignación *">
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
            </form>
        </Modal>
    );
}
