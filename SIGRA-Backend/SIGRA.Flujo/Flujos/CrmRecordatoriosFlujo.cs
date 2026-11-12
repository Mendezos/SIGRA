using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// CRMGPSC-025 y T-02: recordatorios de baterías y servicio de recordatorios
public class CrmRecordatoriosFlujo(ICrmRecordatoriosDA da, ICrmCatalogosDA catalogos, IAuditoriaDA auditoria, TimeProvider? reloj = null) : ICrmRecordatoriosFlujo
{
    private const string ModuloAuditoria = "CRM";
    private const string EntidadAuditoria = "RecordatorioBateria";
    private const int MaximoCantidad = 9999;
    private static readonly DateTime FechaCompraMinima = new(2000, 1, 1);
    private static readonly string[] EstadosBateria = { "Pendiente", "Notificado", "Atendido", "Cerrado" };
    private static readonly TimeZoneInfo ZonaCostaRica = ObtenerZonaCostaRica();

    private readonly TimeProvider _reloj = reloj ?? TimeProvider.System;

    // Costa Rica no usa horario de verano (UTC-6 todo el año). Se busca la zona por su nombre en Windows y en Linux.
    private static TimeZoneInfo ObtenerZonaCostaRica()
    {
        foreach (var id in new[] { "Central America Standard Time", "America/Costa_Rica" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.CreateCustomTimeZone("Costa Rica", TimeSpan.FromHours(-6), "Costa Rica", "Costa Rica");
    }

    private DateTime HoyCostaRica => TimeZoneInfo.ConvertTime(_reloj.GetUtcNow(), ZonaCostaRica).Date;

    private static string? Normalizar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private static string Codigo(int id) => $"BT-{id:0000}";

    private static string Fecha(DateTime fecha) => fecha.ToString("dd/MM/yyyy");

    // ---------- Consultas ----------
    public Task<List<BateriaModeloDto>> ListarModelosAsync() => da.ListarModelosAsync();

    public Task<List<RecordatorioBateriaDto>> ListarAsync(string? estado, int? idVendedor, string? cliente, DateTime? desde, DateTime? hasta)
    {
        estado = Normalizar(estado);
        if (estado is not null && !EstadosBateria.Contains(estado))
            throw new ReglaNegocioException("El estado indicado no es válido.");

        if (desde is not null && hasta is not null && desde.Value.Date > hasta.Value.Date)
            throw new ReglaNegocioException("La fecha inicial no puede ser posterior a la fecha final.");

        return da.ListarAsync(estado, idVendedor, Normalizar(cliente), desde?.Date, hasta?.Date);
    }

    public async Task<RecordatorioBateriaDto> ObtenerAsync(int idRecordatorio) =>
        await da.ObtenerAsync(idRecordatorio) ?? throw new ReglaNegocioException("El recordatorio indicado no existe.");

    // ---------- CRMGPSC-025: registro de la compra ----------
    public async Task<BateriaRegistroResultadoDto> RegistrarAsync(RegistrarCompraBateriaDto dto, int idUsuario)
    {
        var numeroFactura = Normalizar(dto.NumeroFactura);
        var modeloTexto = Normalizar(dto.ModeloBateria);

        var faltantes = new List<string>();
        if (dto.IdCliente is null) faltantes.Add("Cliente");
        if (dto.IdModelo is null && modeloTexto is null) faltantes.Add("Modelo de la batería");
        if (dto.Cantidad is null) faltantes.Add("Cantidad");
        if (dto.FechaCompra is null) faltantes.Add("Fecha de compra");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar la compra de batería.", faltantes);

        if (numeroFactura is not null && numeroFactura.Length > 30)
            throw new ReglaNegocioException("El número de factura no puede superar los 30 caracteres.");

        if (modeloTexto is not null && modeloTexto.Length > 150)
            throw new ReglaNegocioException("El modelo de la batería no puede superar los 150 caracteres.");

        if (dto.Cantidad!.Value < 1)
            throw new ReglaNegocioException("La cantidad debe ser un número entero mayor o igual a 1.");

        if (dto.Cantidad.Value > MaximoCantidad)
            throw new ReglaNegocioException($"La cantidad no puede superar las {MaximoCantidad:N0} unidades por compra.");

        var fechaCompra = dto.FechaCompra!.Value.Date;
        if (fechaCompra > HoyCostaRica)
            throw new ReglaNegocioException("La fecha de compra no puede ser futura.");

        if (fechaCompra < FechaCompraMinima)
            throw new ReglaNegocioException("La fecha de compra no es válida.");

        var idCliente = dto.IdCliente!.Value;
        var cliente = await catalogos.ObtenerEmpresaAsync(CrmCatalogos.TipoCliente, idCliente)
            ?? throw new ReglaNegocioException("El cliente indicado no existe.");
        if (!cliente.Activa)
            throw new ReglaNegocioException("El cliente está inactivo; no se pueden registrar compras de batería.");

        if (dto.IdContactoEmpresa is { } idContacto)
        {
            var contacto = (await catalogos.ListarContactosAsync(CrmCatalogos.TipoCliente, idCliente, false))
                .FirstOrDefault(c => c.IdContactoEmpresa == idContacto)
                ?? throw new ReglaNegocioException("El contacto indicado no pertenece al cliente.");
            if (!contacto.Activo)
                throw new ReglaNegocioException("El contacto indicado está inactivo.");
        }

        if (dto.IdModelo is { } idModelo)
        {
            var modelos = await da.ListarModelosAsync();
            if (!modelos.Any(m => m.IdModelo == idModelo))
                throw new ReglaNegocioException("El modelo indicado no es una batería del catálogo.");
            // Con un modelo del catálogo, el nombre se toma del catálogo (así dos compras del mismo modelo siempre coinciden).
            modeloTexto = null;
        }

        var vendedores = await catalogos.ListarVendedoresAsync();
        int idVendedor;
        if (dto.IdVendedor is { } elegido)
        {
            if (vendedores.All(v => v.IdUsuario != elegido))
                throw new ReglaNegocioException("El vendedor responsable debe ser un vendedor activo.");
            idVendedor = elegido;
        }
        else if (cliente.IdVendedor is { } delCliente && vendedores.Any(v => v.IdUsuario == delCliente))
            idVendedor = delCliente;
        else if (vendedores.Any(v => v.IdUsuario == idUsuario))
            idVendedor = idUsuario;
        else
            throw new ReglaNegocioException("El cliente no tiene un vendedor activo asignado; seleccione el vendedor responsable.");

        var (id, cerrados) = await da.RegistrarAsync(idCliente, dto.IdContactoEmpresa, dto.IdFactura, numeroFactura,
            dto.IdModelo, modeloTexto, dto.Cantidad.Value, fechaCompra, idVendedor, idUsuario);

        var recordatorio = await ObtenerAsync(id);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, EntidadAuditoria, id, "BATERIA_REGISTRADA",
            $"{Codigo(id)}: {recordatorio.Cliente}, {recordatorio.Cantidad} × {recordatorio.ModeloBateria}, compra {Fecha(recordatorio.FechaCompra)}, " +
            $"recordatorio {Fecha(recordatorio.FechaRecordatorio)}, vendedor {recordatorio.Vendedor}");
        foreach (var anterior in cerrados)
            await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, EntidadAuditoria, anterior, "BATERIA_CERRADA",
                $"{Codigo(anterior)}: Estado: «Abierto» → «Cerrado»; reemplazada por la compra nueva {Codigo(id)} del {Fecha(recordatorio.FechaCompra)}");

        return new BateriaRegistroResultadoDto
        {
            Recordatorio = recordatorio,
            Cerrados = cerrados,
            Mensaje = ConstruirMensajeRegistro(recordatorio, cerrados)
        };
    }

