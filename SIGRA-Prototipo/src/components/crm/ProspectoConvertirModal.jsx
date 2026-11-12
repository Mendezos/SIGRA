import { useState } from "react";
import { UserCheck } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmClientesService";
import * as prospectos from "../../services/crmProspectosService";
import { hoyISO } from "./helpers";

// CRMGPSC-019: convierte un prospecto en cliente con su venta inicial. Si ya hay un cliente con los mismos datos se vincula con él.
export default function ProspectoConvertirModal({ prospecto, onClose, onHecho }) {
    const [form, setForm] = useState({ producto: "", cantidad: "1", monto: "", moneda: "CRC", fecha: hoyISO() });
    const [pendientes, setPendientes] = useState([]);
    const [coincidencias, setCoincidencias] = useState([]);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    const marca = (nombre) => (pendientes.some((x) => x.toLowerCase().startsWith(nombre)) ? { ...inputStyle, borderColor: COLORS.red } : inputStyle);

    async function convertir(idClienteExistente = null) {
        setError("");
        setPendientes([]);
        setGuardando(true);
        try {
            const r = await api.convertirProspecto(prospecto.idProspecto, {
                idClienteExistente,
                ventaInicial: {
                    producto: form.producto,
                    cantidad: form.cantidad === "" ? null : Number(form.cantidad),
                    monto: form.monto === "" ? null : Number(form.monto),
                    moneda: form.moneda,
                    fecha: form.fecha || null,
                },
            });
            if (r.resultado === "RequiereVinculo") { setCoincidencias(r.coincidencias); setError(r.mensaje); }
            else onHecho(r);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo convertir el prospecto.");
            setPendientes(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={UserCheck}
            title="Convertir en cliente"
            subtitle={`${prospectos.codigoProspecto(prospecto.idProspecto)} · ${prospecto.empresa}`}
            width="max-w-xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    {coincidencias.length === 0 && (
                        <Button variant="primary" disabled={guardando} onClick={() => convertir()}>{guardando ? "Convirtiendo..." : "Convertir a cliente"}</Button>
                    )}
                </div>
            }
        >
            {error && (
                <Notice tone={coincidencias.length > 0 ? "warning" : "error"}>
                    {error}
                    {pendientes.length > 0 && <ul className="list-disc ml-4 mt-1">{pendientes.map((x) => <li key={x}>{x}</li>)}</ul>}
                </Notice>
            )}

            {coincidencias.length > 0 ? (
                <div>
                    <p className="text-sm mb-3">Elija el cliente con el que se vincula el prospecto. No se crea un cliente nuevo y su historial pasa a ese cliente.</p>
                    <ul className="space-y-2">
                        {coincidencias.map((c) => (
                            <li key={c.idEmpresa} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                                <span>
                                    <strong>{api.codigoCliente(c.idEmpresa)} · {c.empresa}</strong>
                                    <span className="block text-xs" style={{ color: COLORS.muted }}>Coincide: {c.motivoCoincidencia}</span>
                                </span>
                                <Button variant="primary" disabled={guardando} onClick={() => convertir(c.idEmpresa)}>Vincular</Button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <>
                    <p className="text-sm mb-4" style={{ color: COLORS.charcoal }}>
                        El cliente se crea con los datos de la empresa y sus contactos; las cotizaciones, notas, seguimientos e interacciones del prospecto pasan al cliente. Complete la venta inicial.
                    </p>
                    <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); convertir(); }} noValidate>
                        <div className="sm:col-span-2">
                            <FieldLabel label="Producto o servicio *">
                                <input value={form.producto} onChange={cambiar("producto")} maxLength={200} className={inputClass} style={marca("producto")} autoFocus />
                            </FieldLabel>
                        </div>
                        <FieldLabel label="Cantidad *"><input type="number" min="1" value={form.cantidad} onChange={cambiar("cantidad")} className={inputClass} style={marca("cantidad")} /></FieldLabel>
                        <FieldLabel label="Monto *"><input type="number" min="0" step="0.01" value={form.monto} onChange={cambiar("monto")} className={inputClass} style={marca("monto")} /></FieldLabel>
                        <FieldLabel label="Moneda *">
                            <select value={form.moneda} onChange={cambiar("moneda")} className={inputClass} style={marca("moneda")}>
                                <option value="CRC">Colones (CRC)</option>
                                <option value="USD">Dólares (USD)</option>
                            </select>
                        </FieldLabel>
                        <FieldLabel label="Fecha de la venta *"><input type="date" value={form.fecha} max={hoyISO()} onChange={cambiar("fecha")} className={inputClass} style={marca("fecha")} /></FieldLabel>
                    </form>
                </>
            )}
        </Modal>
    );
}
