import EntradaTicketModal from "./tickets/EntradaTicketModal";

export default function GenerateTicketModal({ open, onClose, onGenerate }) {
    return open ? <EntradaTicketModal onClose={onClose} onSaved={onGenerate} /> : null;
}
