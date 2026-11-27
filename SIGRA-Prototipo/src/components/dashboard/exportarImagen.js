// Descarga como PNG el gráfico (SVG) que está dentro de un contenedor, con su título arriba (DAR-020).
export function exportarGraficoComoImagen(contenedor, titulo, archivo) {
    const svg = contenedor?.querySelector(".recharts-wrapper svg");
    if (!svg) return false;
    const { width, height } = svg.getBoundingClientRect();
    const copia = svg.cloneNode(true);
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copia.setAttribute("width", width);
    copia.setAttribute("height", height);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml;charset=utf-8" }));
    const imagen = new Image();
    imagen.onload = () => {
        const escala = 2;
        const lienzo = document.createElement("canvas");
        lienzo.width = (width + 32) * escala;
        lienzo.height = (height + 56) * escala;
        const ctx = lienzo.getContext("2d");
        ctx.scale(escala, escala);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width + 32, height + 56);
        ctx.fillStyle = "#323232";
        ctx.font = "600 15px Arial, sans-serif";
        ctx.fillText(titulo, 16, 28);
        ctx.drawImage(imagen, 16, 40, width, height);
        URL.revokeObjectURL(url);
        const enlace = document.createElement("a");
        enlace.download = archivo;
        enlace.href = lienzo.toDataURL("image/png");
        enlace.click();
    };
    imagen.src = url;
    return true;
}
