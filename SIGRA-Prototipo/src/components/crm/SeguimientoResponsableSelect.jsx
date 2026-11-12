import { useEffect, useState } from "react";
import { FieldLabel } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { listarVendedores } from "../../services/crmCatalogosService";

// Selector de vendedores activos (responsables de seguimientos y series).
// value = idUsuario (número) o "" ; onChange recibe el id (número) o "".
// Con todos = "Texto" agrega la opción vacía como filtro («Todos los responsables»).
export default function SeguimientoResponsableSelect({ value, onChange, label = "Responsable *", todos, disabled = false, invalido = false, id }) {
    const [vendedores, setVendedores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let vigente = true;
        listarVendedores()
            .then((filas) => vigente && setVendedores(filas))
            .catch((e) => vigente && setError(e.message ?? "No se pudieron cargar los vendedores."))
            .finally(() => vigente && setCargando(false));
        return () => {
            vigente = false;
        };
    }, []);

    return (
        <FieldLabel label={label}>
            <select
                id={id}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
                disabled={disabled || cargando}
                aria-invalid={invalido || undefined}
                className={inputClass}
                style={inputStyle}
            >
                <option value="">{cargando ? "Cargando vendedores..." : (todos ?? "Seleccione un vendedor")}</option>
                {vendedores.map((v) => (
                    <option key={v.idUsuario} value={v.idUsuario}>
                        {v.nombre}
                    </option>
                ))}
            </select>
            {error && (
                <span role="alert" className="block text-xs mt-1" style={{ color: COLORS.red }}>
                    {error}
                </span>
            )}
        </FieldLabel>
    );
}
