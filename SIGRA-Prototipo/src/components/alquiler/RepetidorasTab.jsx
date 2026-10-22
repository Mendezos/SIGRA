import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ClipboardCheck, FileText, Gauge, HardHat, MapPin, Navigation, Package, Pencil, Plus, Radio, RadioTower, Tag, UserRound, Waves } from "lucide-react";
import DataTable from "../DataTable";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import BitacoraMantenimientoSeccion from "./BitacoraMantenimientoSeccion";
import ChecklistInstalacionModal from "./ChecklistInstalacionModal";
import DocumentosRepetidoraModal from "./DocumentosRepetidoraModal";
import FichaRepetidoraFormModal from "./FichaRepetidoraFormModal";
import { fechaHora } from "./helpers";

const columnas = [
    { key: "serie", label: "Número de serie" },
    { key: "modelo", label: "Modelo" },
    { key: "contrato", label: "Contrato" },
    { key: "empresa", label: "Empresa cliente" },
    { key: "direccion", label: "Dirección de instalación" },
    { key: "clasificacion", label: "Clasificación" },
    { key: "facturacion", label: "Facturación" },
    { key: "ficha", label: "Ficha técnica" },
    { key: "checklist", label: "Checklist de instalación" },
];

// Alquilada por Radifax genera facturación; propia del cliente solo bitácora de garantía y control administrativo.
const textoFacturacion = (r) =>
    !r.clasificacion ? "Sin clasificar" : r.facturable ? "Facturable" : "Sin cobro (bitácora de garantía y control administrativo)";

const textoInstalacion = (estado) =>
    estado === "Completo"
        ? "Lista para instalación (checklist completo)"
        : estado === "Incompleto"
          ? "No lista: checklist incompleto, hay requisitos pendientes"
          : "Sin checklist: pendiente de verificación previa";

function FichaRepetidoraModal({ repetidora: r, canEditar, onEditar, onChecklist, onDocumentos, onClose }) {
    const [pestana, setPestana] = useState("ficha");

    return (
        <Modal
            open
            onClose={onClose}
            title={`${r.marca} ${r.modelo}`}
            subtitle={`Repetidora · serie ${r.numeroSerie}`}
            icon={RadioTower}
            width="max-w-2xl"
            headerExtra={<StatusBadge value={r.estado} />}
            tabs={[{ key: "ficha", label: "Ficha técnica" }, { key: "bitacora", label: "Bitácora de mantenimiento" }]}
            activeTab={pestana}
            onTabChange={setPestana}
            footer={(r.tieneFicha || canEditar) ? (
                <>
                    {r.tieneFicha && (
                        <Button className="flex items-center gap-1.5" onClick={onDocumentos}>
                            <FileText size={14} /> Documentos
                        </Button>
                    )}
                    {r.tieneFicha && (
                        <Button className="flex items-center gap-1.5" onClick={onChecklist}>
                            <ClipboardCheck size={14} /> Checklist de instalación
                        </Button>
                    )}
                    {canEditar && (
                        <Button variant="primary" className="flex items-center gap-1.5" onClick={onEditar}>
                            {r.tieneFicha ? <><Pencil size={14} /> Editar ficha</> : <><Plus size={14} /> Registrar ficha</>}
                        </Button>
                    )}
                </>
            ) : undefined}
        >
            {pestana === "ficha" && <>

            {!r.tieneFicha ? (
                <Notice tone="error">Esta repetidora todavía no tiene ficha técnica registrada.</Notice>
            ) : (
                <DetailGrid
                    items={[
                        { icon: Radio, label: "Modelo", value: `${r.marca} ${r.modelo}` },
                        { icon: Tag, label: "Número de serie", value: r.numeroSerie },
                        { icon: Building2, label: "Contrato asociado", value: `${api.codigoContrato(r.idContrato)} · ${r.empresa}`, wide: true },
                        { icon: Waves, label: "Frecuencia de transmisión", value: r.frecuencia },
                        { icon: Waves, label: "Frecuencia de recepción", value: r.frecuenciaRecepcion },
                        { icon: Gauge, label: "Potencia", value: r.potencia },
                        { icon: Package, label: "Accesorios", value: r.accesorios || "Sin accesorios registrados" },
                        {
                            icon: HardHat,
                            label: "Clasificación",
                            value: r.clasificacion ? `${r.clasificacion} · ${textoFacturacion(r)}` : "Sin clasificar",
                            wide: true,
                        },
                        { icon: MapPin, label: "Dirección de instalación", value: r.direccionInstalacion, wide: true },
                        { icon: ClipboardCheck, label: "Instalación", value: textoInstalacion(r.estadoChecklist), wide: true },
                        {
                            icon: Navigation,
                            label: "Coordenadas GPS",
                            value: r.sinCoordenadas ? "Sin coordenadas registradas" : r.coordenadasGPS,
                            wide: true,
                        },
                        { icon: UserRound, label: "Registrada por", value: r.registradoPor ? `${r.registradoPor} · ${fechaHora(r.fechaRegistro)}` : "—", wide: true },
                    ]}
                />
            )}

            {r.tieneFicha && !r.sinCoordenadas && (
                <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(r.coordenadasGPS)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm mt-4"
                    style={{ color: COLORS.green, fontWeight: 600 }}
                >
                    <MapPin size={14} /> Ver ubicación en el mapa
                </a>
            )}

            </>}

            {pestana === "bitacora" && <BitacoraMantenimientoSeccion numeroSerie={r.numeroSerie} />}
        </Modal>
    );
}

