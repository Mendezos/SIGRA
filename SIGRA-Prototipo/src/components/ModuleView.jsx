import { useState } from "react";
import {
    List,
    Calendar as CalendarIcon,
} from "lucide-react";
import EntityPanel from "./EntityPanel";
import Modal from "./Modal";
import RecordForm from "./RecordForm";
import GirasCalendar from "./GirasCalendar";
import StatusBadge from "./StatusBadge";
import {
    canAccessModule,
    canRescheduleGiras,
    getModulePermissions,
    getReportTypes,
} from "../data/roleCapabilities";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const ID_PREFIXES = {
    tickets: "BOL",
    inventario: "INV",
    giras: "GIR",
    cuentas: "USR",
    roles: "ROL",
    facturas: "FA",
    notasCredito: "NC",
    plantillas: "PLA",
};

function idPrefixFor(id) {
    return (
        ID_PREFIXES[id] ??
        id.toUpperCase().slice(0, 3)
    );
}

function TabSwitcher({ tabs, active, onSelect }) {
    return (
        <div
            className="flex items-center gap-1 mb-6"
            style={{
                borderBottom: `1px solid ${COLORS.border}`,
            }}
        >
            {tabs.map((tab) => {
                const isActive = tab.key === active;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onSelect(tab.key)}
                        className="px-4 py-2.5 text-sm"
                        style={{
                            color: isActive
                                ? COLORS.green
                                : COLORS.muted,
                            fontWeight: isActive ? 600 : 400,
                            borderBottom: isActive
                                ? `2px solid ${COLORS.green}`
                                : "2px solid transparent",
                            marginBottom: "-1px",
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

function GenerateReportWidget({ role, onGenerate }) {
    const options = getReportTypes(role);

    const [type, setType] = useState(
        options[0] ?? ""
    );
    const [period, setPeriod] = useState("");
    const [format, setFormat] = useState("PDF");

    if (options.length === 0) return null;

    function handleSubmit(event) {
        event.preventDefault();

        if (!type || !period.trim()) return;

        onGenerate({
            tipo: type,
            periodo: period.trim(),
            formato: format,
        });

        setPeriod("");
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3"
            style={{
                border: `1px solid ${COLORS.border}`,
            }}
        >
            <label className="block">
                <span
                    className="block text-xs mb-1.5"
                    style={{ color: COLORS.charcoal }}
                >
                    Tipo de informe
                </span>

                <select
                    value={type}
                    onChange={(event) =>
                        setType(event.target.value)
                    }
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.charcoal,
                    }}
                >
                    {options.map((option) => (
                        <option
                            key={option}
                            value={option}
                        >
                            {option}
                        </option>
                    ))}
                </select>
            </label>

            <label className="block">
                <span
                    className="block text-xs mb-1.5"
                    style={{ color: COLORS.charcoal }}
                >
                    Período
                </span>

                <input
                    value={period}
                    onChange={(event) =>
                        setPeriod(event.target.value)
                    }
                    placeholder="Ej. Agosto 2026"
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.charcoal,
                    }}
                />
            </label>

            <label className="block">
                <span
                    className="block text-xs mb-1.5"
                    style={{ color: COLORS.charcoal }}
                >
                    Formato
                </span>

                <select
                    value={format}
                    onChange={(event) =>
                        setFormat(event.target.value)
                    }
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.charcoal,
                    }}
                >
                    <option>PDF</option>
                    <option>Excel</option>
                </select>
            </label>

            <button
                type="submit"
                className="px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{
                    backgroundColor: COLORS.green,
                    color: "#FFFFFF",
                    border: "none",
                }}
            >
                Generar informe
            </button>

            <p
                className="w-full text-xs mt-1"
                style={{ color: COLORS.muted }}
            >
                El informe generado aparecerá en el listado de informes disponibles para tu rol.
            </p>
        </form>
    );
}

