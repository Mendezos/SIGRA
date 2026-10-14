import Modal from "./Modal";
import { Button } from "./ui";
import { COLORS } from "./uiTheme";

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
    variant = "primary",
}) {
    if (!open) return null;

    return (
        <Modal open={open} onClose={onCancel} title={title} width="max-w-sm">
            <p className="text-sm mb-7" style={{ color: COLORS.charcoal }}>
                {message}
            </p>

            <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={onCancel}>
                    {cancelLabel}
                </Button>
                <Button variant={variant} onClick={onConfirm}>
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
