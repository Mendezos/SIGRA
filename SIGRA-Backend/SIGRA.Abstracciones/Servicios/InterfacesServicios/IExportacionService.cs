using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Servicios;

public interface IExportacionService
{
    ArchivoExportadoDto Tabla(string titulo, IReadOnlyList<string> columnas, IReadOnlyList<IReadOnlyList<string>> filas, string formato, string nombre);
    ArchivoExportadoDto Comprobante(TicketDetalleDto original);
}

public interface ICorreosPendientesService
{
    Task<bool> EnviarAhoraAsync(long? idCorreo = null);
}
