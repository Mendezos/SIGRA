import { STATUS_STYLES } from "../data/modules";

const COLORS = {
    positive: { bg: "#EAF6E8", text: "#4CA23D" },
    warning: { bg: "#FBF3DE", text: "#9C7A17" },
    negative: { bg: "#FCEBEB", text: "#C0392B" },
    neutral: { bg: "#F1F1F1", text: "#6E6E6E" },
};

function tone(value) {
    if (STATUS_STYLES.positive.includes(value)) return "positive";
    if (STATUS_STYLES.warning.includes(value)) return "warning";
    if (STATUS_STYLES.negative.includes(value)) return "negative";
    return "neutral";
}

export default function StatusBadge({ value }) {
    if (!value || value === "—") {
        return <span style={{ color: COLORS.neutral.text }}>—</span>;
    }
    const c = COLORS[tone(value)];
    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs"
            style={{ backgroundColor: c.bg, color: c.text, fontWeight: 600 }}
        >
            {value}
        </span>
    );
}