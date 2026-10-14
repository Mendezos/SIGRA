import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Ban, Download, Eye, RefreshCw, ScrollText, FileSpreadsheet, FileText, Image as ImageIcon, Upload } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import HistorialRenovaciones from "./HistorialRenovaciones";
import { extensionDe, fechaCorta, fechaHora, tamano } from "./helpers";

function validar(archivo) {
    if (!api.EXTENSIONES_DOCUMENTO.includes(extensionDe(archivo.name))) return api.MENSAJE_FORMATO_DOCUMENTO;
    if (archivo.size > api.TAMANO_MAXIMO_DOCUMENTO) return api.MENSAJE_TAMANO_DOCUMENTO;
    return "";
}

function textoDias(dias, estado) {
    if (dias === null || dias === undefined) return "";
    if (estado === "Renovada") return "Frecuencia renovada";
    if (dias < 0) return `Venció hace ${-dias} día(s)`;
    if (dias === 0) return "Vence hoy";
    return `${dias} día(s) restantes`;
}

function IconoArchivo({ contenido }) {
    const props = { size: 18, color: COLORS.green };
    if (contenido?.startsWith("image/")) return <ImageIcon {...props} />;
    if (contenido?.includes("spreadsheet")) return <FileSpreadsheet {...props} />;
    return <FileText {...props} />;
}

