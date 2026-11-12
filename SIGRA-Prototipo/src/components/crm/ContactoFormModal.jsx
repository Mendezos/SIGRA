import { useState } from "react";
import { AlertTriangle, Pencil, UserPlus } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmProspectosService";
import { hoyISO } from "./helpers";
import EmpresaSelect from "./EmpresaSelect";
import ProspectoCampo from "./ProspectoCampo";
import { aInputFecha, atributosControl } from "./prospectoControl";

function formularioInicial(contacto) {
    return {
        nombre: contacto?.nombre ?? "",
        cargo: contacto?.cargo ?? "",
        telefono: contacto?.telefono ?? "",
        correo: contacto?.correo ?? "",
        fechaCumpleanos: aInputFecha(contacto?.fechaCumpleanos),
        preferenciaContacto: contacto?.preferenciaContacto ?? "Cualquiera",
        esPrincipal: contacto?.esPrincipal ?? false,
    };
}

// Alta (CRMGPSC-005) y edición (CRMGPSC-006) de un contacto de empresa (prospecto o cliente).
// onSaved(contacto, mensaje) · onAbrirExistente(idContacto) abre el contacto que ya existe en la empresa.
export default function ContactoFormModal({ contacto, empresaInicial, onClose, onSaved, onAbrirExistente }) {
    const editando = Boolean(contacto);
    const [empresa, setEmpresa] = useState(empresaInicial ?? null);
    const [form, setForm] = useState(() => formularioInicial(contacto));
    const [errores, setErrores] = useState({});
    const [error, setError] = useState("");
    const [confirmacion, setConfirmacion] = useState(null); // respuesta RequiereConfirmacion
    const [duplicado, setDuplicado] = useState(null); // respuesta Duplicado
    const [guardando, setGuardando] = useState(false);

    function cambiar(campo, valor) {
        setForm((f) => ({ ...f, [campo]: valor }));
        if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
        setConfirmacion(null);
        setDuplicado(null);
    }
    const set = (campo) => (e) => cambiar(campo, e.target.value);

    async function guardar(confirmarCambioPrincipal = false) {
        if (guardando) return;
        setError("");
        setDuplicado(null);

        const { mensaje, errores: nuevos } = api.validarContacto(form);
        if (!editando && !empresa) {
            nuevos.empresa = "Seleccione la empresa del contacto.";
        }
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) {
            setError(nuevos.empresa && !mensaje ? "Debe seleccionar la empresa a la que se vincula el contacto." : mensaje);
            return;
        }

        const cuerpo = {
            nombre: form.nombre,
            cargo: form.cargo,
            telefono: form.telefono,
            correo: form.correo,
            fechaCumpleanos: form.fechaCumpleanos || null,
            preferenciaContacto: form.preferenciaContacto,
            esPrincipal: form.esPrincipal,
            confirmarCambioPrincipal,
        };

        setGuardando(true);
        try {
            const respuesta = editando
                ? await api.editarContacto(contacto.idContactoEmpresa, cuerpo)
                : await api.registrarContacto({ ...cuerpo, tipo: empresa.tipo, idEmpresa: empresa.idEmpresa });
            if (respuesta.resultado === "RequiereConfirmacion") {
                setConfirmacion(respuesta);
                return;
            }
            if (respuesta.resultado === "Duplicado") {
                setDuplicado(respuesta);
                return;
            }
            onSaved(respuesta.contacto, respuesta.mensaje);
        } catch (err) {
            if (err instanceof ApiError) {
                setErrores(api.erroresDelServidor(err.errores));
                setError(err.message);
            } else {
                setError("No se pudo guardar el contacto.");
            }
        } finally {
            setGuardando(false);
        }
    }

    const campoProps = (campo, extra) => atributosControl(errores[campo], extra);
    const existente = duplicado?.contactoExistente;

    return (
        <Modal
            open
            onClose={onClose}
            icon={editando ? Pencil : UserPlus}
            title={editando ? `Editar contacto ${api.codigoContacto(contacto.idContactoEmpresa)}` : "Registrar contacto"}
            subtitle={editando ? `${contacto.empresa} · ${contacto.tipo}` : "Debe ingresar el nombre y al menos un teléfono o un correo."}
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" form="form-contacto" disabled={guardando}>
                        {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Guardar"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            {existente && (
                <div className="rounded-xl p-4 mb-5" style={{ border: "1px solid #E7C873", backgroundColor: "#FEF9E7" }} data-testid="contacto-duplicado">
                    <p className="flex items-start gap-2 text-sm mb-3" style={{ color: "#92400E", fontWeight: 600 }}>
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        {duplicado.mensaje}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                        <span style={{ color: COLORS.charcoal }}>
                            <strong>{existente.nombre}</strong> · {api.codigoContacto(existente.idContactoEmpresa)}
                            {existente.activo ? "" : " · Inactivo"}
                            <span className="block text-xs" style={{ color: COLORS.muted }}>
                                {[existente.telefono, existente.correo].filter(Boolean).join(" · ")}
                            </span>
                        </span>
                        {onAbrirExistente && <Button onClick={() => onAbrirExistente(existente.idContactoEmpresa)}>Abrir el contacto existente</Button>}
                    </div>
                </div>
            )}

            {confirmacion && (
                <div className="rounded-xl p-4 mb-5" style={{ border: "1px solid #E7C873", backgroundColor: "#FEF9E7" }} data-testid="confirmar-principal">
                    <p className="flex items-start gap-2 text-sm mb-3" style={{ color: "#92400E", fontWeight: 600 }}>
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        {confirmacion.mensaje}
                    </p>
                    <div className="flex gap-3">
                        <Button variant="primary" onClick={() => guardar(true)} disabled={guardando}>
                            Confirmar el cambio de contacto principal
                        </Button>
                        <Button onClick={() => setConfirmacion(null)} disabled={guardando}>
                            No cambiar
                        </Button>
                    </div>
                </div>
            )}

            <form
                id="form-contacto"
                onSubmit={(e) => {
                    e.preventDefault();
                    guardar(false);
                }}
                noValidate
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4"
            >
                <div className="sm:col-span-2">
                    {editando ? (
                        <ProspectoCampo label="Empresa vinculada">
                            <input value={`${contacto.empresa} (${contacto.tipo})`} readOnly disabled {...atributosControl(null)} />
                        </ProspectoCampo>
                    ) : (
                        <div>
                            <EmpresaSelect
                                label="Empresa vinculada *"
                                value={empresa}
                                soloActivas
                                onChange={(e) => {
                                    setEmpresa(e);
                                    setErrores((er) => ({ ...er, empresa: undefined }));
                                    setConfirmacion(null);
                                    setDuplicado(null);
                                }}
                            />
                            {errores.empresa && (
                                <span role="alert" className="block text-xs mt-1" style={{ color: COLORS.red }}>
                                    {errores.empresa}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <ProspectoCampo label="Nombre completo *" error={errores.nombre}>
                    <input value={form.nombre} onChange={set("nombre")} maxLength={150} {...campoProps("nombre")} />
                </ProspectoCampo>

                <ProspectoCampo label="Cargo" error={errores.cargo}>
                    <input value={form.cargo} onChange={set("cargo")} maxLength={100} {...campoProps("cargo")} />
                </ProspectoCampo>

                <ProspectoCampo label="Teléfono" error={errores.telefono}>
                    <input value={form.telefono} onChange={set("telefono")} maxLength={20} inputMode="tel" placeholder="Ej. 8888-0000" {...campoProps("telefono")} />
                </ProspectoCampo>

                <ProspectoCampo label="Correo personal" error={errores.correo}>
                    <input value={form.correo} onChange={set("correo")} maxLength={150} inputMode="email" placeholder="nombre@empresa.com" {...campoProps("correo")} />
                </ProspectoCampo>

                <ProspectoCampo label="Fecha de cumpleaños" error={errores.fechaCumpleanos}>
                    <input type="date" value={form.fechaCumpleanos} min="1900-01-01" max={hoyISO()} onChange={set("fechaCumpleanos")} {...campoProps("fechaCumpleanos")} />
                </ProspectoCampo>

                <ProspectoCampo label="Preferencia de contacto" error={errores.preferenciaContacto}>
                    <select value={form.preferenciaContacto} onChange={set("preferenciaContacto")} {...campoProps("preferenciaContacto")}>
                        {catalogos.PREFERENCIAS_CONTACTO.map((p) => (
                            <option key={p}>{p}</option>
                        ))}
                    </select>
                </ProspectoCampo>

                <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.charcoal }}>
                        <input type="checkbox" checked={form.esPrincipal} onChange={(e) => cambiar("esPrincipal", e.target.checked)} />
                        Es el contacto principal de la empresa
                    </label>
                </div>
            </form>
        </Modal>
    );
}
