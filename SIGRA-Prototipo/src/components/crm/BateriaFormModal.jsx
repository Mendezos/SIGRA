import { useEffect, useRef, useState } from "react";
import { BatteryCharging } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmRecordatoriosService";
import ContactoSelect from "./ContactoSelect";
import EmpresaSelect from "./EmpresaSelect";
import { fechaLocal, hoyISO } from "./helpers";

const soloLectura = { ...inputStyle, backgroundColor: COLORS.greenTint };
const OTRO_MODELO = "otro";

// Mismos mensajes que devuelve el servidor, para avisar antes de enviar.
const MENSAJE_OBLIGATORIOS = "Debe completar los campos obligatorios para registrar la compra de batería.";
const MENSAJE_CANTIDAD = "La cantidad debe ser un número entero mayor o igual a 1.";
const MENSAJE_FECHA_FUTURA = "La fecha de compra no puede ser futura.";
const MENSAJE_FECHA_INVALIDA = "La fecha de compra no es válida.";

// Registro de la compra de una batería (CRMGPSC-025). Al guardar se programa el recordatorio de reemplazo a los 11 meses y, si el
// cliente ya tenía uno abierto de la misma batería, se cierra (cambio anticipado).
export default function BateriaFormModal({ onClose, onSaved }) {
    const [empresa, setEmpresa] = useState(null);
    const [form, setForm] = useState({ idContactoEmpresa: null, numeroFactura: "", modelo: "", modeloTexto: "", cantidad: "1", fechaCompra: hoyISO(), idVendedor: "" });
    const [modelos, setModelos] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    useEffect(() => {
        let activo = true;
        api.listarModelosBateria()
            .then((lista) => activo && setModelos(lista))
            .catch(() => activo && setError("No se pudo cargar el catálogo de baterías."));
        catalogos
            .listarVendedores()
            .then((lista) => activo && setVendedores(lista))
            .catch(() => activo && setError("No se pudieron cargar los vendedores."));
        return () => {
            activo = false;
        };
    }, []);

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    const fechaRecordatorio = form.fechaCompra ? api.sumarMeses(form.fechaCompra) : "";

    function cambiarEmpresa(valor) {
        setEmpresa(valor);
        setForm((f) => ({ ...f, idContactoEmpresa: null }));
    }

    async function guardar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        setErrores([]);

        const usaTexto = form.modelo === OTRO_MODELO;
        const faltantes = [];
        if (!empresa) faltantes.push("Cliente");
        if (!form.modelo || (usaTexto && !form.modeloTexto.trim())) faltantes.push("Modelo de la batería");
        if (form.cantidad === "") faltantes.push("Cantidad");
        if (!form.fechaCompra) faltantes.push("Fecha de compra");
        if (faltantes.length > 0) {
            setError(MENSAJE_OBLIGATORIOS);
            setErrores(faltantes);
            return;
        }

        const cantidad = Number(form.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) return setError(MENSAJE_CANTIDAD);
        if (cantidad > api.LIMITES_BATERIA.cantidadMaxima) return setError(`La cantidad no puede superar las ${api.LIMITES_BATERIA.cantidadMaxima.toLocaleString("es-CR")} unidades por compra.`);
        if (form.fechaCompra > hoyISO()) return setError(MENSAJE_FECHA_FUTURA);
        if (form.fechaCompra < "2000-01-01") return setError(MENSAJE_FECHA_INVALIDA);

        enviando.current = true;
        setGuardando(true);
        try {
            const resultado = await api.registrarCompraBateria({
                idCliente: empresa.idEmpresa,
                idContactoEmpresa: form.idContactoEmpresa,
                numeroFactura: form.numeroFactura.trim() || null,
                idModelo: usaTexto ? null : Number(form.modelo),
                modeloBateria: usaTexto ? form.modeloTexto.trim() : null,
                cantidad,
                fechaCompra: form.fechaCompra,
                idVendedor: form.idVendedor ? Number(form.idVendedor) : null,
            });
            onSaved(resultado);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar la compra de la batería.");
            setErrores(err.errores ?? []);
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={BatteryCharging}
            title="Registrar compra de batería"
            subtitle="Programa el aviso para ofrecer el reemplazo cuando se cumplan 11 meses desde la compra."
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-bateria" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar compra"}
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

            <form id="form-bateria" onSubmit={guardar} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EmpresaSelect tipo={catalogos.TIPO_CLIENTE} value={empresa} onChange={cambiarEmpresa} label="Cliente *" placeholder="Seleccione el cliente" />
                <ContactoSelect
                    tipo={empresa?.tipo}
                    idEmpresa={empresa?.idEmpresa}
                    value={form.idContactoEmpresa}
                    onChange={(id) => setForm((f) => ({ ...f, idContactoEmpresa: id }))}
                    vacio="Contacto principal del cliente"
                />

                <FieldLabel label="Modelo de la batería *">
                    <select value={form.modelo} onChange={set("modelo")} className={inputClass} style={inputStyle}>
                        <option value="">Seleccione el modelo</option>
                        {modelos.map((m) => <option key={m.idModelo} value={m.idModelo}>{m.nombre}</option>)}
                        <option value={OTRO_MODELO}>Otro modelo (escribirlo)</option>
                    </select>
                </FieldLabel>
                <FieldLabel label="Número de factura">
                    <input value={form.numeroFactura} onChange={set("numeroFactura")} maxLength={api.LIMITES_BATERIA.factura} placeholder="Ej. FAC-2026-0145" className={inputClass} style={inputStyle} />
                </FieldLabel>
                {form.modelo === OTRO_MODELO && (
                    <div className="md:col-span-2">
                        <FieldLabel label="Modelo de la batería (texto) *">
                            <input value={form.modeloTexto} onChange={set("modeloTexto")} maxLength={api.LIMITES_BATERIA.modelo} placeholder="Ej. Motorola NNTN8128" className={inputClass} style={inputStyle} />
                        </FieldLabel>
                    </div>
                )}

                <FieldLabel label="Cantidad *">
                    <input type="number" min={1} max={api.LIMITES_BATERIA.cantidadMaxima} step={1} value={form.cantidad} onChange={set("cantidad")} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Fecha de compra *">
                    <input type="date" value={form.fechaCompra} max={hoyISO()} onChange={set("fechaCompra")} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <FieldLabel label={`Fecha del recordatorio (compra + ${catalogos.MESES_RECORDATORIO_BATERIA} meses)`}>
                    <input
                        value={fechaRecordatorio ? fechaLocal(fechaRecordatorio) : "Se calcula al indicar la fecha de compra"}
                        readOnly
                        className={inputClass}
                        style={soloLectura}
                    />
                </FieldLabel>
                <FieldLabel label="Vendedor responsable">
                    <select value={form.idVendedor} onChange={set("idVendedor")} className={inputClass} style={inputStyle}>
                        <option value="">{empresa?.vendedor ? `Vendedor del cliente (${empresa.vendedor})` : "Vendedor del cliente (o yo, si soy vendedor)"}</option>
                        {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                    </select>
                </FieldLabel>

                <p className="md:col-span-2 text-xs" style={{ color: COLORS.muted }}>
                    Al llegar la fecha del recordatorio, el sistema avisa por la campana (y por correo) al vendedor responsable con el cliente, contacto,
                    batería, cantidad, fecha de compra y factura. Si el cliente compra otra vez la misma batería antes del plazo, el recordatorio anterior se
                    cierra y se calcula uno nuevo desde la nueva fecha.
                </p>
            </form>
        </Modal>
    );
}
