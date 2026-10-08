import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../DataTable";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { fechaHora } from "./helpers";

const columnas = [
    { key: "fecha", label: "Fecha" },
    { key: "empresa", label: "Empresa" },
    { key: "contacto", label: "Contacto" },
    { key: "medio", label: "Medio" },
    { key: "vendedor", label: "Vendedor asignado" },
    { key: "estado", label: "Estado" },
];

function ContactoFormModal({ onClose, onSaved }) {
    const [empresa, setEmpresa] = useState("");
    const [contacto, setContacto] = useState("");
    const [medio, setMedio] = useState("Teléfono");
    const [dato, setDato] = useState("");
    const [motivo, setMotivo] = useState("");
    const [sugerencia, setSugerencia] = useState(null);
    const [usarVendedorPrevio, setUsarVendedorPrevio] = useState(true);
    const [duplicado, setDuplicado] = useState(null);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function consultarSugerencia() {
        const nombre = empresa.trim();
        if (!nombre) {
            setSugerencia(null);
            return;
        }
        try {
            setSugerencia(await api.sugerenciaContacto(nombre));
        } catch {
            setSugerencia(null);
        }
    }

    async function guardar(e, confirmarDuplicado = false) {
        e?.preventDefault();
        setError("");
        setGuardando(true);
        try {
            const resultado = await api.registrarContacto({
                empresa,
                contacto: contacto || null,
                medioContacto: medio,
                datoContacto: dato,
                motivo: motivo || null,
                idVendedor: sugerencia?.vendedorPrevio && usarVendedorPrevio ? sugerencia.vendedorPrevio.idUsuario : null,
                confirmarDuplicado,
            });

            if (resultado.requiereConfirmacion) {
                setDuplicado(resultado);
                return;
            }
            onSaved(resultado);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar el contacto.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title="Registrar contacto inicial"
            subtitle="El contacto se asigna a un vendedor disponible en orden rotativo."
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-contacto" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar contacto"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            {duplicado && (
                <div className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ backgroundColor: "#FBF3DE", color: "#7A5E10" }}>
                    <p>{duplicado.mensaje}</p>
                    <p className="text-xs mt-1">
                        Contacto anterior: {fechaHora(duplicado.contactoReciente.fechaRegistro)}
                        {duplicado.contactoReciente.vendedor ? ` · atendido por ${duplicado.contactoReciente.vendedor}` : ""}
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button variant="primary" disabled={guardando} onClick={() => guardar(null, true)}>Registrar de todas formas</Button>
                        <Button onClick={onClose}>Cancelar, usar el existente</Button>
                    </div>
                </div>
            )}

            <form id="form-contacto" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <FieldLabel label="Nombre de la empresa *">
                        <input
                            value={empresa}
                            onChange={(e) => { setEmpresa(e.target.value); setDuplicado(null); }}
                            onBlur={consultarSugerencia}
                            maxLength={150}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                </div>

                {sugerencia?.vendedorPrevio && (
                    <label className="sm:col-span-2 flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}>
                        <input
                            type="checkbox"
                            checked={usarVendedorPrevio}
                            onChange={(e) => setUsarVendedorPrevio(e.target.checked)}
                            className="mt-0.5"
                            style={{ accentColor: COLORS.green }}
                        />
                        <span>
                            Esta empresa ya fue atendida por <strong>{sugerencia.vendedorPrevio.nombre}</strong> en contratos anteriores.
                            Asignar el contacto al mismo vendedor para mantener la continuidad comercial.
                        </span>
                    </label>
                )}

                <FieldLabel label="Nombre del contacto">
                    <input value={contacto} onChange={(e) => setContacto(e.target.value)} maxLength={150} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <FieldLabel label="Medio de contacto *">
                    <select value={medio} onChange={(e) => setMedio(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="Teléfono">Teléfono</option>
                        <option value="Correo">Correo</option>
                    </select>
                </FieldLabel>

                <div className="sm:col-span-2">
                    <FieldLabel label={medio === "Correo" ? "Correo electrónico *" : "Número de teléfono *"}>
                        <input
                            type={medio === "Correo" ? "email" : "tel"}
                            value={dato}
                            onChange={(e) => setDato(e.target.value)}
                            maxLength={150}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                </div>

                <div className="sm:col-span-2">
                    <FieldLabel label="Motivo de la consulta">
                        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={500} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}

function ContactoDetalleModal({ detalle, canReasignar, onClose, onChanged }) {
    const [vendedores, setVendedores] = useState([]);
    const [idVendedor, setIdVendedor] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!canReasignar) return;
        let activo = true;
        api.listarVendedores().then((v) => activo && setVendedores(v)).catch(() => {});
        return () => {
            activo = false;
        };
    }, [canReasignar]);

    const { contacto, historial } = detalle;

    async function reasignar() {
        setError("");
        setMensaje("");
        setGuardando(true);
        try {
            const nuevo = await api.reasignarContacto(contacto.idContacto, idVendedor ? Number(idVendedor) : null, motivo);
            setIdVendedor("");
            setMotivo("");
            setMensaje("El contacto se reasignó y el cambio quedó en el historial.");
            onChanged(nuevo);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo reasignar el contacto.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal open onClose={onClose} title={contacto.empresa} subtitle="Contacto inicial" width="max-w-2xl">
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex items-center gap-3 mb-4">
                <span className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>Estado</span>
                <StatusBadge value={contacto.estado} />
            </div>

            <DetailGrid
                items={[
                    { label: "Contacto", value: contacto.contacto },
                    { label: contacto.medioContacto, value: contacto.datoContacto },
                    { label: "Vendedor asignado", value: contacto.vendedor ?? "Sin asignar (en espera)" },
                    { label: "Registrado por", value: contacto.registradoPor },
                    { label: "Fecha de registro", value: fechaHora(contacto.fechaRegistro) },
                    { label: "Motivo de la consulta", value: contacto.motivo, wide: true },
                ]}
            />

            {canReasignar && (
                <section className="rounded-xl p-4 mb-5" style={{ backgroundColor: "#FAFAFA", border: `1px solid ${COLORS.border}` }}>
                    <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>Reasignar vendedor</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldLabel label="Vendedor disponible">
                            <select value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)} className={inputClass} style={inputStyle}>
                                <option value="">Seleccionar...</option>
                                {vendedores.filter((v) => v.idUsuario !== contacto.idVendedor).map((v) => (
                                    <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>
                                ))}
                            </select>
                        </FieldLabel>
                        <FieldLabel label="Motivo del cambio *">
                            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} className={inputClass} style={inputStyle} />
                        </FieldLabel>
                    </div>
                    <div className="flex justify-end mt-3">
                        <Button variant="primary" disabled={!idVendedor || guardando} onClick={reasignar}>
                            {guardando ? "Guardando..." : "Reasignar"}
                        </Button>
                    </div>
                </section>
            )}

            <section>
                <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>Historial de asignaciones</h3>
                <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
                    {historial.map((h, i) => (
                        <li key={i} className="pl-5 pb-4 relative">
                            <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.green, border: "2px solid white" }} />
                            <p className="text-sm" style={{ color: COLORS.charcoal }}>
                                {h.vendedorAnterior ? `${h.vendedorAnterior} → ${h.vendedorNuevo}` : `Asignado a ${h.vendedorNuevo}`}
                            </p>
                            <p className="text-xs" style={{ color: COLORS.muted }}>{h.motivo}</p>
                            <p className="text-xs" style={{ color: COLORS.muted }}>{fechaHora(h.fecha)} · {h.usuario}</p>
                        </li>
                    ))}
                    {historial.length === 0 && (
                        <li className="pl-5 text-sm" style={{ color: COLORS.muted }}>Todavía no se asignó a ningún vendedor.</li>
                    )}
                </ol>
            </section>
        </Modal>
    );
}

