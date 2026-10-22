import { useState } from "react";
import { Search, RadioTower } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";

const vacio = {
    frecuencia: "",
    frecuenciaRecepcion: "",
    potencia: "",
    accesorios: "",
    direccionInstalacion: "",
    coordenadasGPS: "",
    clasificacion: "",
};

const soloLectura = { ...inputStyle, backgroundColor: COLORS.greenTint };

// Alta (repetidora sin ficha) o edición (repetidora con ficha) de la ficha técnica.
export default function FichaRepetidoraFormModal({ repetidora, onClose, onSaved }) {
    const edicion = !!repetidora?.tieneFicha;
    const [serie, setSerie] = useState(repetidora?.numeroSerie ?? "");
    const [encontrada, setEncontrada] = useState(repetidora ?? null);
    const [form, setForm] = useState(
        edicion
            ? {
                  frecuencia: repetidora.frecuencia ?? "",
                  frecuenciaRecepcion: repetidora.frecuenciaRecepcion ?? "",
                  potencia: repetidora.potencia ?? "",
                  accesorios: repetidora.accesorios ?? "",
                  direccionInstalacion: repetidora.direccionInstalacion ?? "",
                  coordenadasGPS: repetidora.coordenadasGPS ?? "",
                  clasificacion: repetidora.clasificacion ?? "",
              }
            : vacio
    );
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [buscando, setBuscando] = useState(false);

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    async function buscar() {
        setError("");
        setErrores([]);
        setEncontrada(null);
        if (!serie.trim()) {
            setError("Debe indicar el número de serie de la repetidora.");
            return;
        }
        setBuscando(true);
        try {
            const r = await api.obtenerRepetidoraPorSerie(serie.trim());
            if (r.tieneFicha) {
                setError("La repetidora ya tiene una ficha técnica registrada. Edítela desde la consulta de la ficha.");
                return;
            }
            setEncontrada(r);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo consultar la repetidora.");
        } finally {
            setBuscando(false);
        }
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);
        setGuardando(true);
        try {
            const datos = { numeroSerie: serie, modelo: encontrada?.modelo ?? "", ...form };
            const guardada = edicion ? await api.actualizarFichaRepetidora(datos) : await api.registrarFichaRepetidora(datos);
            onSaved(guardada, edicion);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar la ficha técnica.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    const campo = (label, name, props = {}) => (
        <FieldLabel label={label}>
            <input value={form[name]} onChange={set(name)} className={inputClass} style={inputStyle} {...props} />
        </FieldLabel>
    );

    return (
        <Modal
            open
            onClose={onClose}
            icon={RadioTower}
            title={edicion ? "Editar ficha técnica de la repetidora" : "Registrar ficha técnica de repetidora"}
            subtitle="Características técnicas y lugar de instalación de la repetidora asignada a un contrato."
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-ficha-repetidora" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar ficha"}
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

            <form id="form-ficha-repetidora" onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <FieldLabel label="Número de serie de la repetidora *">
                        <div className="flex gap-2">
                            <input
                                value={serie}
                                onChange={(e) => { setSerie(e.target.value); setEncontrada(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } }}
                                disabled={edicion}
                                maxLength={50}
                                className={inputClass}
                                style={inputStyle}
                            />
                            {!edicion && (
                                <Button type="button" onClick={buscar} disabled={buscando} className="flex items-center gap-1.5 shrink-0">
                                    <Search size={14} /> {buscando ? "Buscando..." : "Buscar"}
                                </Button>
                            )}
                        </div>
                    </FieldLabel>
                </div>

                <FieldLabel label="Modelo *">
                    <input
                        value={encontrada ? `${encontrada.marca} ${encontrada.modelo}` : ""}
                        readOnly
                        placeholder="Se completa al buscar el número de serie"
                        className={inputClass}
                        style={soloLectura}
                    />
                </FieldLabel>
                <FieldLabel label="Contrato de alquiler">
                    <input
                        value={encontrada?.idContrato ? `${api.codigoContrato(encontrada.idContrato)} · ${encontrada.empresa}` : ""}
                        readOnly
                        placeholder="Contrato vinculado"
                        className={inputClass}
                        style={soloLectura}
                    />
                </FieldLabel>

                {campo("Frecuencia de transmisión *", "frecuencia", { maxLength: 30, placeholder: "Ej. 450.125 MHz" })}
                {campo("Frecuencia de recepción *", "frecuenciaRecepcion", { maxLength: 30, placeholder: "Ej. 455.125 MHz" })}
                {campo("Potencia *", "potencia", { maxLength: 30, placeholder: "Ej. 40 W" })}
                {campo("Coordenadas GPS (opcional)", "coordenadasGPS", { maxLength: 50, placeholder: "Ej. 9.934100, -84.087700" })}

                <div className="md:col-span-2">
                    <FieldLabel label="Clasificación de la repetidora *">
                        <select value={form.clasificacion} onChange={set("clasificacion")} className={inputClass} style={inputStyle}>
                            <option value="">Seleccionar...</option>
                            <option value="Alquilada por Radifax">Alquilada por Radifax (facturable)</option>
                            <option value="Propia del cliente">Propia del cliente (sin cobro)</option>
                        </select>
                    </FieldLabel>
                </div>
                <div className="md:col-span-2">
                    {campo("Dirección de instalación *", "direccionInstalacion", { maxLength: 200, placeholder: "Lugar exacto donde se instala la repetidora" })}
                </div>
                <div className="md:col-span-2">
                    <FieldLabel label="Accesorios">
                        <textarea
                            value={form.accesorios}
                            onChange={set("accesorios")}
                            maxLength={500}
                            rows={2}
                            placeholder="Duplexor, antena, cable coaxial, UPS..."
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}