function LimitedRentalNotice() {
    return (
        <div
            className="rounded-xl px-4 py-3 mb-6"
            style={{
                border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.greenTint,
            }}
        >
            <p
                className="text-sm"
                style={{
                    color: COLORS.charcoal,
                    fontWeight: 600,
                }}
            >
                Consulta operativa de alquileres
            </p>

            <p
                className="text-xs mt-1"
                style={{ color: COLORS.muted }}
            >
                Como técnico podés consultar los equipos
                alquilados y sus fechas. La creación,
                renovación o cancelación del contrato
                corresponde a otros roles.
            </p>
        </div>
    );
}

function RouteMapPreview() {
    return (
        <div
            className="rounded-xl overflow-hidden mb-8"
            style={{
                border: `1px solid ${COLORS.border}`,
            }}
        >
            <div
                className="px-5 py-3 flex flex-wrap items-center justify-between gap-2"
                style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.greenTint,
                }}
            >
                <p
                    className="text-sm"
                    style={{
                        color: COLORS.charcoal,
                        fontWeight: 600,
                    }}
                >
                    Vista previa de ruta
                </p>

                <p
                    className="text-xs"
                    style={{ color: COLORS.muted }}
                >
                    Tiempo estimado: ~52 min · Gran Área
                    Metropolitana
                </p>
            </div>

            <iframe
                title="Vista previa de ruta"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-84.20%2C9.86%2C-83.95%2C10.05&layer=mapnik"
                style={{
                    width: "100%",
                    height: "220px",
                    border: "none",
                }}
                loading="lazy"
            />
        </div>
    );
}

function TemplateDocumentModal({
    template,
    fields,
    onClose,
    onSubmit,
}) {
    const today = new Date().toISOString().slice(0, 10);

    const initialValues = {
        cliente: "",
        concepto: "Alquiler",
        monto: "",
        fecha: today,
        estado: "Pendiente",
    };

    return (
        <Modal
            open={!!template}
            onClose={onClose}
            title={`Nuevo documento — a partir de "${template?.id}"`}
            subtitle="Se creará como una nueva factura."
            width="max-w-2xl"
        >
            <RecordForm
                fields={fields}
                initialValues={initialValues}
                onSubmit={onSubmit}
                onCancel={onClose}
                submitLabel="Crear documento"
            />
        </Modal>
    );
}