export default function ContactosTab({ canRegister, canReasignar }) {
    const [contactos, setContactos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [detalle, setDetalle] = useState(null);

    const cargar = useCallback(async () => {
        try {
            setContactos(await api.listarContactos());
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los contactos.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    const filas = useMemo(
        () =>
            contactos.map((c) => ({
                id: c.idContacto,
                fecha: fechaHora(c.fechaRegistro),
                empresa: c.empresa,
                contacto: c.contacto,
                medio: `${c.medioContacto}: ${c.datoContacto}`,
                vendedor: c.vendedor ?? "Sin asignar",
                estado: c.estado,
            })),
        [contactos]
    );

    async function abrir(fila) {
        setError("");
        try {
            setDetalle(await api.obtenerContacto(fila.id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir el contacto.");
        }
    }

    function alRegistrar(resultado) {
        setRegistrando(false);
        setMensaje(resultado.mensaje);
        cargar();
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {canRegister && (
                <div className="flex justify-end mb-4">
                    <Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setRegistrando(true); }}>
                        <Plus size={15} /> Registrar contacto
                    </Button>
                </div>
            )}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando contactos...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={abrir}
                    searchPlaceholder="Buscar contacto, empresa o vendedor..."
                    hideInactiveToggle
                    emptyMessage="Todavía no hay contactos iniciales registrados."
                />
            )}

            {registrando && <ContactoFormModal onClose={() => setRegistrando(false)} onSaved={alRegistrar} />}

            {detalle && (
                <ContactoDetalleModal
                    key={detalle.contacto.idContacto}
                    detalle={detalle}
                    canReasignar={canReasignar}
                    onClose={() => setDetalle(null)}
                    onChanged={(nuevo) => { setDetalle(nuevo); cargar(); }}
                />
            )}
        </div>
    );
}
