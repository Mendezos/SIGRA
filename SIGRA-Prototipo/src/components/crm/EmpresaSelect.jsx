import { useEffect, useMemo, useState } from "react";
import { FieldLabel } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import * as catalogos from "../../services/crmCatalogosService";

// Selector de empresa del CRM (prospecto o cliente). Devuelve { tipo, idEmpresa, empresa, ... } o null.
// - soloActivas: oculta prospectos convertidos/descartados y clientes inactivos (por defecto, sí).
// - tipo: limita a "Prospecto" o "Cliente".
export default function EmpresaSelect({ value, onChange, label = "Empresa *", soloActivas = true, tipo, disabled = false, placeholder = "Seleccione una empresa", id }) {
    const [empresas, setEmpresas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let vigente = true;
        catalogos
            .listarEmpresas({ tipo, soloActivas })
            .then((filas) => vigente && setEmpresas(filas))
            .catch((e) => vigente && setError(e.message ?? "No se pudieron cargar las empresas."))
            .finally(() => vigente && setCargando(false));
        return () => {
            vigente = false;
        };
    }, [tipo, soloActivas]);

    const prospectos = useMemo(() => empresas.filter((e) => e.tipo === catalogos.TIPO_PROSPECTO), [empresas]);
    const clientes = useMemo(() => empresas.filter((e) => e.tipo === catalogos.TIPO_CLIENTE), [empresas]);
    const seleccionada = value ? catalogos.claveEmpresa(value.tipo, value.idEmpresa) : "";

    function cambiar(e) {
        const sel = catalogos.separarClaveEmpresa(e.target.value);
        if (!sel) return onChange(null);
        onChange(empresas.find((x) => x.tipo === sel.tipo && x.idEmpresa === sel.idEmpresa) ?? sel);
    }

    return (
        <FieldLabel label={label}>
            <select id={id} value={seleccionada} onChange={cambiar} disabled={disabled || cargando} className={inputClass} style={inputStyle}>
                <option value="">{cargando ? "Cargando empresas..." : placeholder}</option>
                {prospectos.length > 0 && (
                    <optgroup label="Prospectos">
                        {prospectos.map((e) => (
                            <option key={`P${e.idEmpresa}`} value={catalogos.claveEmpresa(e.tipo, e.idEmpresa)}>
                                {e.empresa} · {e.estado}
                            </option>
                        ))}
                    </optgroup>
                )}
                {clientes.length > 0 && (
                    <optgroup label="Clientes">
                        {clientes.map((e) => (
                            <option key={`C${e.idEmpresa}`} value={catalogos.claveEmpresa(e.tipo, e.idEmpresa)}>
                                {e.empresa}
                                {e.activa ? "" : " · Inactivo"}
                            </option>
                        ))}
                    </optgroup>
                )}
            </select>
            {error && (
                <span role="alert" className="block text-xs mt-1" style={{ color: COLORS.red }}>
                    {error}
                </span>
            )}
        </FieldLabel>
    );
}
