import { useEffect, useState } from "react";
import { Pencil, RotateCcw, UserCheck, UserRound, UserX } from "lucide-react";
import Modal from "../Modal";
import { Button, DetailGrid, Notice, Pill } from "../ui";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmProspectosService";
import { formatearFechaHora } from "../../utils/format";
import { fechaLocal } from "./helpers";

// Detalle de un contacto de empresa con sus acciones (editar, desactivar, reactivar).
export default function ContactoDetalleModal({ idContacto, version = 0, puedeEditar, reactivando, onClose, onEditar, onDesactivar, onReactivar }) {
    const [cargado, setCargado] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        api.obtenerContacto(idContacto)
            .then((c) => activo && (setCargado({ idContacto, contacto: c }), setError("")))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el contacto."));
        return () => {
            activo = false;
        };
    }, [idContacto, version]);

    const c = cargado?.idContacto === idContacto ? cargado.contacto : null;
    const empresaUtilizable = c ? c.empresaActiva : false;

    return (
        <Modal
            open
            onClose={onClose}
            icon={UserRound}
            title={c ? `${api.codigoContacto(c.idContactoEmpresa)} · ${c.nombre}` : "Detalle del contacto"}
            subtitle={c ? `${c.empresa} · ${c.tipo}` : undefined}
            width="max-w-2xl"
            headerExtra={
                c ? (
                    <span className="flex gap-2">
                        {c.esPrincipal && <Pill tone="positive">Principal</Pill>}
                        <Pill tone={c.activo ? "positive" : "negative"}>{c.activo ? "Activo" : "Inactivo"}</Pill>
                    </span>
                ) : null
            }
            footer={
                <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cerrar
                    </Button>
                    {c && puedeEditar && c.activo && (
                        <>
                            <Button className="flex items-center gap-1.5" onClick={() => onEditar(c)}>
                                <Pencil size={14} /> Editar
                            </Button>
                            <Button variant="danger" className="flex items-center gap-1.5" onClick={() => onDesactivar(c)}>
                                <UserX size={14} /> Desactivar
                            </Button>
                        </>
                    )}
                    {c && puedeEditar && !c.activo && (
                        <Button variant="primary" className="flex items-center gap-1.5" disabled={reactivando} onClick={() => onReactivar(c)}>
                            <RotateCcw size={14} /> {reactivando ? "Reactivando..." : "Reactivar"}
                        </Button>
                    )}
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            {!c && !error && (
                <p className="text-sm py-6 text-center" style={{ color: "#6E6E6E" }}>
                    Cargando contacto...
                </p>
            )}
            {c && !c.activo && (
                <Notice tone="warning">
                    Contacto inactivo{c.motivoDesactivacion ? `: ${c.motivoDesactivacion}` : ""}
                    {c.fechaDesactivacion ? ` (${formatearFechaHora(c.fechaDesactivacion)})` : ""}. No se puede editar ni usar en seguimientos nuevos hasta reactivarlo.
                </Notice>
            )}
            {c && c.activo && !empresaUtilizable && (
                <Notice tone="warning">La empresa vinculada está {c.estadoEmpresa.toLowerCase()}: el contacto se conserva para consulta.</Notice>
            )}
            {c && (
                <DetailGrid
                    title="Datos del contacto"
                    items={[
                        { icon: UserCheck, label: "Nombre completo", value: c.nombre },
                        { label: "Cargo", value: c.cargo },
                        { label: "Teléfono", value: c.telefono },
                        { label: "Correo personal", value: c.correo },
                        { label: "Fecha de cumpleaños", value: c.fechaCumpleanos ? fechaLocal(c.fechaCumpleanos) : "" },
                        { label: "Preferencia de contacto", value: c.preferenciaContacto },
                        { label: "Empresa vinculada", value: `${c.empresa} (${c.tipo}, ${c.estadoEmpresa})` },
                        { label: "Contacto principal", value: c.esPrincipal ? "Sí" : "No" },
                        { label: "Interacciones registradas", value: String(c.cantidadInteracciones) },
                        { label: "Seguimientos registrados", value: String(c.cantidadSeguimientos) },
                    ]}
                />
            )}
        </Modal>
    );
}
