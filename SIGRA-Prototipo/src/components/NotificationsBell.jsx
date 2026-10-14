import { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { apiRequest, getToken } from "../services/apiClient";
import { COLORS } from "./uiTheme";

export default function NotificationsBell({ role }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [error, setError] = useState("");
    const cargar = useCallback(async () => {
        if (!getToken()) return;
        try { setItems(await apiRequest("/notificaciones")); setError(""); }
        catch (e) { setError(e.message); }
    }, []);
    useEffect(() => {
        const inicial = setTimeout(cargar, 0);
        const intervalo = setInterval(cargar, 30000);
        window.addEventListener("focus", cargar);
        return () => { clearTimeout(inicial); clearInterval(intervalo); window.removeEventListener("focus", cargar); };
    }, [cargar, role]);
    async function leer(item) {
        try { await apiRequest(`/notificaciones/${item.idNotificacion}/leer`, { method: "POST" }); await cargar(); }
        catch (e) { setError(e.message); }
    }
    const pendientes = items.filter(n => !n.fechaLectura).length;
    return <div className="fixed top-6 right-6 z-40">
        <button type="button" onClick={() => { setOpen(o => !o); cargar(); }} aria-label={`Notificaciones: ${pendientes} sin leer`} aria-expanded={open} className="relative w-11 h-11 rounded-full flex items-center justify-center bg-white border border-[#E3E3E3] shadow-sm">
            <Bell size={18} color={COLORS.charcoal} />
            {pendientes > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] px-1 rounded-full text-[10px] font-semibold bg-[#C0392B] text-white">{pendientes}</span>}
        </button>
        {open && <section aria-label="Notificaciones" className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl overflow-hidden bg-white border border-[#E3E3E3] shadow-xl">
            <div className="px-4 py-3 bg-[#EAF6E8]"><h2 className="text-sm font-semibold">Notificaciones</h2><p className="text-xs text-[#6E6E6E]">Asignaciones y avisos de tu cuenta</p></div>
            {error && <p role="alert" className="px-4 py-3 text-sm text-[#C0392B]">{error}</p>}
            <ul className="max-h-96 overflow-y-auto">
                {!error && items.length === 0 && <li className="p-4 text-sm text-[#6E6E6E]">No tenés notificaciones.</li>}
                {items.map(n => <li key={n.idNotificacion} className={`p-4 border-t border-[#E3E3E3] text-sm ${n.fechaLectura ? "" : "bg-[#EAF6E8]/40"}`}>
                    <h3 className="font-semibold">{n.titulo}</h3><p className="mt-1 whitespace-pre-wrap">{n.mensaje}</p>
                    <p className="text-xs text-[#6E6E6E] mt-2">{new Date(n.fecha).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}</p>
                    {n.estadoCorreo === "Fallido" && <p className="text-xs text-[#C0392B] mt-1">El correo no pudo enviarse. Este aviso sigue disponible aquí.</p>}
                    {!n.fechaLectura && <button className="mt-2 text-xs text-[#43833B] inline-flex gap-1 items-center" type="button" onClick={() => leer(n)}><Check size={13} />Marcar como leída</button>}
                </li>)}
            </ul>
        </section>}
    </div>;
}
