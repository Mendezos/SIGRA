import { useState } from "react";
import { SubTabs } from "../ui";
import ContactosTab from "./ContactosTab";
import ContratosTab from "./ContratosTab";
import PlantillasTab from "./PlantillasTab";
import RadiosTab from "./RadiosTab";
import RepetidorasTab from "./RepetidorasTab";
import {
    puedeAdministrarPlantillas,
    puedeAsignarRadio,
    puedeCancelarContrato,
    puedeVerAuditoria,
    puedeReasignarContacto,
    puedeRegistrarContacto,
    puedeRegistrarContrato,
    puedeRegistrarFichaRepetidora,
    puedeVerContactos,
    puedeVerContratos,
    puedeVerPlantillas,
} from "./helpers";

export default function AlquilerPanel({ user }) {
    // Para sumar una pestaña basta agregarla aquí y renderizarla abajo.
    const tabs = [
        ...(puedeVerContratos(user)
            ? [
                  { key: "contratos", label: "Contratos" },
                  ...(puedeVerPlantillas(user) ? [{ key: "plantillas", label: "Plantillas de contrato" }] : []),
                  { key: "radios", label: "Radios en alquiler" },
                  { key: "repetidoras", label: "Repetidoras" },
              ]
            : []),
        ...(puedeVerContactos(user) ? [{ key: "contactos", label: "Contactos iniciales" }] : []),
    ];
    const [tab, setTab] = useState(tabs[0]?.key ?? "contratos");

    return (
        <div className="mt-6">
            <SubTabs tabs={tabs} active={tab} onSelect={setTab} />

            {tab === "contratos" && (
                <ContratosTab
                    canRegister={puedeRegistrarContrato(user)}
                    canAsignarRadio={puedeAsignarRadio(user)}
                    canRenovar={puedeRegistrarContrato(user)}
                    canCancelar={puedeCancelarContrato(user)}
                    canVerAuditoria={puedeVerAuditoria(user)}
                />
            )}
            {tab === "plantillas" && <PlantillasTab canAdministrar={puedeAdministrarPlantillas(user)} />}
            {tab === "radios" && <RadiosTab canAsignar={puedeAsignarRadio(user)} />}
            {tab === "repetidoras" && <RepetidorasTab canRegistrar={puedeRegistrarFichaRepetidora(user)} />}
            {tab === "contactos" && (
                <ContactosTab canRegister={puedeRegistrarContacto(user)} canReasignar={puedeReasignarContacto(user)} />
            )}
        </div>
    );
}
