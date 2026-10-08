import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Radio, Search } from "lucide-react";
import DataTable from "../DataTable";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import AsignarRadioModal from "./AsignarRadioModal";
import { fechaCorta } from "./helpers";

const columnas = [
    { key: "serie", label: "Número de serie" },
    { key: "modelo", label: "Modelo" },
    { key: "contrato", label: "Contrato" },
    { key: "empresa", label: "Empresa cliente" },
    { key: "asignado", label: "Asignado" },
    { key: "estado", label: "Estado" },
];

function FichaRadioModal({ radio, onClose }) {
    return (
        <Modal open onClose={onClose} title={`${radio.marca} ${radio.modelo}`} subtitle={`Número de serie ${radio.numeroSerie}`} width="max-w-xl">
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
                    {
                        label: "Estado de la batería",
                        value: radio.ultimoCambioBateria
                            ? `Último cambio el ${fechaCorta(radio.ultimoCambioBateria)}`
                            : "Sin cambios de batería registrados",
                        wide: true,
                    },
                ]}
            />
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
                estado: r.estado,
            })),
        [radios]
    );

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

            {ficha && <FichaRadioModal radio={ficha} onClose={() => setFicha(null)} />}

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
