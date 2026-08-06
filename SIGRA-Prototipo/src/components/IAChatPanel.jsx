
import { useState } from "react";
import { Sparkles, Send, X } from "lucide-react";


const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

const CANNED = [
    {
        match: ["contrato", "vencen", "vencer"],
        question: "¿Qué contratos vencen este mes?",
        answer: "El contrato CT-0041 de Bomberos de Costa Rica está por vencer el 02/08/2026 (3 repetidoras). Te recomiendo iniciar la renovación esta semana.",
    },
    {
        match: ["resumen", "boleta"],
        question: "Dame el resumen de la boleta BOL-00187",
        answer: "BOL-00187 — Hotel Los Sueños, radio SN-88214. Reparación en proceso: la batería no retiene carga y está pendiente de repuesto. Técnico asignado: Ricardo Infante.",
    },
    {
        match: ["boletas", "tecnico", "técnico", "ricardo"],
        question: "¿Cuántas boletas tiene abiertas Ricardo Infante?",
        answer: "Ricardo Infante tiene 2 boletas abiertas actualmente: BOL-00187 (en proceso) y BOL-00185 (asignada).",
    },
    {
        match: ["facturacion", "facturación", "reporte"],
        question: "Genera un reporte de facturación del trimestre",
        answer: "Facturación estimada del trimestre: ₡3.1M este mes, con 3 facturas cobradas y 2 pendientes de cobro. ¿Querés que lo exporte a Excel desde el dashboard?",
    },
];

const SUGGESTED = CANNED.map((c) => c.question);

function findAnswer(text) {
    const q = text.toLowerCase();
    const hit = CANNED.find((c) => c.match.some((kw) => q.includes(kw)));
    return hit
        ? hit.answer
        : "Puedo ayudarte a consultar contratos, boletas, inventario y reportes. Probá con una de las preguntas sugeridas o preguntame algo similar.";
}

export default function IAChatPanel() {

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "ai", text: "Hola, soy el asistente de Radifax. Puedo resumirte boletas, contratos y reportes en lenguaje natural. ¿En qué te ayudo?" },
    ]);
    const [input, setInput] = useState("");

    function send(text) {
        const value = (text ?? input).trim();
        if (!value) return;
        setMessages((m) => [...m, { role: "user", text: value }, { role: "ai", text: findAnswer(value) }]);
        setInput("");
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: COLORS.green, border: "none", boxShadow: "0 6px 18px rgba(94,180,83,0.45)" }}
                aria-label="Abrir asistente de Radifax"
            >
                <Sparkles size={22} color={COLORS.white} />
            </button>
        );
    }

    return (
        <div
            className="fixed bottom-6 right-6 z-40 w-96 rounded-2xl overflow-hidden flex flex-col"
            style={{ border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.white, boxShadow: "0 16px 40px rgba(50,50,50,0.22)", maxHeight: "32rem" }}
        >
            <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.greenTint }}>
                <div className="flex items-center gap-2">
                    <Sparkles size={16} color={COLORS.green} />
                    <span className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                        Asistente Radifax
                    </span>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente" style={{ color: COLORS.muted }}>
                    <X size={17} />
                </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto" style={{ flex: 1 }}>
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${m.role === "user" ? "self-end" : "self-start"}`}
                        style={{ backgroundColor: m.role === "user" ? COLORS.green : COLORS.greenTint, color: m.role === "user" ? COLORS.white : COLORS.charcoal }}
                    >
                        {m.text}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 px-5 pb-3">
                {SUGGESTED.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="px-3 py-1.5 rounded-full text-xs"
                        style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send();
                }}
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Preguntale algo al asistente..."
                    className="flex-1 px-3.5 py-2.5 rounded-lg text-sm outline-none"
                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                />
                <button type="submit" className="p-2.5 rounded-lg" style={{ backgroundColor: COLORS.green, border: "none" }} aria-label="Enviar">
                    <Send size={16} color={COLORS.white} />
                </button>
            </form>
        </div>
    );
}

