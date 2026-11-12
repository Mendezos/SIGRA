import { useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmSeguimientosService";
import ContactoSelect from "./ContactoSelect";
import EmpresaSelect from "./EmpresaSelect";
import SeguimientoResponsableSelect from "./SeguimientoResponsableSelect";
import { hoyISO } from "./helpers";
import SeguimientoMensajeCampo from "./SeguimientoMensajeCampo";

// CRMGPSC-015: programar un seguimiento a un prospecto o cliente activo.
// empresaInicial ({ tipo, idEmpresa, empresa, estado }) deja la empresa ya elegida.
export default function SeguimientoFormModal({ user, empresaInicial = null, onClose, onSaved }) {
    const [empresa, setEmpresa] = useState(empresaInicial);
    const [idContacto, setIdContacto] = useState(null);
    const [tipo, setTipo] = useState("");
    const [fecha, setFecha] = useState("");
    const [hora, setHora] = useState("");
    const [prioridad, setPrioridad] = useState("Media");
    const [idResponsable, setIdResponsable] = useState(api.esVendedorCrm(user) ? user.idUsuario : "");
    const [motivo, setMotivo] = useState("");
    const [campos, setCampos] = useState({});
    const [error, setError] = useState("");
    const [faltantes, setFaltantes] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    function validar() {
        const c = {};
        if (!empresa) c.empresa = "Seleccione el prospecto o cliente.";
        if (!tipo) c.tipo = "Seleccione el tipo de seguimiento.";
        if (!fecha) c.fecha = "Indique la fecha.";
        if (!hora) c.hora = "Indique la hora.";
        if (!motivo.trim()) c.motivo = "Indique el motivo del seguimiento.";
        if (!idResponsable) c.responsable = "Seleccione el responsable.";
        if (Object.keys(c).length > 0) return { campos: c, mensaje: api.MENSAJE_FALTANTES_SEGUIMIENTO };

        if (!api.fechaExiste(fecha) || !api.horaExiste(hora)) return { campos: { fecha: " ", hora: " " }, mensaje: api.MENSAJE_FECHA_HORA_INVALIDA };
        if (new Date(`${fecha}T${hora}:00`).getTime() <= Date.now()) return { campos: { fecha: " ", hora: " " }, mensaje: api.MENSAJE_FECHA_HORA_PASADA };
        return null;
    }

    async function guardar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        setFaltantes([]);

        const problema = validar();
        setCampos(problema?.campos ?? {});
        if (problema) return setError(problema.mensaje);

        enviando.current = true;
        setGuardando(true);
        try {
            const creado = await api.crearSeguimiento({
                tipoEmpresa: empresa.tipo,
                idEmpresa: empresa.idEmpresa,
                idContactoEmpresa: idContacto,
                tipo,
                fecha,
                hora,
                motivo: motivo.trim(),
                prioridad,
                idResponsable: Number(idResponsable),
            });
            onSaved(creado);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo programar el seguimiento.");
            setFaltantes(err instanceof ApiError ? err.errores : []);
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    const marca = (campo) => (campos[campo] ? true : undefined);

    return (
        <Modal
            open
            onClose={onClose}
            icon={CalendarPlus}
            title="Programar seguimiento"
            subtitle="El seguimiento queda Pendiente y aparece en la agenda de su responsable."
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-seguimiento" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {faltantes.length > 0 && <span className="block text-xs mt-1">Falta: {faltantes.join(", ")}.</span>}
                </Notice>
            )}

            <form id="form-seguimiento" onSubmit={guardar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <EmpresaSelect
                        id="seguimiento-empresa"
                        value={empresa}
                        onChange={(e) => {
                            setEmpresa(e);
                            setIdContacto(null);
                        }}
                        label="Prospecto o cliente *"
                        disabled={Boolean(empresaInicial)}
                    />
                    <SeguimientoMensajeCampo texto={campos.empresa} />
                </div>

                <div className="sm:col-span-2">
                    <ContactoSelect tipo={empresa?.tipo} idEmpresa={empresa?.idEmpresa} value={idContacto} onChange={setIdContacto} label="Contacto" />
                </div>

                <div>
                    <FieldLabel label="Tipo de seguimiento *">
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-invalid={marca("tipo")} className={inputClass} style={inputStyle}>
                            <option value="">Seleccione el tipo</option>
                            {catalogos.TIPOS_SEGUIMIENTO.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.tipo} />
                </div>

                <div>
                    <FieldLabel label="Prioridad">
                        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputClass} style={inputStyle}>
                            {catalogos.PRIORIDADES_SEGUIMIENTO.map((p) => <option key={p}>{p}</option>)}
                        </select>
                    </FieldLabel>
                </div>

                <div>
                    <FieldLabel label="Fecha *">
                        <input type="date" value={fecha} min={hoyISO()} onChange={(e) => setFecha(e.target.value)} aria-invalid={marca("fecha")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.fecha?.trim()} />
                </div>

                <div>
                    <FieldLabel label="Hora *">
                        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-invalid={marca("hora")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.hora?.trim()} />
                </div>

                <div className="sm:col-span-2">
                    <SeguimientoResponsableSelect value={idResponsable} onChange={setIdResponsable} invalido={Boolean(campos.responsable)} />
                    <SeguimientoMensajeCampo texto={campos.responsable} />
                </div>

                <div className="sm:col-span-2">
                    <FieldLabel label="Motivo *">
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={3}
                            maxLength={api.MAX_MOTIVO}
                            placeholder="Ej. Presentar la propuesta de repetidoras..."
                            aria-invalid={marca("motivo")}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.motivo} />
                </div>
            </form>
        </Modal>
    );
}
