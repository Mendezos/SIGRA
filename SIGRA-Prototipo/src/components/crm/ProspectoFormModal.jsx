import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Pencil, UserPlus } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmProspectosService";
import ProspectoCampo from "./ProspectoCampo";
import { atributosControl } from "./prospectoControl";

const MAX_JUSTIFICACION = 300;

function formularioInicial(prospecto) {
    return {
        empresa: prospecto?.empresa ?? "",
        sector: prospecto?.sector ?? "",
        direccion: prospecto?.direccion ?? "",
        telefono: prospecto?.telefono ?? "",
        correo: prospecto?.correo ?? "",
        contacto: prospecto?.contacto ?? "",
        tamanoFlota: prospecto?.tamanoFlota == null ? "" : String(prospecto.tamanoFlota),
        fuente: prospecto?.fuente ?? "",
        idVendedor: prospecto?.idVendedor ? String(prospecto.idVendedor) : "",
    };
}

// Alta (CRMGPSC-001) y edición (CRMGPSC-003) de un prospecto.
// onSaved(prospecto, mensaje) · onAbrirExistente(idProspecto) abre para editar el prospecto coincidente.
export default function ProspectoFormModal({ user, prospecto, onClose, onSaved, onAbrirExistente }) {
    const editando = Boolean(prospecto);
    const [form, setForm] = useState(() => formularioInicial(prospecto));
    const [vendedores, setVendedores] = useState(null);
    const [errores, setErrores] = useState({});
    const [error, setError] = useState("");
    const [coincidencias, setCoincidencias] = useState(null);
    const [mensajeCoincidencia, setMensajeCoincidencia] = useState("");
    const [continuar, setContinuar] = useState(false);
    const [justificacion, setJustificacion] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        catalogos
            .listarVendedores()
            .then((lista) => {
                if (!activo) return;
                setVendedores(lista);
                // El vendedor que registra queda preseleccionado (el administrador debe elegir).
                if (!prospecto) {
                    setForm((f) => (f.idVendedor || !lista.some((v) => v.idUsuario === user?.idUsuario) ? f : { ...f, idVendedor: String(user.idUsuario) }));
                }
            })
            .catch(() => activo && (setVendedores([]), setError("No se pudo cargar la lista de vendedores.")));
        return () => {
            activo = false;
        };
    }, [prospecto, user]);

    const vendedorActualInactivo = editando && Boolean(prospecto.idVendedor) && vendedores !== null && !vendedores.some((v) => v.idUsuario === prospecto.idVendedor);

    const set = (campo) => (e) => {
        const valor = e.target.value;
        setForm((f) => ({ ...f, [campo]: valor }));
        if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
        // Si se cambian los datos, las coincidencias mostradas dejan de ser válidas.
        if (coincidencias) {
            setCoincidencias(null);
            setContinuar(false);
        }
    };

    async function guardar(e) {
        e.preventDefault();
        if (guardando) return;
        setError("");

        const { mensaje, errores: erroresCliente } = api.validarProspecto(form, { requiereVendedor: !(editando && vendedorActualInactivo) });
        let mensajeError = mensaje;
        if (continuar) {
            if (!justificacion.trim()) erroresCliente.justificacion = "Ingrese la justificación para continuar.";
            else if (justificacion.trim().length > MAX_JUSTIFICACION) erroresCliente.justificacion = `No puede superar los ${MAX_JUSTIFICACION} caracteres.`;
            if (erroresCliente.justificacion && !mensajeError) mensajeError = "Debe ingresar la justificación para registrar el prospecto a pesar de las coincidencias.";
        }
        setErrores(erroresCliente);
        if (Object.keys(erroresCliente).length > 0) {
            setError(mensajeError);
            return;
        }

        const cuerpo = {
            empresa: form.empresa,
            sector: form.sector,
            direccion: form.direccion,
            telefono: form.telefono,
            correo: form.correo,
            contacto: form.contacto,
            tamanoFlota: form.tamanoFlota.trim() === "" ? null : Number(form.tamanoFlota),
            fuente: form.fuente,
        };

        setGuardando(true);
        try {
            if (editando) {
                const cambioVendedor = form.idVendedor && Number(form.idVendedor) !== prospecto.idVendedor;
                const guardado = await api.editarProspecto(prospecto.idProspecto, { ...cuerpo, idVendedor: cambioVendedor ? Number(form.idVendedor) : null });
                onSaved(guardado, `Los datos del prospecto ${api.codigoProspecto(prospecto.idProspecto)} se actualizaron correctamente.`);
                return;
            }
            const respuesta = await api.registrarProspecto({
                ...cuerpo,
                estado: "Nuevo",
                idVendedor: Number(form.idVendedor),
                confirmarDuplicado: continuar,
                justificacionDuplicado: continuar ? justificacion : null,
            });
            if (respuesta.requiereConfirmacion) {
                setCoincidencias(respuesta.coincidencias);
                setMensajeCoincidencia(respuesta.mensaje);
                return;
            }
            onSaved(respuesta.prospecto, respuesta.mensaje);
        } catch (err) {
            if (err instanceof ApiError) {
                setErrores(api.erroresDelServidor(err.errores));
                setError(err.message);
            } else {
                setError("No se pudo guardar el prospecto.");
            }
        } finally {
            setGuardando(false);
        }
    }

    const enRevision = Boolean(coincidencias);
    const campoProps = (campo, extra) => atributosControl(errores[campo], extra);

    return (
        <Modal
            open
            onClose={onClose}
            icon={editando ? Pencil : UserPlus}
            title={editando ? `Editar prospecto ${api.codigoProspecto(prospecto.idProspecto)}` : "Registrar prospecto"}
            subtitle={editando ? prospecto.empresa : "Los campos marcados con * son obligatorios. Debe ingresar al menos un teléfono o un correo."}
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" form="form-prospecto" disabled={guardando || (enRevision && !continuar)}>
                        {guardando ? "Guardando..." : enRevision ? "Registrar con justificación" : editando ? "Guardar cambios" : "Guardar"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            {enRevision && (
                <div className="rounded-xl p-4 mb-5" style={{ border: "1px solid #E7C873", backgroundColor: "#FEF9E7" }} data-testid="coincidencias">
                    <p className="flex items-start gap-2 text-sm mb-3" style={{ color: "#92400E", fontWeight: 600 }}>
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        {mensajeCoincidencia}
                    </p>
                    <ul className="space-y-2 mb-4">
                        {coincidencias.map((c) => (
                            <li key={`${c.tipo}-${c.idEmpresa}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                                <span style={{ color: COLORS.charcoal }}>
                                    <strong>{c.empresa}</strong> · {c.tipo} {c.tipo === "Prospecto" ? api.codigoProspecto(c.idEmpresa) : `#${c.idEmpresa}`} · {c.estado}
                                    <span className="block text-xs" style={{ color: COLORS.muted }}>
                                        Coincide por {c.motivoCoincidencia}
                                    </span>
                                </span>
                                {c.tipo === "Prospecto" && onAbrirExistente && (
                                    <Button className="flex items-center gap-1.5" onClick={() => onAbrirExistente(c.idEmpresa)}>
                                        <ExternalLink size={14} /> Abrir el existente (editar)
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {!continuar ? (
                        <Button onClick={() => setContinuar(true)}>Continuar de todas formas</Button>
                    ) : (
                        <ProspectoCampo label="Justificación para registrarlo de todas formas *" error={errores.justificacion}>
                            <textarea
                                value={justificacion}
                                onChange={(e) => {
                                    setJustificacion(e.target.value);
                                    if (errores.justificacion) setErrores((er) => ({ ...er, justificacion: undefined }));
                                }}
                                rows={3}
                                maxLength={MAX_JUSTIFICACION}
                                placeholder="Ej. Es otra sucursal con otra administración."
                                {...atributosControl(errores.justificacion)}
                            />
                        </ProspectoCampo>
                    )}
                </div>
            )}

            <form id="form-prospecto" onSubmit={guardar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="sm:col-span-2">
                    <ProspectoCampo label="Nombre de la empresa *" error={errores.empresa}>
                        <input value={form.empresa} onChange={set("empresa")} maxLength={150} {...campoProps("empresa")} />
                    </ProspectoCampo>
                </div>

                <ProspectoCampo label="Sector *" error={errores.sector}>
                    <select value={form.sector} onChange={set("sector")} {...campoProps("sector")}>
                        <option value="">Seleccione un sector</option>
                        {catalogos.SECTORES_EMPRESA.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </ProspectoCampo>

                <ProspectoCampo label="Fuente del contacto *" error={errores.fuente}>
                    <select value={form.fuente} onChange={set("fuente")} {...campoProps("fuente")}>
                        <option value="">Seleccione una fuente</option>
                        {catalogos.FUENTES_PROSPECTO.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </ProspectoCampo>

                <div className="sm:col-span-2">
                    <ProspectoCampo label="Dirección" error={errores.direccion}>
                        <input value={form.direccion} onChange={set("direccion")} maxLength={300} {...campoProps("direccion")} />
                    </ProspectoCampo>
                </div>

                <ProspectoCampo label="Teléfono" error={errores.telefono}>
                    <input value={form.telefono} onChange={set("telefono")} maxLength={20} inputMode="tel" placeholder="Ej. 2222-3333" {...campoProps("telefono")} />
                </ProspectoCampo>

                <ProspectoCampo label="Correo electrónico" error={errores.correo}>
                    <input value={form.correo} onChange={set("correo")} maxLength={150} inputMode="email" placeholder="nombre@empresa.com" {...campoProps("correo")} />
                </ProspectoCampo>

                <ProspectoCampo label="Nombre del contacto" error={errores.contacto}>
                    <input value={form.contacto} onChange={set("contacto")} maxLength={150} {...campoProps("contacto")} />
                </ProspectoCampo>

                <ProspectoCampo label="Tamaño estimado de la flota de radios" error={errores.tamanoFlota}>
                    <input value={form.tamanoFlota} onChange={set("tamanoFlota")} inputMode="numeric" placeholder="Cantidad de radios" {...campoProps("tamanoFlota")} />
                </ProspectoCampo>

                {!editando && (
                    <ProspectoCampo label="Estado" ayuda="Todo prospecto nuevo inicia en la etapa Nuevo.">
                        <input value="Nuevo" readOnly disabled {...atributosControl(null)} />
                    </ProspectoCampo>
                )}

                <ProspectoCampo label={`Vendedor responsable${vendedorActualInactivo ? "" : " *"}`} error={errores.idVendedor}>
                    <select value={form.idVendedor} onChange={set("idVendedor")} {...campoProps("idVendedor")}>
                        <option value="">{vendedorActualInactivo ? `${prospecto.vendedor} (inactivo): elija uno activo para cambiarlo` : "Seleccione un vendedor activo"}</option>
                        {(vendedores ?? []).map((v) => (
                            <option key={v.idUsuario} value={v.idUsuario}>
                                {v.nombre}
                            </option>
                        ))}
                    </select>
                </ProspectoCampo>
            </form>
        </Modal>
    );
}
