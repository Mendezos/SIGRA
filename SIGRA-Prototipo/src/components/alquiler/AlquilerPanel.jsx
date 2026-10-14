import { useState } from "react";
import { SubTabs } from "../ui";
import ContactosTab from "./ContactosTab";
import ContratosTab from "./ContratosTab";
import RadiosTab from "./RadiosTab";
import RepetidorasTab from "./RepetidorasTab";
import {
    puedeAsignarRadio,
    puedeCancelarContrato,
    puedeVerAuditoria,
    puedeReasignarContacto,
    puedeRegistrarContacto,
    puedeRegistrarContrato,
    puedeRegistrarFichaRepetidora,
    puedeVerContactos,
} from "./helpers";

export default function AlquilerPanel({ user }) {
    const [tab, setTab] = useState("contratos");

    // Para sumar una pestaña basta agregarla aquí y renderizarla abajo.
    const tabs = [
        { key: "contratos", label: "Contratos" },
        { key: "radios", label: "Radios en alquiler" },
        { key: "repetidoras", label: "Repetidoras" },
        ...(puedeVerContactos(user.role) ? [{ key: "contactos", label: "Contactos iniciales" }] : []),
    ];

    return (
        <div className="mt-6">
            <SubTabs tabs={tabs} active={tab} onSelect={setTab} />

            {tab === "contratos" && (
                <ContratosTab
                    canRegister={puedeRegistrarContrato(user.role)}
                    canAsignarRadio={puedeAsignarRadio(user.role)}
                    canRenovar={puedeRegistrarContrato(user.role)}
                    canCancelar={puedeCancelarContrato(user.role)}
                    canVerAuditoria={puedeVerAuditoria(user.role)}
                />
            )}
            {tab === "radios" && <RadiosTab canAsignar={puedeAsignarRadio(user.role)} />}
            {tab === "repetidoras" && <RepetidorasTab canRegistrar={puedeRegistrarFichaRepetidora(user.role)} />}
            {tab === "contactos" && (
                <ContactosTab canRegister={puedeRegistrarContacto(user.role)} canReasignar={puedeReasignarContacto(user.role)} />
            )}
        </div>
    );
}
