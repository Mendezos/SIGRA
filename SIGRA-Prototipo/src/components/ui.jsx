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
            className={`px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
            style={{ ...VARIANTS[variant], ...style }}
            {...props}
        >
            {children}
        </button>
    );
}

export function Notice({ tone = "success", children }) {
    const palette =
        tone === "error"
            ? { backgroundColor: COLORS.redTint, color: COLORS.red }
            : { backgroundColor: COLORS.greenTint, color: COLORS.greenDark };

    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className="px-4 py-2.5 rounded-lg text-sm mb-4"
            style={palette}
        >
            {children}
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
            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                {label}
            </span>
            {children}
        </label>
    );
}

export function DetailGrid({ title, items }) {
    return (
        <section className="mb-5">
            {title && (
                <h3
                    className="text-xs uppercase tracking-wide mb-3"
                    style={{ color: COLORS.muted, fontWeight: 600 }}
                >
                    {title}
                </h3>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {items.map((item) => (
                    <div key={item.label} className={item.wide ? "sm:col-span-2" : ""}>
                        <dt className="text-xs mb-0.5" style={{ color: COLORS.muted }}>
                            {item.label}
                        </dt>
                        <dd className="text-sm" style={{ color: COLORS.charcoal }}>
                            {item.value || "Sin registro"}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
