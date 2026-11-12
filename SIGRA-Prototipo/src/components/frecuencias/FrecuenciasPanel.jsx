import { useCallback, useState } from "react";
import { SubTabs } from "../ui";
import AlertasTab from "./AlertasTab";
import SolicitudesTab from "./SolicitudesTab";
import VencidasTab from "./VencidasTab";

// `navTarget` ({ tab, id, nonce }) lo manda el tablero cuando se abre una notificación de la campana: salta a esa pestaña y,
// si trae `id` (solicitud), abre su detalle.
const PESTANAS = ["solicitudes", "alertas", "vencidas"];

export default function FrecuenciasPanel({ user, navTarget }) {
    const [tab, setTab] = useState(PESTANAS.includes(navTarget?.tab) ? navTarget.tab : "solicitudes");
    const [abrirId, setAbrirId] = useState(navTarget?.id ?? null);
    const [nonceVisto, setNonceVisto] = useState(navTarget?.nonce);

    // Una notificación abierta con el módulo ya visible: se cambia de pestaña durante el render (patrón recomendado por React).
    if (navTarget && navTarget.nonce !== nonceVisto) {
        setNonceVisto(navTarget.nonce);
        if (PESTANAS.includes(navTarget.tab)) setTab(navTarget.tab);
        setAbrirId(navTarget.tab === "solicitudes" ? (navTarget.id ?? null) : null);
    }

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
