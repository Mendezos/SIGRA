using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Servicios;

namespace SIGRA.Flujo.Servicios;

/// <summary>Documentos tabulares compartidos, sin dependencias de un módulo ni de servicios externos.</summary>
public class ExportacionService : IExportacionService
{
    private static readonly CultureInfo Cultura = CultureInfo.GetCultureInfo("es-CR");

    public ArchivoExportadoDto Tabla(string titulo, IReadOnlyList<string> columnas, IReadOnlyList<IReadOnlyList<string>> filas, string formato, string nombre)
    {
        if (filas.Count == 0) throw new ReglaNegocioException("No hay datos disponibles para exportar");
        if (columnas.Count == 0 || filas.Any(f => f.Count != columnas.Count)) throw new ReglaNegocioException("El documento no tiene una estructura válida.");
        return formato.ToLowerInvariant() switch
        {
            "pdf" => new() { Contenido = Pdf(titulo, columnas, filas), TipoContenido = "application/pdf", Nombre = nombre + ".pdf" },
            "excel" or "xlsx" => new() { Contenido = Excel(columnas, filas), TipoContenido = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Nombre = nombre + ".xlsx" },
            _ => throw new ReglaNegocioException("Seleccione PDF o Excel para exportar.")
        };
    }

    public ArchivoExportadoDto Comprobante(TicketDetalleDto original)
    {
        var filas = new List<IReadOnlyList<string>>
        {
            new[] { "Boleta", original.NumeroBoleta.ToString(Cultura) },
            new[] { "Código de seguimiento", original.CodigoSeguimiento },
            new[] { "Fecha de ingreso", original.FechaRecepcion.ToOffset(TimeSpan.FromHours(-6)).ToString("dd/MM/yyyy HH:mm", Cultura) },
            new[] { "Empresa o cliente", original.Empresa },
            new[] { "Contacto", original.Contacto },
            new[] { "Teléfono", original.Telefono },
            new[] { "Correo", original.Correo ?? "Sin registro" },
            new[] { "Cargo", original.Cargo ?? "Sin registro" },
            new[] { "Servicio solicitado", original.TipoServicio },
            new[] { "Registrado por", original.RegistradoPor ?? "Sin registro" },
        };
        foreach (var equipo in original.Equipos)
        {
            filas.Add(new[] { "Equipo " + equipo.NumeroSerie, $"{equipo.Marca} {equipo.Modelo} - {equipo.Tipo}" });
            filas.Add(new[] { "Accesorios", equipo.Accesorios.Count > 0 ? string.Join(", ", equipo.Accesorios) : "Sin accesorios" });
            filas.Add(new[] { "Falla indicada", equipo.Problema });
        }
        filas.Add(new[] { "Seguimiento", "Conservá este comprobante. El número y el código identifican todos los equipos de esta visita." });
        return Tabla("RADIFAX - Comprobante de recepción", ["Dato", "Información"], filas, "pdf", "comprobante-boleta-" + original.NumeroBoleta);
    }

