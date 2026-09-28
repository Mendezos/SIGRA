import Modal from "./Modal";

const COLORS = {
    green: "#5EB453",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
};

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    return (
        <Modal open={open} onClose={onCancel} title={title} width="max-w-sm">
            <p className="text-sm mb-7" style={{ color: COLORS.charcoal }}>
                {message}
            </p>

            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-lg text-sm"
                    style={{ color: COLORS.muted }}
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: COLORS.green, color: COLORS.white, border: "none" }}
                >
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}
