import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import StatusBadge from "./StatusBadge";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

function selectClass() {
    return "px-3 py-2 rounded-lg text-sm bg-white";
}

export default function DataTable({
    columns,
    rows,
    onRowClick,
    searchPlaceholder = "Buscar...",
    initialShowInactive = false,
    initialEstadoFilter = "",
    pagination = true,
    showCount = true,
    paginationResetKey = "",
    searchVisibleColumns = false,
    tableClassName = "",
    tableContainerClassName = "",
    toolbarContent,
    showInactiveToggle = true,
    statusOptions,
    hideInactiveToggle = false,
    initialPageSize = 10,
    showSearch = true,
    showEstadoFilter = true,
    emptyMessage = "No hay registros que coincidan con la búsqueda o los filtros.",
}) {
    const [query, setQuery] = useState("");
    const [estadoFilter, setEstadoFilter] = useState(initialEstadoFilter);
    const [venceHasta, setVenceHasta] = useState("");
    const [showInactive, setShowInactive] = useState(initialShowInactive);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [page, setPage] = useState({ number: 1, filtersKey: "" });

    const hasEstadoColumn = showEstadoFilter && columns.some((c) => c.key === "estado");
    const hasVenceColumn = columns.some((c) => c.key === "vence");
    const hasInactiveRows = rows.some((r) => r.activo === false);

    const estadoOptions = useMemo(() => {
        if (!hasEstadoColumn) return [];

        return statusOptions ?? [...new Set(rows.map((r) => r.estado).filter(Boolean))];
    }, [rows, hasEstadoColumn, statusOptions]);

    const filtered = useMemo(() => {
        let result = rows;

        if (!showInactive) {
            result = result.filter((row) => row.activo !== false);
        }

        if (estadoFilter) {
            result = result.filter((row) => row.estado === estadoFilter);
        }

        if (venceHasta) {
            const limit = new Date(venceHasta);

            result = result.filter((row) => {
                if (!row.vence || row.vence === "—") return false;

                const d = new Date(row.vence);
                return !Number.isNaN(d.getTime()) && d <= limit;
            });
        }

        if (query.trim()) {
            const q = query.trim().toLowerCase();

            result = result.filter((row) =>
                (searchVisibleColumns ? columns.map((c) => row[c.key]) : Object.values(row)).some((v) =>
                    String(v ?? "").toLowerCase().includes(q)
                )
            );
        }

        return result;
    }, [rows, query, estadoFilter, venceHasta, showInactive, columns, searchVisibleColumns]);

    const filtersKey = JSON.stringify([
        query, estadoFilter, venceHasta, showInactive, pageSize, paginationResetKey,
    ]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (pagination && (page.filtersKey !== filtersKey || page.number > totalPages)) {
        setPage({ number: page.filtersKey !== filtersKey ? 1 : totalPages, filtersKey });
    }
    const currentPage = Math.min(page.filtersKey === filtersKey ? page.number : 1, totalPages);
    const firstRow = (currentPage - 1) * pageSize;
    const visibleRows = pagination ? filtered.slice(firstRow, firstRow + pageSize) : filtered;

    function goToPage(number) {
        setPage({ number, filtersKey });
    }

    return (
        <div className="min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-3 mb-4">
                {showSearch && (<div className="relative max-w-xs w-full">
                    <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        color={COLORS.muted}
                    />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                        style={{
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.charcoal,
                        }}
                    />
                </div>)}

                {hasEstadoColumn && (
                    <select
                        value={estadoFilter}
                        aria-label="Filtrar por estado"
                        onChange={(e) => setEstadoFilter(e.target.value)}
                        className={selectClass()}
                        style={{
                            border: `1px solid ${COLORS.border}`,
                            color: estadoFilter
                                ? COLORS.charcoal
                                : COLORS.muted,
                        }}
                    >
                        <option value="">Todos los estados</option>
                        {estadoOptions.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </select>
                )}

                {hasVenceColumn && (
                    <label
                        className="flex items-center gap-2 text-xs"
                        style={{ color: COLORS.muted }}
                    >
                        Vence antes de
                        <input
                            type="date"
                            value={venceHasta}
                            onChange={(e) => setVenceHasta(e.target.value)}
                            className="px-2.5 py-2 rounded-lg text-sm"
                            style={{
                                border: `1px solid ${COLORS.border}`,
                                color: COLORS.charcoal,
                            }}
                        />
                        {venceHasta && (
                            <button
                                type="button"
                                onClick={() => setVenceHasta("")}
                                style={{ color: COLORS.green }}
                            >
                                Quitar
                            </button>
                        )}
                    </label>
                )}

                {toolbarContent}

                {hasInactiveRows && showInactiveToggle && !hideInactiveToggle && (
                    <label
                        className="flex items-center gap-2 text-xs ml-auto"
                        style={{ color: COLORS.muted }}
                    >
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            style={{ accentColor: COLORS.green }}
                        />
                        Mostrar inactivos
                    </label>
                )}
            </div>

            <div
                className={`rounded-xl overflow-auto max-w-full ${tableContainerClassName}`}
                style={{ border: `1px solid ${COLORS.border}` }}
                tabIndex={0}
                role="region"
                aria-label="Tabla de registros con desplazamiento horizontal"
            >
                <table
                    className={`w-full text-sm ${tableClassName}`}
                    style={{ borderCollapse: "collapse" }}
                >
                    <thead className="sticky top-0" style={{ backgroundColor: COLORS.greenTint }}>
                        <tr style={{ backgroundColor: COLORS.greenTint }}>
                            {columns.map((c) => (
                                <th
                                    key={c.key}
                                    className="text-left px-4 py-3 text-xs uppercase tracking-wide"
                                    style={{
                                        color: COLORS.muted,
                                        fontWeight: 600,
                                    }}
                                >
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-6 text-center text-sm"
                                    style={{ color: COLORS.muted }}
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}

                        {visibleRows.map((row, i) => (
                            <tr
                                key={row.id ?? i}
                                onClick={() => onRowClick?.(row)}
                                className="cursor-pointer"
                                style={{
                                    borderTop: `1px solid ${COLORS.border}`,
                                    opacity: row.activo === false ? 0.55 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#FAFAFA";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={`px-4 py-3 ${c.cellClassName ?? ""}`}
                                        style={{ color: COLORS.charcoal }}
                                    >
                                        {c.key === "estado" ? (
                                            <StatusBadge value={row[c.key]} />
                                        ) : (
                                            row[c.key] === "" ? "—" : row[c.key] ?? "—"
                                        )}

                                        {c.key === columns[0].key &&
                                            row.activo === false && (
                                                <span
                                                    className="ml-2 text-xs"
                                                    style={{ color: COLORS.muted }}
                                                >
                                                    (inactivo)
                                                </span>
                                            )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination ? (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
                    <p role="status" style={{ color: COLORS.muted }}>
                        {filtered.length === 0 ? "0 registros" :
                            `Mostrando ${firstRow + 1}–${Math.min(firstRow + pageSize, filtered.length)} de ${filtered.length} registros`}
                    </p>
                    <label className="flex items-center gap-2" style={{ color: COLORS.muted }}>
                        Registros por página
                        <select className={selectClass()} value={pageSize}
                            style={{ border: `1px solid ${COLORS.border}` }}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                        >
                            {[...new Set([5, 10, 25, 50, initialPageSize])].sort((a, b) => a - b)
                                .map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                    <nav aria-label="Paginación" className="flex items-center gap-3">
                        <button type="button" className="border rounded-lg px-3 py-2 disabled:opacity-50"
                            disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}
                        >
                            Anterior
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button type="button" className="border rounded-lg px-3 py-2 disabled:opacity-50"
                            disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}
                        >
                            Siguiente
                        </button>
                    </nav>
                </div>
            ) : showCount && (
                <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                    {filtered.length} de {rows.length} registros
                </p>
            )}
        </div>
    );
}
