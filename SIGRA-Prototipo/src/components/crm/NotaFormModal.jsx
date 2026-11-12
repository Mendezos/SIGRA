import { useRef, useState } from "react";
import { StickyNote } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { CATEGORIAS_NOTA, VISIBILIDADES_NOTA } from "../../services/crmCatalogosService";
import * as api from "../../services/crmHistorialService";
import EmpresaSelect from "./EmpresaSelect";

// Ventana para registrar una nota comercial: información que se guarda sin que haya un contacto directo (CRMGPSC-013).
// `empresaInicial` ({ tipo, idEmpresa }) viene preseleccionada desde el historial; se puede cambiar.
export default function NotaFormModal({ empresaInicial, onClose, onSaved }) {
    const [empresa, setEmpresa] = useState(empresaInicial ?? null);
    const [form, setForm] = useState({ categoria: "", texto: "", visibilidad: "Equipo" });
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false); // evita el doble envío aunque el estado aún no se haya repintado

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    async function guardar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        setErrores([]);

        const texto = form.texto.trim();
        const faltantes = [];
        if (!empresa) faltantes.push("Empresa");
        if (!form.categoria) faltantes.push("Categoría");
        if (!texto) faltantes.push("Texto de la nota");
        if (faltantes.length > 0) {
            setError(api.MENSAJE_NOTA_INCOMPLETA);
            setErrores(faltantes);
            return;
        }
        if (texto.length > api.MAX_TEXTO_NOTA) return setError(`El texto de la nota no puede superar los ${api.MAX_TEXTO_NOTA} caracteres.`);

        enviando.current = true;
        setGuardando(true);
        try {
            const registrada = await api.registrarNota({
                tipoEmpresa: empresa.tipo,
                idEmpresa: empresa.idEmpresa,
                categoria: form.categoria,
                texto,
                visibilidad: form.visibilidad,
            });
            onSaved(registrada);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar la nota.");
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
            icon={StickyNote}
            title="Registrar nota"
            subtitle="Guarda información sobre la empresa sin registrar un contacto directo."
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-crm-nota" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar nota"}
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

            <form id="form-crm-nota" onSubmit={guardar} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="md:col-span-2 text-xs" style={{ color: COLORS.muted }}>
                    El identificador se asigna automáticamente al guardar; la nota queda a su nombre con la fecha y hora de este momento.
                </p>

                <div className="md:col-span-2">
                    <EmpresaSelect value={empresa} onChange={(e) => setEmpresa(e ? { tipo: e.tipo, idEmpresa: e.idEmpresa } : null)} label="Empresa *" />
                </div>

                <FieldLabel label="Categoría *">
                    <select value={form.categoria} onChange={set("categoria")} className={inputClass} style={inputStyle}>
                        <option value="">Seleccionar...</option>
                        {CATEGORIAS_NOTA.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="Visibilidad *">
                    <select value={form.visibilidad} onChange={set("visibilidad")} className={inputClass} style={inputStyle}>
                        {VISIBILIDADES_NOTA.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                </FieldLabel>

                <div className="md:col-span-2">
                    <FieldLabel label="Texto de la nota *">
                        <textarea
                            value={form.texto}
                            onChange={set("texto")}
                            maxLength={api.MAX_TEXTO_NOTA}
                            rows={5}
                            placeholder="Escriba aquí la información que desea dejar registrada"
                            className={inputClass}
                            style={inputStyle}
                        />
                        <span className="block text-xs mt-1 text-right" style={{ color: COLORS.muted }}>
                            {form.texto.length}/{api.MAX_TEXTO_NOTA}
                        </span>
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}
