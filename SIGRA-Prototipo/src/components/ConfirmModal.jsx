import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "./Modal";
import { Button } from "./ui";
import { COLORS } from "./uiTheme";

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "default",
    busy = false,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    const peligro = tone === "danger";

    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            icon={peligro ? AlertTriangle : HelpCircle}
            tone={tone}
            width="max-w-md"
            footer={(
                <>
                    <Button variant="ghost" onClick={onCancel} disabled={busy}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={peligro ? "dangerSolid" : "primary"}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {confirmLabel}
                    </Button>
                </>
            )}
        >
            <p className="text-sm leading-relaxed" style={{ color: COLORS.charcoal }}>
                {message}
            </p>
        </Modal>
    );
}
