using System.Text.RegularExpressions;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class AlquilerFlujo : IAlquilerFlujo
{
    private const string ModuloAuditoria = "Alquiler";
    private const string MensajeEquipoNoDisponible = "El equipo seleccionado no se encuentra disponible en el inventario.";
    private static readonly string[] CategoriasRadio = { "Radio portátil", "Radio móvil" };
    private static readonly Regex PatronCorreo = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex PatronTelefono = new(@"^[0-9+\-\s()]{7,20}$", RegexOptions.Compiled);

    private readonly IAlquilerDA _alquilerDA;
    private readonly IInventarioDA _inventarioDA;
    private readonly IAuditoriaDA _auditoriaDA;

    public AlquilerFlujo(IAlquilerDA alquilerDA, IInventarioDA inventarioDA, IAuditoriaDA auditoriaDA)
    {
        _alquilerDA = alquilerDA;
        _inventarioDA = inventarioDA;
        _auditoriaDA = auditoriaDA;
    }

    // ---------- CARR-001: contacto inicial ----------
    public Task<List<VendedorDto>> ListarVendedoresAsync() => _alquilerDA.ListarVendedoresAsync();

    public async Task<SugerenciaContactoDto> ObtenerSugerenciaContactoAsync(string empresa)
    {
        if (string.IsNullOrWhiteSpace(empresa)) return new SugerenciaContactoDto();

        var nombre = empresa.Trim();
        return new SugerenciaContactoDto
        {
            VendedorPrevio = await _alquilerDA.ObtenerVendedorPrevioAsync(nombre),
            ContactoReciente = await _alquilerDA.ObtenerContactoRecienteAsync(nombre)
        };
    }

    public async Task<RegistrarContactoResultadoDto> RegistrarContactoAsync(RegistrarContactoDto dto, int idUsuario)
    {
        var empresa = Normalizar(dto.Empresa);
        var dato = Normalizar(dto.DatoContacto);

        if (empresa is null || dato is null)
            throw new ReglaNegocioException("Debe ingresar al menos el nombre de la empresa y un medio de contacto.");

        if (dto.MedioContacto is not ("Teléfono" or "Correo"))
            throw new ReglaNegocioException("El medio de contacto debe ser Teléfono o Correo.");

        if (dto.MedioContacto == "Correo" && !PatronCorreo.IsMatch(dato))
            throw new ReglaNegocioException("El correo del contacto no tiene un formato válido.");

        if (dto.MedioContacto == "Teléfono" && !PatronTelefono.IsMatch(dato))
            throw new ReglaNegocioException("El teléfono del contacto no tiene un formato válido.");

        if (empresa.Length > 150 || dato.Length > 150 || (dto.Contacto?.Length ?? 0) > 150 || (dto.Motivo?.Length ?? 0) > 500)
            throw new ReglaNegocioException("Alguno de los datos excede la longitud permitida.");

        if (!dto.ConfirmarDuplicado)
        {
            var reciente = await _alquilerDA.ObtenerContactoRecienteAsync(empresa);
            if (reciente is not null)
            {
                return new RegistrarContactoResultadoDto
                {
                    RequiereConfirmacion = true,
                    ContactoReciente = reciente,
                    Mensaje = $"Ya existe un contacto de {empresa} registrado en las últimas 24 horas. ¿Desea registrar uno nuevo de todas formas?"
                };
            }
        }

        int? idVendedor = null;
        string? motivoAsignacion = null;

        if (dto.IdVendedor is not null)
        {
            var activos = await _alquilerDA.ListarVendedoresAsync();
            if (!activos.Any(v => v.IdUsuario == dto.IdVendedor))
                throw new ReglaNegocioException("El vendedor indicado no está disponible.");

            idVendedor = dto.IdVendedor;
            motivoAsignacion = "Vendedor que atendió al cliente en contratos anteriores";
        }
        else
        {
            var siguiente = await _alquilerDA.ObtenerSiguienteVendedorCascadaAsync();
            if (siguiente is not null)
            {
                idVendedor = siguiente.IdUsuario;
                motivoAsignacion = "Asignación en cascada";
            }
        }

        var idContacto = await _alquilerDA.InsertarContactoAsync(empresa, Normalizar(dto.Contacto), dto.MedioContacto, dato,
            Normalizar(dto.Motivo), idVendedor, motivoAsignacion, idUsuario);

        var detalle = await ObtenerContactoAsync(idContacto);

        if (idVendedor is null)
        {
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoInicial", idContacto, "CONTACTO_SIN_VENDEDOR",
                $"{empresa}: no hay vendedores disponibles; queda en espera de asignación manual");
        }
        else
        {
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoInicial", idContacto, "CONTACTO_REGISTRADO",
                $"{empresa} asignado a {detalle.Contacto.Vendedor}");
        }

        return new RegistrarContactoResultadoDto
        {
            Contacto = detalle.Contacto,
            Mensaje = idVendedor is null
                ? "El contacto se registró sin vendedor porque no hay vendedores disponibles. Quedó en espera para que el administrador lo asigne."
                : $"El contacto se registró y se asignó a {detalle.Contacto.Vendedor}."
        };
    }

    public Task<List<ContactoDto>> ListarContactosAsync(int? idVendedor) => _alquilerDA.ListarContactosAsync(idVendedor);

    public async Task<DetalleContactoDto> ObtenerContactoAsync(int idContacto)
    {
        var contacto = (await _alquilerDA.ListarContactosAsync(null)).FirstOrDefault(c => c.IdContacto == idContacto)
            ?? throw new ReglaNegocioException("El contacto indicado no existe.");

        return new DetalleContactoDto
        {
            Contacto = contacto,
            Historial = await _alquilerDA.ObtenerHistorialContactoAsync(idContacto)
        };
    }

    public async Task<DetalleContactoDto> ReasignarContactoAsync(int idContacto, ReasignarContactoDto dto, int idUsuario)
    {
        if (!await _alquilerDA.ExisteContactoAsync(idContacto))
            throw new ReglaNegocioException("El contacto indicado no existe.");

        var motivo = Normalizar(dto.Motivo);
        if (dto.IdVendedor is null || motivo is null)
            throw new ValidacionException("Debe completar los campos obligatorios.", new List<string> { "Vendedor", "Motivo del cambio" });

        if (motivo.Length > 300)
            throw new ReglaNegocioException("El motivo no puede superar los 300 caracteres.");

        var activos = await _alquilerDA.ListarVendedoresAsync();
        var vendedor = activos.FirstOrDefault(v => v.IdUsuario == dto.IdVendedor)
            ?? throw new ReglaNegocioException("Solo se puede reasignar a un vendedor disponible.");

        await _alquilerDA.ReasignarContactoAsync(idContacto, vendedor.IdUsuario, idUsuario, motivo);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoInicial", idContacto, "CONTACTO_REASIGNADO",
            $"Asignado a {vendedor.Nombre}. {motivo}");

        return await ObtenerContactoAsync(idContacto);
    }

    // ---------- CARR-002 / CARR-014: contratos ----------
    public Task<List<ClienteDto>> ListarClientesAsync() => _alquilerDA.ListarClientesAsync();

    public Task<List<EquipoDisponibleDto>> ListarEquiposParaContratoAsync() => _alquilerDA.ListarEquiposParaContratoAsync();

    public async Task<DetalleContratoDto> RegistrarContratoAsync(RegistrarContratoDto dto, int? idVendedor, int idUsuario)
    {
        var empresa = Normalizar(dto.Empresa);
        var series = (dto.Series ?? new List<string>())
            .Select(s => s?.Trim() ?? string.Empty)
            .Where(s => s.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var faltantes = new List<string>();
        if (empresa is null) faltantes.Add("Empresa cliente");
        if (series.Count == 0) faltantes.Add("Equipo (número de serie)");
        if (dto.FechaInicio is null) faltantes.Add("Fecha de inicio");
        if (dto.FechaVencimiento is null) faltantes.Add("Fecha de vencimiento");
        if (dto.MontoMensual is null) faltantes.Add("Monto mensual");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar el contrato.", faltantes);

        if (empresa!.Length > 150)
            throw new ReglaNegocioException("El nombre de la empresa no puede superar los 150 caracteres.");

        if (dto.FechaVencimiento!.Value.Date <= dto.FechaInicio!.Value.Date)
            throw new ReglaNegocioException("La fecha de vencimiento debe ser posterior a la fecha de inicio del contrato.");

        if (dto.MontoMensual <= 0)
            throw new ReglaNegocioException("El monto mensual debe ser un valor numérico mayor a cero.");

        var idsEquipo = new List<int>();
        foreach (var serie in series)
        {
            var equipo = await _inventarioDA.ObtenerEquipoAsync(null, serie)
                ?? throw new ReglaNegocioException($"El número de serie ingresado no existe en el inventario ({serie}).");

            if (equipo.Estado != "Disponible")
                throw new ReglaNegocioException($"{MensajeEquipoNoDisponible.TrimEnd('.')} ({serie}: {equipo.Estado}).");

            if (equipo.ManejaCantidad)
                throw new ReglaNegocioException($"El equipo {serie} se maneja por cantidad; los accesorios se asocian al contrato por separado.");

            idsEquipo.Add(equipo.IdEquipo);
        }

        var idContrato = await _alquilerDA.InsertarContratoAsync(empresa, dto.FechaInicio.Value.Date, dto.FechaVencimiento.Value.Date,
                dto.MontoMensual.Value, Normalizar(dto.Condiciones), idVendedor, idsEquipo, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "CONTRATO_REGISTRADO",
            $"{empresa}: {idsEquipo.Count} equipo(s), {dto.FechaInicio:yyyy-MM-dd} a {dto.FechaVencimiento:yyyy-MM-dd}");

        return await ObtenerContratoAsync(idContrato);
    }

    public Task<List<ContratoDto>> ListarContratosAsync(string? texto, string? estado)
    {
        var estadosValidos = new[] { "Activo", "Por vencer", "Vencido", "Renovado", "Cancelado" };
        if (!string.IsNullOrWhiteSpace(estado) && !estadosValidos.Contains(estado))
            throw new ReglaNegocioException("El estado indicado no es válido.");

        return _alquilerDA.ListarContratosAsync(Normalizar(texto), Normalizar(estado));
    }

    public async Task<DetalleContratoDto> ObtenerContratoAsync(int idContrato)
    {
        var contrato = await _alquilerDA.ObtenerContratoAsync(idContrato)
            ?? throw new ReglaNegocioException("El contrato indicado no existe.");

        var equipos = await _alquilerDA.ListarEquiposDeContratoAsync(idContrato);
        contrato.CantidadEquipos = equipos.Count;
        contrato.Series = string.Join(", ", equipos.Select(e => e.NumeroSerie));

        return new DetalleContratoDto { Contrato = contrato, Equipos = equipos };
    }

    // ---------- CARR-006: fichas de radios ----------
    public async Task<DetalleContratoDto> AgregarRadioAContratoAsync(AgregarRadioDto dto, int idUsuario)
    {
        var serie = Normalizar(dto.NumeroSerie);
        var faltantes = new List<string>();
        if (dto.IdContrato is null) faltantes.Add("Contrato");
        if (serie is null) faltantes.Add("Número de serie");
        if (dto.FechaAsignacion is null) faltantes.Add("Fecha de asignación");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios.", faltantes);

        var contrato = await _alquilerDA.ObtenerContratoAsync(dto.IdContrato!.Value)
            ?? throw new ReglaNegocioException("El contrato indicado no existe.");

        if (contrato.EstadoRegistrado != "Activo")
            throw new ReglaNegocioException("Solo se pueden asignar radios a un contrato activo.");

        var equipo = await _inventarioDA.ObtenerEquipoAsync(null, serie)
            ?? throw new ReglaNegocioException("El número de serie ingresado no existe en el inventario.");

        if (!CategoriasRadio.Contains(equipo.Categoria))
            throw new ReglaNegocioException("El número de serie ingresado no corresponde a un radio.");

        if (await _alquilerDA.TieneContratoActivoAsync(equipo.IdEquipo))
            throw new ReglaNegocioException("El número de serie ya se encuentra registrado.");

        if (equipo.Estado != "Disponible")
            throw new ReglaNegocioException($"{MensajeEquipoNoDisponible.TrimEnd('.')} (estado actual: {equipo.Estado}).");

        var fecha = dto.FechaAsignacion!.Value.Date;
        if (fecha < contrato.FechaInicio.Date || fecha > contrato.FechaVencimiento.Date)
            throw new ReglaNegocioException("La fecha de asignación debe estar dentro de la vigencia del contrato.");

        await _alquilerDA.AgregarEquipoAContratoAsync(contrato.IdContrato, equipo.IdEquipo, fecha, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", contrato.IdContrato, "RADIO_ASIGNADO",
            $"{equipo.NumeroSerie} ({equipo.Marca} {equipo.Modelo}) asignado a {contrato.Empresa}");

        return await ObtenerContratoAsync(contrato.IdContrato);
    }

    public Task<List<RadioDto>> ListarRadiosAsync(string? texto) => _alquilerDA.ListarRadiosAsync(Normalizar(texto), null);

    public async Task<RadioDto> ObtenerRadioPorSerieAsync(string numeroSerie)
    {
        var radio = string.IsNullOrWhiteSpace(numeroSerie)
            ? null
            : (await _alquilerDA.ListarRadiosAsync(null, numeroSerie.Trim())).FirstOrDefault();

        return radio ?? throw new ReglaNegocioException("No se encontró ningún radio en alquiler con ese número de serie.");
    }

    private static string? Normalizar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
