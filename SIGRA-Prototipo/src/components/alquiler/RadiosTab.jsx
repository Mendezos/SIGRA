import { useCallback, useEffect, useMemo, useState } from "react";
import { BatteryWarning, Plus, Radio, Search } from "lucide-react";
import DataTable from "../DataTable";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import AsignarRadioModal from "./AsignarRadioModal";
import { fechaCorta, hoyISO } from "./helpers";

const columnas = [
    { key: "serie", label: "Número de serie" },
    { key: "modelo", label: "Modelo" },
    { key: "contrato", label: "Contrato" },
    { key: "empresa", label: "Empresa cliente" },
    { key: "asignado", label: "Asignado" },
    { key: "bateria", label: "Batería" },
    { key: "estado", label: "Estado" },
];

function CambioBateriaModal({ radio, onClose, onSaved }) {
    const [serie, setSerie] = useState("");
    const [fecha, setFecha] = useState(hoyISO());
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            onSaved(await api.registrarCambioBateria({ idEquipo: radio.idEquipo, numeroSerieBateria: serie, fechaCambio: fecha || null }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar el cambio de batería.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title="Registrar cambio de batería"
            subtitle={`Radio ${radio.numeroSerie}`}
            width="max-w-md"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-bateria" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar cambio"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <form id="form-bateria" onSubmit={guardar} className="grid grid-cols-1 gap-4">
                <FieldLabel label="Número de serie de la batería nueva *">
                    <input value={serie} onChange={(e) => setSerie(e.target.value)} maxLength={50} className={inputClass} style={inputStyle} autoFocus />
                </FieldLabel>
                <FieldLabel label="Fecha del cambio *">
                    <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
            </form>
        </Modal>
    );
}

function FichaRadioModal({ radio, canRegistrar, onClose, onChanged }) {
    const [baterias, setBaterias] = useState([]);
    const [registrando, setRegistrando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        let activo = true;
        api.listarBaterias(radio.idEquipo)
            .then((lista) => activo && setBaterias(lista))
            .catch(() => activo && setBaterias([]));
        return () => {
            activo = false;
        };
    }, [radio]);

    return (
        <Modal open onClose={onClose} title={`${radio.marca} ${radio.modelo}`} subtitle={`Número de serie ${radio.numeroSerie}`} width="max-w-xl">
            {mensaje && <Notice>{mensaje}</Notice>}

            <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.greenTint }}>
                    <Radio size={26} color={COLORS.green} />
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.muted, fontWeight: 600 }}>Estado actual</p>
                    <StatusBadge value={radio.estado} />
                </div>
            </div>

            <DetailGrid
                items={[
                    { label: "Modelo", value: `${radio.marca} ${radio.modelo}` },
                    { label: "Categoría", value: radio.categoria },
                    { label: "Contrato asociado", value: `${api.codigoContrato(radio.idContrato)} · ${radio.empresa}`, wide: true },
                    { label: "Fecha de asignación", value: fechaCorta(radio.fechaAsignacion) },
                    { label: "Ubicación", value: radio.ubicacion },
                ]}
            />

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>Batería</h3>
                    {canRegistrar && <Button onClick={() => { setMensaje(""); setRegistrando(true); }}>Registrar cambio</Button>}
                </div>

                {radio.estadoBateria === "Sin batería" ? (
                    <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "#FBF3DE", color: "#7A5E10" }}>
                        Este radio no cuenta con batería registrada. Registre la primera batería con el botón "Registrar cambio".
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <StatusBadge value={radio.estadoBateria} />
                            <span className="text-sm" style={{ color: COLORS.charcoal }}>
                                Instalada el {fechaCorta(radio.ultimoCambioBateria)} · cumple su ciclo el {fechaCorta(radio.fechaVencimientoBateria)}
                            </span>
                        </div>
                        <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
                            {baterias.map((c, i) => (
                                <li key={i} className="pl-5 pb-3 relative">
                                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ backgroundColor: i === 0 ? COLORS.green : COLORS.muted, border: "2px solid white" }} />
                                    <p className="text-sm" style={{ color: COLORS.charcoal }}>Batería {c.numeroSerieBateria}</p>
                                    <p className="text-xs" style={{ color: COLORS.muted }}>{fechaCorta(c.fechaCambio)} · {c.usuario}</p>
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </section>

            {registrando && (
                <CambioBateriaModal
                    radio={radio}
                    onClose={() => setRegistrando(false)}
                    onSaved={(actualizado) => {
                        setRegistrando(false);
                        setMensaje("El cambio de batería se registró y se reinició el conteo de 11 meses.");
                        onChanged(actualizado);
                    }}
                />
            )}
        </Modal>
    );
}

