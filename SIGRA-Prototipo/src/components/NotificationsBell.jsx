import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, BatteryCharging, Bell, CalendarClock, Check, CheckCheck, FileText, Info, RefreshCw, UserX, Waves, Wrench } from "lucide-react";
import { getToken } from "../services/apiClient";
import { obtenerPerfil } from "../services/authService";
import { listarNotificaciones, marcarNotificacionLeida, marcarTodasLeidas, obtenerResumenNotificaciones } from "../services/notificacionesService";
import { formatearFechaHora } from "../utils/format";
import { destinoDeAviso, puedeAbrirDestino, textoContador, tipoDeAviso, TIPOS_AVISO } from "../utils/notificaciones";
import { COLORS } from "./uiTheme";

// Ícono y color por tipo de aviso. La etiqueta sale de TIPOS_AVISO.
const ICONOS = {
    Seguimiento: { Icono: CalendarClock, color: "#2F6FB5", fondo: "#E8F0FA" },
    Bateria: { Icono: BatteryCharging, color: "#B7791F", fondo: "#FEF3C7" },
    ContactoSinVendedor: { Icono: UserX, color: COLORS.red, fondo: COLORS.redTint },
    Contrato: { Icono: FileText, color: "#6B4FA3", fondo: "#EFEAF8" },
    Frecuencia: { Icono: Waves, color: "#1F7A8C", fondo: "#E2F3F6" },
    Ticket: { Icono: Wrench, color: COLORS.greenDark, fondo: COLORS.greenTint },
    General: { Icono: Info, color: COLORS.muted, fondo: "#F0F0F0" },
};

