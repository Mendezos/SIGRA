using System.Globalization;
using System.Text.Json;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Abstracciones.Servicios;
using SIGRA.Flujo.Servicios;

namespace SIGRA.Flujo.Flujos;

public class TicketsFlujo(ITicketsDA da, IExportacionService exportacion, INotificacionesDA notificaciones,
    ICorreosPendientesService correos, TimeProvider reloj) : ITicketsFlujo
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly CultureInfo Cultura = CultureInfo.GetCultureInfo("es-CR");

    private async Task<AccesoModuloModel> Actor(int idUsuario, string permiso = "Lectura", bool soloInterno = false)
    {
        var actor = await da.AccesoAsync(idUsuario) ?? throw new SesionInvalidaException("La cuenta o su rol ya no están activos.");
        ReglasTickets.Exigir(actor.Interno, "Esta consulta está disponible únicamente para usuarios internos de Radifax.");
        var permitido = permiso switch { "Escritura" => actor.Escritura, "Edicion" => actor.Edicion, "Eliminacion" => actor.Eliminacion, _ => actor.Lectura };
        ReglasTickets.Exigir(soloInterno || permitido || ReglasTickets.Administrador(actor), "Tu rol no tiene permiso para realizar esta operación.");
        return actor;
    }

    private async Task<TicketDetalleDto> Ticket(int idTicket) =>
        await da.ObtenerAsync(idTicket) ?? throw new ReglaNegocioException("La boleta indicada no existe.");

    private static void Responsable(AccesoModuloModel actor, TicketDetalleDto ticket)
    {
        ReglasTickets.Exigir(ReglasTickets.Tecnico(actor) && ticket.IdTecnicoAsignado == actor.IdUsuario
            && ticket.EstadoAsignacion == "Asignada", "Solo el técnico asignado puede registrar el trabajo de esta boleta.");
    }

    public async Task<PaginaDto<TicketDetalleDto>> ListarAsync(FiltroTicketsDto filtro, int idUsuario)
    {
        var actor = await Actor(idUsuario);
        ReglasTickets.ValidarPeriodo(filtro.Desde, filtro.Hasta);
        if (filtro.Pagina < 1 || filtro.Pagina > 1000000 || filtro.TamanoPagina is < 1 or > 100)
            throw new ReglaNegocioException("La paginación indicada no es válida.");
        if (!string.IsNullOrWhiteSpace(filtro.Estado)) filtro.Estado = ReglasTickets.Canonico(filtro.Estado, ReglasTickets.Estados, "estado");
        if (!string.IsNullOrWhiteSpace(filtro.TipoServicio)) filtro.TipoServicio = ReglasTickets.Canonico(filtro.TipoServicio, ReglasTickets.TiposServicio, "tipo de servicio");
        if (ReglasTickets.Tecnico(actor) && !filtro.SinRecepcionFisica) filtro.IdTecnico = idUsuario;
        filtro.Texto = ReglasTickets.Limpio(filtro.Texto);
        return await da.ListarAsync(filtro);
    }

    public async Task<ResumenTicketsDto> ResumenAsync(int idUsuario)
    { var a = await Actor(idUsuario); return await da.ResumenAsync(ReglasTickets.Tecnico(a) ? idUsuario : null); }

    public async Task<TicketDetalleDto> ObtenerAsync(int idTicket, int idUsuario)
    { await Actor(idUsuario); return await Ticket(idTicket); }

    public async Task<SeguimientoTicketDto> SeguimientoAsync(string codigo, int idUsuario)
    {
        await Actor(idUsuario, soloInterno: true);
        if (!Guid.TryParseExact(codigo, "N", out var guid)) throw new ReglaNegocioException("El código ingresado no es válido");
        return await da.SeguimientoAsync(guid.ToString("N")) ?? throw new ReglaNegocioException("El código ingresado no es válido");
    }

    public async Task<List<SeguimientoTicketDto>> SeguimientoClienteAsync(string empresa, int idUsuario)
    {
        await Actor(idUsuario, soloInterno: true);
        if (string.IsNullOrWhiteSpace(empresa) || empresa.Trim().Length < 2) throw new ReglaNegocioException("Ingresá al menos dos letras del nombre del cliente.");
        return await da.SeguimientoClienteAsync(empresa.Trim());
    }

    public async Task<List<ClienteTicketDto>> ClientesAsync(string? texto, int idUsuario)
    { await Actor(idUsuario); return await da.ClientesAsync(ReglasTickets.Limpio(texto)); }

    public async Task<List<TecnicoTicketDto>> TecnicosAsync(int idUsuario)
    { await Actor(idUsuario); return await da.TecnicosAsync(); }

    public async Task<ConfiguracionTicketsDto> ConfiguracionAsync(int idUsuario)
    { await Actor(idUsuario); return await da.ConfiguracionAsync(); }

    public async Task GuardarConfiguracionAsync(ConfiguracionTicketsDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion");
        ReglasTickets.Exigir(ReglasTickets.Gestion(a), "Solo el coordinador o administrador puede configurar la carga y el plazo.");
        if (dto.CargaMaxima is < 1 or > 1000 || dto.DiasHabilesEstimados is < 1 or > 365)
            throw new ReglaNegocioException("La carga debe estar entre 1 y 1000, y el plazo entre 1 y 365 días hábiles.");
        await da.GuardarConfiguracionAsync(dto, idUsuario);
    }

    public async Task GuardarEspecialidadesAsync(int idTecnico, EspecialidadesTecnicoDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion");
        ReglasTickets.Exigir(ReglasTickets.Gestion(a), "Solo el coordinador o administrador puede configurar las especialidades.");
        var especialidades = dto.Especialidades.Select(e => ReglasTickets.Canonico(e, ReglasTickets.Especialidades, "especialidad")).Distinct().ToList();
        await da.GuardarEspecialidadesAsync(idTecnico, especialidades, idUsuario);
    }

    public async Task<TicketDetalleDto> RegistrarAsync(RegistrarTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Escritura");
        ReglasTickets.Exigir(ReglasTickets.Recepcionista(a) || ReglasTickets.Gestion(a), "El registro de entrada corresponde a recepción, coordinación o administración.");
        ReglasTickets.ValidarEntrada(dto);
        if (dto.Solicitud == Guid.Empty) throw new ReglaNegocioException("La solicitud de registro no es válida.");
        await ValidarClienteEquipos(dto);
        return await Ticket(await da.RegistrarAsync(dto, idUsuario));
    }

    private async Task ValidarClienteEquipos(RegistrarTicketDto dto)
    {
        var clientes = await da.ClientesAsync(null);
        var cliente = dto.IdCliente.HasValue ? clientes.FirstOrDefault(c => c.IdCliente == dto.IdCliente)
            : clientes.FirstOrDefault(c => ReglasTickets.Normalizar(c.Empresa) == ReglasTickets.Normalizar(dto.Empresa));
        if (dto.IdCliente.HasValue && cliente is null) throw new ReglaNegocioException("El cliente seleccionado está inactivo o no existe.");
        if (cliente is not null) { dto.IdCliente = cliente.IdCliente; dto.Empresa = cliente.Empresa; }
        var existentes = await da.EquiposContratosAsync(dto.Equipos.Select(e => e.NumeroSerie).ToList());
        foreach (var equipo in dto.Equipos)
        {
            var existente = existentes.FirstOrDefault(e => string.Equals(e.NumeroSerie, equipo.NumeroSerie, StringComparison.OrdinalIgnoreCase));
            if (existente?.Estado == "Dado de baja") throw new ReglaNegocioException($"El equipo {equipo.NumeroSerie} está dado de baja y no puede ingresar al taller.");
            if (existente?.IdContrato is not null && existente.IdCliente != dto.IdCliente && !dto.ConfirmarAlquilerOtroCliente)
                throw new ConfirmacionRequeridaException($"El equipo {equipo.NumeroSerie} está alquilado a otro cliente. ¿Desea continuar de todas formas?", "ALQUILER_OTRO_CLIENTE");
            equipo.IdEquipo = existente?.IdEquipo; equipo.IdContrato = existente?.IdContrato;
            equipo.CubiertoPorContrato = existente?.CubreReparaciones == true && existente.IdCliente == dto.IdCliente;
        }
    }

    public async Task<TicketDetalleDto> EditarAsync(int idTicket, EditarTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual);
        ReglasTickets.ValidarEntrada(dto);
        if (ReglasTickets.Tecnico(a))
        {
            Responsable(a, actual);
            var generalesIguales = dto.IdCliente == actual.IdCliente && dto.Empresa == actual.Empresa && dto.Contacto == actual.Contacto
                && dto.Telefono == actual.Telefono && ReglasTickets.Limpio(dto.Correo) == ReglasTickets.Limpio(actual.Correo)
                && ReglasTickets.Limpio(dto.Cargo) == ReglasTickets.Limpio(actual.Cargo) && dto.TipoServicio == actual.TipoServicio;
            var equiposIguales = dto.Equipos.Count == actual.Equipos.Count && dto.Equipos.All(e => actual.Equipos.Any(o =>
                o.NumeroSerie == e.NumeroSerie && o.Marca == e.Marca && o.Modelo == e.Modelo && o.Tipo == e.Tipo && o.Especialidad == e.Especialidad && o.Problema == e.Problema));
            ReglasTickets.Exigir(generalesIguales && equiposIguales, "El técnico puede editar los accesorios y datos técnicos; los datos de empresa y contacto corresponden a recepción o coordinación.");
        }
        else ReglasTickets.Exigir(ReglasTickets.Recepcionista(a) || ReglasTickets.Gestion(a), "Tu rol no puede editar los datos generales.");
        if (dto.TipoServicio != actual.TipoServicio && (actual.Estado != "Creada" || actual.IdTecnicoAsignado is not null))
            throw new ReglaNegocioException("El tipo de servicio solo puede corregirse en una boleta creada sin asignar.");
        await ValidarClienteEquipos(dto);
        return await Cambiar(actual, dto.Version, idUsuario, "Editar", dto, ResumenEdicion(actual, dto));
    }

    private static string ResumenEdicion(TicketDetalleDto actual, EditarTicketDto nuevo)
    {
        var campos = new List<string>();
        if (actual.Empresa != nuevo.Empresa) campos.Add("cliente");
        if (actual.Contacto != nuevo.Contacto) campos.Add("contacto");
        if (actual.Telefono != nuevo.Telefono) campos.Add("teléfono");
        if (ReglasTickets.Limpio(actual.Correo) != ReglasTickets.Limpio(nuevo.Correo)) campos.Add("correo");
        if (ReglasTickets.Limpio(actual.Cargo) != ReglasTickets.Limpio(nuevo.Cargo)) campos.Add("cargo");
        if (actual.TipoServicio != nuevo.TipoServicio) campos.Add("tipo de servicio");
        var anteriores = actual.Equipos.Select(e => new { e.Marca, e.Modelo, e.NumeroSerie, e.Tipo, e.Accesorios, e.Problema });
        var nuevos = nuevo.Equipos.Select(e => new { e.Marca, e.Modelo, e.NumeroSerie, e.Tipo, e.Accesorios, e.Problema });
        if (JsonSerializer.Serialize(anteriores, Json) != JsonSerializer.Serialize(nuevos, Json)) campos.Add("equipos, accesorios o falla indicada");
        return campos.Count > 0 ? "Campos actualizados: " + string.Join(", ", campos) : "Datos revisados sin cambios";
    }

    public async Task<TicketDetalleDto> RecibirAsync(int idTicket, VersionTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Escritura"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual);
        ReglasTickets.Exigir(ReglasTickets.Tecnico(a), "La recepción física debe confirmarla el técnico que recibe los equipos.");
        if (actual.FechaRecepcionFisica.HasValue) throw new ReglaNegocioException("La recepción física ya fue confirmada y no se puede modificar.");
        var config = await da.ConfiguracionAsync();
        return await Cambiar(actual, dto.Version, idUsuario, "Recibir", new { fechaEstimada = actual.FechaEstimada ?? ReglasTickets.Plazo(reloj.GetUtcNow(), config.DiasHabilesEstimados) });
    }

    public async Task<TicketDetalleDto> AsignarAsync(int idTicket, AsignarTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual);
        ReglasTickets.Exigir(ReglasTickets.Gestion(a), "Solo el coordinador o administrador puede asignar y reasignar técnicos.");
        if (!dto.IdTecnico.HasValue) throw new ReglaNegocioException("Debe seleccionar un técnico responsable");
        if (actual.Estado == "En proceso" && !actual.EsReparacion) throw new ReglaNegocioException("El mantenimiento solo puede reasignarse antes de iniciar el trabajo.");
        return await Cambiar(actual, dto.Version, idUsuario, "Asignar", new { dto.IdTecnico, dto.ConfirmarSobrecarga,
            fechaEstimada = dto.FechaEstimada.HasValue ? ReglasTickets.FechaManual(dto.FechaEstimada.Value) : (DateTimeOffset?)null });
    }

    public async Task<TicketDetalleDto> IniciarAsync(int idTicket, VersionTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual); Responsable(a, actual);
        if (actual.Estado != "Asignada") throw new ReglaNegocioException("Solo se puede iniciar una boleta asignada.");
        if (!actual.FechaRecepcionFisica.HasValue) throw new ReglaNegocioException("Primero debe confirmarse la recepción física de los equipos.");
        return await Cambiar(actual, dto.Version, idUsuario, "Iniciar", new { });
    }

    public async Task<TicketDetalleDto> CancelarAsync(int idTicket, MotivoTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual);
        ReglasTickets.Exigir(ReglasTickets.Recepcionista(a) || ReglasTickets.Gestion(a), "Solo recepción, coordinación o administración puede cancelar la boleta.");
        if (actual.Estado is not "Creada" and not "Asignada") throw new ReglaNegocioException("Solo se puede cancelar antes de iniciar el servicio.");
        ValidarMotivo(dto.Motivo);
        return await Cambiar(actual, dto.Version, idUsuario, "Cancelar", new { motivo = dto.Motivo.Trim() });
    }

    public async Task<TicketDetalleDto> GuardarTrabajoAsync(int idTicket, GuardarTrabajoTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual); Responsable(a, actual);
        if (actual.Estado != "En proceso") throw new ReglaNegocioException("Iniciá el trabajo antes de guardar hallazgos o el borrador de cierre.");
        ReglasTickets.ValidarTrabajo(dto.Trabajo, actual.EsReparacion, false, false);
        return await Cambiar(actual, dto.Version, idUsuario, "Borrador", new { dto.Trabajo }, "Campos técnicos actualizados: hallazgos, acciones, etapa y borrador de cierre");
    }

    public async Task<TicketDetalleDto> DerivarReparacionAsync(int idTicket, VersionTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual); Responsable(a, actual);
        if (actual.EsReparacion) throw new ReglaNegocioException("La boleta ya tiene una reparación asociada.");
        if (actual.Estado != "En proceso") throw new ReglaNegocioException("Iniciá la revisión antes de derivar el equipo a reparación.");
        if (actual.Equipos.Any(e => e.Problema.Trim().Length < 10)) throw new ReglaNegocioException("Completá la descripción de la falla con al menos 10 caracteres antes de generar la reparación.");
        return await Cambiar(actual, dto.Version, idUsuario, "Derivar", new { });
    }

    public async Task<TicketDetalleDto> RegistrarFacturaAsync(int idTicket, ReferenciaFacturaDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual); Responsable(a, actual);
        if (actual.Estado != "En proceso") throw new ReglaNegocioException("La factura se confirma al completar el trabajo técnico.");
        var trabajo = Clonar(actual.Trabajo); trabajo.NumeroFactura = dto.NumeroFactura; trabajo.Monto = dto.Monto; trabajo.TieneCobro = true;
        ReglasTickets.ValidarTrabajo(trabajo, actual.EsReparacion, true, await Cubierto(actual));
        if (trabajo.Resolucion == "Garantía") throw new ReglaNegocioException("La garantía no requiere factura adicional.");
        return await Cambiar(actual, dto.Version, idUsuario, "Factura", new { trabajo });
    }

    public async Task<TicketDetalleDto> CerrarAsync(int idTicket, GuardarTrabajoTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); var actual = await Ticket(idTicket);
        if (!ReglasTickets.Abierta(actual) || actual.Estado != "En proceso")
            throw new ReglaNegocioException("No es posible cerrar una boleta que no ha sido asignada ni iniciada");
        Responsable(a, actual);
        var trabajo = actual.FacturaEmitida ? Clonar(actual.Trabajo) : dto.Trabajo;
        ReglasTickets.ValidarTrabajo(trabajo, actual.EsReparacion, true, await Cubierto(actual));
        if (actual.EsReparacion && trabajo.Resolucion == "Reparado") trabajo.Etapa = "Reparado";
        return await Cambiar(actual, dto.Version, idUsuario, "Cerrar", new { trabajo });
    }

    private async Task<bool> Cubierto(TicketDetalleDto ticket)
    {
        var contratos = await da.EquiposContratosAsync(ticket.Equipos.Select(e => e.NumeroSerie).ToList());
        return ticket.Equipos.Count > 0 && ticket.Equipos.All(e => contratos.Any(c =>
            string.Equals(c.NumeroSerie, e.NumeroSerie, StringComparison.OrdinalIgnoreCase) && c.CubreReparaciones && c.IdCliente == ticket.IdCliente));
    }

    public async Task<TicketDetalleDto> InactivarAsync(int idTicket, MotivoTicketDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Eliminacion"); var actual = await Ticket(idTicket); ReglasTickets.Editable(actual);
        ReglasTickets.Exigir(ReglasTickets.Gestion(a), "Solo el coordinador o administrador puede inactivar una boleta.");
        ValidarMotivo(dto.Motivo);
        return await Cambiar(actual, dto.Version, idUsuario, "Inactivar", new { motivo = dto.Motivo.Trim() });
    }

    private static void ValidarMotivo(string motivo)
    { if (string.IsNullOrWhiteSpace(motivo) || motivo.Trim().Length > 500) throw new ReglaNegocioException("Debe indicar un motivo de hasta 500 caracteres."); }

    private async Task<TicketDetalleDto> Cambiar(TicketDetalleDto actual, string version, int idUsuario, string operacion, object datos, string? resumen = null)
    {
        var bytes = ReglasTickets.Version(version);
        if (actual.Version != version) throw new ConflictoDatosException("Otra persona actualizó la boleta. Actualizá el detalle antes de guardar.");
        await da.CambiarAsync(new() { IdTicket = actual.IdTicket, IdUsuario = idUsuario, Operacion = operacion, Version = bytes,
            Datos = JsonSerializer.Serialize(datos, Json), Antes = JsonSerializer.Serialize(ResumenAuditoria(actual), Json), Resumen = resumen });
        return await Ticket(actual.IdTicket);
    }

    private static object ResumenAuditoria(TicketDetalleDto t) => new { t.Empresa, t.Contacto, t.Telefono, t.Correo, t.Cargo, t.TipoServicio,
        t.Estado, t.Activo, t.Tecnico, t.RecibidoPor, t.FechaRecepcionFisica, t.FechaInicio, t.FechaCierre, t.FechaEstimada, t.FacturaEmitida, t.Motivo,
        t.Trabajo, equipos = t.Equipos.Select(e => new { e.Marca, e.Modelo, e.NumeroSerie, e.Tipo, e.Accesorios, e.Problema }).ToList() };

    public async Task<List<HistorialTicketDto>> HistorialAsync(FiltroHistorialTicketsDto filtro, int idUsuario)
    { await Actor(idUsuario); ReglasTickets.ValidarPeriodo(filtro.Desde, filtro.Hasta); return await da.HistorialAsync(filtro); }

    public async Task<IndicadoresTicketsDto> IndicadoresAsync(DateOnly? desde, DateOnly? hasta, int idUsuario)
    {
        var a = await Actor(idUsuario);
        ReglasTickets.Exigir(ReglasTickets.Gestion(a) || ReglasTickets.Rol(a, "Gerente"), "Los indicadores corresponden a coordinación y gerencia.");
        ReglasTickets.ValidarPeriodo(desde, hasta); return await da.IndicadoresAsync(desde, hasta);
    }

    public async Task<List<ResponsableAuditoriaTicketDto>> ResponsablesAuditoriaAsync(int idUsuario)
    { var a = await Actor(idUsuario); ReglasTickets.Exigir(ReglasTickets.Administrador(a), "Esta sección es exclusiva para el rol Administrador"); return await da.ResponsablesAuditoriaAsync(); }

    public async Task<List<AuditoriaTicketDto>> AuditoriaAsync(FiltroAuditoriaTicketsDto filtro, int idUsuario)
    {
        var a = await Actor(idUsuario); ReglasTickets.Exigir(ReglasTickets.Administrador(a), "Esta sección es exclusiva para el rol Administrador");
        ReglasTickets.ValidarPeriodo(filtro.Desde, filtro.Hasta); return await da.AuditoriaAsync(filtro);
    }

    public async Task<List<GarantiaTicketDto>> GarantiasAsync(FiltroGarantiasDto filtro, int idUsuario)
    {
        var a = await Actor(idUsuario); ReglasTickets.Exigir(ReglasTickets.Gestion(a), "La bitácora de garantías corresponde a coordinación y administración.");
        ReglasTickets.ValidarPeriodo(filtro.Desde, filtro.Hasta); return await da.GarantiasAsync(filtro);
    }

    public async Task AgregarSeguimientoAsync(long idGarantia, AgregarSeguimientoGarantiaDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario, "Edicion"); ReglasTickets.Exigir(ReglasTickets.Gestion(a), "Solo coordinación o administración puede agregar un seguimiento de garantía.");
        dto.Estado = ReglasTickets.Canonico(dto.Estado, ["En trámite", "Resuelto por el proveedor", "Rechazado por el proveedor"], "estado de garantía");
        if (string.IsNullOrWhiteSpace(dto.Nota) || dto.Nota.Length > 1000) throw new ReglaNegocioException("Agregá una nota de hasta 1000 caracteres.");
        dto.Nota = dto.Nota.Trim(); await da.AgregarSeguimientoAsync(idGarantia, dto, idUsuario);
    }

    public async Task<ArchivoExportadoDto> ComprobanteAsync(int idTicket, int idUsuario)
    {
        var t = await ObtenerAsync(idTicket, idUsuario);
        if (string.IsNullOrEmpty(t.ComprobanteOriginal)) throw new ReglaNegocioException("Esta boleta histórica no tiene un comprobante original disponible.");
        var original = JsonSerializer.Deserialize<TicketDetalleDto>(t.ComprobanteOriginal, Json) ?? throw new ReglaNegocioException("No se pudo leer el comprobante original.");
        return exportacion.Comprobante(original);
    }

    public async Task EnviarComprobanteAsync(int idTicket, EnviarComprobanteDto dto, int idUsuario)
    {
        var a = await Actor(idUsuario);
        ReglasTickets.Exigir(ReglasTickets.Recepcionista(a) || ReglasTickets.Gestion(a), "El envío del comprobante corresponde a recepción o coordinación.");
        if (!dto.Confirmado) throw new ReglaNegocioException("Confirmá la dirección de correo antes de enviar el comprobante.");
        if (!ReglasTickets.CorreoValido(dto.Correo.Trim())) throw new ReglaNegocioException("El correo está vacío o no es válido. Podés imprimir el comprobante.");
        var t = await Ticket(idTicket); var archivo = await ComprobanteAsync(idTicket, idUsuario);
        var idCorreo = await notificaciones.EncolarCorreoAsync(new() { Destinatario = dto.Correo.Trim(), Nombre = t.Contacto,
            Asunto = "RADIFAX - Comprobante de boleta " + t.NumeroBoleta, Cuerpo = "Adjuntamos el comprobante original de recepción de tus equipos. Conservá el número y el código de seguimiento.",
            AdjuntosJson = JsonSerializer.Serialize(new[] { new AdjuntoCorreoDto { Nombre = archivo.Nombre, TipoContenido = archivo.TipoContenido, Contenido = archivo.Contenido } }, Json) });
        if (!await correos.EnviarAhoraAsync(idCorreo)) throw new ReglaNegocioException("El correo no pudo enviarse ahora y quedó pendiente de reintento. Podés imprimir el comprobante.");
    }

    public async Task<ArchivoExportadoDto> ExportarHistorialAsync(FiltroHistorialTicketsDto filtro, string formato, int idUsuario)
    {
        var a = await Actor(idUsuario);
        ReglasTickets.Exigir(ReglasTickets.Gestion(a) || ReglasTickets.Tecnico(a) || ReglasTickets.Recepcionista(a), "Tu rol no tiene acceso a esta exportación.");
        if (ReglasTickets.Recepcionista(a) && filtro.IdTicket is null && filtro.IdCliente is null && string.IsNullOrWhiteSpace(filtro.NumeroSerie))
            throw new ReglaNegocioException("Seleccioná una boleta, cliente o equipo antes de exportar.");
        var filas = await HistorialAsync(filtro, idUsuario);
        return exportacion.Tabla("RADIFAX - Historial de servicio técnico", ["Fecha", "Boleta", "Servicio", "Técnico", "Resolución", "Observaciones"],
            filas.Select(f => (IReadOnlyList<string>)new[] { Fecha(f.Fecha), f.NumeroBoleta.ToString(Cultura), f.TipoServicio, f.Tecnico ?? "Sin asignar", f.Resolucion ?? "Sin resolución", f.Observaciones ?? "Sin registro" }).ToList(), formato, "bitacora-servicio-tecnico");
    }

    public async Task<ArchivoExportadoDto> ExportarGarantiasAsync(FiltroGarantiasDto filtro, string formato, int idUsuario)
    {
        var filas = await GarantiasAsync(filtro, idUsuario);
        return exportacion.Tabla("RADIFAX - Casos de garantía", ["Fecha", "Boleta", "Cliente", "Equipo", "Proveedor", "Caso", "Estado"],
            filas.Select(f => (IReadOnlyList<string>)new[] { Fecha(f.Fecha), f.NumeroBoleta.ToString(Cultura), f.Empresa, f.NumeroSerie + " - " + f.Equipo, f.Proveedor, f.CasoProveedor, f.Estado }).ToList(), formato, "garantias-servicio-tecnico");
    }

    private static string Fecha(DateTimeOffset fecha) => fecha.ToOffset(TimeSpan.FromHours(-6)).ToString("dd/MM/yyyy HH:mm", Cultura);
    private static TrabajoTicketDto Clonar(TrabajoTicketDto trabajo) => JsonSerializer.Deserialize<TrabajoTicketDto>(JsonSerializer.Serialize(trabajo, Json), Json)!;
}
