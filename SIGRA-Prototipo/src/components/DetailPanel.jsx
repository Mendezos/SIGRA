import { useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    Printer,
    Download,
} from "lucide-react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";

const COLORS = {
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    green: "#5EB453",
};

function buildAuditTrail(record) {
    const id = record.id ?? "el registro";

    return [
        {
            fecha: "hace 2 días",
            usuario: "Sistema",
            accion: `Se creó ${id} con estado inicial.`,
        },
        {
            fecha: "hace 1 día",
            usuario: "María Fernanda Ceciliano",
            accion: `Se actualizaron los datos generales de ${id}.`,
        },
        {
            fecha: "hoy",
            usuario: "Sistema",
            accion: `Estado actual: ${record.estado ?? "sin definir"}.`,
        },
    ];
}

function AuditTrail({ record }) {
    const [open, setOpen] = useState(false);
    const entries = buildAuditTrail(record);

    return (
        <div
            className="mt-6 pt-5"
            style={{ borderTop: `1px solid ${COLORS.border}` }}
        >
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex items-center gap-2 text-xs"
                style={{
                    color: COLORS.muted,
                    fontWeight: 600,
                }}
            >
                {open ? (
                    <ChevronUp size={14} />
                ) : (
                    <ChevronDown size={14} />
                )}
                Bitácora de auditoría
            </button>

            {open && (
                <ul className="mt-3 space-y-2.5">
                    {entries.map((entry, index) => (
                        <li
                            key={index}
                            className="text-xs"
                            style={{ color: COLORS.muted }}
                        >
                            <span
                                style={{
                                    color: COLORS.charcoal,
                                    fontWeight: 600,
                                }}
                            >
                                {entry.fecha}
                            </span>
                            {" — "}
                            {entry.accion} ({entry.usuario})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function downloadRecord(record, fields) {
    const lines = [record.id ?? "Registro", ""];

    fields.forEach((field) => {
        lines.push(
            `${field.label}: ${record[field.key] || "—"}`
        );
    });

    const blob = new Blob([lines.join("\n")], {
        type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${String(record.id ?? "registro").replace(
        /[^a-z0-9-_]+/gi,
        "_"
    )}.txt`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export default function DetailPanel({
    open,
    record,
    fields,
    idLabel,
    onClose,
    onEdit,
    onToggleActive,
    allowEdit = true,
    allowDeactivate = true,
}) {
    if (!record) return null;

    const isInactive = record.activo === false;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={record.id ?? "Detalle"}
            subtitle={idLabel}
        >
            {isInactive && (
                <div
                    className="mb-5 px-3 py-2 rounded-lg text-xs"
                    style={{
                        backgroundColor: "#F1F1F1",
                        color: COLORS.muted,
                    }}
                >
                    Este registro está inactivo. Podés consultarlo,
                    pero no aparece por defecto en el listado.
                </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {fields.map((field) => (
                    <div
                        key={field.key}
                        className={
                            field.type === "textarea"
                                ? "sm:col-span-2"
                                : ""
                        }
                    >
                        <dt
                            className="text-xs mb-1"
                            style={{ color: COLORS.muted }}
                        >
                            {field.label}
                        </dt>

                        <dd
                            className="text-sm"
                            style={{ color: COLORS.charcoal }}
                        >
                            {field.key === "estado" ? (
                                <StatusBadge value={record[field.key]} />
                            ) : (
                                record[field.key] || "—"
                            )}
                        </dd>
                    </div>
                ))}
            </dl>

            <AuditTrail record={record} />

            <div
                className="flex flex-wrap items-center justify-between gap-3 mt-7 pt-5"
                style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
                        style={{
                            color: COLORS.muted,
                            border: `1px solid ${COLORS.border}`,
                        }}
                    >
                        <Printer size={14} />
                        Imprimir
                    </button>

                    <button
                        type="button"
                        onClick={() => downloadRecord(record, fields)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
                        style={{
                            color: COLORS.muted,
                            border: `1px solid ${COLORS.border}`,
                        }}
                    >
                        <Download size={14} />
                        Descargar
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-lg text-sm"
                        style={{ color: COLORS.muted }}
                    >
                        Cerrar
                    </button>

                    {allowDeactivate && onToggleActive && (
                        <button
                            type="button"
                            onClick={onToggleActive}
                            className="px-4 py-2.5 rounded-lg text-sm"
                            style={{
                                color: isInactive
                                    ? "#4CA23D"
                                    : "#C0392B",
                                border: `1px solid ${COLORS.border}`,
                            }}
                        >
                            {isInactive
                                ? "Reactivar"
                                : "Inactivar"}
                        </button>
                    )}

                    {allowEdit && onEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium"
                            style={{
                                backgroundColor: COLORS.green,
                                color: "#FFFFFF",
                                border: "none",
                            }}
                        >
                            Editar
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}