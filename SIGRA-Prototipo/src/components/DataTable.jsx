import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { Paginacion } from "./ui";

const COLORS = {
    green: "#5EB453",
    greenDark: "#4CA23D",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const PAGE_SIZES = [5, 10, 25, 50];

function selectClass() {
    return "px-3 py-2 rounded-lg text-sm bg-white";
}

function valorDeCelda(columna, fila) {
    if (columna.render) return columna.render(fila);
    if (columna.key === "estado") return <StatusBadge value={fila[columna.key]} />;
    return fila[columna.key] === "" ? "—" : fila[columna.key] ?? "—";
}

// Las columnas de estado se muestran como etiqueta en la parte superior de la tarjeta.
function esInsignia(columna) {
    return columna.cardBadge ?? /^(estado|estadoTexto|estadoAlerta|estadoRegistrado|bloqueo|bloqueoTexto|activo)$/i.test(columna.key);
}

function TarjetaRegistro({ fila, columnas, maxCampos, onClick }) {
    const titulo = columnas.find((c) => c.cardTitle) ?? columnas[0];
    const resto = columnas.filter((c) => c !== titulo && !c.cardHide);
    const insignias = resto.filter(esInsignia);
    const campos = resto.filter((c) => !esInsignia(c)).slice(0, maxCampos);
    const inactivo = fila.activo === false;
    const interactiva = !!onClick;

    return (
        <div
            role={interactiva ? "button" : undefined}
            tabIndex={interactiva ? 0 : undefined}
            onClick={interactiva ? () => onClick(fila) : undefined}
            onKeyDown={interactiva ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick(fila);
                }
            } : undefined}
            className={`group flex flex-col gap-3 rounded-2xl bg-white p-5 transition-all outline-none ${
                interactiva
                    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(25,35,25,0.10)] focus-visible:shadow-[0_0_0_3px_#EAF6E8]"
                    : ""
            }`}
            style={{
                border: `1px solid ${COLORS.border}`,
                borderTop: `3px solid ${COLORS.green}`,
                opacity: inactivo ? 0.6 : 1,
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                    <div className="text-[15px] leading-snug break-words">{valorDeCelda(titulo, fila)}</div>
                    {inactivo && <span className="text-xs" style={{ color: COLORS.muted, fontWeight: 400 }}>(inactivo)</span>}
                </div>
                {insignias.length > 0 && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {insignias.map((c) => (
                            <span key={c.key}>{valorDeCelda(c, fila)}</span>
                        ))}
                    </div>
                )}
            </div>

            {campos.length > 0 && (
                <dl className="flex flex-col gap-1.5 pt-3" style={{ borderTop: "1px solid #DCEBD9" }}>
                    {campos.map((c) => (
                        <div key={c.key} className="flex items-baseline justify-between gap-4 text-sm">
                            <dt className="text-[11px] uppercase tracking-wide shrink-0" style={{ color: COLORS.muted, fontWeight: 600 }}>
                                {c.label}
                            </dt>
                            <dd className="min-w-0 text-right break-words" style={{ color: COLORS.charcoal }}>
                                {valorDeCelda(c, fila)}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {interactiva && (
                <span
                    className="mt-auto inline-flex items-center gap-1 self-end text-xs transition-transform group-hover:translate-x-0.5"
                    style={{ color: COLORS.greenDark, fontWeight: 600 }}
                >
                    Ver detalles <ChevronRight size={14} />
                </span>
            )}
        </div>
    );
}

/**
 * Lista de registros con búsqueda, filtros y paginación.
 *
 * Por defecto cada registro se muestra como una tarjeta: la primera columna es el título,
 * las columnas de estado van como etiqueta y las siguientes (hasta `cardMax`) como datos.
 * Al presionar la tarjeta o "Ver detalles" se ejecuta `onRowClick`. Con layout="table" se usa
 * la tabla clásica, pensada para bitácoras y reportes con muchas columnas.
 *
 * Modo local (por defecto): filtra y pagina `rows` en el navegador.
 * Modo servidor: si se pasa `serverPagination` ({ page, pageSize, total,
 * onPageChange, onPageSizeChange }) solo muestra `rows` (la página actual) y delega la
 * paginación al servidor.
 *
 * Cada columna admite: key, label, render(row), nowrap, align, cellClassName y, para las
 * tarjetas, cardTitle, cardBadge y cardHide.
 */
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
    serverPagination = null,
    loading = false,
    stickyFirstColumn = false,
    compact = false,
    layout = "cards",
    cardMax = 4,
    emptyMessage = "No hay registros que coincidan con la búsqueda o los filtros.",
}) {
    const [query, setQuery] = useState("");
    const [estadoFilter, setEstadoFilter] = useState(initialEstadoFilter);
    const [venceHasta, setVenceHasta] = useState("");
    const [showInactive, setShowInactive] = useState(initialShowInactive);
    const [localPageSize, setLocalPageSize] = useState(initialPageSize);
    const [page, setPage] = useState({ number: 1, filtersKey: "" });

    const enServidor = !!serverPagination;
    const comoTarjetas = layout === "cards";

    const hasEstadoColumn = !enServidor && showEstadoFilter && columns.some((c) => c.key === "estado");
    const hasVenceColumn = !enServidor && columns.some((c) => c.key === "vence");
    const hasInactiveRows = !enServidor && rows.some((r) => r.activo === false);

    const estadoOptions = useMemo(() => {
        if (!hasEstadoColumn) return [];

        return statusOptions ?? [...new Set(rows.map((r) => r.estado).filter(Boolean))];
    }, [rows, hasEstadoColumn, statusOptions]);

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
                (searchVisibleColumns ? columns.map((c) => row[c.key]) : Object.values(row)).some((v) =>
                    String(v ?? "").toLowerCase().includes(q)
                )
            );
        }

        return result;
    }, [enServidor, rows, query, estadoFilter, venceHasta, showInactive, columns, searchVisibleColumns]);

    const pageSize = enServidor ? serverPagination.pageSize : localPageSize;
    const total = enServidor ? serverPagination.total : filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // La página local vuelve a 1 cuando cambian los filtros o el tamaño de página.
    const filtersKey = JSON.stringify([query, estadoFilter, venceHasta, showInactive, localPageSize, paginationResetKey]);
    if (!enServidor && pagination && (page.filtersKey !== filtersKey || page.number > totalPages)) {
        setPage({ number: page.filtersKey !== filtersKey ? 1 : totalPages, filtersKey });
    }

    const currentPage = enServidor
        ? Math.min(serverPagination.page, totalPages)
        : Math.min(page.filtersKey === filtersKey ? page.number : 1, totalPages);
    const firstRow = (currentPage - 1) * pageSize;
    const visibleRows = enServidor ? rows : pagination ? filtered.slice(firstRow, firstRow + pageSize) : filtered;

    function irAPagina(numero) {
        const destino = Math.min(Math.max(1, numero), totalPages);

        if (enServidor) serverPagination.onPageChange(destino);
        else setPage({ number: destino, filtersKey });
    }

    function cambiarTamano(size) {
        if (enServidor) serverPagination.onPageSizeChange(size);
        else setLocalPageSize(size);
    }

    const celda = compact ? "px-3 py-2.5" : "px-4 py-3";
    const tamanos = [...new Set([...PAGE_SIZES, initialPageSize])].sort((a, b) => a - b);
    const hayBarra =
        (showSearch && !enServidor) || hasEstadoColumn || hasVenceColumn || toolbarContent ||
        (hasInactiveRows && showInactiveToggle && !hideInactiveToggle);

    return (
        <div className="min-w-0 max-w-full">
            {hayBarra ? (
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
                                aria-label={searchPlaceholder}
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
                            aria-label="Filtrar por estado"
                            onChange={(e) => setEstadoFilter(e.target.value)}
                            className={selectClass()}
                            style={{
                                border: `1px solid ${COLORS.border}`,
                                color: estadoFilter ? COLORS.charcoal : COLORS.muted,
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
                        <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
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
                        <label className="flex items-center gap-2 text-xs ml-auto" style={{ color: COLORS.muted }}>
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

            {comoTarjetas ? (
                visibleRows.length === 0 ? (
                    <div
                        className="rounded-2xl px-4 py-10 text-center text-sm"
                        style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.muted, backgroundColor: "#FAFAFA" }}
                    >
                        {loading ? "Cargando..." : emptyMessage}
                    </div>
                ) : (
                    <div
                        className="grid gap-4"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            opacity: loading ? 0.55 : 1,
                            transition: "opacity 120ms",
                        }}
                        aria-busy={loading}
                    >
                        {visibleRows.map((row, i) => (
                            <TarjetaRegistro
                                key={row.id ?? i}
                                fila={row}
                                columnas={columns}
                                maxCampos={cardMax}
                                onClick={onRowClick}
                            />
                        ))}
                    </div>
                )
            ) : (
                <div
                    className={`rounded-xl overflow-auto max-w-full ${tableContainerClassName}`}
                    style={{ border: `1px solid ${COLORS.border}` }}
                    tabIndex={0}
                    role="region"
                    aria-label="Tabla de registros con desplazamiento horizontal"
                >
                    <table
                        className={`w-full text-sm ${tableClassName}`}
                        style={{
                            borderCollapse: "collapse",
                            opacity: loading ? 0.55 : 1,
                            transition: "opacity 120ms",
                        }}
                        aria-busy={loading}
                    >
                        <thead className="sticky top-0" style={{ backgroundColor: COLORS.greenTint }}>
                            <tr style={{ backgroundColor: COLORS.greenTint }}>
                                {columns.map((c, index) => (
                                    <th
                                        key={c.key}
                                        className={`${celda} text-xs uppercase tracking-wide ${c.nowrap ? "whitespace-nowrap" : ""}`}
                                        style={{
                                            color: COLORS.muted,
                                            fontWeight: 600,
                                            textAlign: c.align ?? "left",
                                            ...(stickyFirstColumn && index === 0
                                                ? { position: "sticky", left: 0, zIndex: 2, backgroundColor: COLORS.greenTint }
                                                : {}),
                                        }}
                                    >
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {visibleRows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-6 text-center text-sm"
                                        style={{ color: COLORS.muted }}
                                    >
                                        {loading ? "Cargando..." : emptyMessage}
                                    </td>
                                </tr>
                            )}

                            {visibleRows.map((row, i) => (
                                <tr
                                    key={row.id ?? i}
                                    onClick={() => onRowClick?.(row)}
                                    className={onRowClick ? "cursor-pointer" : ""}
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
                                    {columns.map((c, index) => (
                                        <td
                                            key={c.key}
                                            className={`${celda} ${c.nowrap ? "whitespace-nowrap" : ""} ${c.cellClassName ?? ""}`}
                                            style={{
                                                color: COLORS.charcoal,
                                                textAlign: c.align ?? "left",
                                                ...(stickyFirstColumn && index === 0
                                                    ? { position: "sticky", left: 0, zIndex: 1, backgroundColor: "#FFFFFF" }
                                                    : {}),
                                            }}
                                        >
                                            {valorDeCelda(c, row)}

                                            {!enServidor && c.key === columns[0].key && row.activo === false && (
                                                <span className="ml-2 text-xs" style={{ color: COLORS.muted }}>
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
            )}

            {pagination || enServidor ? (
                <Paginacion
                    total={total}
                    page={currentPage}
                    pageSize={pageSize}
                    onPageChange={irAPagina}
                    onPageSizeChange={cambiarTamano}
                    sizes={enServidor ? PAGE_SIZES : tamanos}
                    loading={loading}
                />
            ) : showCount && (
                <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                    {filtered.length} de {rows.length} registros
                </p>
            )}
        </div>
    );
}