    private static string ConstruirMensajeRegistro(RecordatorioBateriaDto r, List<int> cerrados)
    {
        var mensaje = $"Se registró la compra de batería {r.Codigo}. ";
        if (r.Estado == "Cerrado")
            return mensaje + $"Ya existía una compra más reciente de esa batería ({Codigo(r.IdRecordatorioNuevo ?? 0)}), por lo que este recordatorio quedó cerrado y solo se conserva en el historial.";

        mensaje += $"El recordatorio de reemplazo quedó programado para el {Fecha(r.FechaRecordatorio)} ({CrmCatalogos.MesesRecordatorioBateria} meses después de la compra) y se avisará a {r.Vendedor}.";
        if (cerrados.Count > 0)
            mensaje += $" Se cerró el recordatorio anterior de la misma batería ({string.Join(", ", cerrados.Select(Codigo))}) porque el cliente la reemplazó antes del plazo.";
        return mensaje;
    }

    // ---------- CRMGPSC-025: recordatorio atendido ----------
    public async Task<BateriaAtencionResultadoDto> AtenderAsync(int idRecordatorio, AtenderBateriaDto dto, int idUsuario)
    {
        var medio = Normalizar(dto.Medio);
        var resultado = Normalizar(dto.Resultado);
        var observacion = Normalizar(dto.Observacion);
        var proximoPaso = Normalizar(dto.ProximoPaso);

        var faltantes = new List<string>();
        if (medio is null) faltantes.Add("Medio de contacto");
        if (resultado is null) faltantes.Add("Resultado");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar la atención.", faltantes);

        if (!CrmCatalogos.MediosAtencionBateria.Contains(medio!))
            throw new ReglaNegocioException("El medio de contacto indicado no es válido.");

        if (resultado!.Length > 500)
            throw new ReglaNegocioException("El resultado no puede superar los 500 caracteres.");
        if (observacion is not null && observacion.Length > 1000)
            throw new ReglaNegocioException("La observación no puede superar los 1000 caracteres.");
        if (proximoPaso is not null && proximoPaso.Length > 500)
            throw new ReglaNegocioException("El próximo paso no puede superar los 500 caracteres.");

        // Existe el recordatorio (si no, mensaje claro antes de intentar atenderlo).
        await ObtenerAsync(idRecordatorio);

        var aplicado = await da.AtenderAsync(idRecordatorio, medio!, resultado, observacion, proximoPaso, idUsuario);
        var recordatorio = await ObtenerAsync(idRecordatorio);

        if (!aplicado)
        {
            return new BateriaAtencionResultadoDto
            {
                Recordatorio = recordatorio,
                Aplicado = false,
                Mensaje = $"El recordatorio {recordatorio.Codigo} ya estaba {recordatorio.Estado}; no se modificó."
            };
        }

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, EntidadAuditoria, idRecordatorio, "BATERIA_ATENDIDA",
            $"{recordatorio.Codigo}: Estado: «Abierto» → «Atendido»; Medio: «{medio}»; Resultado: «{resultado}»" +
            (observacion is null ? "" : $"; Observación: «{observacion}»") +
            (proximoPaso is null ? "" : $"; Próximo paso: «{proximoPaso}»"));

