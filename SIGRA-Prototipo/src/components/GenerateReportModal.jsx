import Modal from "./Modal";
import RecordForm from "./RecordForm";
import { getReportTypes } from "../data/roleCapabilities";

export default function GenerateReportModal({
    open,
    user,
    onClose,
    onGenerate,
}) {
    if (!open) return null;

    const reportTypes = getReportTypes(user.role);

    const fields = [
        {
            key: "tipo",
            label: "Tipo de informe",
            type: "select",
            options: reportTypes,
            required: true,
        },
        {
            key: "periodo",
            label: "Período",
            type: "text",
            required: true,
        },
        {
            key: "formato",
            label: "Formato",
            type: "select",
            options: ["PDF", "Excel"],
            required: true,
        },
    ];

    function handleSubmit(values) {
        onGenerate(values);
        onClose();
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Generar informe"
            subtitle={`Los tipos disponibles corresponden al rol ${user.role}.`}
        >
            <RecordForm
                fields={fields}
                initialValues={{
                    tipo: reportTypes[0] ?? "",
                    periodo: "Julio 2026",
                    formato: "PDF",
                }}
                onSubmit={handleSubmit}
                onCancel={onClose}
                submitLabel="Generar informe"
            />
        </Modal>
    );
}