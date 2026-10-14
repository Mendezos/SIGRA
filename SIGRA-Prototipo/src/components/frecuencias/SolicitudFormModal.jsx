import { useEffect, useState } from "react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import { esVendedor, extensionDe, fechaCorta, hoyISO, tamano } from "./helpers";

const soloLectura = { ...inputStyle, backgroundColor: COLORS.greenTint };

// Mismos mensajes que devuelve el servidor, para avisar antes de enviar.
const MENSAJE_SIN_CLIENTE = "Debe indicar el cliente vinculado a la solicitud";
const MENSAJE_SIN_REPETIDORA = "Debe seleccionar la repetidora asociada a la solicitud";
const MENSAJE_DATOS_TECNICOS = "Debe completar los datos técnicos obligatorios de la solicitud";

function validarArchivo(archivo) {
    if (!api.EXTENSIONES_DOCUMENTO.includes(extensionDe(archivo.name))) return api.MENSAJE_FORMATO_DOCUMENTO;
    if (archivo.size > api.TAMANO_MAXIMO_DOCUMENTO) return api.MENSAJE_TAMANO_DOCUMENTO;
    return "";
}

function SelectorArchivos({ label, archivos, onChange }) {
    function elegir(e) {
        onChange(Array.from(e.target.files ?? []).map((archivo) => ({ archivo, error: validarArchivo(archivo) })));
    }

    return (
        <FieldLabel label={label}>
            <input type="file" multiple onChange={elegir} className={inputClass} style={inputStyle} />
            {archivos.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                    {archivos.map(({ archivo, error }) => (
                        <li key={archivo.name + archivo.size} className="flex flex-wrap gap-x-2">
                            <span>{archivo.name}</span>
                            <span style={{ color: COLORS.muted }}>({tamano(archivo.size)})</span>
                            {error && <span style={{ color: COLORS.red, fontWeight: 600 }}>{error}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </FieldLabel>
    );
}

export default function SolicitudFormModal({ user, renovacionDe, onClose, onSaved }) {
    const vendedorSesion = esVendedor(user.role);
    const [clientes, setClientes] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [repetidoras, setRepetidoras] = useState([]);
    const [cargandoRepetidoras, setCargandoRepetidoras] = useState(false);
    const [form, setForm] = useState({
        idCliente: renovacionDe ? String(renovacionDe.idCliente) : "",
        idEquipo: renovacionDe ? String(renovacionDe.idEquipo) : "",
        idVendedor: renovacionDe ? String(renovacionDe.idVendedor) : "",
        frecuencia: renovacionDe?.frecuencia ?? "",
        banda: renovacionDe?.banda ?? "",
        potencia: renovacionDe?.potencia ?? "",
        zonaCobertura: renovacionDe?.zonaCobertura ?? "",
        fechaPresentacion: hoyISO(),
    });
    const [formularios, setFormularios] = useState([]);
    const [acuses, setAcuses] = useState([]);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    useEffect(() => {
        let activo = true;
        api.listarClientes()
            .then((lista) => activo && setClientes(lista))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudieron cargar los clientes."));
        if (!vendedorSesion) {
            api.listarVendedores()
                .then((lista) => activo && setVendedores(lista))
                .catch(() => activo && setError("No se pudieron cargar los vendedores."));
        }
        // En una renovación el cliente y la repetidora ya vienen definidos por la frecuencia original.
        if (renovacionDe) {
            api.listarRepetidorasDeCliente(renovacionDe.idCliente)
                .then((lista) => activo && setRepetidoras(lista))
                .catch(() => activo && setError("No se pudieron cargar las repetidoras del cliente."));
        }
        return () => {
            activo = false;
        };
    }, [vendedorSesion, renovacionDe]);

    // Las repetidoras disponibles dependen del cliente elegido.
    async function elegirCliente(e) {
        const idCliente = e.target.value;
        setForm((f) => ({ ...f, idCliente, idEquipo: "" }));
        setRepetidoras([]);
        if (!idCliente) return;
        setCargandoRepetidoras(true);
        try {
            setRepetidoras(await api.listarRepetidorasDeCliente(idCliente));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudieron cargar las repetidoras del cliente.");
        } finally {
            setCargandoRepetidoras(false);
        }
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);

        if (!form.idCliente) return setError(MENSAJE_SIN_CLIENTE);
        if (!form.idEquipo) return setError(MENSAJE_SIN_REPETIDORA);

        const faltantes = [];
        if (!form.frecuencia.trim()) faltantes.push("Frecuencia solicitada");
        if (!form.banda) faltantes.push("Banda");
        if (!form.potencia.trim()) faltantes.push("Potencia");
        if (!form.zonaCobertura.trim()) faltantes.push("Zona geográfica de cobertura");
        if (faltantes.length > 0) {
            setError(MENSAJE_DATOS_TECNICOS);
            setErrores(faltantes);
            return;
        }

        if (!form.fechaPresentacion) return setError("Debe indicar la fecha de presentación del trámite ante el gobierno");
        if (renovacionDe?.fechaOtorgamiento && form.fechaPresentacion < renovacionDe.fechaOtorgamiento.slice(0, 10)) {
            return setError("La fecha de presentación de la renovación no puede ser anterior a la fecha de otorgamiento de la frecuencia original.");
        }
        if (!vendedorSesion && !form.idVendedor) return setError("Debe indicar el vendedor responsable de la solicitud");

        const adjuntos = [...formularios, ...acuses];
        if (adjuntos.length > api.MAXIMO_DOCUMENTOS) return setError(`Se pueden adjuntar hasta ${api.MAXIMO_DOCUMENTOS} documentos por solicitud.`);
        const invalido = adjuntos.find((a) => a.error);
        if (invalido) return setError(`${invalido.archivo.name}: ${invalido.error}`);

        setGuardando(true);
        try {
            const guardada = await api.registrarSolicitud({
                ...form,
                idSolicitudOrigen: renovacionDe?.idSolicitud,
                formularios: formularios.map((a) => a.archivo),
                acuses: acuses.map((a) => a.archivo),
            });
            onSaved(guardada);
        } catch (err) {
            const mensaje = err instanceof ApiError && err.status === 413 ? api.MENSAJE_TAMANO_DOCUMENTO : err.message;
            setError(mensaje || "No se pudo registrar la solicitud.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={renovacionDe ? `Renovar frecuencia ${api.codigoSolicitud(renovacionDe.idSolicitud)}` : "Nueva solicitud de frecuencia"}
            subtitle={
                renovacionDe
                    ? `${renovacionDe.empresa} · ${renovacionDe.frecuencia} · vence el ${fechaCorta(renovacionDe.fechaVencimiento)}`
                    : "Inicia el trámite ante la entidad gubernamental para la repetidora de un cliente."
            }
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-solicitud-frecuencia" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar solicitud"}
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

            {renovacionDe && (
                <Notice tone="warning">
                    Se registrará una nueva solicitud vinculada a la frecuencia original, que conserva todo su historial y pasará a
                    &quot;En renovación&quot;. Cuando el gobierno apruebe la renovación (registrando su otorgamiento), la nueva frecuencia quedará
                    &quot;Vigente&quot; con un nuevo vencimiento a 5 años, la original quedará &quot;Renovada&quot; y las alertas se reiniciarán.
                </Notice>
            )}

            <form id="form-solicitud-frecuencia" onSubmit={guardar} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldLabel label="ID de la solicitud">
                    <input value="Se asigna automáticamente al guardar" readOnly className={inputClass} style={soloLectura} />
                </FieldLabel>
                <FieldLabel label="Estado inicial">
                    <input value={api.ESTADO_INICIAL} readOnly className={inputClass} style={soloLectura} />
                </FieldLabel>

                <FieldLabel label="Cliente vinculado *">
                    <select value={form.idCliente} onChange={elegirCliente} disabled={!!renovacionDe} className={inputClass} style={inputStyle}>
                        <option value="">Seleccionar...</option>
                        {clientes.map((c) => <option key={c.idCliente} value={c.idCliente}>{c.empresa}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="Repetidora asociada *">
                    <select
                        value={form.idEquipo}
                        onChange={set("idEquipo")}
                        disabled={!!renovacionDe || !form.idCliente || cargandoRepetidoras}
                        className={inputClass}
                        style={inputStyle}
                    >
                        <option value="">
                            {!form.idCliente
                                ? "Seleccione primero el cliente"
                                : cargandoRepetidoras
                                  ? "Cargando..."
                                  : repetidoras.length === 0
                                    ? "El cliente no tiene repetidoras en alquiler"
                                    : "Seleccionar..."}
                        </option>
                        {repetidoras.map((r) => (
                            <option key={r.idEquipo} value={r.idEquipo}>
                                {r.numeroSerie} · {r.marca} {r.modelo} · {`CT-${String(r.idContrato).padStart(4, "0")}`}
                            </option>
                        ))}
                    </select>
                </FieldLabel>

                <FieldLabel label="Frecuencia solicitada *">
                    <input value={form.frecuencia} onChange={set("frecuencia")} maxLength={30} placeholder="Ej. 450.125 MHz" className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Banda *">
                    <select value={form.banda} onChange={set("banda")} className={inputClass} style={inputStyle}>
                        <option value="">Seleccionar...</option>
                        {api.BANDAS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="Potencia *">
                    <input value={form.potencia} onChange={set("potencia")} maxLength={30} placeholder="Ej. 40 W" className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label={renovacionDe ? "Fecha de presentación del trámite de renovación *" : "Fecha de presentación del trámite *"}>
                    <input type="date" value={form.fechaPresentacion} onChange={set("fechaPresentacion")} max={hoyISO()} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <div className="md:col-span-2">
                    <FieldLabel label="Zona geográfica de cobertura *">
                        <input value={form.zonaCobertura} onChange={set("zonaCobertura")} maxLength={200} placeholder="Ej. Zona Sur: Golfito, Corredores y Osa" className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>

                <div className="md:col-span-2">
                    <FieldLabel label="Vendedor responsable (recibe las alertas de vencimiento)">
                        {vendedorSesion ? (
                            <input value={user.name} readOnly className={inputClass} style={soloLectura} />
                        ) : (
                            <select value={form.idVendedor} onChange={set("idVendedor")} className={inputClass} style={inputStyle}>
                                <option value="">Seleccionar...</option>
                                {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                            </select>
                        )}
                    </FieldLabel>
                </div>

                <div className="md:col-span-2 rounded-lg border p-4" style={{ borderColor: COLORS.border }}>
                    <p className="text-sm mb-1" style={{ fontWeight: 600, color: COLORS.charcoal }}>Documentos del trámite (opcional)</p>
                    <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
                        PDF, JPG, PNG o XLSX, máximo 10 MB cada uno. También se pueden adjuntar después desde el detalle de la solicitud.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectorArchivos label="Formularios presentados" archivos={formularios} onChange={setFormularios} />
                        <SelectorArchivos label="Acuse de recibo" archivos={acuses} onChange={setAcuses} />
                    </div>
                </div>
            </form>
        </Modal>
    );
}
