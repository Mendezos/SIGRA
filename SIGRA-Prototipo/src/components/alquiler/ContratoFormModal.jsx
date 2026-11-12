import { useEffect, useState } from "react";
import { X, FileText } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import * as plantillasApi from "../../services/contratosService";
import { listarArticulos } from "../../services/inventarioService";
import AccesoriosPicker from "./AccesoriosPicker";
import SelectorEquipo from "./SelectorEquipo";
import { aItemsApi, hoyISO } from "./helpers";

const aFecha = (valor) => (valor ? String(valor).slice(0, 10) : "");

/**
 * Registra un contrato nuevo (queda en Borrador) o, con `detalle`, edita un borrador existente.
 * Los equipos solo se asignan cuando el contrato se activa con el documento firmado.
 */
export default function ContratoFormModal({ detalle, esAdmin, onClose, onSaved }) {
    const edita = !!detalle;
    const c = detalle?.contrato;
    const [clientes, setClientes] = useState([]);
    const [disponibles, setDisponibles] = useState([]);
    const [plantillas, setPlantillas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [catalogoAccesorios, setCatalogoAccesorios] = useState([]);
    const [clausulasPlantilla, setClausulasPlantilla] = useState("");
    const [form, setForm] = useState({
        empresa: c?.empresa ?? "",
        contacto: c?.contacto ?? "",
        telefono: c?.telefono ?? "",
        correo: c?.correo ?? "",
        direccion: c?.direccion ?? "",
        idPlantilla: c?.idPlantilla ? String(c.idPlantilla) : "",
        fechaInicio: c ? aFecha(c.fechaInicio) : hoyISO(),
        fechaVencimiento: c ? aFecha(c.fechaVencimiento) : "",
        fechaFirma: aFecha(c?.fechaFirma),
        monto: c ? String(c.montoMensual) : "",
        moneda: c?.moneda ?? "CRC",
        condiciones: c?.condiciones ?? "",
        clausulasAdicionales: c?.clausulasAdicionales ?? "",
        responsabilidades: c?.responsabilidades ?? "",
        penalizacion: c?.penalizacion ?? "",
        idVendedor: c?.idVendedor ? String(c.idVendedor) : "",
        cubreReparaciones: c?.cubreReparaciones ?? false,
    });
    const [accesorios, setAccesorios] = useState(
        (detalle?.accesorios ?? []).map((a) => ({ idAccesorioModelo: String(a.idAccesorioModelo), cantidad: String(a.cantidad) }))
    );
    const [series, setSeries] = useState((detalle?.equipos ?? []).map((e) => e.numeroSerie));
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    // Un campo obligatorio que falta se resalta (la lista de faltantes la entrega el servidor).
    const falta = (nombre) => errores.some((x) => x.toLowerCase().startsWith(nombre.toLowerCase()));
    const estilo = (nombre) => (falta(nombre) ? { ...inputStyle, borderColor: COLORS.red } : inputStyle);

    useEffect(() => {
        let activo = true;
        Promise.all([
            api.listarClientes(),
            api.listarEquiposDisponibles(),
            listarArticulos("accesorios"),
            plantillasApi.listarPlantillas({ estado: "Activa" }),
            esAdmin ? api.listarVendedores() : Promise.resolve([]),
        ])
            .then(([cl, eq, acc, pl, ve]) => {
                if (!activo) return;
                setClientes(cl);
                setDisponibles(eq);
                setCatalogoAccesorios(acc);
                setPlantillas(pl);
                setVendedores(ve);
            })
            .catch((e) => activo && setError(e.message ?? "No se pudieron cargar los catálogos."));
        return () => { activo = false; };
    }, [esAdmin]);

    // Al elegir una plantilla se muestran sus cláusulas y se sugieren las responsabilidades y la penalización.
    useEffect(() => {
        if (!form.idPlantilla) return;
        let activo = true;
        plantillasApi.obtenerPlantilla(Number(form.idPlantilla))
            .then((p) => {
                if (!activo) return;
                setClausulasPlantilla(p.clausulas);
                if (!edita) {
                    setForm((f) => ({
                        ...f,
                        responsabilidades: f.responsabilidades || p.responsabilidades,
                        penalizacion: f.penalizacion || p.condicionesCancelacion || "",
                    }));
                }
            })
            .catch(() => activo && setClausulasPlantilla(""));
        return () => { activo = false; };
    }, [form.idPlantilla, edita]);

    // Al escribir una empresa que ya es cliente se completan sus datos de contacto.
    function elegirEmpresa(e) {
        const empresa = e.target.value;
        const cliente = clientes.find((x) => x.empresa.toLowerCase() === empresa.toLowerCase());
        setForm((f) => ({
            ...f,
            empresa,
            ...(cliente && !edita ? { contacto: f.contacto || cliente.contacto || "", telefono: f.telefono || cliente.telefono || "", correo: f.correo || cliente.correo || "" } : {}),
        }));
    }

    function agregarSerie(serie) {
        if (!serie || series.some((s) => s.toLowerCase() === serie.toLowerCase())) return;
        setError("");
        setSeries((lista) => [...lista, serie]);
    }

    function detalleSerie(serie) {
        const e = disponibles.find((d) => d.numeroSerie.toLowerCase() === serie.toLowerCase());
        return e ? `${e.marca} ${e.modelo} · ${e.categoria}` : "No figura entre los equipos disponibles";
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);
        setGuardando(true);
        try {
            const datos = {
                empresa: form.empresa,
                contacto: form.contacto,
                telefono: form.telefono,
                correo: form.correo,
                direccion: form.direccion,
                idPlantilla: form.idPlantilla ? Number(form.idPlantilla) : null,
                fechaInicio: form.fechaInicio || null,
                fechaVencimiento: form.fechaVencimiento || null,
                fechaFirma: form.fechaFirma || null,
                montoMensual: form.monto === "" ? null : Number(form.monto),
                moneda: form.moneda,
                condiciones: form.condiciones || null,
                clausulasAdicionales: form.clausulasAdicionales || null,
                responsabilidades: form.responsabilidades || null,
                penalizacion: form.penalizacion || null,
                idVendedor: form.idVendedor ? Number(form.idVendedor) : null,
                cubreReparaciones: form.cubreReparaciones,
                series,
                accesorios: aItemsApi(accesorios),
            };
            onSaved(edita ? await api.editarContrato(c.idContrato, datos) : await api.registrarContrato(datos));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar el contrato.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    const plantillaActual = plantillas.some((p) => String(p.id) === form.idPlantilla);

    return (
        <Modal
            open
            onClose={onClose}
            icon={FileText}
            title={edita ? `Editar borrador ${api.codigoContrato(c.idContrato)}` : "Registrar contrato de alquiler"}
            subtitle="Queda en Borrador: los equipos se asignan y pasan a Alquilado cuando se activa con el documento firmado."
            width="max-w-4xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-contrato" disabled={guardando}>
                        {guardando ? "Guardando..." : edita ? "Guardar cambios" : "Guardar borrador"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {errores.length > 0 && <ul className="list-disc ml-4 mt-1">{errores.map((x) => <li key={x}>{x}</li>)}</ul>}
                </Notice>
            )}

            <form id="form-contrato" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
                <h3 className="sm:col-span-2 text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>Cliente</h3>
                <div className="sm:col-span-2">
                    <FieldLabel label="Empresa o persona cliente *">
                        <input value={form.empresa} onChange={elegirEmpresa} list="lista-clientes" maxLength={150} className={inputClass} style={estilo("Empresa")} />
                        <datalist id="lista-clientes">{clientes.map((x) => <option key={x.idCliente} value={x.empresa} />)}</datalist>
                    </FieldLabel>
                </div>
                <FieldLabel label="Contacto *"><input value={form.contacto} onChange={cambiar("contacto")} maxLength={150} className={inputClass} style={estilo("Contacto")} /></FieldLabel>
                <FieldLabel label="Teléfono *"><input value={form.telefono} onChange={cambiar("telefono")} maxLength={20} className={inputClass} style={estilo("Teléfono")} /></FieldLabel>
                <FieldLabel label="Correo *"><input type="email" value={form.correo} onChange={cambiar("correo")} maxLength={150} className={inputClass} style={estilo("Correo")} /></FieldLabel>
                <FieldLabel label="Dirección física *"><input value={form.direccion} onChange={cambiar("direccion")} maxLength={300} className={inputClass} style={estilo("Dirección")} /></FieldLabel>

                <h3 className="sm:col-span-2 text-xs uppercase tracking-wide mt-2" style={{ color: COLORS.muted, fontWeight: 600 }}>Condiciones del alquiler</h3>
                <div className="sm:col-span-2">
                    <FieldLabel label="Plantilla de contrato *">
                        <select value={form.idPlantilla} onChange={cambiar("idPlantilla")} className={inputClass} style={estilo("Plantilla")}>
                            <option value="">Seleccione una plantilla...</option>
                            {edita && c.idPlantilla && !plantillaActual && <option value={c.idPlantilla}>{c.plantillaNombre} (inactiva)</option>}
                            {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.tipoEquipo} · versión {p.versionActual}</option>)}
                        </select>
                    </FieldLabel>
                    {clausulasPlantilla && (
                        <details className="mt-2 text-sm rounded-lg px-3 py-2" style={{ backgroundColor: COLORS.greenTint, color: COLORS.charcoal }}>
                            <summary className="cursor-pointer">Ver las cláusulas de la plantilla</summary>
                            <p className="mt-2 whitespace-pre-wrap">{clausulasPlantilla}</p>
                        </details>
                    )}
                </div>
                <FieldLabel label="Fecha de inicio *"><input type="date" value={form.fechaInicio} onChange={cambiar("fechaInicio")} className={inputClass} style={estilo("Fecha de inicio")} /></FieldLabel>
                <FieldLabel label="Fecha de vencimiento *"><input type="date" value={form.fechaVencimiento} min={form.fechaInicio} onChange={cambiar("fechaVencimiento")} className={inputClass} style={estilo("Fecha de vencimiento")} /></FieldLabel>
                <FieldLabel label="Precio mensual *"><input type="number" min="0" step="0.01" value={form.monto} onChange={cambiar("monto")} className={inputClass} style={estilo("Precio")} /></FieldLabel>
                <FieldLabel label="Moneda *">
                    <select value={form.moneda} onChange={cambiar("moneda")} className={inputClass} style={estilo("Moneda")}>
                        <option value="CRC">Colones (CRC)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                </FieldLabel>
                <FieldLabel label="Fecha de firma (si ya se firmó)"><input type="date" value={form.fechaFirma} max={hoyISO()} onChange={cambiar("fechaFirma")} className={inputClass} style={inputStyle} /></FieldLabel>
                {esAdmin && (
                    <FieldLabel label="Responsable *">
                        <select value={form.idVendedor} onChange={cambiar("idVendedor")} className={inputClass} style={estilo("Responsable")}>
                            <option value="">Seleccione al vendedor...</option>
                            {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                        </select>
                    </FieldLabel>
                )}

                <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={form.cubreReparaciones} onChange={(e) => setForm((f) => ({ ...f, cubreReparaciones: e.target.checked }))} />Incluye cobertura de reparaciones de los equipos</label>
                    <div className="grid grid-cols-1 gap-4">
                        <FieldLabel label="Cláusulas adicionales"><textarea value={form.clausulasAdicionales} onChange={cambiar("clausulasAdicionales")} rows={2} className={inputClass} style={inputStyle} /></FieldLabel>
                        <FieldLabel label="Responsabilidades del cliente"><textarea value={form.responsabilidades} onChange={cambiar("responsabilidades")} rows={2} className={inputClass} style={inputStyle} /></FieldLabel>
                        <FieldLabel label="Condición de penalización por cancelación anticipada"><textarea value={form.penalizacion} onChange={cambiar("penalizacion")} rows={2} className={inputClass} style={inputStyle} /></FieldLabel>
                        <FieldLabel label="Otras condiciones del contrato"><textarea value={form.condiciones} onChange={cambiar("condiciones")} rows={2} className={inputClass} style={inputStyle} /></FieldLabel>
                    </div>
                </div>

                <h3 className="sm:col-span-2 text-xs uppercase tracking-wide mt-2" style={{ color: COLORS.muted, fontWeight: 600 }}>Equipos y accesorios</h3>
                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Equipos del contrato *</span>
                    <SelectorEquipo disponibles={disponibles} excluidas={series} onAgregar={agregarSerie} textoPie="Los equipos no se reservan hasta activar el contrato." />
                    {series.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-2">
                            {series.map((s) => (
                                <li key={s} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                                    <span>
                                        <span style={{ fontWeight: 600, color: COLORS.charcoal }}>{s}</span>
                                        <span className="ml-2 text-xs" style={{ color: COLORS.muted }}>{detalleSerie(s)}</span>
                                    </span>
                                    <button type="button" aria-label={`Quitar ${s}`} onClick={() => setSeries((l) => l.filter((x) => x !== s))} style={{ color: COLORS.red }}><X size={14} /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Accesorios entregados (opcional; salen de bodega al activar)</span>
                    <AccesoriosPicker catalogo={catalogoAccesorios} value={accesorios} onChange={setAccesorios} />
                </div>
            </form>
        </Modal>
    );
}
