using SIGRA.Abstracciones.Excepciones;

namespace SIGRA.Flujo.Utilidades;

// Reglas comunes para los archivos adjuntos (PDF, JPG, PNG o XLSX, máximo 10 MB). Además de la extensión se comprueba
// la firma del archivo para detectar ejecutables u otros formatos renombrados con una extensión permitida.
public static class ArchivoAdjuntoValidador
{
    public const int TamanoMaximoBytes = 10 * 1024 * 1024;
    public const string MensajeFormatoNoPermitido = "Formato de archivo no permitido, use PDF, JPG, PNG o XLSX";

    private static readonly Dictionary<string, string> Extensiones = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    // Devuelve el nombre de archivo limpio y su tipo de contenido, o lanza ReglaNegocioException si el archivo no es válido.
    public static (string NombreArchivo, string TipoContenido) Validar(string? nombreArchivo, byte[]? contenido)
    {
        var nombre = Path.GetFileName(string.IsNullOrWhiteSpace(nombreArchivo) ? string.Empty : nombreArchivo.Trim());
        if (nombre.Length == 0 || contenido is null)
            throw new ReglaNegocioException("Debe seleccionar el archivo que desea adjuntar.");

        var extension = Path.GetExtension(nombre);
        if (!Extensiones.TryGetValue(extension, out var tipoContenido))
            throw new ReglaNegocioException(MensajeFormatoNoPermitido);

        if (contenido.Length > TamanoMaximoBytes)
            throw new ReglaNegocioException("El archivo supera el tamaño máximo permitido de 10 MB");

        if (contenido.Length == 0)
            throw new ReglaNegocioException("El archivo seleccionado está vacío.");

        if (!FirmaValida(extension, contenido))
            throw new ReglaNegocioException(MensajeFormatoNoPermitido);

        if (nombre.Length > 255)
            throw new ReglaNegocioException("El nombre del archivo excede la longitud permitida.");

        return (nombre, tipoContenido);
    }

    private static bool FirmaValida(string extension, byte[] datos) => extension.ToLowerInvariant() switch
    {
        ".pdf" => datos.Length >= 5 && datos[0] == 0x25 && datos[1] == 0x50 && datos[2] == 0x44 && datos[3] == 0x46 && datos[4] == 0x2D,
        ".jpg" or ".jpeg" => datos.Length >= 3 && datos[0] == 0xFF && datos[1] == 0xD8 && datos[2] == 0xFF,
        ".png" => datos.Length >= 8 && datos[0] == 0x89 && datos[1] == 0x50 && datos[2] == 0x4E && datos[3] == 0x47,
        ".xlsx" => datos.Length >= 4 && datos[0] == 0x50 && datos[1] == 0x4B && datos[2] == 0x03 && datos[3] == 0x04,
        _ => false
    };
}
