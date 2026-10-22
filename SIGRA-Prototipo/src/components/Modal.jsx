import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    greenDark: "#4CA23D",
    red: "#C0392B",
    redTint: "#FCEBEB",
    amber: "#9C7A17",
    amberTint: "#FBF3DE",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const TONES = {
    default: { accent: COLORS.green, badgeBg: COLORS.greenTint, badgeFg: COLORS.greenDark },
    danger: { accent: COLORS.red, badgeBg: COLORS.redTint, badgeFg: COLORS.red },
    warning: { accent: "#D9A21B", badgeBg: COLORS.amberTint, badgeFg: COLORS.amber },
};

const FOCUSABLE =
    "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])";

// Pila de modales abiertos: solo el de encima responde a Escape.
const pila = [];
let overflowOriginal = "";

export default function Modal({
    open,
    title,
    subtitle,
    onClose,
    children,
    footer,
    width = "max-w-lg",
    icon: Icon,
    tone = "default",
    headerExtra,
    tabs,
    activeTab,
    onTabChange,
}) {
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const mouseDownEnFondo = useRef(false);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;

        const token = Symbol("modal");

        if (pila.length === 0) {
            overflowOriginal = document.body.style.overflow;
            document.body.style.overflow = "hidden";
        }
        pila.push(token);

        function onKeyDown(e) {
            if (e.key === "Escape" && pila[pila.length - 1] === token) {
                e.stopPropagation();
                onCloseRef.current?.();
            }
        }

        const previo = document.activeElement;
        document.addEventListener("keydown", onKeyDown);

        // Enfoca el primer campo editable; si no hay, el propio panel.
        const id = requestAnimationFrame(() => {
            const campo = panelRef.current?.querySelector(FOCUSABLE);
            (campo ?? panelRef.current)?.focus({ preventScroll: true });
        });

        return () => {
            cancelAnimationFrame(id);
            document.removeEventListener("keydown", onKeyDown);
            pila.splice(pila.indexOf(token), 1);
            if (pila.length === 0) document.body.style.overflow = overflowOriginal;
            if (previo instanceof HTMLElement && document.contains(previo)) {
                previo.focus({ preventScroll: true });
            }
        };
    }, [open]);

    if (!open) return null;

    const palette = TONES[tone] ?? TONES.default;

    return (
        <div
            className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{
                backgroundColor: "rgba(28,38,28,0.5)",
                backdropFilter: "blur(4px)",
            }}
            onMouseDown={(e) => {
                mouseDownEnFondo.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
                // Solo cierra si el clic empezó y terminó en el fondo
                // (evita cierres al soltar el mouse tras seleccionar texto).
                if (mouseDownEnFondo.current && e.target === e.currentTarget) {
                    onClose?.();
                }
                mouseDownEnFondo.current = false;
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === "string" ? title : undefined}
                tabIndex={-1}
                className={`modal-panel w-full ${width} bg-white rounded-2xl relative flex flex-col overflow-hidden outline-none`}
                style={{
                    maxHeight: "calc(100vh - 3rem)",
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: "0 30px 70px rgba(25,35,25,0.30), 0 2px 6px rgba(25,35,25,0.08)",
                }}
            >
                <div style={{ height: 4, backgroundColor: palette.accent }} className="shrink-0" />

                <div
                    className="flex items-center gap-4 px-6 sm:px-7 pt-5 pb-4 shrink-0"
                    style={{
                        borderBottom: tabs ? "none" : `1px solid ${COLORS.border}`,
                        background: `linear-gradient(180deg, ${palette.badgeBg} 0%, #FFFFFF 100%)`,
                    }}
                >
                    {Icon && (
                        <div
                            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                            style={{
                                backgroundColor: "#FFFFFF",
                                color: palette.badgeFg,
                                boxShadow: `0 0 0 1px ${palette.accent}33, 0 3px 8px rgba(25,35,25,0.08)`,
                            }}
                        >
                            <Icon size={20} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
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

                    {headerExtra && <div className="shrink-0">{headerExtra}</div>}

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-[#F1F5F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5EB453]"
                        style={{ color: COLORS.muted }}
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {tabs && (
                    <div
                        role="tablist"
                        className="flex gap-7 px-6 sm:px-7 shrink-0 overflow-x-auto"
                        style={{ borderBottom: `1px solid ${COLORS.border}` }}
                    >
                        {tabs.map((tab) => {
                            const activa = tab.key === activeTab;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activa}
                                    onClick={() => onTabChange?.(tab.key)}
                                    className="pb-3 pt-1 text-sm whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5EB453]"
                                    style={{
                                        color: activa ? palette.badgeFg : COLORS.muted,
                                        fontWeight: activa ? 600 : 400,
                                        borderBottom: `2px solid ${activa ? palette.accent : "transparent"}`,
                                        marginBottom: -1,
                                    }}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className={`modal-body px-6 sm:px-7 py-6 overflow-y-auto${tabs ? " min-h-[min(22rem,38vh)]" : ""}`}>{children}</div>

                {footer && (
                    <div
                        className="px-6 sm:px-7 py-4 shrink-0 flex flex-wrap items-center justify-end gap-3"
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
