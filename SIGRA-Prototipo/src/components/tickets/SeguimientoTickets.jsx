import { useState } from "react";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import StatusBadge from "../StatusBadge";
import * as api from "../../services/ticketsService";

export default function SeguimientoTickets() {
    const [codigo, setCodigo] = useState(""); const [empresa, setEmpresa] = useState(""); const [porCliente, setPorCliente] = useState(false);
    const [resultados, setResultados] = useState(null); const [error, setError] = useState(""); const [cargando, setCargando] = useState(false);
    async function consultar(e) {
        e.preventDefault(); setCargando(true); setError(""); setResultados(null);
        try { setResultados(porCliente ? await api.seguimientoCliente(empresa) : [await api.seguimiento(codigo)]); }
        catch (err) { setError(err.message); setPorCliente(true); }
        finally { setCargando(false); }
    }
    return <section className="border border-[#E3E3E3] rounded-xl p-5 my-6" aria-label="Seguimiento de boletas"><h2 className="font-semibold text-[#323232] mb-1">Consultar una boleta</h2><p className="text-xs text-[#6E6E6E] mb-4">Usá el código del comprobante o buscá el cliente.</p>
        {error && <Notice tone="error">{error}</Notice>}<form className="flex flex-wrap items-end gap-3" onSubmit={consultar}><div className="flex-1 min-w-56"><FieldLabel label={porCliente ? "Empresa o cliente" : "Código de seguimiento"}><input className={inputClass + " w-full"} style={inputStyle} required value={porCliente ? empresa : codigo} minLength={porCliente ? 2 : undefined} onChange={e => porCliente ? setEmpresa(e.target.value) : setCodigo(e.target.value)} /></FieldLabel></div><Button variant="primary" type="submit" disabled={cargando}>{cargando ? "Consultando..." : "Consultar"}</Button><Button onClick={() => { setPorCliente(v => !v); setError(""); setResultados(null); }}>{porCliente ? "Usar código" : "Buscar por cliente"}</Button></form>
        {resultados && <div className="mt-4 space-y-2">{resultados.length === 0 && <p className="text-sm text-[#6E6E6E]">No se encontraron boletas para ese cliente.</p>}{resultados.map(r => <div key={r.numeroBoleta} className="flex flex-wrap gap-3 justify-between p-3 rounded-lg bg-[#FAFAFA]"><div><p className="text-sm font-medium">Boleta {r.numeroBoleta} · {r.empresa}</p><p className="text-xs text-[#6E6E6E]">{r.tipoServicio}</p></div><StatusBadge value={r.estado} /></div>)}</div>}
    </section>;
}
