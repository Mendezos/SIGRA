import { useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

const COLORS = {
    greenTint: "#EAF6E8",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const DAYS = [
    "Dom",
    "Lun",
    "Mar",
    "Mié",
    "Jue",
    "Vie",
    "Sáb",
];

const MONTHS = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

function toDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(
        2,
        "0"
    )}-${String(day).padStart(2, "0")}`;
}

// Vista de calendario mensual para Giras: las tarjetas se pueden arrastrar
// y soltar entre días para reprogramarlas. Es interacción de interfaz pura
// (drag & drop de HTML5) — no hay lógica de negocio ni validación de choques
// de agenda todavía, eso queda para el curso de implementación.
export default function GirasCalendar({
    rows,
    onRowsChange,
    onSelectGira,
    canReschedule = false,
}) {
    const seedMonth = rows[0]?.fecha
        ? new Date(rows[0].fecha)
        : new Date();

    const [cursor, setCursor] = useState(
        new Date(
            seedMonth.getFullYear(),
            seedMonth.getMonth(),
            1
        )
    );

    const [dragId, setDragId] = useState(null);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const byDate = useMemo(() => {
        const map = {};

        rows.forEach((row) => {
            if (!row.fecha) return;
            (map[row.fecha] ??= []).push(row);
        });

        return map;
    }, [rows]);

    const cells = useMemo(() => {
        const firstWeekday = new Date(
            year,
            month,
            1
        ).getDay();

        const daysInMonth = new Date(
            year,
            month + 1,
            0
        ).getDate();

        const result = [];

        for (let index = 0; index < firstWeekday; index += 1) {
            result.push(null);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            result.push(day);
        }

        return result;
    }, [year, month]);

    function handleDrop(day) {
        if (!canReschedule || !dragId) return;

        const newDate = toDateKey(year, month, day);

        onRowsChange((currentRows) =>
            currentRows.map((row) =>
                row.id === dragId
                    ? { ...row, fecha: newDate }
                    : row
            )
        );

        setDragId(null);
    }

    return (
        <div
            className="rounded-xl overflow-hidden mb-8"
            style={{ border: `1px solid ${COLORS.border}` }}
        >
            <div
                className="flex items-center justify-between px-5 py-3"
                style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.greenTint,
                }}
            >
                <button
                    type="button"
                    onClick={() =>
                        setCursor(
                            new Date(year, month - 1, 1)
                        )
                    }
                    className="p-1 rounded"
                    style={{ color: COLORS.charcoal }}
                    aria-label="Mes anterior"
                >
                    <ChevronLeft size={18} />
                </button>

                <p
                    className="text-sm"
                    style={{
                        color: COLORS.charcoal,
                        fontWeight: 600,
                    }}
                >
                    {MONTHS[month]} {year}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        setCursor(
                            new Date(year, month + 1, 1)
                        )
                    }
                    className="p-1 rounded"
                    style={{ color: COLORS.charcoal }}
                    aria-label="Mes siguiente"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div
                className="grid grid-cols-7"
                style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                {DAYS.map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs py-2"
                        style={{
                            color: COLORS.muted,
                            fontWeight: 600,
                        }}
                    >
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {cells.map((day, index) => {
                    const dateKey = day
                        ? toDateKey(year, month, day)
                        : null;

                    const giras = dateKey
                        ? byDate[dateKey] ?? []
                        : [];

                    return (
                        <div
                            key={index}
                            onDragOver={(event) => {
                                if (day && canReschedule) {
                                    event.preventDefault();
                                }
                            }}
                            onDrop={() =>
                                day && handleDrop(day)
                            }
                            className="min-h-[92px] p-1.5"
                            style={{
                                borderRight: `1px solid ${COLORS.border}`,
                                borderBottom: `1px solid ${COLORS.border}`,
                                backgroundColor: day
                                    ? COLORS.white
                                    : "#FAFAFA",
                            }}
                        >
                            {day && (
                                <>
                                    <p
                                        className="text-xs mb-1"
                                        style={{
                                            color: COLORS.muted,
                                        }}
                                    >
                                        {day}
                                    </p>

                                    <div className="flex flex-col gap-1">
                                        {giras.map((gira) => (
                                            <div
                                                key={gira.id}
                                                draggable={canReschedule}
                                                onDragStart={() => {
                                                    if (canReschedule) {
                                                        setDragId(
                                                            gira.id
                                                        );
                                                    }
                                                }}
                                                onClick={() =>
                                                    onSelectGira?.(
                                                        gira
                                                    )
                                                }
                                                className={`px-1.5 py-1 rounded text-xs ${
                                                    canReschedule
                                                        ? "cursor-grab"
                                                        : "cursor-pointer"
                                                }`}
                                                style={{
                                                    backgroundColor:
                                                        COLORS.greenTint,
                                                    color:
                                                        COLORS.charcoal,
                                                    opacity:
                                                        gira.activo ===
                                                        false
                                                            ? 0.5
                                                            : 1,
                                                }}
                                                title={
                                                    canReschedule
                                                        ? "Arrastrá para reprogramar o hacé clic para consultar"
                                                        : "Hacé clic para consultar la gira"
                                                }
                                            >
                                                <p
                                                    className="truncate"
                                                    style={{
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {gira.id} ·{" "}
                                                    {gira.tecnico}
                                                </p>

                                                <div className="mt-0.5">
                                                    <StatusBadge
                                                        value={
                                                            gira.estado
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div
                className="px-5 py-3"
                style={{
                    borderTop: `1px solid ${COLORS.border}`,
                }}
            >
                <p
                    className="text-xs"
                    style={{ color: COLORS.muted }}
                >
                    {canReschedule
                        ? "Podés arrastrar una gira a otro día para reprogramarla."
                        : "Tu rol puede consultar las giras, pero no reprogramarlas."}
                </p>
            </div>
        </div>
    );
}