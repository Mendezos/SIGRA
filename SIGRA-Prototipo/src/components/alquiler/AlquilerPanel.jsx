import { useCallback, useState } from "react";
import { SubTabs } from "../ui";
import ContactosTab from "./ContactosTab";
import ContratosTab from "./ContratosTab";
import RadiosTab from "./RadiosTab";
import RepetidorasTab from "./RepetidorasTab";
import {
    puedeAsignarRadio,
    esAdministrador,
    puedeCancelarContrato,
    puedeEditarContrato,
    puedeVerAuditoria,
    puedeReasignarContacto,
    puedeRegistrarContacto,
    puedeRegistrarContrato,
    puedeRegistrarFichaRepetidora,
    puedeVerContactos,
    puedeVerContratos,
} from "./helpers";

// `navTarget` ({ tab, id, nonce }) lo manda el tablero cuando se abre una notificación de la campana: salta a esa pestaña y,
// si trae `id`, abre ese contacto o contrato.
export default function AlquilerPanel({ user, navTarget }) {
    // Para sumar una pestaña basta agregarla aquí y renderizarla abajo.
    const tabs = [
        ...(puedeVerContratos(user)
            ? [
                  { key: "contratos", label: "Contratos" },
                  { key: "radios", label: "Radios en alquiler" },
                  { key: "repetidoras", label: "Repetidoras" },
              ]
            : []),
        ...(puedeVerContactos(user) ? [{ key: "contactos", label: "Contactos iniciales" }] : []),
    ];
    const [tab, setTab] = useState(tabs.some((t) => t.key === navTarget?.tab) ? navTarget.tab : (tabs[0]?.key ?? "contratos"));
    const [nonceVisto, setNonceVisto] = useState(navTarget?.nonce);
    const [abrirId, setAbrirId] = useState(tabs.some((t) => t.key === navTarget?.tab) ? (navTarget.id ?? null) : null);
    const registroAbierto = useCallback(() => setAbrirId(null), []);

    // Una notificación abierta con el módulo ya visible: se cambia de pestaña durante el render (patrón recomendado por React).
    if (navTarget && navTarget.nonce !== nonceVisto) {
        setNonceVisto(navTarget.nonce);
        if (tabs.some((t) => t.key === navTarget.tab)) {
            setTab(navTarget.tab);
            setAbrirId(navTarget.id ?? null);
        }
    }

    return (
        <div className="mt-6">
            <SubTabs tabs={tabs} active={tab} onSelect={setTab} />

            {tab === "contratos" && (
                <ContratosTab
                    canRegister={puedeRegistrarContrato(user)}
                    canAsignarRadio={puedeAsignarRadio(user)}
                    canRenovar={puedeRegistrarContrato(user)}
                    canEditar={puedeEditarContrato(user)}
                    esAdmin={esAdministrador(user)}
                    canCancelar={puedeCancelarContrato(user)}
                    canVerAuditoria={puedeVerAuditoria(user)}
                    abrirId={abrirId}
                    onAbierto={registroAbierto}
                />
            )}
            {tab === "radios" && <RadiosTab canAsignar={puedeAsignarRadio(user)} />}
            {tab === "repetidoras" && <RepetidorasTab canRegistrar={puedeRegistrarFichaRepetidora(user)} />}
            {tab === "contactos" && (
                <ContactosTab
                    canRegister={puedeRegistrarContacto(user)}
                    canReasignar={puedeReasignarContacto(user)}
                    abrirId={abrirId}
                    onAbierto={registroAbierto}
                />
            )}
        </div>
    );
}
