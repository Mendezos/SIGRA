import { useState } from "react";
import { SubTabs } from "../ui";
import InventarioDashboard from "./InventarioDashboard";

// Módulo Dashboard y reportes. Cada área se agrega como una pestaña; "reportes" conserva lo que ya existía.
export default function DashboardPanel({ reportes }) {
    const [tab, setTab] = useState("inventario");
    return (
        <div className="mt-6">
            <SubTabs
                tabs={[{ key: "inventario", label: "Inventario" }, { key: "reportes", label: "Frecuencias y reportes" }]}
                active={tab}
                onSelect={setTab}
            />
            {tab === "inventario" && <InventarioDashboard />}
            {tab === "reportes" && <div className="space-y-4">{reportes}</div>}
        </div>
    );
}
