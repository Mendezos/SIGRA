// Colores de los gráficos del sistema, validados para que se distingan también con daltonismo (orden fijo: no se ciclan).
export const PALETA = ["#3F9B37", "#2A78D6", "#EB6834", "#4A3AA7", "#D55181", "#EDA100"];

// El color sigue a la cosa, no a su posición: un mismo estado se pinta igual en todos los gráficos.
export const ESTADO_EQUIPO = { Disponibles: "#3F9B37", Alquilados: "#2A78D6", EnTaller: "#EB6834" };

// Colores reservados para avisos (siempre acompañados de ícono y texto).
export const AVISO = { bien: "#2E7D32", atencion: "#B7791F", critico: "#C0392B" };
