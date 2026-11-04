import { useState } from "react";
import { FileText } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";

/**
 * Con `plantilla` edita: el nombre y el tipo no cambian, y guardar crea una versión nueva con su motivo.
 * Sin `plantilla` registra una plantilla nueva en su versión 1.
 */
export default function PlantillaFormModal({ plantilla, categorias, onClose, onSaved }) {
    const edita = !!plantilla;
    const [form, setForm] = useState({
        nombre: plantilla?.nombre ?? "",
        idCategoria: plantilla?.idCategoria ? String(plantilla.idCategoria) : "",
        clausulas: plantilla?.clausulas ?? "",
        responsabilidades: plantilla?.responsabilidades ?? "",
        condicionesCancelacion: plantilla?.condicionesCancelacion ?? "",
        motivo: "",
        activa: true,
    });
    const [error, setError] = useState("");
    const [faltantes, setFaltantes] = useState([]);
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    const marca = (campo) => (faltantes.includes(campo) ? { ...inputStyle, borderColor: "#C0392B" } : inputStyle);

    async function guardar(e) {
        e.preventDefault();
        const falta = [];
        if (!edita && !form.nombre.trim()) falta.push("nombre");
        if (!form.clausulas.trim()) falta.push("clausulas");
        if (!form.responsabilidades.trim()) falta.push("responsabilidades");
        if (edita && !form.motivo.trim()) falta.push("motivo");
        setFaltantes(falta);
        if (falta.length > 0) {
            setError("Complete los campos marcados antes de guardar.");
            return;
        }

        setError("");
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre,
                idCategoria: form.idCategoria ? Number(form.idCategoria) : null,
                clausulas: form.clausulas,
                responsabilidades: form.responsabilidades,
                condicionesCancelacion: form.condicionesCancelacion,
                motivo: form.motivo,
                activa: form.activa,
            };
            onSaved(edita ? await api.editarPlantilla(plantilla.id, datos) : await api.registrarPlantilla(datos));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar la plantilla.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={FileText}
            title={edita ? `Editar plantilla: ${plantilla.nombre}` : "Nueva plantilla de contrato"}
            subtitle={edita ? `Se creará la versión ${plantilla.versionActual + 1}. Los contratos anteriores conservan su versión.` : "Cláusulas aprobadas por Radifax para reutilizar en los contratos."}
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-plantilla" disabled={guardando}>
                        {guardando ? "Guardando..." : edita ? "Guardar nueva versión" : "Guardar plantilla"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <form id="form-plantilla" onSubmit={guardar} className="space-y-4" noValidate>
                {!edita && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldLabel label="Nombre *">
                            <input value={form.nombre} onChange={cambiar("nombre")} maxLength={120} className={inputClass} style={marca("nombre")} autoFocus />
                        </FieldLabel>
                        <FieldLabel label="Tipo de equipo">
                            <select value={form.idCategoria} onChange={cambiar("idCategoria")} className={inputClass} style={inputStyle}>
                                <option value="">Cualquier equipo</option>
                                {categorias.map((c) => <option key={c.idCategoria ?? c.id} value={c.idCategoria ?? c.id}>{c.nombre}</option>)}
                            </select>
                        </FieldLabel>
                    </div>
                )}

                <FieldLabel label="Cláusulas *">
                    <textarea value={form.clausulas} onChange={cambiar("clausulas")} rows={6} maxLength={20000} className={inputClass} style={marca("clausulas")} />
                </FieldLabel>
                <FieldLabel label="Responsabilidades del cliente *">
                    <textarea value={form.responsabilidades} onChange={cambiar("responsabilidades")} rows={4} maxLength={20000} className={inputClass} style={marca("responsabilidades")} />
                </FieldLabel>
                <FieldLabel label="Condiciones de cancelación anticipada">
                    <textarea value={form.condicionesCancelacion} onChange={cambiar("condicionesCancelacion")} rows={3} maxLength={20000} className={inputClass} style={inputStyle} />
                </FieldLabel>

                {edita ? (
                    <FieldLabel label="Motivo del cambio *">
                        <input value={form.motivo} onChange={cambiar("motivo")} maxLength={300} className={inputClass} style={marca("motivo")} />
                    </FieldLabel>
                ) : (
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.activa} onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))} />
                        Dejar la plantilla activa para usarla en contratos nuevos
                    </label>
                )}
            </form>
        </Modal>
    );
}
