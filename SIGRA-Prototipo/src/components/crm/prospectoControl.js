import { inputClass, inputStyle } from "../uiTheme";

// Atributos comunes de un control (entrada, selección, área de texto) que puede marcarse con error.
export function atributosControl(error, extra = {}) {
    return {
        className: inputClass,
        style: error ? { ...inputStyle, borderBottom: "2px solid #C0392B", backgroundColor: "#FDF3F2" } : inputStyle,
        "aria-invalid": error ? true : undefined,
        ...extra,
    };
}

// Valor para <input type="date"> (yyyy-MM-dd) a partir de una fecha del servidor (sin conversión de zona horaria).
export const aInputFecha = (valor) => (/^\d{4}-\d{2}-\d{2}/.test(String(valor ?? "")) ? String(valor).slice(0, 10) : "");
