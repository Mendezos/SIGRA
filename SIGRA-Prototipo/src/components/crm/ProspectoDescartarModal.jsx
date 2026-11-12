import { useState } from "react";
import { Ban } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmProspectosService";
import { hoyISO } from "./helpers";
import ProspectoCampo from "./ProspectoCampo";
import { atributosControl } from "./prospectoControl";

// CRMGPSC-004: descartar un prospecto (motivo, fecha, observación y confirmación en pantalla).
// onHecho(resultado) recibe la respuesta del servidor (Aplicado | SinCambios).
export default function ProspectoDescartarModal({ prospecto, onClose, onHecho }) {
    const [form, setForm] = useState({ motivo: "", fecha: hoyISO(), observacion: "", confirmo: false });
    const [errores, setErrores] = useState({});
    const [error, setError] = useState("");
    const [rechazo, setRechazo] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const set = (campo) => (e) => {
        const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [campo]: valor }));
        if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
    };

    async function confirmar(e) {
        e.preventDefault();
        if (guardando) return;
        setError("");
        const nuevos = {};
        if (!form.motivo) nuevos.motivo = "Seleccione el motivo del descarte.";
        if (!form.fecha) nuevos.fecha = "Indique la fecha del descarte.";
        else if (form.fecha > hoyISO()) nuevos.fecha = "La fecha no puede ser futura.";
        if (form.observacion.trim().length > 500) nuevos.observacion = "No puede superar los 500 caracteres.";
        if (!form.confirmo) nuevos.confirmo = "Marque la casilla para confirmar el descarte.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) {
            setError(nuevos.motivo ? "Debe indicar el motivo del descarte." : nuevos.confirmo ? "Debe confirmar que desea descartar el prospecto." : "Revise los campos indicados.");
            return;
        }

        setGuardando(true);
        try {
            onHecho(await api.descartarProspecto(prospecto.idProspecto, { motivo: form.motivo, fecha: form.fecha, observacion: form.observacion }));
        } catch (err) {
            if (err instanceof ApiError) {
                setErrores(api.erroresDelServidor(err.errores));
                setError(err.message);
                if (err.status === 409) setRechazo(err.message);
            } else {
                setError("No se pudo descartar el prospecto.");
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={Ban}
            tone="danger"
            title={`Descartar prospecto ${api.codigoProspecto(prospecto.idProspecto)}`}
            subtitle={prospecto.empresa}
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>
                        Volver
                    </Button>
                    {!rechazo && (
                        <Button variant="dangerSolid" type="submit" form="form-descartar-prospecto" disabled={guardando}>
                            {guardando ? "Descartando..." : "Confirmar descarte"}
                        </Button>
                    )}
                </div>
            }
        >
            <Notice tone="warning">
                Los seguimientos pendientes del prospecto se cancelarán y se detendrán sus series de contacto periódico. El historial (interacciones, notas y cotizaciones) se conserva.
            </Notice>
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-descartar-prospecto" onSubmit={confirmar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <ProspectoCampo label="Motivo del descarte *" error={errores.motivo}>
                    <select value={form.motivo} onChange={set("motivo")} {...atributosControl(errores.motivo)}>
                        <option value="">Seleccione un motivo</option>
                        {catalogos.MOTIVOS_DESCARTE.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </select>
                </ProspectoCampo>

                <ProspectoCampo label="Fecha del descarte *" error={errores.fecha}>
                    <input type="date" value={form.fecha} max={hoyISO()} onChange={set("fecha")} {...atributosControl(errores.fecha)} />
                </ProspectoCampo>

                <div className="sm:col-span-2">
                    <ProspectoCampo label="Observación" error={errores.observacion}>
                        <textarea value={form.observacion} onChange={set("observacion")} rows={3} maxLength={500} placeholder="Detalle opcional del descarte" {...atributosControl(errores.observacion)} />
                    </ProspectoCampo>
                </div>

                <div className="sm:col-span-2">
                    <label className="flex items-start gap-2 text-sm" style={{ color: COLORS.charcoal }}>
                        <input type="checkbox" checked={form.confirmo} onChange={set("confirmo")} className="mt-1" />
                        Confirmo que deseo descartar este prospecto.
                    </label>
                    {errores.confirmo && (
                        <span role="alert" className="block text-xs mt-1" style={{ color: COLORS.red }}>
                            {errores.confirmo}
                        </span>
                    )}
                </div>
            </form>
        </Modal>
    );
}
