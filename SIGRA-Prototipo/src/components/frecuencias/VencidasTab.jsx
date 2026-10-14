import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import DataTable from "../DataTable";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import { fechaCorta } from "./helpers";

const columnas = [
    { key: "codigo", label: "Solicitud" },
    { key: "empresa", label: "Cliente" },
    { key: "repetidora", label: "Repetidora" },
    { key: "frecuencia", label: "Frecuencia" },
    { key: "resolucion", label: "Resolución" },
    { key: "vence", label: "Venció el", render: (f) => fechaCorta(`${f.vence}T00:00:00`) },
    { key: "diasVencida", label: "Días vencida" },
    { key: "vendedor", label: "Vendedor responsable" },
    { key: "renovacion", label: "Renovación" },
];

const comillas = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

// Reporte de frecuencias vencidas sin renovación (una frecuencia que se renueva y se otorga pasa a "Renovada" y sale de aquí).
export default function VencidasTab({ onVerSolicitud }) {
    const [vencidas, setVencidas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargar = useCallback(async () => {
        try {
            setVencidas(await api.listarVencidas());
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar el reporte.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    const filas = useMemo(
        () =>
            vencidas.map((s) => ({
                id: s.idSolicitud,
                codigo: api.codigoSolicitud(s.idSolicitud),
                empresa: s.empresa,
                repetidora: s.numeroSerie,
                frecuencia: s.frecuencia || "—",
                resolucion: s.numeroResolucion || "—",
                vence: s.fechaVencimiento.slice(0, 10),
                diasVencida: -s.diasParaVencer,
                vendedor: s.vendedor,
                renovacion: s.idSolicitudRenovacion
                    ? `Iniciada: ${api.codigoSolicitud(s.idSolicitudRenovacion)} (${s.estadoRenovacion})`
                    : "Sin renovación",
            })),
        [vencidas]
    );

    function exportar() {
        const encabezado = ["Solicitud", "Cliente", "Repetidora", "Frecuencia", "Resolución", "Venció el", "Días vencida", "Vendedor responsable", "Renovación"];
        const lineas = filas.map((f) =>
            [f.codigo, f.empresa, f.repetidora, f.frecuencia, f.resolucion, f.vence, f.diasVencida, f.vendedor, f.renovacion].map(comillas).join(",")
        );
        const csv = "﻿" + [encabezado.map(comillas).join(","), ...lineas].join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `frecuencias-vencidas-sin-renovacion-${new Date().toISOString().slice(0, 10)}.csv`;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    return (
        <div>
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <p className="text-sm" style={{ color: COLORS.charcoal }}>
                    <strong>{vencidas.length}</strong> frecuencia(s) vencida(s) sin renovar
                </p>
                <Button className="ml-auto flex items-center gap-1.5" onClick={exportar} disabled={filas.length === 0}>
                    <Download size={14} /> Exportar a CSV
                </Button>
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando reporte...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => onVerSolicitud(fila.id)}
                    searchPlaceholder="Buscar por cliente, frecuencia o vendedor..."
                    hideInactiveToggle
                    emptyMessage="No hay frecuencias vencidas sin renovar."
                />
            )}
        </div>
    );
}
