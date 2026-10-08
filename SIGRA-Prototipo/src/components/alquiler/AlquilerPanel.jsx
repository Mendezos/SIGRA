import { useState } from "react";
import { SubTabs } from "../ui";
import ContactosTab from "./ContactosTab";
import ContratosTab from "./ContratosTab";
import RadiosTab from "./RadiosTab";
import {
    puedeAsignarRadio,
    puedeReasignarContacto,
    puedeRegistrarContacto,
    puedeRegistrarContrato,
    puedeVerContactos,
} from "./helpers";

export default function AlquilerPanel({ user }) {
    const [tab, setTab] = useState("contratos");

    // Para sumar una pestaña (por ejemplo repetidoras) basta agregarla aquí y renderizarla abajo.
    const tabs = [
        { key: "contratos", label: "Contratos" },
        { key: "radios", label: "Radios en alquiler" },
        ...(puedeVerContactos(user.role) ? [{ key: "contactos", label: "Contactos iniciales" }] : []),
    ];

    return (
        <div className="mt-6">
            <SubTabs tabs={tabs} active={tab} onSelect={setTab} />

            {tab === "contratos" && (
                <ContratosTab canRegister={puedeRegistrarContrato(user.role)} canAsignarRadio={puedeAsignarRadio(user.role)} />
            )}
            {tab === "radios" && <RadiosTab canAsignar={puedeAsignarRadio(user.role)} />}
            {tab === "contactos" && (
                <ContactosTab canRegister={puedeRegistrarContacto(user.role)} canReasignar={puedeReasignarContacto(user.role)} />
            )}
        </div>
    );
}