// Campana única: todos los avisos del usuario (tickets, seguimientos, baterías, contratos, frecuencias, contacto sin vendedor...).
// `onNavigate({ moduleId, tab, id })` abre el destino del aviso; `user` (opcional) trae los permisos para saber si hay enlace.
export default function NotificationsBell({ role, user, onNavigate }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [permisosPerfil, setPermisosPerfil] = useState(null);
    const contenedor = useRef(null);
    const boton = useRef(null);
    const secuencia = useRef(0);
    const panelId = useId();

    const cargar = useCallback(async () => {
        if (!getToken()) return;
        const actual = ++secuencia.current;
        try {
            const [lista, contadores] = await Promise.all([listarNotificaciones(), obtenerResumenNotificaciones()]);
            if (actual !== secuencia.current) return;
            setItems(lista);
            setResumen(contadores);
            setError("");
        } catch (e) {
            if (actual === secuencia.current) setError(e.message || "No se pudieron cargar las notificaciones.");
        } finally {
            if (actual === secuencia.current) setCargando(false);
        }
    }, []);

    useEffect(() => {
        const inicial = setTimeout(cargar, 0);
        const intervalo = setInterval(cargar, 30000);
        window.addEventListener("focus", cargar);
        return () => {
            clearTimeout(inicial);
            clearInterval(intervalo);
            window.removeEventListener("focus", cargar);
        };
    }, [cargar, role]);

    // Si el tablero no entrega el usuario, los permisos (para saber si un aviso lleva enlace) se leen del perfil.
    const tieneUsuario = Boolean(user?.permisos);
    useEffect(() => {
        if (tieneUsuario || !getToken()) return undefined;
        let activo = true;
        obtenerPerfil()
            .then((perfil) => activo && setPermisosPerfil(perfil.permisos ?? []))
            .catch(() => activo && setPermisosPerfil([]));
        return () => {
            activo = false;
        };
    }, [tieneUsuario, role]);
    const permisos = user?.permisos ?? permisosPerfil;

    // Esc y clic fuera cierran el panel.
    useEffect(() => {
        if (!open) return undefined;
        function alTeclear(e) {
            if (e.key === "Escape") {
                setOpen(false);
                boton.current?.focus();
            }
        }
        function alPulsar(e) {
            if (contenedor.current && !contenedor.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("keydown", alTeclear);
        document.addEventListener("mousedown", alPulsar);
        return () => {
            document.removeEventListener("keydown", alTeclear);
            document.removeEventListener("mousedown", alPulsar);
        };
    }, [open]);

    const sinLeer = resumen ? resumen.sinLeer : items.filter((n) => !n.fechaLectura).length;
    const contador = textoContador(sinLeer);

    async function marcarLeida(item) {
        if (ocupado) return;
        setOcupado(true);
        try {
            await marcarNotificacionLeida(item.idNotificacion);
            await cargar();
        } catch (e) {
            setError(e.message);
        } finally {
            setOcupado(false);
        }
    }

    async function marcarTodas() {
        if (ocupado || sinLeer === 0) return;
        setOcupado(true);
        try {
            await marcarTodasLeidas();
            await cargar();
        } catch (e) {
            setError(e.message);
        } finally {
            setOcupado(false);
        }
    }

    // Abrir un aviso lo marca como leído y lleva al módulo (y pestaña) que corresponde.
    async function abrir(item, destino) {
        setOpen(false);
        onNavigate?.({ moduleId: destino.moduleId, tab: destino.tab, id: destino.id });
        if (!item.fechaLectura) {
            try {
                await marcarNotificacionLeida(item.idNotificacion);
            } catch {
                // El aviso sigue disponible; se reintenta en la siguiente actualización.
            }
            await cargar();
        }
    }

    return (
        <div ref={contenedor} className="fixed top-6 right-6 z-40">
            <button
                ref={boton}
                type="button"
                onClick={() => {
                    setOpen((o) => !o);
                    cargar();
                }}
                aria-label={`Notificaciones: ${sinLeer} sin leer`}
                aria-expanded={open}
                aria-controls={panelId}
                className="relative w-11 h-11 rounded-full flex items-center justify-center bg-white border border-[#E3E3E3] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EB453]"
            >
                <Bell size={18} color={COLORS.charcoal} />
                {contador && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] px-1 rounded-full text-[10px] font-semibold bg-[#C0392B] text-white" aria-hidden="true">
                        {contador}
                    </span>
                )}
            </button>

            {open && (
                <section id={panelId} aria-label="Notificaciones" className="absolute right-0 mt-2 w-[26rem] max-w-[calc(100vw-3rem)] rounded-xl overflow-hidden bg-white border border-[#E3E3E3] shadow-xl">
                    <div className="px-4 py-3 bg-[#EAF6E8] flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold">Notificaciones</h2>
                            <p className="text-xs text-[#6E6E6E]">
                                {sinLeer === 0 ? "No tenés avisos pendientes" : sinLeer === 1 ? "1 aviso sin leer" : `${sinLeer} avisos sin leer`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={marcarTodas}
                            disabled={sinLeer === 0 || ocupado}
                            className="shrink-0 inline-flex items-center gap-1 text-xs text-[#43833B] font-medium disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:underline"
                        >
                            <CheckCheck size={14} />
                            Marcar todas como leídas
                        </button>
                    </div>

                    {error && (
                        <div role="alert" className="px-4 py-3 text-sm text-[#C0392B] bg-[#FCEBEB] flex items-start justify-between gap-3">
                            <span>{error}</span>
                            <button type="button" onClick={cargar} className="shrink-0 inline-flex items-center gap-1 text-xs font-medium underline">
                                <RefreshCw size={12} />
                                Reintentar
                            </button>
                        </div>
                    )}

                    <ul className="max-h-96 overflow-y-auto">
                        {cargando && items.length === 0 && !error && (
                            <li role="status" className="p-4 text-sm text-[#6E6E6E]">
                                Cargando notificaciones...
                            </li>
                        )}
                        {!cargando && !error && items.length === 0 && <li className="p-4 text-sm text-[#6E6E6E]">No tenés notificaciones.</li>}
                        {items.map((n) => {
                            const tipo = tipoDeAviso(n);
                            const { Icono, color, fondo } = ICONOS[tipo];
                            const destino = destinoDeAviso(n);
                            const conEnlace = destino && puedeAbrirDestino(permisos, destino);
                            return (
                                <li key={n.idNotificacion} className={`p-4 border-t border-[#E3E3E3] text-sm ${n.fechaLectura ? "" : "bg-[#EAF6E8]/40"}`}>
                                    <div className="flex gap-3">
                                        <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: fondo }} aria-hidden="true">
                                            <Icono size={15} color={color} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color }}>
                                                {TIPOS_AVISO[tipo]}
                                                {!n.fechaLectura && <span className="sr-only"> (sin leer)</span>}
                                            </p>
                                            <h3 className="font-semibold break-words">
                                                {!n.fechaLectura && <span className="inline-block w-2 h-2 rounded-full bg-[#5EB453] mr-1.5 align-middle" aria-hidden="true" />}
                                                {n.titulo}
                                            </h3>
                                            <p className="mt-1 whitespace-pre-line break-words">{n.mensaje}</p>
                                            <p className="text-xs text-[#6E6E6E] mt-2">{formatearFechaHora(n.fecha)}</p>
                                            {n.estadoCorreo === "Fallido" && <p className="text-xs text-[#C0392B] mt-1">El correo no pudo enviarse. Este aviso sigue disponible aquí.</p>}
                                            {(conEnlace || !n.fechaLectura) && (
                                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                                    {conEnlace && (
                                                        <button type="button" onClick={() => abrir(n, destino)} className="text-xs text-[#43833B] font-medium inline-flex gap-1 items-center focus:outline-none focus-visible:underline">
                                                            {destino.etiqueta}
                                                            <ArrowRight size={13} />
                                                        </button>
                                                    )}
                                                    {!n.fechaLectura && (
                                                        <button type="button" disabled={ocupado} onClick={() => marcarLeida(n)} className="text-xs text-[#43833B] inline-flex gap-1 items-center disabled:opacity-40 focus:outline-none focus-visible:underline">
                                                            <Check size={13} />
                                                            Marcar como leída
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {resumen && resumen.total > items.length && (
                        <p className="px-4 py-2 text-xs text-[#6E6E6E] border-t border-[#E3E3E3]">Se muestran los {items.length} avisos más recientes de {resumen.total}.</p>
                    )}
                </section>
            )}
        </div>
    );
}
