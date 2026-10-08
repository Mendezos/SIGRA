import { useState } from "react";
import { SubTabs } from "../ui";
import BodegaTab from "./BodegaTab";
import EquiposTab from "./EquiposTab";
import MovimientosTab from "./MovimientosTab";
import StockTab from "./StockTab";
import { puedeConfigurarStock, puedeEscribirInventario } from "./helpers";

const TABS = [
    { key: "equipos", label: "Equipos" },
    { key: "stock", label: "Stock" },
    { key: "movimientos", label: "Movimientos" },
    { key: "bodega", label: "Accesorios y repuestos" },
];

export default function InventarioPanel({ user }) {
    const [tab, setTab] = useState("equipos");
    // Se incrementa cuando una pestaña cambia datos para que el stock se vuelva a consultar.
    const [version, setVersion] = useState(0);
    const canWrite = puedeEscribirInventario(user.role);

    const alCambiar = () => setVersion((v) => v + 1);

    return (
        <div className="mt-6">
            <SubTabs tabs={TABS} active={tab} onSelect={setTab} />

            {tab === "equipos" && <EquiposTab canWrite={canWrite} onChanged={alCambiar} />}
            {tab === "stock" && <StockTab canConfigure={puedeConfigurarStock(user.role)} version={version} />}
            {tab === "movimientos" && <MovimientosTab canWrite={canWrite} onChanged={alCambiar} />}
            {tab === "bodega" && <BodegaTab canWrite={canWrite} />}
        </div>
    );
}
