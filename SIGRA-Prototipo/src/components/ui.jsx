import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { COLORS } from "./uiTheme";

const VARIANTS = {
    primary: {
        backgroundColor: COLORS.green,
        color: COLORS.white,
        border: `1px solid ${COLORS.green}`,
    },
    secondary: {
        backgroundColor: COLORS.white,
        color: COLORS.charcoal,
        border: `1px solid ${COLORS.border}`,
    },
    danger: {
        backgroundColor: COLORS.redTint,
        color: COLORS.red,
        border: `1px solid ${COLORS.redTint}`,
    },
    dangerSolid: {
        backgroundColor: COLORS.red,
        color: COLORS.white,
        border: `1px solid ${COLORS.red}`,
    },
    ghost: {
        backgroundColor: "transparent",
        color: COLORS.muted,
        border: "1px solid transparent",
    },
};

export function Button({ variant = "secondary", className = "", style, children, ...props }) {
    return (
        <button
            type="button"
            className={`px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-[filter,box-shadow] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5EB453] ${className}`}
            style={{ ...VARIANTS[variant], ...style }}
            {...props}
        >
            {children}
        </button>
    );
}

export function Notice({ tone = "success", children }) {
    const error = tone === "error";
    const warning = tone === "warning";
    const palette = error
        ? { backgroundColor: COLORS.redTint, color: COLORS.red }
        : warning
          ? { backgroundColor: "#FEF3C7", color: "#92400E" }
          : { backgroundColor: COLORS.greenTint, color: COLORS.greenDark };
    const Icono = error ? AlertCircle : warning ? AlertTriangle : CheckCircle2;

    return (
        <div
            role={error || warning ? "alert" : "status"}
            className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg text-sm mb-4"
            style={palette}
        >
            <Icono size={16} className="shrink-0 mt-0.5" />
            <div className="min-w-0">{children}</div>
        </div>
    );
}

export function SubTabs({ tabs, active, onSelect }) {
    return (
        <div className="inline-flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: "#F4F4F4" }}>
            {tabs.map((tab) => {
                const isActive = tab.key === active;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onSelect(tab.key)}
                        className="px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{
                            backgroundColor: isActive ? COLORS.white : "transparent",
                            color: isActive ? COLORS.greenDark : COLORS.muted,
                            fontWeight: isActive ? 600 : 400,
                            boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

export function FieldLabel({ label, children }) {
    return (
        <label className="block">
            <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: COLORS.muted, fontWeight: 600 }}>
                {label}
            </span>
            {children}
        </label>
    );
}

export function DetailGrid({ title, items }) {
    return (
        <section className="mb-6 last:mb-0">
            {title && (
                <h3
                    className="flex items-center gap-2 text-xs uppercase tracking-wide mb-4"
                    style={{ color: COLORS.greenDark, fontWeight: 600 }}
                >
                    <span className="inline-block w-1 h-3.5 rounded-full" style={{ backgroundColor: COLORS.green }} />
                    {title}
                </h3>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {items.map((item) => {
                    const Icono = item.icon;

                    return (
                        <div
                            key={item.label}
                            className={`flex items-start gap-3 pb-2.5 ${item.wide ? "sm:col-span-2" : ""}`}
                            style={{ borderBottom: "1px solid #DCEBD9" }}
                        >
                            {Icono && (
                                <span
                                    className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}
                                >
                                    <Icono size={15} />
                                </span>
                            )}
                            <div className="min-w-0">
                                <dt className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: COLORS.muted }}>
                                    {item.label}
                                </dt>
                                <dd className="text-sm break-words" style={{ color: COLORS.charcoal, fontWeight: 500 }}>
                                    {item.value || "Sin registro"}
                                </dd>
                            </div>
                        </div>
                    );
                })}
            </dl>
        </section>
    );
}

const PILL_TONES = {
    positive: { backgroundColor: "#EAF6E8", color: "#4CA23D" },
    negative: { backgroundColor: "#FCEBEB", color: "#C0392B" },
    warning: { backgroundColor: "#FBF3DE", color: "#9C7A17" },
    neutral: { backgroundColor: "#F1F1F1", color: "#6E6E6E" },
};

export function Pill({ tone = "neutral", children }) {
    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
            style={{ ...PILL_TONES[tone], fontWeight: 600 }}
        >
            {children}
        </span>
    );
}
