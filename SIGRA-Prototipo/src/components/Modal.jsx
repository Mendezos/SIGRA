import { useEffect } from "react";
import { X } from "lucide-react";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

export default function Modal({
    open,
    title,
    subtitle,
    onClose,
    children,
    footer,
    width = "max-w-lg",
}) {
    useEffect(() => {
        if (!open) return;

        function onKeyDown(e) {
            if (e.key === "Escape") onClose?.();
        }

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{
                backgroundColor: "rgba(35,45,35,0.45)",
                backdropFilter: "blur(3px)",
            }}
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === "string" ? title : undefined}
                className={`w-full ${width} bg-white rounded-2xl relative flex flex-col overflow-hidden`}
                style={{
                    maxHeight: "calc(100vh - 3rem)",
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: "0 24px 60px rgba(35,45,35,0.28)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ height: 4, backgroundColor: COLORS.green }} />

                <div
                    className="flex items-start justify-between gap-4 px-7 pt-5 pb-4 shrink-0"
                    style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                    <div className="min-w-0">
                        <h2
                            className="text-lg leading-snug"
                            style={{ color: COLORS.charcoal, fontWeight: 600 }}
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg shrink-0 transition-colors"
                        style={{ color: COLORS.muted }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = COLORS.greenTint;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-7 py-6 overflow-y-auto">{children}</div>

                {footer && (
                    <div
                        className="px-7 py-4 shrink-0 flex items-center justify-end gap-3"
                        style={{
                            borderTop: `1px solid ${COLORS.border}`,
                            backgroundColor: "#FAFAFA",
                        }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
