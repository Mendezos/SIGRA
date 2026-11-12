import { useState } from "react";
import { SubTabs } from "../ui";
import AgendaTab from "./AgendaTab";
import BateriasTab from "./BateriasTab";
import ContactosCrmTab from "./ContactosCrmTab";
import HistorialTab from "./HistorialTab";
import PeriodicosTab from "./PeriodicosTab";
import ProspectosTab from "./ProspectosTab";
import { puedeVerCrm } from "./helpers";

// Módulo CRM y prospectos. Para sumar una pestaña basta agregarla a `tabs` y renderizarla abajo.
// `navTarget` ({ tab, id, nonce }) lo manda el tablero cuando se abre una notificación de la campana: salta a esa pestaña y
// cada pestaña recibe `target` para abrir el registro indicado (id).
export default function CrmPanel({ user, navTarget }) {
    const tabs = puedeVerCrm(user)
        ? [
              { key: "prospectos", label: "Prospectos" },
              { key: "contactos", label: "Contactos" },
              { key: "agenda", label: "Mi agenda" },
              { key: "periodicos", label: "Contactos periódicos" },
              { key: "historial", label: "Historial comercial" },
              { key: "baterias", label: "Recordatorios de baterías" },
          ]
        : [];
    const [tab, setTab] = useState(tabs.some((t) => t.key === navTarget?.tab) ? navTarget.tab : (tabs[0]?.key ?? "prospectos"));
    const [nonceVisto, setNonceVisto] = useState(navTarget?.nonce);

    // Una notificación abierta con el módulo ya visible: se cambia de pestaña durante el render (patrón recomendado por React).
    if (navTarget && navTarget.nonce !== nonceVisto) {
        setNonceVisto(navTarget.nonce);
        if (tabs.some((t) => t.key === navTarget.tab)) setTab(navTarget.tab);
    }

    const target = (key) => (navTarget?.tab === key ? navTarget : null);

    return (
        <div className="mt-6">
            <SubTabs tabs={tabs} active={tab} onSelect={setTab} />

            {tab === "prospectos" && <ProspectosTab user={user} target={target("prospectos")} />}
            {tab === "contactos" && <ContactosCrmTab user={user} target={target("contactos")} />}
            {tab === "agenda" && <AgendaTab user={user} target={target("agenda")} />}
            {tab === "periodicos" && <PeriodicosTab user={user} target={target("periodicos")} />}
            {tab === "historial" && <HistorialTab user={user} target={target("historial")} />}
            {tab === "baterias" && <BateriasTab user={user} target={target("baterias")} />}
        </div>
    );
}
