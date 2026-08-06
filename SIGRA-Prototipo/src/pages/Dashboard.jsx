import { useState } from "react";
import {
    Home,
    Wrench,
    Radio,
    Package,
    Users,
    LayoutDashboard,
    Sparkles,
    FileText,
    Route,
    Handshake,
    Building2,
    Waves,
    LogOut,
    FilePlus2,
    BarChart3,
    ArrowRight,
} from "lucide-react";
import { MODULES } from "../data/modules";
import {
    canAccessModule,
    canGenerateTicket,
    getQuickModuleIds,
    getReportTypes,
} from "../data/roleCapabilities";
import ModuleView from "../components/ModuleView";
import NotificationsBell from "../components/NotificationsBell";
import IAChatPanel from "../components/IAChatPanel";
import BrandLogo from "../components/BrandLogo";
import GenerateTicketModal from "../components/GenerateTicketModal";
import GenerateReportModal from "../components/GenerateReportModal";
import StatusBadge from "../components/StatusBadge";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const FONT =
    "'Source Serif 4', Georgia, 'Times New Roman', serif";

const ICONS = {
    usuarios: Users,
    tickets: Wrench,
    alquiler: Radio,
    inventario: Package,
    dashboard: LayoutDashboard,
    ia: Sparkles,
    contratos: FileText,
    giras: Route,
    crm: Handshake,
    clientes: Building2,
    frecuencias: Waves,
};

function createInitialModuleData() {
    return Object.fromEntries(
        MODULES.map((module) => [
            module.id,
            Array.isArray(module.tabs)
                ? Object.fromEntries(
                      module.tabs.map((tab) => [
                          tab.key,
                          tab.seed ?? [],
                      ])
                  )
                : module.seed ?? [],
        ])
    );
}

function nextTicketId(rows) {
    const numbers = rows
        .map((row) => {
            const match = String(row.id ?? "").match(
                /^BOL-(\d+)$/
            );

            return match ? Number(match[1]) : 0;
        })
        .filter(Number.isFinite);

    const next = Math.max(0, ...numbers) + 1;

    return `BOL-${String(next).padStart(5, "0")}`;
}

function Sidebar({
    active,
    onSelect,
    user,
    onLogout,
}) {
    const visibleModules = MODULES.filter((module) =>
        canAccessModule(user.role, module.id)
    );

    return (
        <aside
            className="w-72 shrink-0 h-screen sticky top-0 flex flex-col px-5 py-6"
            style={{
                borderRight: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
            }}
        >
            <div className="mb-7 px-2">
                <BrandLogo compact />

                <div
                    style={{ color: COLORS.muted }}
                    className="text-xs uppercase tracking-widest mt-2"
                >
                    Portal interno
                </div>
            </div>

            <div
                className="flex items-center gap-3 px-3 py-3 mb-6 rounded-lg"
                style={{
                    backgroundColor: COLORS.greenTint,
                }}
            >
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{
                        backgroundColor: COLORS.green,
                        color: COLORS.white,
                    }}
                >
                    {user.initials}
                </div>

                <div className="min-w-0">
                    <p
                        className="text-sm truncate"
                        style={{ color: COLORS.charcoal }}
                    >
                        {user.name}
                    </p>

                    <p
                        className="text-xs leading-snug"
                        style={{ color: COLORS.muted }}
                    >
                        {user.role}
                    </p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto">
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left text-sm"
                    style={{
                        backgroundColor:
                            active === null
                                ? COLORS.greenTint
                                : "transparent",
                        color:
                            active === null
                                ? COLORS.green
                                : COLORS.charcoal,
                        fontWeight:
                            active === null ? 600 : 400,
                    }}
                >
                    <Home
                        size={17}
                        color={
                            active === null
                                ? COLORS.green
                                : COLORS.muted
                        }
                    />
                    Inicio
                </button>

                {visibleModules.map((module) => {
                    const Icon = ICONS[module.id];
                    const isActive =
                        active === module.id;

                    return (
                        <button
                            key={module.id}
                            type="button"
                            onClick={() =>
                                onSelect(module.id)
                            }
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg mb-1 text-left text-sm leading-snug"
                            style={{
                                backgroundColor: isActive
                                    ? COLORS.greenTint
                                    : "transparent",
                                color: isActive
                                    ? COLORS.green
                                    : COLORS.charcoal,
                                fontWeight: isActive
                                    ? 600
                                    : 400,
                            }}
                        >
                            <Icon
                                size={17}
                                className="mt-0.5 shrink-0"
                                color={
                                    isActive
                                        ? COLORS.green
                                        : COLORS.muted
                                }
                            />

                            {module.label}
                        </button>
                    );
                })}
            </nav>

            <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm mt-4"
                style={{ color: COLORS.muted }}
            >
                <LogOut
                    size={17}
                    color={COLORS.muted}
                />
                Cerrar sesión
            </button>
        </aside>
    );
}