export default function SolicitudDetalleModal({ solicitud: s, canAdjuntar, onOtorgar, onRenovar, onCancelar, onAuditoria, onVerSolicitud, onDocumentosCambiaron, onClose }) {
    const [documentos, setDocumentos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [tipo, setTipo] = useState("Formulario presentado");
    const [archivos, setArchivos] = useState([]);
    const [errorRenovar, setErrorRenovar] = useState("");
    const [subiendo, setSubiendo] = useState(false);
    const [resultados, setResultados] = useState([]);
    const entrada = useRef(null);

    const cargar = useCallback(async () => {
        try {
            setDocumentos(await api.listarDocumentos(s.idSolicitud));
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los documentos.");
        } finally {
            setCargando(false);
        }
    }, [s.idSolicitud]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    function elegir(e) {
        setResultados([]);
        setArchivos(Array.from(e.target.files ?? []).map((archivo) => ({ archivo, error: validar(archivo) })));
    }

    async function adjuntar(e) {
        e.preventDefault();
        if (archivos.length === 0) {
            setError("Debe seleccionar al menos un archivo.");
            return;
        }
        setError("");
        setSubiendo(true);
        const salida = [];
        for (const { archivo, error: errorLocal } of archivos) {
            if (errorLocal) {
                salida.push({ nombre: archivo.name, error: errorLocal });
                continue;
            }
            try {
                await api.adjuntarDocumento(s.idSolicitud, { archivo, tipoDocumento: tipo });
                salida.push({ nombre: archivo.name });
            } catch (err) {
                const mensaje = err instanceof ApiError && err.status === 413 ? api.MENSAJE_TAMANO_DOCUMENTO : err.message;
                salida.push({ nombre: archivo.name, error: mensaje });
            }
        }
        setResultados(salida);
        setArchivos([]);
        if (entrada.current) entrada.current.value = "";
        setSubiendo(false);
        await cargar();
        onDocumentosCambiaron?.();
    }

    function renovar() {
        if (s.estado === "Cancelada") {
            setErrorRenovar(api.MENSAJE_RENOVAR_CANCELADA);
            return;
        }
        onRenovar();
    }

    async function abrir(doc, ver) {
        setError("");
        try {
            const blob = await api.descargarDocumento(doc.idDocumento, !ver);
            const url = URL.createObjectURL(blob);
            if (ver) {
                window.open(url, "_blank", "noopener");
            } else {
                const enlace = document.createElement("a");
                enlace.href = url;
                enlace.download = doc.nombreArchivo ?? doc.nombreDocumento;
                enlace.click();
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo obtener el documento.");
        }
    }

    const exitosos = resultados.filter((r) => !r.error);
    const fallidos = resultados.filter((r) => r.error);

    return (
        <Modal
            open
            onClose={onClose}
            title={`Solicitud ${api.codigoSolicitud(s.idSolicitud)}`}
            subtitle={`${s.empresa} · repetidora ${s.numeroSerie}`}
            width="max-w-3xl"
            footer={
                <div className="flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                </div>
            }
        >
            <div className="flex items-center gap-4 mb-5">
                <div>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.muted, fontWeight: 600 }}>Estado del trámite</p>
                    <StatusBadge value={s.estado} />
                </div>
                <div className="ml-auto flex flex-wrap justify-end gap-2">
                    <Button className="flex items-center gap-1.5" onClick={onAuditoria} title="Bitácora de auditoría completa (solo Administrador)">
                        <ScrollText size={14} /> Auditoría
                    </Button>
                    {canAdjuntar && (api.ESTADOS_RENOVABLES.includes(s.estado) || s.estado === "Cancelada") && !s.idSolicitudRenovacion && (
                        <Button variant="primary" className="flex items-center gap-1.5" onClick={renovar}>
                            <RefreshCw size={14} /> Iniciar renovación
                        </Button>
                    )}
                    {canAdjuntar && s.estado === api.ESTADO_INICIAL && (
                        <Button variant="primary" className="flex items-center gap-1.5" onClick={onOtorgar}>
                            <BadgeCheck size={14} /> Registrar otorgamiento
                        </Button>
                    )}
                    {canAdjuntar && api.ESTADOS_CANCELABLES.includes(s.estado) && !s.idSolicitudRenovacion && (
                        <Button variant="danger" className="flex items-center gap-1.5" onClick={onCancelar}>
                            <Ban size={14} /> Cancelar solicitud
                        </Button>
                    )}
                </div>
            </div>

            {errorRenovar && <Notice tone="error">{errorRenovar}</Notice>}

            <DetailGrid
                items={[
                    { label: "Cliente", value: s.empresa },
                    { label: "Repetidora", value: `${s.numeroSerie} · ${s.marca} ${s.modelo}` },
                    { label: "Frecuencia solicitada", value: s.frecuencia },
                    { label: "Banda", value: s.banda },
                    { label: "Potencia", value: s.potencia },
                    { label: "Fecha de presentación", value: fechaCorta(s.fechaPresentacion) },
                    { label: "Zona geográfica de cobertura", value: s.zonaCobertura, wide: true },
                    { label: "Vendedor responsable", value: s.vendedor },
                    { label: "Registrada el", value: fechaCorta(s.fechaRegistro) },
                    ...(s.estado === "Cancelada"
                        ? [
                              { label: "Fecha de cancelación", value: fechaHora(s.fechaCancelacion) },
                              { label: "Cancelada por", value: s.usuarioCancelacion },
                              { label: "Motivo de la cancelación", value: s.motivoCancelacion, wide: true },
                          ]
                        : []),
                    ...(s.fechaOtorgamiento
                        ? [
                              { label: "Resolución o expediente", value: s.numeroResolucion },
                              { label: "Fecha de otorgamiento", value: fechaCorta(s.fechaOtorgamiento) },
                              { label: "Fecha de vencimiento", value: fechaCorta(s.fechaVencimiento) },
                              { label: "Tiempo para el vencimiento", value: textoDias(s.diasParaVencer, s.estado) },
                          ]
                        : []),
                    ...(s.idSolicitudOrigen
                        ? [{ label: "Renovación de", value: api.codigoSolicitud(s.idSolicitudOrigen), wide: true }]
                        : []),
                    ...(s.idSolicitudRenovacion
                        ? [{ label: "Renovación iniciada", value: `${api.codigoSolicitud(s.idSolicitudRenovacion)} · ${s.estadoRenovacion}`, wide: true }]
                        : []),
                ]}
            />

            <HistorialRenovaciones idSolicitud={s.idSolicitud} onVerSolicitud={onVerSolicitud} />

            <h3 className="text-xs uppercase tracking-wide mb-3 mt-6" style={{ color: COLORS.muted, fontWeight: 600 }}>
                Documentos del trámite
            </h3>

            {error && <Notice tone="error">{error}</Notice>}
            {exitosos.length > 0 && (
                <Notice>
                    {exitosos.length === 1
                        ? `El documento "${exitosos[0].nombre}" se adjuntó a la solicitud.`
                        : `Se adjuntaron ${exitosos.length} documentos a la solicitud.`}
                </Notice>
            )}
            {fallidos.map((r) => (
                <Notice key={r.nombre} tone="error">
                    <strong>{r.nombre}:</strong> {r.error}
                </Notice>
            ))}

            {canAdjuntar && (
                <form onSubmit={adjuntar} className="rounded-lg border p-4 mb-5" style={{ borderColor: COLORS.border }}>
                    <p className="text-sm mb-3" style={{ fontWeight: 600, color: COLORS.charcoal }}>Adjuntar documentos</p>
                    <div className="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-3">
                        <label className="block">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Tipo de documento *</span>
                            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass} style={inputStyle}>
                                {api.TIPOS_DOCUMENTO.map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Archivos (PDF, JPG, PNG o XLSX, máximo 10 MB cada uno) *</span>
                            <input ref={entrada} type="file" multiple onChange={elegir} className={inputClass} style={inputStyle} />
                        </label>
                    </div>

                    {archivos.length > 0 && (
                        <ul className="mt-3 text-sm space-y-1">
                            {archivos.map(({ archivo, error: e }) => (
                                <li key={archivo.name + archivo.size} className="flex flex-wrap gap-x-2">
                                    <span>{archivo.name}</span>
                                    <span style={{ color: COLORS.muted }}>({tamano(archivo.size)})</span>
                                    {e && <span style={{ color: COLORS.red, fontWeight: 600 }}>{e}</span>}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex justify-end mt-3">
                        <Button variant="primary" type="submit" disabled={subiendo} className="flex items-center gap-1.5">
                            <Upload size={14} /> {subiendo ? "Adjuntando..." : "Adjuntar"}
                        </Button>
                    </div>
                </form>
            )}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando documentos...</p>
            ) : documentos.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Esta solicitud todavía no tiene documentos adjuntos.</p>
            ) : (
                <ul className="divide-y rounded-lg border" style={{ borderColor: COLORS.border }}>
                    {documentos.map((d) => {
                        const visible = d.tipoContenido === "application/pdf" || d.tipoContenido?.startsWith("image/");
                        return (
                            <li key={d.idDocumento} className="flex items-center gap-3 px-4 py-3">
                                <IconoArchivo contenido={d.tipoContenido} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm truncate" style={{ fontWeight: 600 }}>{d.nombreDocumento}</p>
                                    <p className="text-xs" style={{ color: COLORS.muted }}>
                                        {d.tipoDocumento} · {d.nombreArchivo} · {tamano(d.tamanoBytes)} · {fechaHora(d.fechaCarga)} · {d.usuario ?? "—"}
                                    </p>
                                </div>
                                {visible && (
                                    <Button className="flex items-center gap-1.5" onClick={() => abrir(d, true)}>
                                        <Eye size={14} /> Ver
                                    </Button>
                                )}
                                <Button className="flex items-center gap-1.5" onClick={() => abrir(d, false)}>
                                    <Download size={14} /> Descargar
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Modal>
    );
}