export default function RadiosTab({ canAsignar }) {
    const [radios, setRadios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [serieBuscada, setSerieBuscada] = useState("");
    const [ficha, setFicha] = useState(null);
    const [asignando, setAsignando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            setRadios(await api.listarRadios());
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los radios.");
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
            radios.map((r) => ({
                id: r.idEquipo,
                serie: r.numeroSerie,
                modelo: `${r.marca} ${r.modelo}`,
                contrato: api.codigoContrato(r.idContrato),
                empresa: r.empresa,
                asignado: fechaCorta(r.fechaAsignacion),
                bateria: r.estadoBateria === "Sin batería" ? "Sin batería registrada" : r.estadoBateria,
                estado: r.estado,
            })),
        [radios]
    );

    const porCambiar = radios.filter((r) => ["Próxima a vencer", "Vencida"].includes(r.estadoBateria)).length;

    async function buscar(e) {
        e.preventDefault();
        if (!serieBuscada.trim()) return;
        setError("");
        setMensaje("");
        try {
            setFicha(await api.obtenerRadioPorSerie(serieBuscada.trim()));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo consultar el radio.");
        }
    }

    async function abrirFila(fila) {
        const radio = radios.find((r) => r.idEquipo === fila.id);
        if (radio) setFicha(radio);
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {porCambiar > 0 && (
                <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-4 text-sm" style={{ backgroundColor: "#FBF3DE", color: "#7A5E10" }}>
                    <BatteryWarning size={16} />
                    {porCambiar} radio(s) tienen la batería próxima a vencer o vencida. Abra su ficha para registrar el cambio.
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <form onSubmit={buscar} className="relative flex-1 min-w-[16rem] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                    <input
                        value={serieBuscada}
                        onChange={(e) => setSerieBuscada(e.target.value)}
                        placeholder="Consultar ficha por número de serie y presionar Enter"
                        aria-label="Consultar ficha de un radio por número de serie"
                        className={`${inputClass} pl-9`}
                        style={inputStyle}
                    />
                </form>

                {canAsignar && (
                    <Button variant="primary" className="ml-auto flex items-center gap-1.5" onClick={() => { setMensaje(""); setAsignando(true); }}>
                        <Plus size={15} /> Asignar radio a contrato
                    </Button>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando radios...</p>
            ) : (
                <DataTable
                    columns={columnas}
                    rows={filas}
                    onRowClick={abrirFila}
                    searchPlaceholder="Buscar por serie, modelo o empresa..."
                    hideInactiveToggle
                    emptyMessage="Todavía no hay radios asignados a contratos."
                />
            )}

            {ficha && (
                <FichaRadioModal
                    radio={ficha}
                    canRegistrar={canAsignar}
                    onClose={() => setFicha(null)}
                    onChanged={(actualizado) => { setFicha(actualizado); cargar(); }}
                />
            )}

            {asignando && (
                <AsignarRadioModal
                    onClose={() => setAsignando(false)}
                    onSaved={async (_detalle, serie) => {
                        setAsignando(false);
                        setMensaje(`La ficha del radio ${serie} se creó y quedó vinculada al contrato.`);
                        await cargar();
                        try {
                            setFicha(await api.obtenerRadioPorSerie(serie));
                        } catch {
                            /* la lista ya quedó actualizada */
                        }
                    }}
                />
            )}
        </div>
    );
}
