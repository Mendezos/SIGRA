using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class FacturaFlujo(
    IFacturaDA da,
    IEncuestaFlujo? encuestas = null) : IFacturaFlujo
{
    private static readonly string[] Tipos = ["Venta", "Servicio", "Alquiler"];
    private static readonly string[] EstadosCobro = ["Pagada", "Pendiente", "Irregular"];

    public async Task<FacturaDto> RegistrarAsync(RegistrarFacturaDto dto, int idUsuario)
    {
        var errores = Validar(dto);
        if (errores.Count > 0)
            throw new ValidacionException("Debe completar correctamente los datos de la factura.", errores);

        var subtotal = dto.Lineas.Sum(linea => linea.Total);
        var impuesto = Math.Round(subtotal * 0.13m, 2);

        var factura = await da.RegistrarAsync(new FacturaDto
        {
            IdUsuario = idUsuario,
            Cliente = dto.Cliente.Trim(),
            Tipo = dto.Tipo.Trim(),
            FechaEmision = dto.FechaEmision ?? FechaActualCostaRica(),
            Subtotal = subtotal,
            Impuesto = impuesto,
            Total = subtotal + impuesto,
            Lineas = dto.Lineas
        });

        if (factura.Tipo.Equals("Venta", StringComparison.OrdinalIgnoreCase) &&
            encuestas is not null)
            await encuestas.CrearParaFacturaAsync(factura);

        return factura;
    }

    public Task<List<FacturaDto>> ListarAsync() => da.ListarAsync();

    public async Task<FacturaDto> CambiarEstadoCobroAsync(
        int idFactura,
        CambiarEstadoCobroDto dto,
        int idUsuario)
    {
        var estado = dto.EstadoCobro.Trim();
        if (!EstadosCobro.Contains(estado, StringComparer.OrdinalIgnoreCase))
            throw new ReglaNegocioException("El estado de cobro no es válido.");

        var factura = (await da.ListarAsync()).FirstOrDefault(item => item.IdFactura == idFactura)
            ?? throw new ReglaNegocioException("La factura no existe.");

        var errores = ValidarCambioEstado(dto, estado);
        if (errores.Count > 0)
            throw new ValidacionException("Debe completar correctamente los datos del estado de cobro.", errores);

        factura.EstadoCobro = estado;
        factura.FechaPago = dto.FechaPago;
        factura.MetodoPago = dto.MetodoPago.Trim();
        factura.ReferenciaPago = dto.ReferenciaPago.Trim();
        factura.FechaEsperadaPago = dto.FechaEsperadaPago;
        factura.MontoPendiente = dto.MontoPendiente;
        factura.ProximaFechaRevision = dto.ProximaFechaRevision;
        factura.ObservacionCobro = dto.Observacion.Trim();
        factura.MotivoIrregularidad = dto.Motivo.Trim();

        var actualizada = await da.CambiarEstadoCobroAsync(idFactura, estado)
            ?? throw new ReglaNegocioException("No se pudo actualizar el estado de cobro.");
        await da.GuardarDetalleCobroAsync(idFactura, dto, idUsuario);
        actualizada.FechaPago = factura.FechaPago;
        actualizada.MetodoPago = factura.MetodoPago;
        actualizada.ReferenciaPago = factura.ReferenciaPago;
        actualizada.FechaEsperadaPago = factura.FechaEsperadaPago;
        actualizada.MontoPendiente = factura.MontoPendiente;
        actualizada.ProximaFechaRevision = factura.ProximaFechaRevision;
        actualizada.ObservacionCobro = factura.ObservacionCobro;
        actualizada.MotivoIrregularidad = factura.MotivoIrregularidad;
        return actualizada;
    }

    private static List<string> Validar(RegistrarFacturaDto dto)
    {
        var errores = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.Cliente)) errores.Add("Debe indicar el cliente.");
        if (!Tipos.Contains(dto.Tipo, StringComparer.OrdinalIgnoreCase))
            errores.Add("El tipo debe ser Venta, Servicio o Alquiler.");
        if (dto.FechaEmision.HasValue && dto.FechaEmision.Value > FechaActualCostaRica())
            errores.Add("La fecha de emisión no puede ser futura.");
        if (dto.Lineas is null || dto.Lineas.Count == 0)
            errores.Add("Debe agregar al menos una línea.");

        foreach (var linea in dto.Lineas ?? [])
        {
            if (string.IsNullOrWhiteSpace(linea.Descripcion)) errores.Add("Cada línea debe tener una descripción.");
            if (linea.Cantidad <= 0) errores.Add("La cantidad debe ser mayor que cero.");
            if (linea.PrecioUnitario < 0) errores.Add("El precio unitario no puede ser negativo.");
        }

        if (dto.Lineas?.Sum(linea => linea.Total) <= 0)
            errores.Add("El subtotal debe ser mayor que cero.");
        return errores;
    }

    private static List<string> ValidarCambioEstado(
        CambiarEstadoCobroDto dto,
        string estado)
    {
        var errores = new List<string>();
        if (estado.Equals("Pagada", StringComparison.OrdinalIgnoreCase))
        {
            if (!dto.FechaPago.HasValue) errores.Add("Debe indicar la fecha de pago.");
            if (string.IsNullOrWhiteSpace(dto.MetodoPago)) errores.Add("Debe indicar el método de pago.");
            if (string.IsNullOrWhiteSpace(dto.ReferenciaPago)) errores.Add("Debe indicar la referencia de pago.");
            if (dto.FechaPago > FechaActualCostaRica()) errores.Add("La fecha de pago no puede ser futura.");
        }
        else if (estado.Equals("Pendiente", StringComparison.OrdinalIgnoreCase))
        {
            if (!dto.FechaEsperadaPago.HasValue) errores.Add("Debe indicar la fecha esperada de pago.");
        }
        else
        {
            if (string.IsNullOrWhiteSpace(dto.Motivo)) errores.Add("Debe indicar el motivo de la irregularidad.");
            if (!dto.MontoPendiente.HasValue || dto.MontoPendiente <= 0) errores.Add("Debe indicar un monto pendiente mayor que cero.");
            if (!dto.ProximaFechaRevision.HasValue) errores.Add("Debe indicar la próxima fecha de revisión.");
        }
        return errores;
    }

    private static DateOnly FechaActualCostaRica() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
}
