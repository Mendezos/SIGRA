import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmProspectosService";
import { ahoraInputFechaHora } from "./helpers";
import ProspectoCampo from "./ProspectoCampo";
import { atributosControl } from "./prospectoControl";

// CRMGPSC-004: reactivar un prospecto descartado (estado inicial + próximo seguimiento).
export default function ProspectoReactivarModal({ prospecto, onClose, onHecho }) {
    const [form, setForm] = useState({ estadoInicial: "", seguimiento: "", idVendedor: "" });
    const [vendedores, setVendedores] = useState([]);
    const [errores, setErrores] = useState({});
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const vendedorInactivo = prospecto.vendedorActivo === false;

    useEffect(() => {
        if (!vendedorInactivo) return undefined;
        let activo = true;
        catalogos
            .listarVendedores()
            .then((lista) => activo && setVendedores(lista))
            .catch(() => activo && setError("No se pudo cargar la lista de vendedores."));
        return () => {
            activo = false;
        };
    }, [vendedorInactivo]);

    const set = (campo) => (e) => {
        const valor = e.target.value;
        setForm((f) => ({ ...f, [campo]: valor }));
        if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
    };

    async function confirmar(e) {
        e.preventDefault();
        if (guardando) return;
        setError("");
        const nuevos = {};
        if (!form.estadoInicial) nuevos.estadoInicial = "Seleccione el estado inicial.";
        if (!form.seguimiento) nuevos.seguimiento = "Indique la fecha y hora del próximo seguimiento.";
        else if (form.seguimiento <= ahoraInputFechaHora()) nuevos.seguimiento = "Debe ser una fecha y hora futuras.";
        if (vendedorInactivo && !form.idVendedor) nuevos.idVendedor = "Elija un vendedor activo.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) {
            setError(
                nuevos.estadoInicial || (nuevos.seguimiento && !form.seguimiento)
                    ? "Debe indicar el estado inicial y la fecha y hora del próximo seguimiento."
                    : nuevos.seguimiento
                      ? "El próximo seguimiento debe programarse en una fecha y hora futuras."
                      : "El vendedor responsable del prospecto está inactivo. Elija otro vendedor activo para reactivarlo.",
            );
            return;
        }

        setGuardando(true);
        try {
            onHecho(
                await api.reactivarProspecto(prospecto.idProspecto, {
                    estadoInicial: form.estadoInicial,
                    fechaHoraSeguimiento: `${form.seguimiento}:00`,
                    idVendedor: vendedorInactivo ? Number(form.idVendedor) : null,
                }),
            );
        } catch (err) {
            if (err instanceof ApiError) {
                setErrores(api.erroresDelServidor(err.errores));
                setError(err.message);
            } else {
                setError("No se pudo reactivar el prospecto.");
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={RotateCcw}
            title={`Reactivar prospecto ${api.codigoProspecto(prospecto.idProspecto)}`}
            subtitle={prospecto.empresa}
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" form="form-reactivar-prospecto" disabled={guardando}>
                        {guardando ? "Reactivando..." : "Reactivar prospecto"}
                    </Button>
                </div>
            }
        >
            {prospecto.motivoDescarte && (
                <Notice tone="warning">
                    Motivo del descarte anterior: <strong>{prospecto.motivoDescarte}</strong>. Se conserva en el historial de cambios de estado.
                </Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-reactivar-prospecto" onSubmit={confirmar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <ProspectoCampo label="Estado inicial *" error={errores.estadoInicial}>
                    <select value={form.estadoInicial} onChange={set("estadoInicial")} {...atributosControl(errores.estadoInicial)}>
                        <option value="">Seleccione el estado</option>
                        {api.ESTADOS_REACTIVACION.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </ProspectoCampo>

                <ProspectoCampo label="Próximo seguimiento *" error={errores.seguimiento} ayuda="Se creará un seguimiento de tipo llamada para el vendedor responsable.">
                    <input type="datetime-local" value={form.seguimiento} min={ahoraInputFechaHora()} onChange={set("seguimiento")} {...atributosControl(errores.seguimiento)} />
                </ProspectoCampo>

                {vendedorInactivo && (
                    <div className="sm:col-span-2">
                        <Notice tone="warning">
                            El vendedor responsable actual ({prospecto.vendedor ?? "sin asignar"}) está inactivo. Elija otro vendedor activo para reactivar el prospecto.
                        </Notice>
                        <ProspectoCampo label="Nuevo vendedor responsable *" error={errores.idVendedor}>
                            <select value={form.idVendedor} onChange={set("idVendedor")} {...atributosControl(errores.idVendedor)}>
                                <option value="">Seleccione un vendedor activo</option>
                                {vendedores.map((v) => (
                                    <option key={v.idUsuario} value={v.idUsuario}>
                                        {v.nombre}
                                    </option>
                                ))}
                            </select>
                        </ProspectoCampo>
                    </div>
                )}
            </form>
        </Modal>
    );
}
