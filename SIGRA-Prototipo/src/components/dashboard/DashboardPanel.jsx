import { useState } from "react";
import { SubTabs } from "../ui";
import AlertasDashboard from "./AlertasDashboard";
import InventarioDashboard from "./InventarioDashboard";
import TallerDashboard from "./TallerDashboard";

// Módulo Dashboard y reportes. Cada área se agrega como una pestaña; "reportes" conserva lo que ya existía.
export default function DashboardPanel({ reportes, onNavegar }) {
    const [tab, setTab] = useState("alertas");
    return (
        <div className="mt-6">
            <SubTabs
                tabs={[{ key: "alertas", label: "Alertas" }, { key: "inventario", label: "Inventario" }, { key: "taller", label: "Taller y boletas" }, { key: "reportes", label: "Frecuencias y reportes" }]}
                active={tab}
                onSelect={setTab}
            />
            {tab === "alertas" && <AlertasDashboard onNavegar={onNavegar} />}
            {tab === "inventario" && <InventarioDashboard />}
            {tab === "taller" && <TallerDashboard onNavegar={onNavegar} />}
            {tab === "reportes" && <div className="space-y-4">{reportes}</div>}
        </div>
    );
}