function QuickModuleCard({ module, onOpen }) {
    const Icon = ICONS[module.id];

    return (
        <button
            type="button"
            onClick={() => onOpen(module.id)}
            className="rounded-xl p-4 text-left"
            style={{
                border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                        backgroundColor: COLORS.greenTint,
                    }}
                >
                    <Icon
                        size={17}
                        color={COLORS.green}
                    />
                </div>

                <ArrowRight
                    size={16}
                    color={COLORS.muted}
                />
            </div>

            <p
                className="text-sm mt-4"
                style={{
                    color: COLORS.charcoal,
                    fontWeight: 600,
                }}
            >
                {module.label}
            </p>

            <p
                className="text-xs mt-1 leading-relaxed"
                style={{ color: COLORS.muted }}
            >
                {module.id === "alquiler"
                    ? "Consulta operativa de equipos y contratos asignados."
                    : module.subtitle}
            </p>
        </button>
    );
}

function ReportsPreview({
    user,
    reports,
    onOpenReports,
}) {
    const visibleReports = reports
        .filter(
            (report) =>
                !report.rolesVisibles ||
                report.rolesVisibles.includes(user.role)
        )
        .slice(0, 5);

    return (
        <section className="mt-8">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h2
                        className="text-lg"
                        style={{
                            color: COLORS.charcoal,
                            fontWeight: 600,
                        }}
                    >
                        Informes recientes
                    </h2>

                    <p
                        className="text-xs mt-1"
                        style={{ color: COLORS.muted }}
                    >
                        Solo se muestran los informes
                        disponibles para tu rol.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onOpenReports}
                    className="text-sm"
                    style={{ color: COLORS.green }}
                >
                    Ver todos
                </button>
            </div>

            <div
                className="rounded-xl overflow-x-auto"
                style={{
                    border: `1px solid ${COLORS.border}`,
                }}
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr
                            style={{
                                backgroundColor:
                                    COLORS.greenTint,
                            }}
                        >
                            <th className="text-left px-4 py-3 text-xs">
                                Informe
                            </th>
                            <th className="text-left px-4 py-3 text-xs">
                                Período
                            </th>
                            <th className="text-left px-4 py-3 text-xs">
                                Formato
                            </th>
                            <th className="text-left px-4 py-3 text-xs">
                                Estado
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {visibleReports.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-6 text-center"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Todavía no hay informes
                                    disponibles para tu rol.
                                </td>
                            </tr>
                        )}

                        {visibleReports.map(
                            (report, index) => (
                                <tr
                                    key={`${report.id}-${report.periodo}-${index}`}
                                    style={{
                                        borderTop: `1px solid ${COLORS.border}`,
                                    }}
                                >
                                    <td className="px-4 py-3">
                                        {report.id}
                                    </td>
                                    <td className="px-4 py-3">
                                        {report.periodo}
                                    </td>
                                    <td className="px-4 py-3">
                                        {report.formato}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            value={
                                                report.estado
                                            }
                                        />
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Welcome({
    user,
    reports,
    notice,
    onGenerateTicket,
    onGenerateReport,
    onOpenModule,
}) {
    const [ticketModalOpen, setTicketModalOpen] =
        useState(false);
    const [reportModalOpen, setReportModalOpen] =
        useState(false);

    const today = new Date().toLocaleDateString(
        "es-CR",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    );

    const reportTypes = getReportTypes(user.role);

    const quickModules = getQuickModuleIds(user.role)
        .map((id) =>
            MODULES.find((module) => module.id === id)
        )
        .filter(Boolean);

    return (
        <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-10 py-10">
                <p
                    className="text-xs uppercase tracking-widest capitalize"
                    style={{ color: COLORS.muted }}
                >
                    {today}
                </p>

                <h1
                    className="text-3xl mt-3"
                    style={{
                        color: COLORS.charcoal,
                        fontWeight: 600,
                    }}
                >
                    Bienvenido,{" "}
                    {user.name.split(" ")[0]}
                </h1>

                <p
                    className="text-sm mt-2"
                    style={{ color: COLORS.muted }}
                >
                    Estas son las acciones y módulos
                    disponibles para tu rol.
                </p>

                {notice && (
                    <div
                        className="rounded-xl px-4 py-3 mt-6 text-sm"
                        style={{
                            backgroundColor:
                                COLORS.greenTint,
                            color: COLORS.charcoal,
                            border: `1px solid ${COLORS.green}`,
                        }}
                    >
                        {notice}
                    </div>
                )}

                <section className="mt-8">
                    <h2
                        className="text-lg mb-4"
                        style={{
                            color: COLORS.charcoal,
                            fontWeight: 600,
                        }}
                    >
                        Acciones rápidas
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {canGenerateTicket(user.role) && (
                            <button
                                type="button"
                                onClick={() =>
                                    setTicketModalOpen(
                                        true
                                    )
                                }
                                className="rounded-xl p-5 text-left"
                                style={{
                                    backgroundColor:
                                        COLORS.green,
                                    color: COLORS.white,
                                }}
                            >
                                <FilePlus2 size={23} />

                                <p className="text-lg mt-4 font-semibold">
                                    Generar boleta
                                </p>

                                <p className="text-sm mt-1 opacity-90">
                                    {user.role === "Técnico"
                                        ? "Registrá una boleta de reparación asignada a tu usuario."
                                        : "Creá una boleta y asignala al técnico correspondiente."}
                                </p>
                            </button>
                        )}

                        {reportTypes.length > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setReportModalOpen(
                                        true
                                    )
                                }
                                className="rounded-xl p-5 text-left"
                                style={{
                                    backgroundColor:
                                        COLORS.white,
                                    border: `1px solid ${COLORS.border}`,
                                    color:
                                        COLORS.charcoal,
                                }}
                            >
                                <BarChart3
                                    size={23}
                                    color={COLORS.green}
                                />

                                <p className="text-lg mt-4 font-semibold">
                                    Generar informe
                                </p>

                                <p
                                    className="text-sm mt-1"
                                    style={{
                                        color:
                                            COLORS.muted,
                                    }}
                                >
                                    Generá un informe sin
                                    ingresar primero al módulo
                                    de paneles.
                                </p>
                            </button>
                        )}
                    </div>
                </section>

                <section className="mt-8">
                    <h2
                        className="text-lg mb-4"
                        style={{
                            color: COLORS.charcoal,
                            fontWeight: 600,
                        }}
                    >
                        Accesos de tu rol
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {quickModules.map((module) => (
                            <QuickModuleCard
                                key={module.id}
                                module={module}
                                onOpen={onOpenModule}
                            />
                        ))}
                    </div>
                </section>

                <ReportsPreview
                    user={user}
                    reports={reports}
                    onOpenReports={() =>
                        onOpenModule("dashboard")
                    }
                />
            </div>

            <GenerateTicketModal
                open={ticketModalOpen}
                user={user}
                onClose={() =>
                    setTicketModalOpen(false)
                }
                onGenerate={onGenerateTicket}
            />

            <GenerateReportModal
                open={reportModalOpen}
                user={user}
                onClose={() =>
                    setReportModalOpen(false)
                }
                onGenerate={onGenerateReport}
            />
        </main>
    );
}

export default function Dashboard({
    user,
    onLogout,
}) {
    const [active, setActive] = useState(null);
    const [notice, setNotice] = useState("");
    const [moduleData, setModuleData] = useState(
        createInitialModuleData
    );

    const currentModule =
        MODULES.find(
            (module) => module.id === active
        ) ?? null;

    function updateModuleData(moduleId, updater) {
        setModuleData((currentData) => {
            const currentModuleData =
                currentData[moduleId];

            return {
                ...currentData,
                [moduleId]:
                    typeof updater === "function"
                        ? updater(currentModuleData)
                        : updater,
            };
        });
    }

    function handleGenerateTicket(values) {
        const currentTickets =
            moduleData.tickets ?? [];

        const newTicket = {
            ...values,
            id: nextTicketId(currentTickets),
            activo: true,
        };

        updateModuleData("tickets", (rows) => [
            newTicket,
            ...rows,
        ]);

        setNotice(
            `La boleta ${newTicket.id} fue generada correctamente y quedó en estado ${newTicket.estado}.`
        );
    }

    function handleGenerateReport(values) {
        const newReport = {
            id: `${values.tipo} — ${values.periodo}`,
            tipo: values.tipo,
            periodo: values.periodo,
            formato: values.formato,
            estado: "Generado",
            creadoPor: user.name,
            rolesVisibles: [user.role],
            activo: true,
        };

        updateModuleData("dashboard", (rows) => [
            newReport,
            ...rows,
        ]);

        setNotice(
            `El informe “${values.tipo}” fue generado correctamente en formato ${values.formato}.`
        );
    }

    return (
        <div
            style={{ fontFamily: FONT }}
            className="min-h-screen w-full flex bg-white"
        >
            <Sidebar
                active={active}
                onSelect={(moduleId) => {
                    setActive(moduleId);
                    setNotice("");
                }}
                user={user}
                onLogout={onLogout}
            />

            {currentModule ? (
                <ModuleView
                    key={currentModule.id}
                    module={currentModule}
                    Icon={ICONS[currentModule.id]}
                    user={user}
                    moduleData={
                        moduleData[currentModule.id]
                    }
                    onModuleDataChange={(updater) =>
                        updateModuleData(
                            currentModule.id,
                            updater
                        )
                    }
                />
            ) : (
                <Welcome
                    user={user}
                    reports={
                        moduleData.dashboard ?? []
                    }
                    notice={notice}
                    onGenerateTicket={
                        handleGenerateTicket
                    }
                    onGenerateReport={
                        handleGenerateReport
                    }
                    onOpenModule={(moduleId) => {
                        setActive(moduleId);
                        setNotice("");
                    }}
                />
            )}

            <NotificationsBell role={user.role} />
            <IAChatPanel />
        </div>
    );
}