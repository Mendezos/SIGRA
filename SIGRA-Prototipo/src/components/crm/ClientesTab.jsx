import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import DataTable from "../DataTable";
import { Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmClientesService";
import ClientePerfilModal from "./ClientePerfilModal";
import ResponsableModal from "./ResponsableModal";

const columnas = [
    { key: "codigo", label: "Cliente", cardTitle: true },
    { key: "empresa", label: "Empresa" },
    { key: "contacto", label: "Contacto" },
    { key: "vendedor", label: "Responsable" },
    { key: "contratos", label: "Contratos vigentes" },
    { key: "tickets", label: "Boletas abiertas" },
    { key: "estado", label: "Estado" },
];

// CRMGPSC-021 (lista de clientes) y CRMGPSC-020 (asignar o reasignar al responsable de un cliente).
export default function ClientesTab({ target, puedeAsignar }) {
    const [clientes, setClientes] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [texto, setTexto] = useState("");
    const [estado, setEstado] = useState("");
    const [idVendedor, setIdVendedor] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [perfilId, setPerfilId] = useState(target?.id ? Number(target.id) : null);
    const [version, setVersion] = useState(0);
    const [asignando, setAsignando] = useState(null);

    useEffect(() => {
        catalogos.listarVendedores().then(setVendedores).catch(() => setVendedores([]));
    }, []);

    const cargar = useCallback(async () => {
        try {
            setClientes(await api.listarClientes({ texto: texto.trim(), estado, idVendedor }));
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los clientes.");
        } finally {
            setCargando(false);
        }
    }, [texto, estado, idVendedor]);

    useEffect(() => {
        let activo = true;
        const espera = setTimeout(() => activo && cargar(), 250);
        return () => { activo = false; clearTimeout(espera); };
    }, [cargar, version]);

    const filas = useMemo(() => clientes.map((c) => ({
        id: c.idCliente,
        codigo: api.codigoCliente(c.idCliente),
        empresa: c.empresa,
        contacto: c.contacto ?? "—",
        vendedor: c.vendedor ?? "Sin asignar",
        contratos: String(c.contratosVigentes),
        tickets: String(c.ticketsAbiertos),
        estado: c.activo ? "Activo" : "Inactivo",
    })), [clientes]);

    function asignado(resultado) {
        setAsignando(null);
        setVersion((v) => v + 1);
        setMensaje(resultado.mensaje);
    }

    const selectClase = "px-3 py-2.5 rounded-lg text-sm bg-white";
    const estilo = (v) => ({ ...inputStyle, color: v ? COLORS.charcoal : COLORS.muted });

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[16rem] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                    <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por empresa, contacto o correo..." aria-label="Buscar clientes" className={`${inputClass} pl-9`} style={inputStyle} />
                </div>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado" className={selectClase} style={estilo(estado)}>
                    <option value="">Todos los estados</option>
                    <option value="Activo">Activos</option>
                    <option value="Inactivo">Inactivos</option>
                </select>
                <select value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)} aria-label="Filtrar por responsable" className={selectClase} style={estilo(idVendedor)}>
                    <option value="">Todos los responsables</option>
                    {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                </select>
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando clientes...</p>
            ) : (
                <DataTable
                    cardMax={6}
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => { setMensaje(""); setPerfilId(fila.id); }}
                    showSearch={false}
                    showEstadoFilter={false}
                    hideInactiveToggle
                    emptyMessage="No se encontró ningún cliente con los criterios de búsqueda ingresados."
                />
            )}

            {perfilId && (
                <ClientePerfilModal
                    idCliente={perfilId}
                    version={version}
                    puedeAsignar={puedeAsignar}
                    onClose={() => setPerfilId(null)}
                    onAsignar={(c) => setAsignando({ id: c.idCliente, empresa: c.empresa, idVendedor: c.idVendedor, vendedor: c.vendedor })}
                />
            )}
            {asignando && <ResponsableModal tipo="clientes" registro={asignando} onClose={() => setAsignando(null)} onHecho={asignado} />}
        </div>
    );
}
