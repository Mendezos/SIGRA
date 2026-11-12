import { useMemo, useRef, useState } from "react";
import { Repeat } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmSeguimientosService";
import ContactoSelect from "./ContactoSelect";
import EmpresaSelect from "./EmpresaSelect";
import SeguimientoMensajeCampo from "./SeguimientoMensajeCampo";
import SeguimientoResponsableSelect from "./SeguimientoResponsableSelect";
import { fechaLocal, hoyISO } from "./helpers";

// CRMGPSC-024: programar contactos periódicos (mensual, trimestral o semestral) a un prospecto o cliente activo.
export default function SerieFormModal({ user, onClose, onSaved }) {
    const [empresa, setEmpresa] = useState(null);
    const [idContacto, setIdContacto] = useState(null);
    const [periodicidad, setPeriodicidad] = useState("Mensual");
    const [fechaInicial, setFechaInicial] = useState("");
    const [hora, setHora] = useState("");
    const [tipo, setTipo] = useState("");
    const [prioridad, setPrioridad] = useState("Media");
    const [idResponsable, setIdResponsable] = useState(api.esVendedorCrm(user) ? user.idUsuario : "");
    const [motivo, setMotivo] = useState("");
    const [campos, setCampos] = useState({});
    const [error, setError] = useState("");
    const [faltantes, setFaltantes] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    // Vista previa de las fechas que generará el servidor (misma regla de cálculo).
    const fechas = useMemo(() => (api.fechaExiste(fechaInicial) ? api.fechasDeSerie(fechaInicial, periodicidad) : []), [fechaInicial, periodicidad]);

    function validar() {
        const c = {};
        if (!empresa) c.empresa = "Seleccione el prospecto o cliente.";
        if (!fechaInicial) c.fechaInicial = "Indique la fecha inicial.";
        if (!hora) c.hora = "Indique la hora.";
        if (!tipo) c.tipo = "Seleccione el tipo de seguimiento.";
        if (!motivo.trim()) c.motivo = "Indique el motivo del contacto periódico.";
        if (!idResponsable) c.responsable = "Seleccione el responsable.";
        if (Object.keys(c).length > 0) return { campos: c, mensaje: api.MENSAJE_FALTANTES_SERIE };

        if (!api.fechaExiste(fechaInicial)) return { campos: { fechaInicial: " " }, mensaje: "La fecha inicial no es válida; corrija la fecha." };
        if (!api.horaExiste(hora)) return { campos: { hora: " " }, mensaje: "La hora no es válida; corrija la hora." };
        if (fechaInicial < hoyISO()) return { campos: { fechaInicial: " " }, mensaje: api.MENSAJE_SERIE_FECHA_ANTERIOR };
        if (new Date(`${fechaInicial}T${hora}:00`).getTime() <= Date.now()) return { campos: { fechaInicial: " ", hora: " " }, mensaje: api.MENSAJE_SERIE_FECHA_HORA_PASADA };
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
            const creada = await api.crearSerie({
                tipoEmpresa: empresa.tipo,
                idEmpresa: empresa.idEmpresa,
                idContactoEmpresa: idContacto,
                periodicidad,
                fechaInicial,
                hora,
                tipo,
                prioridad,
                motivo: motivo.trim(),
                idResponsable: Number(idResponsable),
            });
            onSaved(creada);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo programar el contacto periódico.");
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
            icon={Repeat}
            title="Programar contacto periódico"
            subtitle="Se crea un seguimiento por cada fecha de la serie, durante los próximos 12 meses."
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-serie" disabled={guardando}>
                        {guardando ? "Guardando..." : "Crear serie"}
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

            <form id="form-serie" onSubmit={guardar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <EmpresaSelect
                        id="serie-empresa"
                        value={empresa}
                        onChange={(e) => {
                            setEmpresa(e);
                            setIdContacto(null);
                        }}
                        label="Prospecto o cliente *"
                    />
                    <SeguimientoMensajeCampo texto={campos.empresa} />
                </div>

                <div className="sm:col-span-2">
                    <ContactoSelect tipo={empresa?.tipo} idEmpresa={empresa?.idEmpresa} value={idContacto} onChange={setIdContacto} label="Contacto" />
                </div>

                <div>
                    <FieldLabel label="Periodicidad *">
                        <select value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)} className={inputClass} style={inputStyle}>
                            {catalogos.PERIODICIDADES.map((p) => <option key={p}>{p}</option>)}
                        </select>
                    </FieldLabel>
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
                    <FieldLabel label="Fecha inicial *">
                        <input type="date" value={fechaInicial} min={hoyISO()} onChange={(e) => setFechaInicial(e.target.value)} aria-invalid={marca("fechaInicial")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.fechaInicial?.trim()} />
                </div>

                <div>
                    <FieldLabel label="Hora *">
                        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-invalid={marca("hora")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.hora?.trim()} />
                </div>

                <div>
                    <SeguimientoResponsableSelect value={idResponsable} onChange={setIdResponsable} invalido={Boolean(campos.responsable)} />
                    <SeguimientoMensajeCampo texto={campos.responsable} />
                </div>

                <div>
                    <FieldLabel label="Prioridad">
                        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputClass} style={inputStyle}>
                            {catalogos.PRIORIDADES_SEGUIMIENTO.map((p) => <option key={p}>{p}</option>)}
                        </select>
                    </FieldLabel>
                </div>

                <div className="sm:col-span-2">
                    <FieldLabel label="Motivo *">
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={3}
                            maxLength={api.MAX_MOTIVO}
                            placeholder="Ej. Contacto mensual para revisar el estado del servicio..."
                            aria-invalid={marca("motivo")}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.motivo} />
                </div>

                {fechas.length > 0 && (
                    <div className="sm:col-span-2 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }} aria-live="polite">
                        <p style={{ fontWeight: 600 }}>
                            Se programarán {fechas.length} seguimientos {periodicidad.toLowerCase() === "mensual" ? "mensuales" : periodicidad.toLowerCase() === "trimestral" ? "trimestrales" : "semestrales"}
                        </p>
                        <p className="text-xs mt-1">{fechas.map((f) => fechaLocal(f)).join(" · ")}</p>
                    </div>
                )}
            </form>
        </Modal>
    );
}
