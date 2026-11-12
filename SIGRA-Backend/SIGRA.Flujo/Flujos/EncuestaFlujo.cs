using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using Microsoft.Extensions.Logging;

namespace SIGRA.Flujo.Flujos;

public class EncuestaFlujo(
    IEncuestaDA da,
    IEncuestaCorreoService correo,
    ILogger<EncuestaFlujo> logger)
    : IEncuestaFlujo
{
    private const int UmbralBajaSatisfaccion = 3;

    public async Task<EncuestaSatisfaccionDto?> CrearParaFacturaAsync(FacturaDto factura)
    {
        if (!factura.Tipo.Equals("Venta", StringComparison.OrdinalIgnoreCase))
            return null;

        var correoCliente = factura.CorreoCliente;
        var creado = await da.CrearAsync(factura, correoCliente);
        if (string.IsNullOrWhiteSpace(correoCliente))
        {
            logger.LogWarning(
                "La factura {NumeroFactura} generó la encuesta {IdEncuesta}, pero el cliente no tiene correo registrado.",
                factura.Numero,
                creado.Encuesta.IdEncuesta);
            return creado.Encuesta;
        }
        try
        {
            await correo.EnviarEnlaceAsync(
                correoCliente,
                factura.Cliente,
                factura.Numero,
                creado.Token,
                creado.Encuesta.FechaVencimiento);

            creado.Encuesta.Estado = "Enviada";
        }
        catch (InvalidOperationException ex)
        {
            logger.LogError(
                ex,
                "La factura {NumeroFactura} se registró, pero no se pudo enviar la encuesta {IdEncuesta}.",
                factura.Numero,
                creado.Encuesta.IdEncuesta);
        }

        return creado.Encuesta;
    }

    public Task<List<EncuestaSatisfaccionDto>> ListarAsync() => da.ListarAsync();

    public async Task<EncuestaPublicaDto> ObtenerPublicaAsync(string token)
    {
        var encuesta = await da.ObtenerPublicaAsync(token)
            ?? throw new ReglaNegocioException("El enlace no es válido, venció o ya fue utilizado.");

        return new EncuestaPublicaDto
        {
            IdEncuesta = encuesta.IdEncuesta,
            NumeroFactura = encuesta.NumeroFactura,
            Cliente = encuesta.Cliente,
            FechaVencimiento = encuesta.FechaVencimiento
        };
    }

    public async Task<RespuestaEncuestaResultadoDto> ResponderAsync(
        string token,
        ResponderEncuestaDto dto)
    {
        if (dto.Calificacion is < 1 or > 5)
            throw new ValidacionException("La calificación no es válida.", ["La calificación debe estar entre 1 y 5."]);
        if (dto.Comentario?.Length > 1000)
            throw new ValidacionException("El comentario no es válido.", ["El comentario no puede superar 1000 caracteres."]);

        return await da.ResponderAsync(token, dto, UmbralBajaSatisfaccion);
    }

    public async Task<ReenvioEncuestaResultadoDto> ReenviarAsync(int idEncuesta)
    {
        var reenvio = await da.ReenviarAsync(idEncuesta)
            ?? throw new ReglaNegocioException("La encuesta no existe o ya fue respondida.");
        var encuesta = reenvio.Encuesta;

        await correo.EnviarEnlaceAsync(
            encuesta.CorreoCliente,
            encuesta.Cliente,
            encuesta.NumeroFactura,
            reenvio.Token,
            encuesta.FechaVencimiento);

        return new ReenvioEncuestaResultadoDto
        {
            Mensaje = "La encuesta fue reenviada correctamente.",
            FechaVencimiento = encuesta.FechaVencimiento
        };
    }

    public Task<HistorialClienteFinancieroDto> ObtenerHistorialClienteAsync(int idCliente)
    {
        if (idCliente <= 0) throw new ReglaNegocioException("El identificador del cliente no es válido.");
        return da.ObtenerHistorialClienteAsync(idCliente);
    }

}