export default function RepetidorasTab({ canRegistrar }) {
    const [repetidoras, setRepetidoras] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [ficha, setFicha] = useState(null);
    const [formulario, setFormulario] = useState(null);
    const [checklist, setChecklist] = useState(null);
    const [documentos, setDocumentos] = useState(null);
    const [facturacion, setFacturacion] = useState("");

    const cargar = useCallback(async () => {
        try {
            setRepetidoras(await api.listarRepetidoras({ facturable: facturacion }));
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar las repetidoras.");
        } finally {
            setCargando(false);
        }
    }, [facturacion]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    const filas = useMemo(
        () =>
            repetidoras.map((r) => ({
                id: r.idEquipo,
                serie: r.numeroSerie,
                modelo: `${r.marca} ${r.modelo}`,
                contrato: api.codigoContrato(r.idContrato),
                empresa: r.empresa,
                direccion: r.direccionInstalacion || "—",
                clasificacion: r.clasificacion || "—",
                facturacion: !r.clasificacion ? "—" : r.facturable ? "Facturable" : "Sin cobro",
                ficha: r.tieneFicha ? (r.sinCoordenadas ? "Registrada · sin coordenadas" : "Registrada") : "Pendiente",
                checklist: r.tieneFicha ? r.estadoChecklist : "—",
            })),
        [repetidoras]
    );

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={facturacion}
                    onChange={(e) => setFacturacion(e.target.value)}
                    aria-label="Filtrar por facturación"
                    className={inputClass}
                    style={{ ...inputStyle, width: "auto" }}
                >
                    <option value="">Todas las repetidoras</option>
                    <option value="true">Facturables (alquiladas por Radifax)</option>
                    <option value="false">Sin cobro (propias del cliente)</option>
                </select>
            </div>

            {canRegistrar && (
                <div className="flex justify-end mb-4">
                    <Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setFormulario({}); }}>
                        <Plus size={15} /> Registrar ficha técnica
                    </Button>
                </div>
            )}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando repetidoras...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => setFicha(repetidoras.find((r) => r.idEquipo === fila.id) ?? null)}
                    searchPlaceholder="Buscar por serie, modelo, empresa o dirección..."
                    hideInactiveToggle
                    emptyMessage="Todavía no hay repetidoras asignadas a contratos de alquiler."
                />
            )}

            {ficha && (
                <FichaRepetidoraModal
                    repetidora={ficha}
                    canEditar={canRegistrar}
                    onClose={() => setFicha(null)}
                    onEditar={() => { setFormulario({ repetidora: ficha }); setFicha(null); }}
                    onChecklist={() => { setChecklist(ficha); setFicha(null); }}
                    onDocumentos={() => { setDocumentos(ficha); setFicha(null); }}
                />
            )}

            {checklist && (
                <ChecklistInstalacionModal
                    repetidora={checklist}
                    canEditar={canRegistrar}
                    onSaved={() => cargar()}
                    onClose={async () => {
                        const serie = checklist.numeroSerie;
                        setChecklist(null);
                        await cargar();
                        try {
                            setFicha(await api.obtenerRepetidoraPorSerie(serie));
                        } catch {
                            /* la lista ya quedó actualizada */
                        }
                    }}
                />
            )}

            {documentos && (
                <DocumentosRepetidoraModal
                    repetidora={documentos}
                    canAdjuntar={canRegistrar}
                    onClose={() => {
                        const r = documentos;
                        setDocumentos(null);
                        setFicha(r);
                    }}
                />
            )}

            {formulario && (
                <FichaRepetidoraFormModal
                    repetidora={formulario.repetidora}
                    onClose={() => setFormulario(null)}
                    onSaved={async (guardada, edicion) => {
                        setFormulario(null);
                        setMensaje(
                            edicion
                                ? `La ficha técnica de la repetidora ${guardada.numeroSerie} se actualizó.`
                                : `La ficha técnica de la repetidora ${guardada.numeroSerie} se guardó y quedó vinculada al contrato ${api.codigoContrato(guardada.idContrato)}.${guardada.sinCoordenadas ? " Se marcó como sin coordenadas registradas." : ""}`
                        );
                        await cargar();
                        setFicha(guardada);
                    }}
                />
            )}
        </div>
    );
}
