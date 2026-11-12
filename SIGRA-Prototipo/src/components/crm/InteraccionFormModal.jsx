import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { TIPOS_INTERACCION } from "../../services/crmCatalogosService";
import * as api from "../../services/crmHistorialService";
import ContactoSelect from "./ContactoSelect";
import EmpresaSelect from "./EmpresaSelect";
import { ahoraInputFechaHora, fechaLocal } from "./helpers";

// Ventana para registrar una interacción comercial (llamada, visita, correo...) con un prospecto o cliente (CRMGPSC-013).
// `empresaInicial` ({ tipo, idEmpresa }) viene preseleccionada desde el historial; se puede cambiar.
export default function InteraccionFormModal({ empresaInicial, onClose, onSaved }) {
    const [maxFecha] = useState(() => ahoraInputFechaHora());
    const [empresa, setEmpresa] = useState(empresaInicial ?? null);
    const [form, setForm] = useState(() => ({
        idContacto: null,
        tipo: "",
        fecha: maxFecha,
        descripcion: "",
        resultado: "",
        proximoPaso: "",
        idCotizacion: "",
    }));
    const [cotizaciones, setCotizaciones] = useState([]);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false); // evita el doble envío aunque el estado aún no se haya repintado

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    // Cotizaciones de la empresa preseleccionada (las de una empresa elegida después se cargan al elegirla).
    useEffect(() => {
        if (!empresaInicial) return undefined;
        let activo = true;
        api.listarCotizacionesDeEmpresa(empresaInicial.tipo, empresaInicial.idEmpresa)
            .then((lista) => activo && setCotizaciones(lista))
            .catch(() => activo && setCotizaciones([]));
        return () => {
            activo = false;
        };
    }, [empresaInicial]);

    async function elegirEmpresa(elegida) {
        const nueva = elegida ? { tipo: elegida.tipo, idEmpresa: elegida.idEmpresa } : null;
        setEmpresa(nueva);
        setForm((f) => ({ ...f, idContacto: null, idCotizacion: "" }));
        setCotizaciones([]);
        if (!nueva) return;
        try {
            setCotizaciones(await api.listarCotizacionesDeEmpresa(nueva.tipo, nueva.idEmpresa));
        } catch {
            setCotizaciones([]);
        }
    }

    async function guardar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        setErrores([]);

        const descripcion = form.descripcion.trim();
        const faltantes = [];
        if (!empresa) faltantes.push("Empresa");
        if (!form.tipo) faltantes.push("Tipo de interacción");
        if (!form.fecha) faltantes.push("Fecha y hora");
        if (!descripcion) faltantes.push("Descripción");
        if (faltantes.length > 0) {
            setError(api.MENSAJE_INTERACCION_INCOMPLETA);
            setErrores(faltantes);
            return;
        }

        if (form.fecha > ahoraInputFechaHora()) return setError(api.MENSAJE_FECHA_FUTURA);
        if (descripcion.length > api.MAX_DESCRIPCION) return setError(`La descripción no puede superar los ${api.MAX_DESCRIPCION} caracteres.`);
        if (form.resultado.trim().length > api.MAX_RESULTADO) return setError(`El resultado no puede superar los ${api.MAX_RESULTADO} caracteres.`);
        if (form.proximoPaso.trim().length > api.MAX_PROXIMO_PASO) return setError(`El próximo paso no puede superar los ${api.MAX_PROXIMO_PASO} caracteres.`);

        enviando.current = true;
        setGuardando(true);
        try {
            const registrada = await api.registrarInteraccion({
                tipoEmpresa: empresa.tipo,
                idEmpresa: empresa.idEmpresa,
                idContactoEmpresa: form.idContacto,
                tipo: form.tipo,
                fecha: `${form.fecha}:00`,
                descripcion,
                resultado: form.resultado.trim() || null,
                proximoPaso: form.proximoPaso.trim() || null,
                idCotizacion: form.idCotizacion ? Number(form.idCotizacion) : null,
            });
            onSaved(registrada);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar la interacción.");
            setErrores(err.errores ?? []);
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={MessageSquarePlus}
            title="Registrar interacción"
            subtitle="Deja constancia de un contacto ya realizado con un prospecto o cliente. Para algo por hacer, programe un seguimiento."
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-crm-interaccion" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar interacción"}
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

            <form id="form-crm-interaccion" onSubmit={guardar} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="md:col-span-2 text-xs" style={{ color: COLORS.muted }}>
                    El identificador se asigna automáticamente al guardar y la interacción queda registrada a su nombre.
                </p>

                <EmpresaSelect value={empresa} onChange={elegirEmpresa} label="Empresa *" />
                <ContactoSelect
                    tipo={empresa?.tipo}
                    idEmpresa={empresa?.idEmpresa}
                    value={form.idContacto}
                    onChange={(id) => setForm((f) => ({ ...f, idContacto: id }))}
                    label="Contacto"
                />

                <FieldLabel label="Tipo de interacción *">
                    <select value={form.tipo} onChange={set("tipo")} className={inputClass} style={inputStyle}>
                        <option value="">Seleccionar...</option>
                        {TIPOS_INTERACCION.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="Fecha y hora *">
                    <input type="datetime-local" value={form.fecha} onChange={set("fecha")} max={maxFecha} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <div className="md:col-span-2">
                    <FieldLabel label="Descripción *">
                        <textarea
                            value={form.descripcion}
                            onChange={set("descripcion")}
                            maxLength={api.MAX_DESCRIPCION}
                            rows={4}
                            placeholder="¿Qué se habló o se hizo en este contacto?"
                            className={inputClass}
                            style={inputStyle}
                        />
                        <span className="block text-xs mt-1 text-right" style={{ color: COLORS.muted }}>
                            {form.descripcion.length}/{api.MAX_DESCRIPCION}
                        </span>
                    </FieldLabel>
                </div>

                <FieldLabel label="Resultado">
                    <input value={form.resultado} onChange={set("resultado")} maxLength={api.MAX_RESULTADO} placeholder="Ej. Interesado en cotización" className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Próximo paso">
                    <input value={form.proximoPaso} onChange={set("proximoPaso")} maxLength={api.MAX_PROXIMO_PASO} placeholder="Ej. Enviar propuesta el viernes" className={inputClass} style={inputStyle} />
                </FieldLabel>

                <div className="md:col-span-2">
                    <FieldLabel label="Cotización relacionada">
                        <select
                            value={form.idCotizacion}
                            onChange={set("idCotizacion")}
                            disabled={!empresa}
                            className={inputClass}
                            style={inputStyle}
                        >
                            <option value="">{!empresa ? "Primero elija la empresa" : cotizaciones.length === 0 ? "La empresa no tiene cotizaciones" : "Sin cotización relacionada"}</option>
                            {cotizaciones.map((c) => (
                                <option key={c.idCotizacion} value={c.idCotizacion}>
                                    {c.codigo} · {c.estado} · {api.montoCotizacion(c.monto, c.moneda)} · {fechaLocal(c.fecha)}
                                </option>
                            ))}
                        </select>
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}
