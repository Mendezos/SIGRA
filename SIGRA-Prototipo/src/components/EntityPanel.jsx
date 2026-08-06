import { useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "./DataTable";
import Modal from "./Modal";
import RecordForm from "./RecordForm";
import DetailPanel from "./DetailPanel";

const COLORS = {
    green: "#5EB453",
    white: "#FFFFFF",
};

// Genera el siguiente ID consecutivo tomando como referencia
// los IDs que ya existen en el arreglo de registros.
function nextGeneratedId(prefix, rows) {
    const numbers = rows
        .map((row) => {
            const match = String(row.id ?? "").match(/(\d+)$/);
            return match ? Number(match[1]) : 0;
        })
        .filter(Number.isFinite);

    const next = Math.max(0, ...numbers) + 1;
    const width = prefix === "BOL" ? 5 : 4;

    return `${prefix}-${String(next).padStart(width, "0")}`;
}

export default function EntityPanel({
    idPrefix,
    entityLabel,
    columns,
    fields,
    createFields = fields,
    editFields = fields,
    seed,
    rows: controlledRows,
    onRowsChange,
    searchPlaceholder,
    allowCreate = true,
    allowEdit = true,
    allowDeactivate = true,
    createLabel = "Nuevo",
    createTitle,
    createSubmitLabel = "Crear",
    transformCreate,
    transformEdit,
    onRowClick,
    extraContent,
    rowFilter,
}) {
    const isControlled = Array.isArray(controlledRows);
    const [internalRows, setInternalRows] = useState(seed ?? []);

    const rows = isControlled ? controlledRows : internalRows;
    const setRows = isControlled ? onRowsChange : setInternalRows;

    const visibleRows = rowFilter
        ? rows.filter(rowFilter)
        : rows;

    const [selected, setSelected] = useState(null);
    const [formMode, setFormMode] = useState(null);

    const selectedCanEdit =
        typeof allowEdit === "function"
            ? allowEdit(selected)
            : allowEdit;

    function handleCreate(values) {
        const transformed = transformCreate
            ? transformCreate(values, rows)
            : values;

        const newRow = {
            ...transformed,
            activo: transformed.activo ?? true,
        };

        if (!newRow.id) {
            newRow.id = nextGeneratedId(idPrefix, rows);
        }

        setRows((currentRows) => [newRow, ...currentRows]);
        setFormMode(null);
    }

    function handleEdit(values) {
        if (!selected || !selectedCanEdit) return;

        const transformed = transformEdit
            ? transformEdit(values, selected)
            : values;

        setRows((currentRows) =>
            currentRows.map((row) =>
                row.id === selected.id
                    ? {
                          ...row,
                          ...transformed,
                          id: row.id,
                      }
                    : row
            )
        );

        setSelected((current) =>
            current
                ? {
                      ...current,
                      ...transformed,
                      id: current.id,
                  }
                : current
        );

        setFormMode(null);
    }

    function handleToggleActive() {
        if (!selected || !allowDeactivate) return;

        const nextActive = selected.activo === false;

        setRows((currentRows) =>
            currentRows.map((row) =>
                row.id === selected.id
                    ? { ...row, activo: nextActive }
                    : row
            )
        );

        setSelected((current) =>
            current
                ? { ...current, activo: nextActive }
                : current
        );
    }

    function handleRowClick(row) {
        if (onRowClick) {
            onRowClick(row);
            return;
        }

        setSelected(row);
    }

    return (
        <div>
            {extraContent}

            <div className="flex items-center justify-end mb-4">
                {allowCreate && (
                    <button
                        type="button"
                        onClick={() => setFormMode("create")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shrink-0"
                        style={{
                            backgroundColor: COLORS.green,
                            color: COLORS.white,
                            border: "none",
                        }}
                    >
                        <Plus size={16} />
                        {createLabel}
                    </button>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={visibleRows}
                onRowClick={handleRowClick}
                searchPlaceholder={
                    searchPlaceholder ??
                    `Buscar en ${entityLabel.toLowerCase()}...`
                }
            />

            <DetailPanel
                open={!!selected && formMode !== "edit"}
                record={selected}
                fields={fields}
                idLabel={columns[0]?.label}
                onClose={() => setSelected(null)}
                onEdit={() => setFormMode("edit")}
                onToggleActive={handleToggleActive}
                allowEdit={!!selectedCanEdit}
                allowDeactivate={allowDeactivate}
            />

            {allowCreate && (
                <Modal
                    open={formMode === "create"}
                    onClose={() => setFormMode(null)}
                    title={
                        createTitle ??
                        `Nuevo registro — ${entityLabel}`
                    }
                    subtitle="Los datos ingresados solo se guardan durante esta sesión."
                    width="max-w-2xl"
                >
                    <RecordForm
                        fields={createFields}
                        onSubmit={handleCreate}
                        onCancel={() => setFormMode(null)}
                        submitLabel={createSubmitLabel}
                    />
                </Modal>
            )}

            <Modal
                open={formMode === "edit" && !!selected && !!selectedCanEdit}
                onClose={() => setFormMode(null)}
                title={`Editar — ${selected?.id ?? ""}`}
                subtitle="Los cambios solo se guardan durante esta sesión."
                width="max-w-2xl"
            >
                {selected && selectedCanEdit && (
                    <RecordForm
                        fields={editFields}
                        initialValues={selected}
                        onSubmit={handleEdit}
                        onCancel={() => setFormMode(null)}
                        submitLabel="Guardar cambios"
                    />
                )}
            </Modal>
        </div>
    );
}