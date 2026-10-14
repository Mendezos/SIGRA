import { useCallback, useState } from "react";
import { SubTabs } from "../ui";
import AlertasTab from "./AlertasTab";
import SolicitudesTab from "./SolicitudesTab";
import VencidasTab from "./VencidasTab";

export default function FrecuenciasPanel({ user }) {
    const [tab, setTab] = useState("solicitudes");
    const [abrirId, setAbrirId] = useState(null);

    // Desde una alerta o desde el reporte se salta al detalle de la solicitud.
    const verSolicitud = useCallback((idSolicitud) => {
        setAbrirId(idSolicitud);
        setTab("solicitudes");
    }, []);
    const solicitudAbierta = useCallback(() => setAbrirId(null), []);

    const tabs = [
        { key: "solicitudes", label: "Solicitudes" },
        { key: "alertas", label: "Alertas de vencimiento" },
        { key: "vencidas", label: "Vencidas sin renovación" },
    ];

    return (
        <div className="mt-6">
            <SubTabs tabs={tabs} active={tab} onSelect={setTab} />

            {tab === "solicitudes" && <SolicitudesTab user={user} abrirId={abrirId} onAbierta={solicitudAbierta} />}
            {tab === "alertas" && <AlertasTab user={user} onVerSolicitud={verSolicitud} />}
            {tab === "vencidas" && <VencidasTab onVerSolicitud={verSolicitud} />}
        </div>
    );
}
