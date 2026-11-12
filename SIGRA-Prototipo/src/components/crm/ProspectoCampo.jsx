import { FieldLabel } from "../ui";
import { COLORS } from "../uiTheme";

// Campo de formulario con su mensaje de error debajo (el campo se resalta en rojo cuando tiene error).
export default function ProspectoCampo({ label, error, children, ayuda }) {
    return (
        <div>
            <FieldLabel label={label}>{children}</FieldLabel>
            {ayuda && !error && (
                <span className="block text-xs mt-1" style={{ color: COLORS.muted }}>
                    {ayuda}
                </span>
            )}
            {error && (
                <span role="alert" className="block text-xs mt-1" style={{ color: COLORS.red }}>
                    {error}
                </span>
            )}
        </div>
    );
}
