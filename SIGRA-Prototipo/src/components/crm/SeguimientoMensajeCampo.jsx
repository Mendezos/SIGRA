import { COLORS } from "../uiTheme";

// Mensaje de error debajo de un campo del formulario (se anuncia a lectores de pantalla).
export default function SeguimientoMensajeCampo({ texto }) {
    if (!texto) return null;
    return (
        <span role="alert" className="block text-xs mt-1" style={{ color: COLORS.red }}>
            {texto}
        </span>
    );
}
