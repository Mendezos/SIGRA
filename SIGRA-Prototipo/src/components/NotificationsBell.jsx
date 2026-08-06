import { useState } from "react";
import { Bell } from "lucide-react";
import { NOTIFICATIONS_BY_ROLE } from "../data/modules";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
};

export default function NotificationsBell({ role }) {
    const [open, setOpen] = useState(false);
    const items = NOTIFICATIONS_BY_ROLE[role] ?? [];

    return (
        <div className="fixed top-6 right-6 z-40">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(50,50,50,0.08)" }}
                aria-label="Notificaciones"
            >
                <Bell size={18} color={COLORS.charcoal} />
                {items.length > 0 && (
                    <span
                        className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-semibold"
                        style={{ backgroundColor: COLORS.red, color: COLORS.white }}
                    >
                        {items.length}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden"
                    style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, boxShadow: "0 12px 32px rgba(50,50,50,0.18)" }}
                >
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.greenTint }}>
                        <p className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                            Notificaciones
                        </p>
                        <p className="text-xs" style={{ color: COLORS.muted }}>
                            Según tu rol: {role}
                        </p>
                    </div>
                    <ul className="max-h-72 overflow-y-auto">
                        {items.length === 0 && (
                            <li className="px-4 py-4 text-sm" style={{ color: COLORS.muted }}>
                                No tenés notificaciones pendientes.
                            </li>
                        )}
                        {items.map((text, i) => (
                            <li key={i} className="px-4 py-3 text-sm" style={{ color: COLORS.charcoal, borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
