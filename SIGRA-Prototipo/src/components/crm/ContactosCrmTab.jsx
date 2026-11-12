import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import DataTable from "../DataTable";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmProspectosService";
import ContactoDesactivarModal from "./ContactoDesactivarModal";
import ContactoDetalleModal from "./ContactoDetalleModal";
import ContactoFormModal from "./ContactoFormModal";
import EmpresaSelect from "./EmpresaSelect";
import { puedeCrearCrm, puedeEditarCrm } from "./helpers";

const FILTROS_VACIOS = { empresa: null, texto: "", estado: "" };

const columnas = [
    { key: "codigo", label: "Identificador", cardTitle: true },
    { key: "nombre", label: "Nombre" },
    { key: "cargo", label: "Cargo" },
    { key: "empresa", label: "Empresa" },
    { key: "telefono", label: "Teléfono" },
    { key: "correo", label: "Correo" },
    { key: "preferencia", label: "Preferencia" },
    { key: "principal", label: "Principal" },
    { key: "estado", label: "Estado" },
];

// Pestaña «Contactos» del CRM: CRMGPSC-005 a 007.
export default function ContactosCrmTab({ user, target }) {
    const puedeCrear = puedeCrearCrm(user);
    const puedeEditar = puedeEditarCrm(user);
    const [contactos, setContactos] = useState([]);
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [textoAplicado, setTextoAplicado] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [avisoTono, setAvisoTono] = useState("success");
    const [formulario, setFormulario] = useState(null); // { contacto? }
    const [detalleId, setDetalleId] = useState(target?.id ? Number(target.id) : null);
    const [nonceVisto, setNonceVisto] = useState(target?.nonce);
    const [version, setVersion] = useState(0);
    const [desactivando, setDesactivando] = useState(null);
    const [reactivando, setReactivando] = useState(false);

    if (target && target.nonce !== nonceVisto) {
        setNonceVisto(target.nonce);
        if (target.id) setDetalleId(Number(target.id));
    }

    useEffect(() => {
        const espera = setTimeout(() => setTextoAplicado(filtros.texto), 350);
        return () => clearTimeout(espera);
    }, [filtros.texto]);

    const empresaFiltro = filtros.empresa;
    const estadoFiltro = filtros.estado;
    const cargar = useCallback(async () => {
        try {
            setContactos(
                await api.listarContactos({
                    tipo: empresaFiltro?.tipo,
                    idEmpresa: empresaFiltro?.idEmpresa,
                    texto: textoAplicado,
                    estado: estadoFiltro,
                }),
            );
            setError("");
        } catch (e) {
            setContactos([]);
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los contactos.");
        } finally {
            setCargando(false);
        }
    }, [empresaFiltro, textoAplicado, estadoFiltro]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar, version]);

    const hayFiltros = Boolean(empresaFiltro || textoAplicado.trim() || estadoFiltro);

    function avisar(texto, tono = "success") {
        setMensaje(texto);
        setAvisoTono(tono);
    }

    function guardado(contacto, texto) {
        setFormulario(null);
        setVersion((v) => v + 1);
        avisar(texto);
    }

    function accionHecha(resultado) {
        setDesactivando(null);
        setVersion((v) => v + 1);
        avisar(resultado.mensaje, resultado.resultado === "SinCambios" ? "warning" : "success");
    }

    async function reactivar(contacto) {
        if (reactivando) return;
        setReactivando(true);
        try {
            const resultado = await api.reactivarContacto(contacto.idContactoEmpresa);
            setVersion((v) => v + 1);
            avisar(resultado.mensaje, resultado.resultado === "SinCambios" ? "warning" : "success");
        } catch (e) {
            avisar(e instanceof ApiError ? e.message : "No se pudo reactivar el contacto.", "error");
        } finally {
            setReactivando(false);
        }
    }

    const filas = useMemo(
        () =>
            contactos.map((c) => ({
                id: c.idContactoEmpresa,
                codigo: api.codigoContacto(c.idContactoEmpresa),
                nombre: c.nombre,
                cargo: c.cargo || "—",
                empresa: `${c.empresa} (${c.tipo})`,
                telefono: c.telefono || "—",
                correo: c.correo || "—",
                preferencia: c.preferenciaContacto,
                principal: c.esPrincipal ? "Sí" : "No",
                estado: c.activo ? "Activo" : "Inactivo",
            })),
        [contactos],
    );

    return (
        <div>
            {mensaje && <Notice tone={avisoTono}>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
                    <EmpresaSelect
                        label="Empresa"
                        value={filtros.empresa}
                        soloActivas={false}
                        placeholder="Todas las empresas"
                        onChange={(e) => setFiltros((f) => ({ ...f, empresa: e }))}
                    />
                    <FieldLabel label="Nombre, cargo, teléfono o correo">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                            <input
                                value={filtros.texto}
                                onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
                                placeholder="Buscar contacto"
                                className={inputClass}
                                style={{ ...inputStyle, paddingLeft: "2.1rem" }}
                            />
                        </div>
                    </FieldLabel>
                    <FieldLabel label="Estado">
                        <select value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))} className={inputClass} style={inputStyle}>
                            <option value="">Todos</option>
                            <option>Activo</option>
                            <option>Inactivo</option>
                        </select>
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                        {(hayFiltros || filtros.texto) && (
                            <Button
                                className="flex items-center gap-1.5"
                                onClick={() => {
                                    setFiltros(FILTROS_VACIOS);
                                    setTextoAplicado("");
                                }}
                            >
                                <X size={14} /> Limpiar filtros
                            </Button>
                        )}
                        {puedeCrear && (
                            <Button variant="primary" className="flex items-center gap-1.5 ml-auto" onClick={() => setFormulario({})}>
                                <Plus size={14} /> Nuevo contacto
                            </Button>
                        )}
                    </div>
                </div>
                {hayFiltros && !error && (
                    <p className="text-sm mt-3" style={{ color: COLORS.charcoal }} aria-live="polite">
                        <strong>{contactos.length}</strong> contacto(s) encontrado(s)
                    </p>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Cargando contactos...
                </p>
            ) : (
                <DataTable
                    layout="table"
                    columns={columnas}
                    rows={filas}
                    showSearch={false}
                    showEstadoFilter={false}
                    onRowClick={(fila) => setDetalleId(fila.id)}
                    paginationResetKey={JSON.stringify([empresaFiltro, textoAplicado, estadoFiltro])}
                    emptyMessage={hayFiltros ? "No se encontró ningún contacto con los criterios de búsqueda ingresados" : "Todavía no hay contactos registrados."}
                />
            )}

            {detalleId && (
                <ContactoDetalleModal
                    idContacto={detalleId}
                    version={version}
                    puedeEditar={puedeEditar}
                    reactivando={reactivando}
                    onClose={() => setDetalleId(null)}
                    onEditar={(c) => setFormulario({ contacto: c })}
                    onDesactivar={setDesactivando}
                    onReactivar={reactivar}
                />
            )}

            {formulario && (
                <ContactoFormModal
                    key={formulario.contacto?.idContactoEmpresa ?? "nuevo"}
                    contacto={formulario.contacto}
                    onClose={() => setFormulario(null)}
                    onSaved={guardado}
                    onAbrirExistente={(id) => {
                        setFormulario(null);
                        setDetalleId(id);
                    }}
                />
            )}

            {desactivando && <ContactoDesactivarModal contacto={desactivando} onClose={() => setDesactivando(null)} onHecho={accionHecha} />}
        </div>
    );
}
