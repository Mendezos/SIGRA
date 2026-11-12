import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, StickyNote } from "lucide-react";
import DataTable from "../DataTable";
import { Button, Notice, Pill } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmHistorialService";
import EmpresaSelect from "./EmpresaSelect";
import HistorialDetalleModal from "./HistorialDetalleModal";
import HistorialFiltros from "./HistorialFiltros";
import InteraccionFormModal from "./InteraccionFormModal";
import NotaFormModal from "./NotaFormModal";
import { fechaLocal, horaLocal, puedeCrearCrm } from "./helpers";

const TONO_MOVIMIENTO = { [api.MOVIMIENTO_INTERACCION]: "positive", [api.MOVIMIENTO_NOTA]: "warning", [api.MOVIMIENTO_COTIZACION]: "neutral" };

const columnas = [
    { key: "fecha", label: "Fecha", nowrap: true },
    { key: "hora", label: "Hora", nowrap: true },
    {
        key: "tipo",
        label: "Tipo",
        render: (fila) => (
            <div>
                <Pill tone={TONO_MOVIMIENTO[fila.mov.tipoMovimiento]}>{fila.mov.tipo}</Pill>
                <p className="text-[11px] mt-1" style={{ color: COLORS.muted }}>{fila.codigo}</p>
            </div>
        ),
    },
    { key: "contacto", label: "Contacto" },
    {
        key: "descripcion",
        label: "Descripción",
        cellClassName: "min-w-[14rem] max-w-md",
        render: (fila) => (
            <div>
                {fila.mov.tipoMovimiento === api.MOVIMIENTO_NOTA && (
                    <p className="text-[11px] mb-0.5" style={{ color: COLORS.muted }}>
                        {fila.mov.categoria} · {fila.mov.visibilidad}
                    </p>
                )}
                <p className="line-clamp-3 whitespace-pre-line break-words">{fila.descripcion}</p>
            </div>
        ),
    },
    { key: "resultado", label: "Resultado", cellClassName: "min-w-[8rem] max-w-xs", render: (fila) => <span className="line-clamp-3 break-words">{fila.resultado}</span> },
    { key: "cotizacion", label: "Cotización relacionada" },
    { key: "autor", label: "Autor", nowrap: true },
];

const textoOGuion = (valor) => (valor ? valor : "—");