    private static byte[] Excel(IReadOnlyList<string> columnas, IReadOnlyList<IReadOnlyList<string>> filas)
    {
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        XNamespace rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        using var memoria = new MemoryStream();
        using (var zip = new ZipArchive(memoria, ZipArchiveMode.Create, true))
        {
            EscribirXml(zip, "[Content_Types].xml", new XDocument(new XElement(XNamespace.Get("http://schemas.openxmlformats.org/package/2006/content-types") + "Types",
                new XElement(XNamespace.Get("http://schemas.openxmlformats.org/package/2006/content-types") + "Default", new XAttribute("Extension", "rels"), new XAttribute("ContentType", "application/vnd.openxmlformats-package.relationships+xml")),
                new XElement(XNamespace.Get("http://schemas.openxmlformats.org/package/2006/content-types") + "Default", new XAttribute("Extension", "xml"), new XAttribute("ContentType", "application/xml")),
                new XElement(XNamespace.Get("http://schemas.openxmlformats.org/package/2006/content-types") + "Override", new XAttribute("PartName", "/xl/workbook.xml"), new XAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml")),
                new XElement(XNamespace.Get("http://schemas.openxmlformats.org/package/2006/content-types") + "Override", new XAttribute("PartName", "/xl/worksheets/sheet1.xml"), new XAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml")),
                new XElement(XNamespace.Get("http://schemas.openxmlformats.org/package/2006/content-types") + "Override", new XAttribute("PartName", "/xl/styles.xml"), new XAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml")))));
            EscribirXml(zip, "_rels/.rels", Relaciones(("rId1", "officeDocument", "xl/workbook.xml")));
            EscribirXml(zip, "xl/_rels/workbook.xml.rels", Relaciones(("rId1", "worksheet", "worksheets/sheet1.xml"), ("rId2", "styles", "styles.xml")));
            EscribirXml(zip, "xl/workbook.xml", new XDocument(new XElement(ns + "workbook", new XAttribute(XNamespace.Xmlns + "r", rel),
                new XElement(ns + "sheets", new XElement(ns + "sheet", new XAttribute("name", "Reporte"), new XAttribute("sheetId", "1"), new XAttribute(rel + "id", "rId1"))))));
            var datos = new XElement(ns + "sheetData");
            var todas = new List<IReadOnlyList<string>> { columnas }; todas.AddRange(filas);
            for (var r = 0; r < todas.Count; r++)
            {
                var fila = new XElement(ns + "row", new XAttribute("r", r + 1));
                for (var c = 0; c < columnas.Count; c++)
                    fila.Add(new XElement(ns + "c", new XAttribute("r", Columna(c) + (r + 1)), new XAttribute("t", "inlineStr"), new XAttribute("s", r == 0 ? 1 : 0),
                        new XElement(ns + "is", new XElement(ns + "t", new XAttribute(XNamespace.Xml + "space", "preserve"), LimpiarXml(todas[r][c])))));
                datos.Add(fila);
            }
            EscribirXml(zip, "xl/worksheets/sheet1.xml", new XDocument(new XElement(ns + "worksheet",
                new XElement(ns + "sheetViews", new XElement(ns + "sheetView", new XAttribute("workbookViewId", "0"), new XElement(ns + "pane", new XAttribute("ySplit", "1"), new XAttribute("topLeftCell", "A2"), new XAttribute("state", "frozen")))),
                new XElement(ns + "cols", Enumerable.Range(1, columnas.Count).Select(c => new XElement(ns + "col", new XAttribute("min", c), new XAttribute("max", c), new XAttribute("width", "32"), new XAttribute("customWidth", "1")))),
                datos, new XElement(ns + "autoFilter", new XAttribute("ref", "A1:" + Columna(columnas.Count - 1) + todas.Count)))));
            EscribirXml(zip, "xl/styles.xml", new XDocument(new XElement(ns + "styleSheet",
                new XElement(ns + "fonts", new XAttribute("count", "2"), new XElement(ns + "font", new XElement(ns + "sz", new XAttribute("val", "11")), new XElement(ns + "name", new XAttribute("val", "Calibri"))), new XElement(ns + "font", new XElement(ns + "b"), new XElement(ns + "sz", new XAttribute("val", "11")))),
                new XElement(ns + "fills", new XAttribute("count", "2"), new XElement(ns + "fill", new XElement(ns + "patternFill", new XAttribute("patternType", "none"))), new XElement(ns + "fill", new XElement(ns + "patternFill", new XAttribute("patternType", "gray125")))),
                new XElement(ns + "borders", new XAttribute("count", "1"), new XElement(ns + "border")),
                new XElement(ns + "cellStyleXfs", new XAttribute("count", "1"), new XElement(ns + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "0"), new XAttribute("fillId", "0"), new XAttribute("borderId", "0"))),
                new XElement(ns + "cellXfs", new XAttribute("count", "2"), new XElement(ns + "xf", new XAttribute("xfId", "0"), new XElement(ns + "alignment", new XAttribute("wrapText", "1"), new XAttribute("vertical", "top"))), new XElement(ns + "xf", new XAttribute("xfId", "0"), new XAttribute("fontId", "1"), new XAttribute("applyFont", "1"), new XElement(ns + "alignment", new XAttribute("wrapText", "1")))),
                new XElement(ns + "cellStyles", new XAttribute("count", "1"), new XElement(ns + "cellStyle", new XAttribute("name", "Normal"), new XAttribute("xfId", "0"), new XAttribute("builtinId", "0"))))));
        }
        return memoria.ToArray();
    }

    private static XDocument Relaciones(params (string Id, string Tipo, string Destino)[] relaciones)
    {
        XNamespace n = "http://schemas.openxmlformats.org/package/2006/relationships";
        return new(new XElement(n + "Relationships", relaciones.Select(r => new XElement(n + "Relationship", new XAttribute("Id", r.Id), new XAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/" + r.Tipo), new XAttribute("Target", r.Destino)))));
    }
    private static void EscribirXml(ZipArchive zip, string nombre, XDocument documento)
    { using var archivo = zip.CreateEntry(nombre).Open(); documento.Save(archivo); }
    private static string LimpiarXml(string valor) => new(valor.Where(c => !char.IsControl(c) || c is '\n' or '\r' or '\t').ToArray());
    private static string Columna(int indice)
    {
        var nombre = "";
        for (var n = indice + 1; n > 0; n = (n - 1) / 26) nombre = (char)('A' + (n - 1) % 26) + nombre;
        return nombre;
    }

    private static byte[] Pdf(string titulo, IReadOnlyList<string> columnas, IReadOnlyList<IReadOnlyList<string>> filas)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        var encoding = Encoding.GetEncoding(1252);
        var ancho = columnas.Count > 4 ? 842.0 : 595.0; var alto = columnas.Count > 4 ? 595.0 : 842.0;
        var celda = (ancho - 64) / columnas.Count;
        var paginas = new List<StringBuilder>(); StringBuilder pagina = null!; double y = 0;
        static string Numero(double n) => n.ToString("0.##", CultureInfo.InvariantCulture);
        static string Escapar(string s) => s.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)").Replace("₡", "CRC");
        void Texto(double x, double filaY, string texto, bool negrita = false, double tamano = 9)
            => pagina.Append($"BT /{(negrita ? "F2" : "F1")} {Numero(tamano)} Tf 0.16 0.2 0.16 rg 1 0 0 1 {Numero(x)} {Numero(filaY)} Tm ({Escapar(texto)}) Tj ET\n");
        void NuevaPagina()
        {
            pagina = new StringBuilder(); paginas.Add(pagina); y = alto - 40;
            Texto(32, y, titulo, true, 16); y -= 30;
            pagina.Append($"0.918 0.965 0.91 rg 32 {Numero(y - 8)} {Numero(ancho - 64)} 22 re f\n");
            for (var i = 0; i < columnas.Count; i++) Texto(36 + i * celda, y, columnas[i], true);
            y -= 28;
        }
        NuevaPagina();
        foreach (var fila in filas)
        {
            var celdas = fila.Select(t => Envolver(t, celda - 12)).ToArray();
            var lineas = celdas.Max(c => c.Count);
            var alturaFila = lineas * 13 + 9;
            if (alturaFila <= alto - 143 && y - alturaFila < 45) NuevaPagina();
            for (var l = 0; l < lineas; l++)
            {
                if (y < 45) NuevaPagina();
                for (var c = 0; c < columnas.Count; c++) if (l < celdas[c].Count) Texto(36 + c * celda, y, celdas[c][l]);
                y -= 13;
            }
            pagina.Append($"0.88 0.88 0.88 RG 0.4 w 32 {Numero(y + 3)} m {Numero(ancho - 32)} {Numero(y + 3)} l S\n"); y -= 9;
        }
        for (var p = 0; p < paginas.Count; p++)
        { pagina = paginas[p]; Texto(32, 22, $"RADIFAX | Página {p + 1} de {paginas.Count}", false, 8); }
        var objetos = new List<byte[]> { encoding.GetBytes("<< /Type /Catalog /Pages 2 0 R >>"), Array.Empty<byte>(),
            encoding.GetBytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
            encoding.GetBytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>") };
        var ids = new List<int>();
        foreach (var contenido in paginas)
        {
            var id = objetos.Count + 1; ids.Add(id);
            objetos.Add(encoding.GetBytes($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {Numero(ancho)} {Numero(alto)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {id + 1} 0 R >>"));
            var cuerpo = encoding.GetBytes(contenido.ToString());
            using var stream = new MemoryStream(); stream.Write(encoding.GetBytes($"<< /Length {cuerpo.Length} >>\nstream\n")); stream.Write(cuerpo); stream.Write(encoding.GetBytes("endstream")); objetos.Add(stream.ToArray());
        }
        objetos[1] = encoding.GetBytes($"<< /Type /Pages /Count {ids.Count} /Kids [{string.Join(" ", ids.Select(id => id + " 0 R"))}] >>");
        using var salida = new MemoryStream(); salida.Write(encoding.GetBytes("%PDF-1.4\n%âãÏÓ\n")); var posiciones = new List<long>();
        for (var i = 0; i < objetos.Count; i++)
        { posiciones.Add(salida.Position); salida.Write(encoding.GetBytes($"{i + 1} 0 obj\n")); salida.Write(objetos[i]); salida.Write(encoding.GetBytes("\nendobj\n")); }
        var xref = salida.Position; salida.Write(encoding.GetBytes($"xref\n0 {objetos.Count + 1}\n0000000000 65535 f \n"));
        foreach (var pos in posiciones) salida.Write(encoding.GetBytes(pos.ToString("D10", CultureInfo.InvariantCulture) + " 00000 n \n"));
        salida.Write(encoding.GetBytes($"trailer\n<< /Size {objetos.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"));
        return salida.ToArray();
    }

    // Advance widths of the standard Helvetica font (points per 1000 units).
    private static readonly int[] AnchosHelvetica = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
        556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,
        667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
        278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
    private static double AnchoTexto(string texto)
    {
        var total = 0;
        foreach (var letra in texto.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(letra) == UnicodeCategory.NonSpacingMark) continue;
            total += letra is >= ' ' and <= '~' ? AnchosHelvetica[letra - ' '] : 944;
        }
        return total * 9.0 / 1000.0;
    }
    private static List<string> Envolver(string texto, double ancho)
    {
        var resultado = new List<string>();
        foreach (var parrafo in texto.Replace("\r", "").Replace("₡", "CRC").Split('\n'))
        {
            var linea = "";
            foreach (var palabra in parrafo.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                if (linea.Length > 0 && AnchoTexto(linea + " " + palabra) > ancho) { resultado.Add(linea); linea = ""; }
                var restante = palabra;
                while (AnchoTexto(restante) > ancho)
                {
                    var corte = 1;
                    while (corte < restante.Length && AnchoTexto(restante[..(corte + 1)]) <= ancho) corte++;
                    resultado.Add(restante[..corte]); restante = restante[corte..];
                }
                linea = linea.Length == 0 ? restante : linea + " " + restante;
            }
            resultado.Add(linea);
        }
        return resultado;
    }
}
