import Modal from "./Modal";
import RecordForm from "./RecordForm";
import { CLIENTS } from "../data/modules";
import { canAssignTechnician } from "../data/roleCapabilities";

const TECHNICIANS = [
    "Ricardo Infante",
    "Tomás Díaz",
    "Sin asignar",
];

const COORDINATOR_FIELDS = [
    {
        key: "cliente",
        label: "Cliente",
        type: "select",
        options: CLIENTS,
        required: true,
    },
    {
        key: "equipo",
        label: "Equipo / número de serie",
        type: "text",
        required: true,
    },
    {
        key: "tipoServicio",
        label: "Tipo de servicio",
        type: "select",
        options: [
            "Mantenimiento preventivo",
            "Reparación",
            "Revisión general",
            "Garantía",
        ],
        required: true,
    },
    {
        key: "tecnico",
        label: "Técnico asignado",
        type: "select",
        options: TECHNICIANS,
        required: true,
    },
    {
        key: "fechaIngreso",
        label: "Fecha de ingreso",
        type: "date",
        required: true,
    },
    {
        key: "hallazgos",
        label: "Observaciones iniciales",
        type: "textarea",
    },
];

const TECHNICIAN_FIELDS = [
    {
        key: "cliente",
        label: "Cliente",
        type: "select",
        options: CLIENTS,
        required: true,
    },
    {
        key: "equipo",
        label: "Equipo / número de serie",
        type: "text",
        required: true,
    },
    {
        key: "fechaIngreso",
        label: "Fecha de ingreso",
        type: "date",
        required: true,
    },
    {
        key: "hallazgos",
        label: "Descripción de la reparación",
        type: "textarea",
        required: true,
    },
];

export default function GenerateTicketModal({
    open,
    user,
    onClose,
    onGenerate,
}) {
    if (!open) return null;

    const mayAssign = canAssignTechnician(user.role);
    const fields = mayAssign
        ? COORDINATOR_FIELDS
        : TECHNICIAN_FIELDS;

    const today = new Date().toISOString().slice(0, 10);

    const initialValues = mayAssign
        ? {
              cliente: "",
              equipo: "",
              tipoServicio: "Mantenimiento preventivo",
              tecnico: "Sin asignar",
              fechaIngreso: today,
              hallazgos: "",
          }
        : {
              cliente: "",
              equipo: "",
              fechaIngreso: today,
              hallazgos: "",
          };

    function handleSubmit(values) {
        const tecnico = mayAssign
            ? values.tecnico
            : user.name;

        const tipoServicio = mayAssign
            ? values.tipoServicio
            : "Reparación";

        onGenerate({
            ...values,
            tecnico,
            tipoServicio,
            estado:
                tecnico && tecnico !== "Sin asignar"
                    ? "Asignada"
                    : "Recibida",
        });

        onClose();
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Generar nueva boleta"
            subtitle={
                mayAssign
                    ? "Podés generar la boleta y asignarla a cualquier técnico."
                    : "La boleta se registrará como reparación y quedará asignada a tu usuario."
            }
            width="max-w-2xl"
        >
            <RecordForm
                fields={fields}
                initialValues={initialValues}
                onSubmit={handleSubmit}
                onCancel={onClose}
                submitLabel="Generar boleta"
            />
        </Modal>
    );
}