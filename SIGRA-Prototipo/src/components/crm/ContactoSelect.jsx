import { useEffect, useState } from "react";
import { FieldLabel } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import * as catalogos from "../../services/crmCatalogosService";

// Selector de la persona de contacto de una empresa del CRM. Solo muestra contactos activos (los inactivos no se usan en
// seguimientos nuevos). value = idContactoEmpresa (número) o "" ; onChange recibe el id (número) o null.
export default function ContactoSelect({ tipo, idEmpresa, value, onChange, label = "Contacto", disabled = false, soloActivos = true, vacio = "Sin contacto específico" }) {
    const [contactos, setContactos] = useState([]);
    const [error, setError] = useState("");
    const llave = tipo && idEmpresa ? `${tipo}:${idEmpresa}` : "";
    const [cargadoPara, setCargadoPara] = useState("");

    useEffect(() => {
        if (!llave) return undefined;
        let vigente = true;
        catalogos
            .listarContactosDeEmpresa(tipo, idEmpresa, soloActivos)
            .then((filas) => {
                if (!vigente) return;
                setContactos(filas);
                setError("");
                setCargadoPara(llave);
            })
            .catch((e) => vigente && (setError(e.message ?? "No se pudieron cargar los contactos."), setCargadoPara(llave)));
        return () => {
            vigente = false;
        };
    }, [llave, tipo, idEmpresa, soloActivos]);

    const cargando = Boolean(llave) && cargadoPara !== llave;
    const lista = llave && cargadoPara === llave ? contactos : [];

    return (
        <FieldLabel label={label}>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled || !llave || cargando}
                className={inputClass}
                style={inputStyle}
            >
                <option value="">{!llave ? "Primero elija la empresa" : cargando ? "Cargando contactos..." : vacio}</option>
                {lista.map((c) => (
                    <option key={c.idContactoEmpresa} value={c.idContactoEmpresa}>
                        {c.nombre}
                        {c.cargo ? ` · ${c.cargo}` : ""}
                        {c.esPrincipal ? " (principal)" : ""}
                        {c.activo ? "" : " · Inactivo"}
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
