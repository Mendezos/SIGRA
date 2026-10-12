import { X } from "lucide-react";

import { useId } from "react";
import { createPortal } from "react-dom";

const COLORS = {
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

export default function Modal({ open, title, subtitle, onClose, children, width = "max-w-lg" }) {
    const titleId = useId();
    if (!open) return null;
    // El portal evita que el espaciado o el scroll de un panel afecten al fondo fijo.
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4" style={{ backgroundColor: "rgba(50,50,50,0.35)" }} onMouseDown={onClose}>
            <div
                className={`w-full ${width} bg-white rounded-2xl relative`}
                style={{ border: `1px solid ${COLORS.border}`, boxShadow: "0 12px 32px rgba(50,50,50,0.18)" }}
                onMouseDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className="flex items-start justify-between px-7 pt-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <div>
                        <h2 id={titleId} className="text-lg" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{title}</h2>
                        {subtitle && <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-lg" style={{ color: COLORS.muted }} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-7 py-6">{children}</div>
            </div>
        </div>,
        document.body
    );
}