export default function ModuleView({
    module,
    Icon,
    user,
    moduleData,
    onModuleDataChange,
}) {
    const hasTabs =
        Array.isArray(module.tabs) &&
        module.tabs.length > 0;

    const [activeTab, setActiveTab] = useState(
        hasTabs ? module.tabs[0].key : null
    );
    const [templateDraft, setTemplateDraft] =
        useState(null);
    const [girasView, setGirasView] =
        useState("lista");
    const [calendarGira, setCalendarGira] =
        useState(null);

    const permissions = getModulePermissions(
        user.role,
        module.id
    );

    const currentTab = hasTabs
        ? module.tabs.find(
              (tab) => tab.key === activeTab
          ) ?? module.tabs[0]
        : null;

    const tabRows = hasTabs
        ? moduleData ?? {}
        : {};

    const singleRows = hasTabs
        ? []
        : moduleData ?? [];

    function setSingleRows(updater) {
        onModuleDataChange(updater);
    }

    function updateTabRows(tabKey, updater) {
        onModuleDataChange((currentData) => {
            const currentTabRows =
                currentData?.[tabKey] ?? [];

            return {
                ...(currentData ?? {}),
                [tabKey]:
                    typeof updater === "function"
                        ? updater(currentTabRows)
                        : updater,
            };
        });
    }

    if (!canAccessModule(user.role, module.id)) {
        return (
            <main className="flex-1 px-10 py-10">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{
                            backgroundColor:
                                COLORS.greenTint,
                        }}
                    >
                        <Icon
                            size={18}
                            color={COLORS.green}
                        />
                    </div>

                    <div>
                        <h1
                            className="text-xl"
                            style={{
                                color: COLORS.charcoal,
                                fontWeight: 600,
                            }}
                        >
                            Acceso restringido
                        </h1>

                        <p
                            className="text-sm mt-1"
                            style={{ color: COLORS.muted }}
                        >
                            Tu rol no tiene acceso a este
                            módulo.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const showMetrics =
        !module.metricsRoles ||
        module.metricsRoles.includes(user.role);

    let displayMetrics = module.metrics;
    let rowFilter;

    if (
        module.id === "tickets" &&
        user.role === "Técnico"
    ) {
        rowFilter = (row) =>
            row.tecnico === user.name;

        const assignedRows =
            singleRows.filter(rowFilter);

        const openRows = assignedRows.filter(
            (row) => row.estado !== "Cerrada"
        ).length;

        const currentMonth = new Date()
            .toISOString()
            .slice(0, 7);

        const closedThisMonth = assignedRows.filter(
            (row) =>
                row.estado === "Cerrada" &&
                String(row.fechaIngreso ?? "").startsWith(
                    currentMonth
                )
        ).length;

        displayMetrics = [
            {
                label: "Mis boletas abiertas",
                value: String(openRows),
            },
            {
                label: "Cerradas este mes",
                value: String(closedThisMonth),
            },
            {
                label: "Total asignadas",
                value: String(assignedRows.length),
            },
        ];
    }

    if (module.id === "dashboard") {
        rowFilter = (row) =>
            !row.rolesVisibles ||
            row.rolesVisibles.includes(user.role);
    }

    function handleGenerateReport({
        tipo,
        periodo,
        formato,
    }) {
        const newReport = {
            id: `${tipo} — ${periodo}`,
            tipo,
            periodo,
            formato,
            estado: "Generado",
            rolesVisibles: [user.role],
            creadoPor: user.name,
            activo: true,
        };

        setSingleRows((rows) => [
            newReport,
            ...rows,
        ]);
    }

    function handleCreateFromTemplate(values) {
        const newRow = {
            ...values,
            id: `FA-${Math.floor(
                1000 + Math.random() * 9000
            )}`,
            activo: true,
        };

        updateTabRows("facturas", (rows) => [
            newRow,
            ...rows,
        ]);

        setTemplateDraft(null);
        setActiveTab("facturas");
    }

    const facturasFields = hasTabs
        ? module.tabs.find(
              (tab) => tab.key === "facturas"
          )?.fields
        : null;

    let createFields = module.fields;
    let editFields = module.fields;
    let transformCreate;
    let allowEdit = permissions.edit;

    if (module.id === "tickets") {
        const isTechnician =
            user.role === "Técnico";

        createFields = isTechnician
            ? module.fields.filter((field) =>
                  [
                      "cliente",
                      "equipo",
                      "fechaIngreso",
                      "hallazgos",
                  ].includes(field.key)
              )
            : module.fields.filter(
                  (field) => field.key !== "estado"
              );

        editFields = isTechnician
            ? module.fields.filter((field) =>
                  ["estado", "hallazgos"].includes(
                      field.key
                  )
              )
            : module.fields;

        transformCreate = (values) => {
            const technician = isTechnician
                ? user.name
                : values.tecnico;

            return {
                ...values,
                tecnico: technician,
                tipoServicio: isTechnician
                    ? "Reparación"
                    : values.tipoServicio,
                estado:
                    technician &&
                    technician !== "Sin asignar"
                        ? "Asignada"
                        : "Recibida",
            };
        };

        if (isTechnician) {
            allowEdit = (record) =>
                !!record &&
                record.tecnico === user.name &&
                record.estado !== "Cerrada";
        }
    }

    if (module.id === "inventario") {
        transformCreate = (values) => ({
            ...values,
            id: values.serie,
        });
    }

    let extraContent;

    if (module.id === "dashboard") {
        extraContent = (
            <GenerateReportWidget
                role={user.role}
                onGenerate={handleGenerateReport}
            />
        );
    }

    if (
        module.id === "alquiler" &&
        user.role === "Técnico"
    ) {
        extraContent = <LimitedRentalNotice />;
    }

    return (
        <main className="flex-1 min-w-0 px-10 py-10 overflow-x-auto">
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                            backgroundColor:
                                COLORS.greenTint,
                        }}
                    >
                        <Icon
                            size={18}
                            color={COLORS.green}
                        />
                    </div>

                    <div>
                        <h1
                            className="text-xl"
                            style={{
                                color: COLORS.charcoal,
                                fontWeight: 600,
                            }}
                        >
                            {module.label}
                        </h1>

                        <p
                            className="text-xs mt-0.5"
                            style={{ color: COLORS.muted }}
                        >
                            {module.subtitle}
                        </p>
                    </div>
                </div>
            </div>

            {showMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-6">
                    {displayMetrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="rounded-lg p-4"
                            style={{
                                backgroundColor:
                                    COLORS.greenTint,
                            }}
                        >
                            <p
                                className="text-xs mb-1"
                                style={{
                                    color: COLORS.muted,
                                }}
                            >
                                {metric.label}
                            </p>

                            <p
                                className="text-2xl"
                                style={{
                                    color: COLORS.charcoal,
                                    fontWeight: 600,
                                }}
                            >
                                {metric.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {module.id === "giras" && (
                <RouteMapPreview />
            )}

            {module.id === "giras" && (
                <div className="flex items-center gap-2 mb-4">
                    <button
                        type="button"
                        onClick={() =>
                            setGirasView("lista")
                        }
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs"
                        style={{
                            border: `1px solid ${COLORS.border}`,
                            backgroundColor:
                                girasView === "lista"
                                    ? COLORS.greenTint
                                    : "transparent",
                            color:
                                girasView === "lista"
                                    ? COLORS.green
                                    : COLORS.muted,
                            fontWeight:
                                girasView === "lista"
                                    ? 600
                                    : 400,
                        }}
                    >
                        <List size={14} />
                        Lista
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setGirasView("calendario")
                        }
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs"
                        style={{
                            border: `1px solid ${COLORS.border}`,
                            backgroundColor:
                                girasView === "calendario"
                                    ? COLORS.greenTint
                                    : "transparent",
                            color:
                                girasView === "calendario"
                                    ? COLORS.green
                                    : COLORS.muted,
                            fontWeight:
                                girasView === "calendario"
                                    ? 600
                                    : 400,
                        }}
                    >
                        <CalendarIcon size={14} />
                        Calendario
                    </button>
                </div>
            )}

            {module.id === "giras" &&
            girasView === "calendario" ? (
                <GirasCalendar
                    rows={singleRows}
                    onRowsChange={setSingleRows}
                    onSelectGira={setCalendarGira}
                    canReschedule={canRescheduleGiras(
                        user.role
                    )}
                />
            ) : hasTabs ? (
                <>
                    <TabSwitcher
                        tabs={module.tabs}
                        active={currentTab.key}
                        onSelect={setActiveTab}
                    />

                    <EntityPanel
                        key={currentTab.key}
                        idPrefix={idPrefixFor(
                            currentTab.key
                        )}
                        entityLabel={currentTab.label}
                        columns={currentTab.columns}
                        fields={currentTab.fields}
                        rows={
                            tabRows[currentTab.key] ?? []
                        }
                        onRowsChange={(updater) =>
                            updateTabRows(
                                currentTab.key,
                                updater
                            )
                        }
                        allowCreate={
                            permissions.create &&
                            currentTab.key !==
                                "plantillas"
                        }
                        allowEdit={permissions.edit}
                        allowDeactivate={
                            permissions.deactivate
                        }
                        onRowClick={
                            currentTab.key ===
                                "plantillas" &&
                            permissions.create
                                ? setTemplateDraft
                                : undefined
                        }
                    />
                </>
            ) : (
                <EntityPanel
                    idPrefix={idPrefixFor(module.id)}
                    entityLabel={module.label}
                    columns={module.columns}
                    fields={module.fields}
                    createFields={createFields}
                    editFields={editFields}
                    rows={singleRows}
                    onRowsChange={setSingleRows}
                    rowFilter={rowFilter}
                    allowCreate={
                        module.allowCreate !== false &&
                        permissions.create
                    }
                    allowEdit={allowEdit}
                    allowDeactivate={
                        permissions.deactivate
                    }
                    createLabel={
                        module.id === "tickets"
                            ? "Generar boleta"
                            : "Nuevo"
                    }
                    createTitle={
                        module.id === "tickets"
                            ? "Generar nueva boleta"
                            : undefined
                    }
                    createSubmitLabel={
                        module.id === "tickets"
                            ? "Generar boleta"
                            : "Crear"
                    }
                    transformCreate={transformCreate}
                    extraContent={extraContent}
                />
            )}

            {templateDraft && facturasFields && (
                <TemplateDocumentModal
                    template={templateDraft}
                    fields={facturasFields}
                    onClose={() =>
                        setTemplateDraft(null)
                    }
                    onSubmit={
                        handleCreateFromTemplate
                    }
                />
            )}

            <Modal
                open={!!calendarGira}
                onClose={() => setCalendarGira(null)}
                title={calendarGira?.id ?? "Gira"}
                subtitle="Vista rápida desde el calendario"
            >
                {calendarGira && (
                    <div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                            <div>
                                <dt
                                    className="text-xs mb-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Técnico asignado
                                </dt>
                                <dd
                                    className="text-sm"
                                    style={{
                                        color:
                                            COLORS.charcoal,
                                    }}
                                >
                                    {calendarGira.tecnico ||
                                        "—"}
                                </dd>
                            </div>

                            <div>
                                <dt
                                    className="text-xs mb-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Fecha programada
                                </dt>
                                <dd
                                    className="text-sm"
                                    style={{
                                        color:
                                            COLORS.charcoal,
                                    }}
                                >
                                    {calendarGira.fecha ||
                                        "—"}
                                </dd>
                            </div>

                            <div>
                                <dt
                                    className="text-xs mb-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Vehículo
                                </dt>
                                <dd
                                    className="text-sm"
                                    style={{
                                        color:
                                            COLORS.charcoal,
                                    }}
                                >
                                    {calendarGira.vehiculo ||
                                        "—"}
                                </dd>
                            </div>

                            <div>
                                <dt
                                    className="text-xs mb-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Costo estimado
                                </dt>
                                <dd
                                    className="text-sm"
                                    style={{
                                        color:
                                            COLORS.charcoal,
                                    }}
                                >
                                    {calendarGira.costoEstimado ||
                                        "—"}
                                </dd>
                            </div>

                            <div className="sm:col-span-2">
                                <dt
                                    className="text-xs mb-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Clientes a visitar
                                </dt>
                                <dd
                                    className="text-sm"
                                    style={{
                                        color:
                                            COLORS.charcoal,
                                    }}
                                >
                                    {calendarGira.clientes ||
                                        "—"}
                                </dd>
                            </div>

                            <div>
                                <dt
                                    className="text-xs mb-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Estado
                                </dt>
                                <dd className="text-sm">
                                    <StatusBadge
                                        value={
                                            calendarGira.estado
                                        }
                                    />
                                </dd>
                            </div>
                        </dl>

                        <div
                            className="flex justify-end gap-3 pt-4"
                            style={{
                                borderTop: `1px solid ${COLORS.border}`,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setCalendarGira(null)
                                }
                                className="px-4 py-2.5 rounded-lg text-sm"
                                style={{
                                    color: COLORS.muted,
                                }}
                            >
                                Cerrar
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setGirasView("lista");
                                    setCalendarGira(null);
                                }}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium"
                                style={{
                                    backgroundColor:
                                        COLORS.green,
                                    color: "#FFFFFF",
                                    border: "none",
                                }}
                            >
                                Ver en la lista
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </main>
    );
}