import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import StatusBadge from "./StatusBadge";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const PAGE_SIZES = [5, 10, 25, 50];

function selectClass() {
    return "px-3 py-2 rounded-lg text-sm bg-white";
}

/**
 * Tabla con búsqueda, filtros y paginación.
 *
 * Modo local (por defecto): filtra y pagina `rows` en el navegador.
 * Modo servidor: si se pasa `serverPagination` ({ page, pageSize, total,
 * onPageChange, onPageSizeChange }) la tabla solo muestra `rows` (la página
 * actual) y delega la paginación al servidor.
 *
 * Cada columna admite: key, label, render(row), nowrap, align.
 */
export default function DataTable({
    columns,
    rows,
    onRowClick,
    searchPlaceholder = "Buscar...",
    initialShowInactive = false,
    hideInactiveToggle = false,
    initialPageSize = 10,
    showSearch = true,
    showEstadoFilter = true,
    serverPagination = null,
    loading = false,
    stickyFirstColumn = false,
    compact = false,
    emptyMessage = "No hay registros que coincidan con la búsqueda o los filtros.",
}) {
    const [query, setQuery] = useState("");
    const [estadoFilter, setEstadoFilter] = useState("");
    const [venceHasta, setVenceHasta] = useState("");
    const [showInactive, setShowInactive] = useState(initialShowInactive);
    const [localPage, setLocalPage] = useState(1);
    const [localPageSize, setLocalPageSize] = useState(initialPageSize);

    const enServidor = !!serverPagination;

    const hasEstadoColumn = !enServidor && showEstadoFilter && columns.some((c) => c.key === "estado");
    const hasVenceColumn = !enServidor && columns.some((c) => c.key === "vence");
    const hasInactiveRows = !enServidor && rows.some((r) => r.activo === false);

    const estadoOptions = useMemo(() => {
        if (!hasEstadoColumn) return [];

        return [...new Set(rows.map((r) => r.estado).filter(Boolean))];
    }, [rows, hasEstadoColumn]);

    const filtered = useMemo(() => {
        if (enServidor) return rows;

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
                Object.values(row).some((v) =>
                    String(v ?? "").toLowerCase().includes(q)
                )
            );
        }

        return result;
    }, [enServidor, rows, query, estadoFilter, venceHasta, showInactive]);

    const filterKey = `${query}|${estadoFilter}|${venceHasta}|${showInactive}|${localPageSize}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (prevFilterKey !== filterKey) {
        setPrevFilterKey(filterKey);
        setLocalPage(1);
    }

    const pageSize = enServidor ? serverPagination.pageSize : localPageSize;
    const total = enServidor ? serverPagination.total : filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = enServidor
        ? Math.min(serverPagination.page, totalPages)
        : Math.min(localPage, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageRows = enServidor ? rows : filtered.slice(startIndex, startIndex + pageSize);

    function irAPagina(page) {
        const destino = Math.min(Math.max(1, page), totalPages);

        if (enServidor) serverPagination.onPageChange(destino);
        else setLocalPage(destino);
    }

    function cambiarTamano(size) {
        if (enServidor) serverPagination.onPageSizeChange(size);
        else setLocalPageSize(size);
    }

    const celda = compact ? "px-3 py-2.5" : "px-4 py-3";

    return (
        <div>
            {(showSearch && !enServidor) || hasEstadoColumn || hasVenceColumn || (hasInactiveRows && !hideInactiveToggle) ? (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    {showSearch && !enServidor && (
                        <div className="relative max-w-xs w-full">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                color={COLORS.muted}
                            />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                                style={{
                                    border: `1px solid ${COLORS.border}`,
                                    color: COLORS.charcoal,
                                }}
                            />
                        </div>
                    )}

                    {hasEstadoColumn && (
                        <select
                            value={estadoFilter}
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

                    {hasInactiveRows && !hideInactiveToggle && (
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
            ) : null}

            <div
                className="rounded-xl overflow-x-auto"
                style={{ border: `1px solid ${COLORS.border}` }}
            >
                <table
                    className="w-full text-sm"
                    style={{
                        borderCollapse: "collapse",
                        opacity: loading ? 0.55 : 1,
                        transition: "opacity 120ms",
                    }}
                    aria-busy={loading}
                >
                    <thead>
                        <tr style={{ backgroundColor: COLORS.greenTint }}>
                            {columns.map((c, index) => (
                                <th
                                    key={c.key}
                                    className={`${celda} text-xs uppercase tracking-wide whitespace-nowrap`}
                                    style={{
                                        color: COLORS.muted,
                                        fontWeight: 600,
                                        textAlign: c.align ?? "left",
                                        ...(stickyFirstColumn && index === 0
                                            ? { position: "sticky", left: 0, zIndex: 1, backgroundColor: COLORS.greenTint }
                                            : {}),
                                    }}
                                >
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {pageRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-sm"
                                    style={{ color: COLORS.muted }}
                                >
                                    {loading ? "Cargando..." : emptyMessage}
                                </td>
                            </tr>
                        )}

                        {pageRows.map((row, i) => (
                            <tr
                                key={row.id ?? i}
                                onClick={() => onRowClick?.(row)}
                                onKeyDown={(e) => {
                                    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                                        e.preventDefault();
                                        onRowClick(row);
                                    }
                                }}
                                tabIndex={onRowClick ? 0 : undefined}
                                className="cursor-pointer group"
                                style={{
                                    borderTop: `1px solid ${COLORS.border}`,
                                    opacity: row.activo === false ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#FAFAFA";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                {columns.map((c, index) => (
                                    <td
                                        key={c.key}
                                        className={`${celda} ${c.nowrap ? "whitespace-nowrap" : ""}`}
                                        style={{
                                            color: COLORS.charcoal,
                                            textAlign: c.align ?? "left",
                                            ...(stickyFirstColumn && index === 0
                                                ? { position: "sticky", left: 0, zIndex: 1, backgroundColor: "#FFFFFF" }
                                                : {}),
                                        }}
                                    >
                                        {c.render ? (
                                            c.render(row)
                                        ) : c.key === "estado" ? (
                                            <StatusBadge value={row[c.key]} />
                                        ) : (
                                            row[c.key] || "—"
                                        )}

                                        {!enServidor && c.key === columns[0].key &&
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

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <p className="text-xs" style={{ color: COLORS.muted }} aria-live="polite">
                    {total === 0
                        ? "0 registros"
                        : `Mostrando ${startIndex + 1}–${Math.min(
                              startIndex + pageSize,
                              total
                          )} de ${total} registros`}
                </p>

                <div className="flex items-center gap-3">
                    <label
                        className="flex items-center gap-2 text-xs"
                        style={{ color: COLORS.muted }}
                    >
                        Filas por página
                        <select
                            value={pageSize}
                            onChange={(e) => cambiarTamano(Number(e.target.value))}
                            className="px-2 py-1 rounded-lg text-xs bg-white"
                            style={{ border: `1px solid ${COLORS.border}` }}
                        >
                            {PAGE_SIZES.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => irAPagina(currentPage - 1)}
                            disabled={currentPage <= 1 || loading}
                            aria-label="Página anterior"
                            className="p-1.5 rounded-lg disabled:opacity-40"
                            style={{ border: `1px solid ${COLORS.border}` }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span
                            className="text-xs px-2"
                            style={{ color: COLORS.charcoal }}
                        >
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => irAPagina(currentPage + 1)}
                            disabled={currentPage >= totalPages || loading}
                            aria-label="Página siguiente"
                            className="p-1.5 rounded-lg disabled:opacity-40"
                            style={{ border: `1px solid ${COLORS.border}` }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