// Pestaña «Historial comercial» (CRMGPSC-013 y 014): línea de tiempo de una empresa (prospecto o cliente) con sus
// interacciones, notas y cotizaciones; desde aquí se registran interacciones y notas.
export default function HistorialTab({ user }) {
    const puedeCrear = puedeCrearCrm(user);
    const [empresa, setEmpresa] = useState(null); // { tipo, idEmpresa }
    const [filtros, setFiltros] = useState(api.FILTROS_HISTORIAL_VACIOS);
    const [historial, setHistorial] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [recarga, setRecarga] = useState(0);
    const [registrando, setRegistrando] = useState(null); // "interaccion" | "nota"
    const [detalle, setDetalle] = useState(null);

    const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);
    const claveEmpresa = empresa ? `${empresa.tipo}:${empresa.idEmpresa}` : "";

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const datos = await api.obtenerHistorial({
                tipoEmpresa: empresa.tipo,
                idEmpresa: empresa.idEmpresa,
                tipoMovimiento: filtros.tipoMovimiento,
                desde: filtros.desde,
                hasta: filtros.hasta,
                idAutor: filtros.idAutor,
            });
            setHistorial(datos);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar el historial comercial.");
        } finally {
            setCargando(false);
        }
    }, [empresa, filtros]);

    useEffect(() => {
        if (!empresa || rangoInvalido) return undefined;
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [empresa, rangoInvalido, cargar, recarga]);

    function elegirEmpresa(elegida) {
        setEmpresa(elegida ? { tipo: elegida.tipo, idEmpresa: elegida.idEmpresa } : null);
        setFiltros(api.FILTROS_HISTORIAL_VACIOS);
        setHistorial(null);
        setError("");
        setMensaje("");
    }

    // Tras registrar algo se muestra la empresa donde se guardó, sin filtros, para ver el movimiento nuevo en la línea de tiempo.
    function alGuardar(registrada, texto) {
        setRegistrando(null);
        setMensaje(texto);
        setError("");
        setFiltros(api.FILTROS_HISTORIAL_VACIOS);
        if (registrada.tipoEmpresa !== empresa?.tipo || registrada.idEmpresa !== empresa?.idEmpresa) {
            setHistorial(null);
            setEmpresa({ tipo: registrada.tipoEmpresa, idEmpresa: registrada.idEmpresa });
        }
        setRecarga((n) => n + 1);
    }

    // Solo se vincula lo nuevo a prospectos en curso o clientes activos; el resto solo se consulta.
    const avisoNoRegistrable = useMemo(() => {
        if (!historial || historial.activa) return "";
        if (historial.tipoEmpresa === "Cliente") return "El cliente está inactivo: puede consultar su historial, pero no registrar interacciones ni notas.";
        return historial.estado === "Convertido"
            ? "Este prospecto ya fue convertido: puede consultar su historial, pero las interacciones y notas nuevas se registran en el cliente."
            : "Este prospecto está descartado: puede consultar su historial, pero no registrar interacciones ni notas; reactívelo primero.";
    }, [historial]);

    const filas = useMemo(
        () =>
            (historial?.movimientos ?? []).map((m) => ({
                id: `${m.tipoMovimiento}-${m.idMovimiento}`,
                mov: m,
                codigo: api.codigoMovimiento(m),
                fecha: fechaLocal(m.fecha),
                // Las cotizaciones solo tienen fecha: no se muestra una hora inventada (00:00).
                hora: m.tipoMovimiento === api.MOVIMIENTO_COTIZACION && /T00:00:00$/.test(m.fecha) ? "—" : horaLocal(m.fecha),
                contacto: textoOGuion(m.contacto),
                descripcion: api.descripcionMovimiento(m),
                resultado: textoOGuion(m.resultado),
                cotizacion: m.idCotizacion && m.tipoMovimiento !== api.MOVIMIENTO_COTIZACION ? api.codigoCotizacion(m.idCotizacion) : "—",
                autor: textoOGuion(m.autor),
            })),
        [historial]
    );

    const columnasConDetalle = useMemo(
        () => [
            ...columnas,
            {
                key: "ver",
                label: "Detalle",
                render: (fila) => (
                    <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => setDetalle(fila.mov)} aria-label={`Ver detalle de ${fila.codigo}`}>
                        Ver
                    </Button>
                ),
            },
        ],
        []
    );

    const bloqueado = Boolean(historial && !historial.activa);
    const sinActividad = historial && historial.totalSinFiltros === 0;

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,26rem)_1fr] gap-4 items-end mb-5">
                <EmpresaSelect value={empresa} onChange={elegirEmpresa} label="Empresa" soloActivas={false} placeholder="Seleccione un prospecto o cliente" />

                {puedeCrear && (
                    <div className="flex flex-wrap gap-3 md:justify-end">
                        <Button
                            variant="primary"
                            className="flex items-center gap-1.5"
                            disabled={bloqueado}
                            title={bloqueado ? avisoNoRegistrable : undefined}
                            onClick={() => { setMensaje(""); setRegistrando("interaccion"); }}
                        >
                            <MessageSquarePlus size={15} /> Registrar interacción
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex items-center gap-1.5"
                            disabled={bloqueado}
                            title={bloqueado ? avisoNoRegistrable : undefined}
                            onClick={() => { setMensaje(""); setRegistrando("nota"); }}
                        >
                            <StickyNote size={15} /> Registrar nota
                        </Button>
                    </div>
                )}
            </div>

            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {avisoNoRegistrable && puedeCrear && <Notice tone="warning">{avisoNoRegistrable}</Notice>}

            {!empresa && (
                <div className="rounded-2xl px-4 py-10 text-center text-sm" style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.muted, backgroundColor: "#FAFAFA" }}>
                    Seleccione un prospecto o cliente para ver su historial comercial.
                </div>
            )}

            {empresa && !historial && !error && !rangoInvalido && (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando historial...</p>
            )}

            {empresa && historial && claveEmpresa === `${historial.tipoEmpresa}:${historial.idEmpresa}` && (
                <>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h3 className="text-base" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{historial.empresa}</h3>
                        <Pill tone="neutral">{historial.tipoEmpresa}</Pill>
                        <Pill tone={historial.activa ? "positive" : "negative"}>{historial.estado}</Pill>
                    </div>

                    {sinActividad ? (
                        <div className="rounded-2xl px-4 py-10 text-center text-sm" style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.muted, backgroundColor: "#FAFAFA" }}>
                            {api.MENSAJE_SIN_ACTIVIDAD}
                        </div>
                    ) : (
                        <>
                            <HistorialFiltros
                                filtros={filtros}
                                onChange={setFiltros}
                                onLimpiar={() => setFiltros(api.FILTROS_HISTORIAL_VACIOS)}
                                autores={historial.autores}
                                total={historial.movimientos.length}
                                rangoInvalido={rangoInvalido}
                            />
                            {rangoInvalido ? (
                                <Notice tone="error">{api.MENSAJE_RANGO_INVALIDO}</Notice>
                            ) : (
                                <DataTable
                                    layout="table"
                                    columns={columnasConDetalle}
                                    rows={filas}
                                    showSearch={false}
                                    showEstadoFilter={false}
                                    hideInactiveToggle
                                    loading={cargando}
                                    initialPageSize={10}
                                    paginationResetKey={`${claveEmpresa}|${JSON.stringify(filtros)}`}
                                    emptyMessage={api.MENSAJE_SIN_COINCIDENCIAS}
                                />
                            )}
                        </>
                    )}
                </>
            )}

            {registrando === "interaccion" && (
                <InteraccionFormModal
                    empresaInicial={empresa}
                    onClose={() => setRegistrando(null)}
                    onSaved={(r) => alGuardar(r, `La interacción ${r.codigo} con ${r.empresa} se registró y se agregó al historial comercial.`)}
                />
            )}
            {registrando === "nota" && (
                <NotaFormModal
                    empresaInicial={empresa}
                    onClose={() => setRegistrando(null)}
                    onSaved={(r) => alGuardar(r, `La nota ${r.codigo} sobre ${r.empresa} se registró con visibilidad ${r.visibilidad} y se agregó al historial comercial.`)}
                />
            )}
            {detalle && <HistorialDetalleModal movimiento={detalle} empresa={historial?.empresa ?? ""} onClose={() => setDetalle(null)} />}
        </div>
    );
}
