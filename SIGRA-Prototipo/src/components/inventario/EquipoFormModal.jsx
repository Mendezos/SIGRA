import { useEffect, useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/inventarioService";
import { hoyISO, leerFoto } from "./helpers";

const PROPIETARIOS = ["Radifax", "Cliente"];

const VACIO = {
    idCategoria: "",
    marca: "",
    modelo: "",
    descripcionTecnica: "",
    numeroSerie: "",
    idProveedor: "",
    propietario: "Radifax",
    ubicacion: "",
    fechaAdquisicion: "",
    costoCompra: "",
    cantidad: "1",
};

export default function EquipoFormModal({ open, onClose, onSaved }) {
    const [categorias, setCategorias] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [modelos, setModelos] = useState([]);
    const [values, setValues] = useState(VACIO);
    const [foto, setFoto] = useState(null);
    const [serieExiste, setSerieExiste] = useState(false);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!open) return;
        let activo = true;

        Promise.resolve().then(() => {
            if (!activo) return;
            setValues(VACIO);
            setFoto(null);
            setSerieExiste(false);
            setError("");
            setErrores([]);
        });

        Promise.all([api.listarCategorias(), api.listarProveedores(), api.listarModelos()])
            .then(([cats, provs, mods]) => {
                if (!activo) return;
                setCategorias(cats);
                setProveedores(provs);
                setModelos(mods);
            })
            .catch((e) => activo && setError(e.message ?? "No se pudieron cargar los catálogos."));

        return () => {
            activo = false;
        };
    }, [open]);

    const categoria = categorias.find((c) => String(c.idCategoria) === String(values.idCategoria));
    const modelosDeCategoria = useMemo(
        () => modelos.filter((m) => String(m.idCategoria) === String(values.idCategoria)),
        [modelos, values.idCategoria]
    );
    const marcas = [...new Set(modelosDeCategoria.map((m) => m.marca))];
    const modelosDeMarca = modelosDeCategoria.filter((m) => m.marca.toLowerCase() === values.marca.trim().toLowerCase());

    if (!open) return null;

    function actualizar(clave, valor) {
        setValues((v) => ({ ...v, [clave]: valor }));
    }

    function alElegirModelo(valor) {
        const existente = modelosDeMarca.find((m) => m.modelo.toLowerCase() === valor.trim().toLowerCase());
        setValues((v) => ({
            ...v,
            modelo: valor,
            descripcionTecnica: existente?.descripcionTecnica && !v.descripcionTecnica
                ? existente.descripcionTecnica
                : v.descripcionTecnica,
        }));
    }

    async function verificarSerie() {
        const serie = values.numeroSerie.trim();
        if (!serie) {
            setSerieExiste(false);
            return;
        }
        try {
            const respuesta = await api.existeSerie(serie);
            setSerieExiste(!!respuesta?.existe);
        } catch {
            setSerieExiste(false);
        }
    }

    async function elegirFoto(e) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setError("");
        try {
            setFoto(await leerFoto(archivo));
        } catch (err) {
            setError(err.message);
        }
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);

        if (serieExiste) {
            setError("Ya existe un equipo registrado con ese número de serie.");
            return;
        }

        setGuardando(true);
        try {
            const ficha = await api.registrarEquipo({
                idCategoria: values.idCategoria ? Number(values.idCategoria) : null,
                marca: values.marca,
                modelo: values.modelo,
                descripcionTecnica: values.descripcionTecnica || null,
                numeroSerie: values.numeroSerie,
                idProveedor: values.idProveedor ? Number(values.idProveedor) : null,
                propietario: values.propietario,
                ubicacion: values.ubicacion || null,
                fechaAdquisicion: values.fechaAdquisicion || null,
                costoCompra: values.costoCompra === "" ? null : Number(values.costoCompra),
                foto,
                cantidad: categoria?.manejaCantidad ? Number(values.cantidad) : null,
            });
            onSaved(ficha);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar el equipo.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Registrar equipo"
            subtitle="Se crea la ficha individual del equipo con estado inicial Disponible."
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-equipo" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar equipo"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {errores.length > 0 && (
                        <ul className="list-disc ml-4 mt-1">
                            {errores.map((e) => <li key={e}>{e}</li>)}
                        </ul>
                    )}
                </Notice>
            )}

            <form id="form-equipo" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldLabel label="Categoría *">
                    <select
                        value={values.idCategoria}
                        onChange={(e) => setValues((v) => ({ ...v, idCategoria: e.target.value, marca: "", modelo: "" }))}
                        className={inputClass}
                        style={inputStyle}
                    >
                        <option value="" disabled>Seleccionar...</option>
                        {categorias.map((c) => (
                            <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>
                        ))}
                    </select>
                </FieldLabel>

                <FieldLabel label="Número de serie *">
                    <input
                        value={values.numeroSerie}
                        onChange={(e) => { actualizar("numeroSerie", e.target.value); setSerieExiste(false); }}
                        onBlur={verificarSerie}
                        maxLength={50}
                        className={inputClass}
                        style={{ ...inputStyle, borderColor: serieExiste ? COLORS.red : COLORS.border }}
                    />
                    {serieExiste && (
                        <span className="block text-xs mt-1" style={{ color: COLORS.red }}>
                            Ya existe un equipo registrado con ese número de serie.
                        </span>
                    )}
                </FieldLabel>

                <FieldLabel label="Marca *">
                    <input
                        value={values.marca}
                        onChange={(e) => actualizar("marca", e.target.value)}
                        list="lista-marcas"
                        maxLength={100}
                        className={inputClass}
                        style={inputStyle}
                    />
                    <datalist id="lista-marcas">
                        {marcas.map((m) => <option key={m} value={m} />)}
                    </datalist>
                </FieldLabel>

                <FieldLabel label="Modelo *">
                    <input
                        value={values.modelo}
                        onChange={(e) => alElegirModelo(e.target.value)}
                        list="lista-modelos"
                        maxLength={100}
                        className={inputClass}
                        style={inputStyle}
                    />
                    <datalist id="lista-modelos">
                        {modelosDeMarca.map((m) => <option key={m.idModelo} value={m.modelo} />)}
                    </datalist>
                </FieldLabel>

                <div className="sm:col-span-2">
                    <FieldLabel label="Descripción técnica">
                        <textarea
                            value={values.descripcionTecnica}
                            onChange={(e) => actualizar("descripcionTecnica", e.target.value)}
                            rows={2}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                </div>

                <FieldLabel label="Proveedor *">
                    <select
                        value={values.idProveedor}
                        onChange={(e) => actualizar("idProveedor", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    >
                        <option value="" disabled>Seleccionar...</option>
                        {proveedores.map((p) => (
                            <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>
                        ))}
                    </select>
                </FieldLabel>

                <FieldLabel label="Propietario del equipo">
                    <select
                        value={values.propietario}
                        onChange={(e) => actualizar("propietario", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    >
                        {PROPIETARIOS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </FieldLabel>

                <FieldLabel label="Fecha de adquisición *">
                    <input
                        type="date"
                        value={values.fechaAdquisicion}
                        max={hoyISO()}
                        onChange={(e) => actualizar("fechaAdquisicion", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>

                <FieldLabel label="Costo de compra (₡) *">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={values.costoCompra}
                        onChange={(e) => actualizar("costoCompra", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>

                <FieldLabel label="Ubicación">
                    <input
                        value={values.ubicacion}
                        onChange={(e) => actualizar("ubicacion", e.target.value)}
                        maxLength={150}
                        placeholder="Ej. Bodega San José"
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>

                {categoria?.manejaCantidad && (
                    <FieldLabel label="Cantidad en stock inicial *">
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={values.cantidad}
                            onChange={(e) => actualizar("cantidad", e.target.value)}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                )}

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Fotografía (opcional)</span>
                    {foto ? (
                        <div className="relative inline-block">
                            <img src={foto} alt="Vista previa del equipo" className="h-32 rounded-lg object-cover" style={{ border: `1px solid ${COLORS.border}` }} />
                            <button
                                type="button"
                                onClick={() => setFoto(null)}
                                aria-label="Quitar fotografía"
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-white"
                                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.red }}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ) : (
                        <label
                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm cursor-pointer w-fit"
                            style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.muted }}
                        >
                            <ImagePlus size={16} />
                            Adjuntar fotografía
                            <input type="file" accept="image/*" onChange={elegirFoto} className="hidden" />
                        </label>
                    )}
                </div>
            </form>
        </Modal>
    );
}
