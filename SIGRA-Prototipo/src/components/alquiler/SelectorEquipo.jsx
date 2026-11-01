import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";

/**
 * Lista desplegable para elegir un equipo disponible sin tener que saberse el número de serie.
 * Primero se escoge el tipo (radio portátil, radio móvil, repetidora...) y luego el equipo, que se muestra con
 * su serie, marca, modelo y ubicación.
 *
 * - Con `onAgregar` muestra el botón Agregar (para armar una lista de equipos).
 * - Con `valor` y `onCambiar` funciona como una selección simple (sin botón).
 */
export default function SelectorEquipo({ disponibles, excluidas = [], categoriasPermitidas, onAgregar, valor, onCambiar, textoBoton = "Agregar" }) {
    const [categoria, setCategoria] = useState("");
    const [elegida, setElegida] = useState("");
    const serieElegida = onAgregar ? elegida : (valor ?? "");

    const candidatos = useMemo(() => {
        const fuera = new Set(excluidas.map((s) => s.toLowerCase()));
        return disponibles.filter(
            (d) => !fuera.has(d.numeroSerie.toLowerCase()) && (!categoriasPermitidas || categoriasPermitidas.includes(d.categoria))
        );
    }, [disponibles, excluidas, categoriasPermitidas]);

    const categorias = useMemo(() => [...new Set(candidatos.map((d) => d.categoria))].sort((a, b) => a.localeCompare(b)), [candidatos]);
    const opciones = candidatos.filter((d) => !categoria || d.categoria === categoria);

    function cambiar(serie) {
        if (onAgregar) setElegida(serie);
        else onCambiar?.(serie);
    }

    function agregar() {
        if (!serieElegida) return;
        onAgregar(serieElegida);
        setElegida("");
    }

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                {categorias.length > 1 && (
                    <select
                        value={categoria}
                        onChange={(e) => { setCategoria(e.target.value); cambiar(""); }}
                        aria-label="Tipo de equipo"
                        className={inputClass}
                        style={{ ...inputStyle, width: "auto", minWidth: "10rem" }}
                    >
                        <option value="">Todos los tipos</option>
                        {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}

                <select
                    value={serieElegida}
                    onChange={(e) => cambiar(e.target.value)}
                    aria-label="Equipo disponible"
                    className={inputClass}
                    style={{ ...inputStyle, flex: "1 1 14rem" }}
                >
                    <option value="">{opciones.length === 0 ? "No hay equipos disponibles" : "Seleccione un equipo disponible..."}</option>
                    {opciones.map((d) => (
                        <option key={d.idEquipo} value={d.numeroSerie}>
                            {d.numeroSerie} · {d.marca} {d.modelo}{categorias.length > 1 && !categoria ? ` · ${d.categoria}` : ""}{d.ubicacion ? ` · ${d.ubicacion}` : ""}
                        </option>
                    ))}
                </select>

                {onAgregar && (
                    <Button className="flex items-center gap-1 shrink-0" disabled={!serieElegida} onClick={agregar}>
                        <Plus size={14} /> {textoBoton}
                    </Button>
                )}
            </div>
            <p className="text-xs mt-1.5" style={{ color: COLORS.muted }}>
                {opciones.length} equipo{opciones.length === 1 ? "" : "s"} disponible{opciones.length === 1 ? "" : "s"}
                {categoria ? ` de tipo ${categoria}` : ""}. Al guardar, el inventario los marca como Alquilados.
            </p>
        </div>
    );
}
