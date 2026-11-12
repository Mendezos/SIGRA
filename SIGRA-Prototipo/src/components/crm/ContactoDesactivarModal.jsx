import { useEffect, useState } from "react";
import { UserX } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmProspectosService";
import ProspectoCampo from "./ProspectoCampo";
import { atributosControl } from "./prospectoControl";

const MAX_MOTIVO = 300;

// CRMGPSC-007: desactivar un contacto (motivo obligatorio; si es el principal hay que elegir el nuevo principal).
export default function ContactoDesactivarModal({ contacto, onClose, onHecho }) {
    const [motivo, setMotivo] = useState("");
    const [idNuevoPrincipal, setIdNuevoPrincipal] = useState("");
    const [otros, setOtros] = useState(null); // otros contactos activos de la empresa (solo si es el principal)
    const [errores, setErrores] = useState({});
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!contacto.esPrincipal) return undefined;
        let activo = true;
        api.listarContactos({ tipo: contacto.tipo, idEmpresa: contacto.idEmpresa, estado: "Activo" })
            .then((lista) => activo && setOtros(lista.filter((c) => c.idContactoEmpresa !== contacto.idContactoEmpresa)))
            .catch(() => activo && (setOtros([]), setError("No se pudieron cargar los demás contactos de la empresa.")));
        return () => {
            activo = false;
        };
    }, [contacto]);

    const necesitaNuevoPrincipal = contacto.esPrincipal && (otros?.length ?? 0) > 0;

    async function confirmar(e) {
        e.preventDefault();
        if (guardando) return;
        setError("");
        const nuevos = {};
        if (!motivo.trim()) nuevos.motivo = "Indique el motivo de la desactivación.";
        else if (motivo.trim().length > MAX_MOTIVO) nuevos.motivo = `No puede superar los ${MAX_MOTIVO} caracteres.`;
        if (necesitaNuevoPrincipal && !idNuevoPrincipal) nuevos.nuevoPrincipal = "Elija otro contacto activo como principal antes de desactivar.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) {
            setError(nuevos.motivo ? "Debe indicar el motivo de la desactivación del contacto." : nuevos.nuevoPrincipal);
            return;
        }

        setGuardando(true);
        try {
            onHecho(await api.desactivarContacto(contacto.idContactoEmpresa, { motivo, idNuevoPrincipal: necesitaNuevoPrincipal ? Number(idNuevoPrincipal) : null }));
        } catch (err) {
            if (err instanceof ApiError) {
                setErrores(api.erroresDelServidor(err.errores));
                setError(err.message);
            } else {
                setError("No se pudo desactivar el contacto.");
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={UserX}
            tone="danger"
            title={`Desactivar contacto ${api.codigoContacto(contacto.idContactoEmpresa)}`}
            subtitle={`${contacto.nombre} · ${contacto.empresa}`}
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>
                        Volver
                    </Button>
                    <Button variant="dangerSolid" type="submit" form="form-desactivar-contacto" disabled={guardando}>
                        {guardando ? "Desactivando..." : "Desactivar"}
                    </Button>
                </div>
            }
        >
            <Notice tone="warning">
                El contacto quedará Inactivo y ya no aparecerá al programar seguimientos nuevos. Sus interacciones y seguimientos pasados se conservan.
            </Notice>
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-desactivar-contacto" onSubmit={confirmar} noValidate className="space-y-4">
                <ProspectoCampo label="Motivo de la desactivación *" error={errores.motivo}>
                    <textarea
                        value={motivo}
                        onChange={(e) => {
                            setMotivo(e.target.value);
                            if (errores.motivo) setErrores((er) => ({ ...er, motivo: undefined }));
                        }}
                        rows={3}
                        maxLength={MAX_MOTIVO}
                        placeholder="Ej. Ya no trabaja en la empresa."
                        {...atributosControl(errores.motivo)}
                    />
                </ProspectoCampo>

                {contacto.esPrincipal && (
                    <div>
                        {necesitaNuevoPrincipal ? (
                            <ProspectoCampo label="Nuevo contacto principal *" error={errores.nuevoPrincipal} ayuda="Este contacto es el principal de la empresa: elija otro contacto activo como principal antes de desactivar.">
                                <select
                                    value={idNuevoPrincipal}
                                    onChange={(e) => {
                                        setIdNuevoPrincipal(e.target.value);
                                        if (errores.nuevoPrincipal) setErrores((er) => ({ ...er, nuevoPrincipal: undefined }));
                                    }}
                                    {...atributosControl(errores.nuevoPrincipal)}
                                >
                                    <option value="">Seleccione un contacto activo</option>
                                    {otros.map((c) => (
                                        <option key={c.idContactoEmpresa} value={c.idContactoEmpresa}>
                                            {c.nombre}
                                            {c.cargo ? ` · ${c.cargo}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </ProspectoCampo>
                        ) : (
                            otros && <Notice tone="warning">Es el único contacto activo de la empresa; la empresa quedará sin contacto principal.</Notice>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
}