        return new BateriaAtencionResultadoDto
        {
            Recordatorio = recordatorio,
            Aplicado = true,
            Mensaje = $"Se registró la atención del recordatorio {recordatorio.Codigo}: quedó Atendido y se conservó el seguimiento."
        };
    }

    // ---------- Integración con facturación ----------
    public async Task<List<BateriaFacturaResultadoDto>> RegistrarDesdeFacturaAsync(int idFactura, int? idUsuario)
    {
        var resultados = await da.RegistrarDesdeFacturaAsync(idFactura, idUsuario);

        foreach (var creado in resultados.Where(r => r is { Resultado: "Creado", IdRecordatorio: not null }))
            await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, EntidadAuditoria, creado.IdRecordatorio, "BATERIA_REGISTRADA",
                $"{Codigo(creado.IdRecordatorio!.Value)}: generado desde la factura {creado.NumeroFactura}, {creado.Cantidad:0.##} × {creado.ModeloBateria}");

        return resultados;
    }

    // ---------- T-02: servicio de recordatorios ----------
    public async Task<ResumenProcesoRecordatoriosDto> ProcesarAsync(int? idUsuario = null)
    {
        var resumen = await da.ProcesarAsync();

        // Solo se audita cuando una persona lo dispara a mano; el proceso automático corre cada pocos minutos y no deja huella por vuelta.
        if (idUsuario is not null)
            await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "RecordatoriosCrm", null, "RECORDATORIOS_PROCESADOS", resumen.Mensaje);

        return resumen;
    }

    public Task<ResumenRecordatoriosDto> ObtenerResumenAsync(int idUsuario) => da.ObtenerResumenAsync(idUsuario);
}
