using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class NotaCreditoFlujo(INotaCreditoDA da, IFacturaDA facturaDa) : INotaCreditoFlujo
{
    public async Task<NotaCreditoDto> RegistrarAsync(RegistrarNotaCreditoDto dto, int idUsuario)
    {
        var factura = (await facturaDa.ListarAsync())
            .FirstOrDefault(item => item.IdFactura == dto.IdFactura);
        var errores = Validar(dto, factura);
        if (errores.Count > 0)
            throw new ValidacionException("Debe completar correctamente los datos de la nota de crédito.", errores);

        return await da.RegistrarAsync(new NotaCreditoDto
        {
            IdUsuario = idUsuario,
            IdFactura = factura!.IdFactura,
            Factura = factura.Numero,
            Cliente = factura.Cliente,
            FechaEmision = dto.FechaEmision ?? FechaActualCostaRica(),
            Motivo = dto.Motivo.Trim(),
            Monto = dto.Monto,
            Estado = "Pendiente"
        });
    }

    public Task<List<NotaCreditoDto>> ListarAsync() => da.ListarAsync();

    private static List<string> Validar(RegistrarNotaCreditoDto dto, FacturaDto? factura)
    {
        var errores = new List<string>();
        if (factura is null) errores.Add("Debe seleccionar una factura válida.");
        if (factura?.EstadoCobro.Equals("Anulada", StringComparison.OrdinalIgnoreCase) == true)
            errores.Add("No se puede registrar una nota para una factura anulada.");
        if (string.IsNullOrWhiteSpace(dto.Motivo)) errores.Add("Debe indicar el motivo.");
        if (dto.Monto <= 0) errores.Add("El monto debe ser mayor que cero.");
        if (factura is not null && dto.Monto > factura.Total)
            errores.Add("El monto no puede superar el total de la factura.");
        if (dto.FechaEmision.HasValue && dto.FechaEmision.Value > FechaActualCostaRica())
            errores.Add("La fecha de emisión no puede ser futura.");
        return errores;
    }

    private static DateOnly FechaActualCostaRica() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
}
