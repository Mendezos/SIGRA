using System.Globalization;
using System.Text.RegularExpressions;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// CRMGPSC-001 a 007: prospectos y contactos de empresa
public class CrmProspectosFlujo(ICrmProspectosDA da, ICrmCatalogosDA catalogos, IAuditoriaDA auditoria, TimeProvider? reloj = null) : ICrmProspectosFlujo
{
    private const string ModuloAuditoria = "CRM";
    private const string EstadoNuevo = "Nuevo";
    private const string EstadoConvertido = "Convertido";
    private const string EstadoDescartado = "Descartado";
    private const int MaximoFlota = 1_000_000;
    private static readonly string[] EstadosReactivacion = { "Nuevo", "Cotización enviada", "En negociación" };
    private static readonly DateTime FechaMinimaCumpleanos = new(1900, 1, 1);
    private static readonly Regex PatronCorreo = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex PatronTelefono = new(@"^[0-9+\-\s()]{7,20}$", RegexOptions.Compiled);
    private static readonly Regex EspaciosRepetidos = new(@"\s+", RegexOptions.Compiled);
    private static readonly TimeZoneInfo ZonaCostaRica = ObtenerZonaCostaRica();

    private readonly TimeProvider _reloj = reloj ?? TimeProvider.System;

    // Las fechas y horas del CRM son hora de pared de Costa Rica (UTC-6, sin horario de verano).
    private static TimeZoneInfo ObtenerZonaCostaRica()
    {
        foreach (var id in new[] { "Central America Standard Time", "America/Costa_Rica" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.CreateCustomTimeZone("CostaRica", TimeSpan.FromHours(-6), "Costa Rica", "Costa Rica");
    }

    private DateTime AhoraCostaRica() => TimeZoneInfo.ConvertTime(_reloj.GetUtcNow(), ZonaCostaRica).DateTime;

    private static string CodigoProspecto(int id) => $"PR-{id:0000}";
    private static string CodigoContacto(int id) => $"CT-{id:0000}";

    // ====================================================================================================================
    // Prospectos
    // ====================================================================================================================

    // CRMGPSC-002: lista con filtros combinados.
    public Task<List<ProspectoDto>> ListarProspectosAsync(string? empresa, string? sector, string? fuente, string? estado, int? idVendedor, DateTime? fechaDesde, DateTime? fechaHasta)
    {
        if (fechaDesde is not null && fechaHasta is not null && fechaDesde.Value.Date > fechaHasta.Value.Date)
            throw new ReglaNegocioException("La fecha inicial no puede ser posterior a la final");

        return da.ListarProspectosAsync(Normalizar(empresa), Normalizar(sector), Normalizar(fuente), Normalizar(estado), idVendedor, fechaDesde?.Date, fechaHasta?.Date);
    }

    // CRMGPSC-002: detalle de solo lectura.
    public async Task<ProspectoDetalleDto> ObtenerDetalleProspectoAsync(int idProspecto, int idUsuario) =>
        await da.ObtenerDetalleProspectoAsync(idProspecto, idUsuario) ?? throw new ReglaNegocioException("El prospecto indicado no existe.");

    // CRMGPSC-001
    public async Task<RegistrarProspectoResultadoDto> RegistrarProspectoAsync(RegistrarProspectoDto dto, int idUsuario)
    {
        var errores = new List<string>();
        var datos = ValidarDatosProspecto(dto.Empresa, dto.Sector, dto.Direccion, dto.Telefono, dto.Correo, dto.Contacto, dto.TamanoFlota, dto.Fuente, errores, out var mensajeError);
        if (dto.IdVendedor is null)
        {
            errores.Add("Vendedor responsable");
            mensajeError ??= "Debe completar los campos obligatorios del prospecto.";
        }
        if (dto.Estado is not null && !string.Equals(dto.Estado.Trim(), EstadoNuevo, StringComparison.Ordinal))
        {
            errores.Add("Estado: al registrar un prospecto el estado siempre es «Nuevo».");
            mensajeError ??= "Hay campos con formato inválido. Corrija los campos indicados.";
        }
        if (errores.Count > 0) throw new ValidacionException(mensajeError!, errores);

        var activos = await catalogos.ListarVendedoresAsync();
        if (!activos.Any(v => v.IdUsuario == dto.IdVendedor))
            throw new ReglaNegocioException("El vendedor responsable está inactivo o no está disponible. Seleccione un vendedor activo.");

        var coincidencias = await da.BuscarCoincidenciasAsync(datos.Empresa, datos.Correo, datos.Telefono, null);
        if (coincidencias.Count > 0 && !dto.ConfirmarDuplicado)
        {
            return new RegistrarProspectoResultadoDto
            {
                RequiereConfirmacion = true,
                Coincidencias = coincidencias,
                Mensaje = coincidencias.Count == 1
                    ? "Ya existe 1 prospecto o cliente con el mismo correo, teléfono o nombre de empresa. Abra el registro existente para editarlo o continúe con una justificación."
                    : $"Ya existen {coincidencias.Count} prospectos o clientes con el mismo correo, teléfono o nombre de empresa. Abra el registro existente para editarlo o continúe con una justificación."
            };
        }

        string? justificacion = null;
        if (dto.ConfirmarDuplicado)
        {
            justificacion = Normalizar(dto.JustificacionDuplicado);
            if (justificacion is null)
                throw new ValidacionException("Debe ingresar la justificación para registrar el prospecto a pesar de las coincidencias.", new List<string> { "Justificación" });
            if (justificacion.Length > 300)
                throw new ValidacionException("La justificación no puede superar los 300 caracteres.", new List<string> { "Justificación: no puede superar los 300 caracteres." });
        }

        var id = await da.InsertarProspectoAsync(datos.Empresa, datos.Contacto, datos.Correo, datos.Telefono, datos.Sector, datos.Direccion,
            datos.TamanoFlota, datos.Fuente, dto.IdVendedor!.Value, dto.ConfirmarDuplicado, justificacion, idUsuario);

        var prospecto = await da.ObtenerProspectoAsync(id) ?? throw new ReglaNegocioException("No se pudo leer el prospecto registrado.");

        var detalle = $"{prospecto.Empresa}: sector {prospecto.Sector}, fuente {prospecto.Fuente}, responsable {prospecto.Vendedor}, estado {prospecto.Estado}";
        if (coincidencias.Count > 0 && justificacion is not null)
            detalle += $". Registrado con coincidencias ({string.Join("; ", coincidencias.Select(c => $"{c.Tipo} «{c.Empresa}»"))}). Justificación: {justificacion}";
        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Prospecto", id, "PROSPECTO_REGISTRADO", detalle);

        return new RegistrarProspectoResultadoDto
        {
            Prospecto = prospecto,
            Coincidencias = coincidencias,
            Mensaje = $"El prospecto {CodigoProspecto(id)} se registró correctamente en la etapa {prospecto.Estado}."
        };
    }

    // CRMGPSC-003
    public async Task<ProspectoDto> EditarProspectoAsync(int idProspecto, EditarProspectoDto dto, int idUsuario)
    {
        var errores = new List<string>();
        var datos = ValidarDatosProspecto(dto.Empresa, dto.Sector, dto.Direccion, dto.Telefono, dto.Correo, dto.Contacto, dto.TamanoFlota, dto.Fuente, errores, out var mensajeError);
        if (errores.Count > 0) throw new ValidacionException(mensajeError!, errores);

        var actual = await da.ObtenerProspectoAsync(idProspecto) ?? throw new ReglaNegocioException("El prospecto indicado no existe.");

        if (actual.Estado == EstadoConvertido)
            throw new ReglaNegocioException("El prospecto ya fue convertido en cliente y no se puede editar." +
                (actual.ClienteEmpresa is null ? "" : $" Abra el cliente vinculado «{actual.ClienteEmpresa}»."));
        if (actual.Estado == EstadoDescartado)
            throw new ReglaNegocioException("El prospecto está descartado y no se puede editar. Reactívelo para modificar sus datos.");

        if (dto.IdVendedor is not null && dto.IdVendedor != actual.IdVendedor)
        {
            var activos = await catalogos.ListarVendedoresAsync();
            if (!activos.Any(v => v.IdUsuario == dto.IdVendedor))
                throw new ReglaNegocioException("El vendedor responsable está inactivo o no está disponible. Seleccione un vendedor activo.");
        }

        var anterior = await da.EditarProspectoAsync(idProspecto, datos.Empresa, datos.Contacto, datos.Correo, datos.Telefono, datos.Sector, datos.Direccion,
            datos.TamanoFlota, datos.Fuente, dto.IdVendedor, idUsuario);

        var actualizado = await da.ObtenerProspectoAsync(idProspecto) ?? throw new ReglaNegocioException("No se pudo leer el prospecto actualizado.");

        var cambios = new List<string>();
        AgregarCambio(cambios, "Empresa", anterior.Empresa, actualizado.Empresa);
        AgregarCambio(cambios, "Sector", anterior.Sector, actualizado.Sector);
        AgregarCambio(cambios, "Dirección", anterior.Direccion, actualizado.Direccion);
        AgregarCambio(cambios, "Teléfono", anterior.Telefono, actualizado.Telefono);
        AgregarCambio(cambios, "Correo", anterior.Correo, actualizado.Correo);
        AgregarCambio(cambios, "Contacto", anterior.Contacto, actualizado.Contacto);
        AgregarCambio(cambios, "Tamaño de la flota", anterior.TamanoFlota?.ToString(CultureInfo.InvariantCulture), actualizado.TamanoFlota?.ToString(CultureInfo.InvariantCulture));
        AgregarCambio(cambios, "Fuente", anterior.Fuente, actualizado.Fuente);
        AgregarCambio(cambios, "Responsable", anterior.Vendedor, actualizado.Vendedor);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Prospecto", idProspecto, "PROSPECTO_EDITADO",
            cambios.Count > 0 ? string.Join("; ", cambios) : "Se guardó sin cambios en los datos.");

        return actualizado;
    }

    // CRMGPSC-004: descartar
    public async Task<ProspectoAccionResultadoDto> DescartarProspectoAsync(int idProspecto, DescartarProspectoDto dto, int idUsuario)
    {
        var motivo = Normalizar(dto.Motivo);
        if (motivo is null)
            throw new ValidacionException("Debe indicar el motivo del descarte.", new List<string> { "Motivo" });
        if (!CrmCatalogos.MotivosDescarte.Contains(motivo))
            throw new ValidacionException("El motivo del descarte no es válido. Seleccione uno de la lista.", new List<string> { "Motivo: seleccione un valor de la lista." });

        var observacion = Normalizar(dto.Observacion);
        if (observacion is not null && observacion.Length > 500)
            throw new ValidacionException("La observación no puede superar los 500 caracteres.", new List<string> { "Observación: no puede superar los 500 caracteres." });

        var hoy = AhoraCostaRica().Date;
        var fecha = dto.Fecha?.Date ?? hoy;
        if (fecha > hoy)
            throw new ValidacionException("La fecha del descarte no puede ser futura.", new List<string> { "Fecha: no puede ser futura." });

        var actual = await da.ObtenerProspectoAsync(idProspecto) ?? throw new ReglaNegocioException("El prospecto indicado no existe.");

        var fila = await da.DescartarProspectoAsync(idProspecto, motivo, fecha, observacion, idUsuario);

        switch (fila.Resultado)
        {
            case "Convertido":
                return RechazoConvertido(actual, fila, "descartar");
            case "SinCambios":
                return new ProspectoAccionResultadoDto
                {
                    Resultado = ResultadosProspecto.SinCambios,
                    EstadoActual = fila.Estado,
                    Mensaje = $"El prospecto {CodigoProspecto(idProspecto)} ya se encuentra en estado {fila.Estado}. No se registró ningún movimiento nuevo.",
                    Prospecto = await da.ObtenerProspectoAsync(idProspecto)
                };
        }

        var detalle = $"Motivo: {motivo}; fecha: {fecha:dd/MM/yyyy}; observación: {observacion ?? "(sin observación)"}; " +
                      $"seguimientos cancelados: {fila.SeguimientosCancelados}; series canceladas: {fila.SeriesCanceladas}";
        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Prospecto", idProspecto, "PROSPECTO_DESCARTADO", detalle);

        return new ProspectoAccionResultadoDto
        {
            Resultado = ResultadosProspecto.Aplicado,
            EstadoActual = EstadoDescartado,
            SeguimientosCancelados = fila.SeguimientosCancelados,
            SeriesCanceladas = fila.SeriesCanceladas,
            Mensaje = $"El prospecto {CodigoProspecto(idProspecto)} se descartó. Se cancelaron {fila.SeguimientosCancelados} seguimiento(s) pendiente(s) y {fila.SeriesCanceladas} serie(s) de contacto; el historial se conserva.",
            Prospecto = await da.ObtenerProspectoAsync(idProspecto)
        };
    }

    // CRMGPSC-004: reactivar
    public async Task<ProspectoAccionResultadoDto> ReactivarProspectoAsync(int idProspecto, ReactivarProspectoDto dto, int idUsuario)
    {
        var errores = new List<string>();
        var estadoInicial = Normalizar(dto.EstadoInicial);
        if (estadoInicial is null) errores.Add("Estado inicial");
        else if (!EstadosReactivacion.Contains(estadoInicial)) errores.Add("Estado inicial: elija Nuevo, Cotización enviada o En negociación.");
        if (dto.FechaHoraSeguimiento is null) errores.Add("Próximo seguimiento");
        if (errores.Count > 0)
            throw new ValidacionException("Debe indicar el estado inicial y la fecha y hora del próximo seguimiento.", errores);

        var fechaHora = dto.FechaHoraSeguimiento!.Value;
        fechaHora = new DateTime(fechaHora.Year, fechaHora.Month, fechaHora.Day, fechaHora.Hour, fechaHora.Minute, 0);
        if (fechaHora <= AhoraCostaRica())
            throw new ValidacionException("El próximo seguimiento debe programarse en una fecha y hora futuras.", new List<string> { "Próximo seguimiento: debe ser futuro." });

        var actual = await da.ObtenerProspectoAsync(idProspecto) ?? throw new ReglaNegocioException("El prospecto indicado no existe.");

        if (actual.Estado == EstadoDescartado)
        {
            var activos = await catalogos.ListarVendedoresAsync();
            if (dto.IdVendedor is not null && !activos.Any(v => v.IdUsuario == dto.IdVendedor))
                throw new ReglaNegocioException("El vendedor indicado está inactivo o no está disponible. Elija un vendedor activo.");
            if (dto.IdVendedor is null && !activos.Any(v => v.IdUsuario == actual.IdVendedor))
                throw new ReglaNegocioException("El vendedor responsable del prospecto está inactivo. Elija otro vendedor activo para reactivarlo.");
        }

        var fila = await da.ReactivarProspectoAsync(idProspecto, estadoInicial!, fechaHora, dto.IdVendedor, idUsuario);

        switch (fila.Resultado)
        {
            case "Convertido":
                return RechazoConvertido(actual, fila, "reactivar");
            case "SinCambios":
                return new ProspectoAccionResultadoDto
                {
                    Resultado = ResultadosProspecto.SinCambios,
                    EstadoActual = fila.Estado,
                    Mensaje = $"El prospecto {CodigoProspecto(idProspecto)} ya está activo (estado actual: {fila.Estado}). No se registró ningún movimiento nuevo.",
                    Prospecto = await da.ObtenerProspectoAsync(idProspecto)
                };
        }

        var reactivado = await da.ObtenerProspectoAsync(idProspecto);
        var detalle = $"Estado inicial: {estadoInicial}; motivo del descarte anterior: {actual.MotivoDescarte ?? "(sin motivo)"}; " +
                      $"próximo seguimiento: {fechaHora:dd/MM/yyyy hh:mm tt} (seguimiento {fila.IdSeguimiento}); responsable: {reactivado?.Vendedor}";
        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Prospecto", idProspecto, "PROSPECTO_REACTIVADO", detalle);

        return new ProspectoAccionResultadoDto
        {
            Resultado = ResultadosProspecto.Aplicado,
            EstadoActual = estadoInicial,
            IdSeguimientoCreado = fila.IdSeguimiento,
            Mensaje = $"El prospecto {CodigoProspecto(idProspecto)} se reactivó en estado {estadoInicial} y se programó el seguimiento del {fechaHora:dd/MM/yyyy} a las {fechaHora:hh:mm tt}.",
            Prospecto = reactivado
        };
    }

    private static ProspectoAccionResultadoDto RechazoConvertido(ProspectoDto prospecto, ProspectoAccionFilaDto fila, string accion)
    {
        var cliente = fila.ClienteEmpresa ?? prospecto.ClienteEmpresa;
        return new ProspectoAccionResultadoDto
        {
            Resultado = ResultadosProspecto.Rechazado,
            Codigo = "PROSPECTO_CONVERTIDO",
            EstadoActual = EstadoConvertido,
            IdCliente = fila.IdCliente ?? prospecto.IdCliente,
            ClienteEmpresa = cliente,
            Mensaje = $"El prospecto {CodigoProspecto(prospecto.IdProspecto)} ya fue convertido en cliente y no se puede {accion}." +
                      (cliente is null ? " Abra el perfil del cliente vinculado." : $" Abra el perfil del cliente «{cliente}»."),
            Prospecto = prospecto
        };
    }

    // ====================================================================================================================
    // Contactos de empresa
    // ====================================================================================================================

    public Task<List<ContactoEmpresaDto>> ListarContactosAsync(string? tipo, int? idEmpresa, string? texto, string? estado)
    {
        tipo = Normalizar(tipo);
        if (tipo is not null && !CrmCatalogos.TiposEmpresa.Contains(tipo))
            throw new ReglaNegocioException("El tipo de empresa debe ser Prospecto o Cliente.");

        bool? activo = null;
        estado = Normalizar(estado);
        if (estado is not null)
        {
            if (estado.Equals("Activo", StringComparison.OrdinalIgnoreCase)) activo = true;
            else if (estado.Equals("Inactivo", StringComparison.OrdinalIgnoreCase)) activo = false;
            else throw new ReglaNegocioException("El estado del contacto debe ser Activo o Inactivo.");
        }

        return da.ListarContactosAsync(tipo, idEmpresa, Normalizar(texto), activo);
    }

    public async Task<ContactoEmpresaDto> ObtenerContactoAsync(int idContactoEmpresa) =>
        await da.ObtenerContactoAsync(idContactoEmpresa) ?? throw new ReglaNegocioException("El contacto indicado no existe.");

    // CRMGPSC-005
    public async Task<GuardarContactoResultadoDto> RegistrarContactoAsync(RegistrarContactoEmpresaDto dto, int idUsuario)
    {
        var tipo = Normalizar(dto.Tipo);
        var errores = new List<string>();
        if (tipo is null || dto.IdEmpresa is null) errores.Add("Empresa");
        else if (!CrmCatalogos.TiposEmpresa.Contains(tipo)) errores.Add("Empresa: el tipo debe ser Prospecto o Cliente.");

        var datos = ValidarDatosContacto(dto.Nombre, dto.Cargo, dto.Telefono, dto.Correo, dto.FechaCumpleanos, dto.PreferenciaContacto, errores, out var mensajeError);
        if (errores.Count > 0)
            throw new ValidacionException(mensajeError ?? "Debe seleccionar la empresa a la que se vincula el contacto.", errores);

        var empresa = await catalogos.ObtenerEmpresaAsync(tipo!, dto.IdEmpresa!.Value) ?? throw new ReglaNegocioException("La empresa indicada no existe.");
        if (tipo == CrmCatalogos.TipoProspecto && !empresa.Activa)
            throw new ReglaNegocioException("No se pueden registrar contactos en un prospecto descartado o convertido en cliente.");

        var coincidencias = await da.BuscarCoincidenciasContactoAsync(tipo!, dto.IdEmpresa.Value, datos.Correo, datos.Telefono, null);
        if (coincidencias.Count > 0)
        {
            var existente = coincidencias[0];
            return new GuardarContactoResultadoDto
            {
                Resultado = ResultadosContacto.Duplicado,
                ContactoExistente = await da.ObtenerContactoAsync(existente.IdContactoEmpresa),
                Mensaje = $"Esta empresa ya tiene al contacto «{existente.Nombre}» ({CodigoContacto(existente.IdContactoEmpresa)}) con {ConDeterminante(existente.MotivoCoincidencia)}. Abra el contacto existente en lugar de crear uno nuevo."
            };
        }

        ContactoEmpresaDto? principalActual = null;
        if (dto.EsPrincipal)
        {
            principalActual = (await da.ListarContactosAsync(tipo, dto.IdEmpresa.Value, null, true)).FirstOrDefault(c => c.EsPrincipal);
            if (principalActual is not null && !dto.ConfirmarCambioPrincipal)
                return SolicitarConfirmacionPrincipal(principalActual, datos.Nombre);
        }

        var id = await da.InsertarContactoAsync(tipo!, dto.IdEmpresa.Value, datos.Nombre, datos.Cargo, datos.Telefono, datos.Correo, datos.FechaCumpleanos,
            datos.Preferencia, dto.EsPrincipal, dto.ConfirmarCambioPrincipal, idUsuario);

        var contacto = await da.ObtenerContactoAsync(id) ?? throw new ReglaNegocioException("No se pudo leer el contacto registrado.");

        var detalle = $"{contacto.Nombre} vinculado a {tipo} «{contacto.Empresa}»" + (contacto.EsPrincipal ? " como contacto principal" : "");
        if (principalActual is not null) detalle += $". «{principalActual.Nombre}» dejó de ser el contacto principal";
        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoEmpresa", id, "CONTACTO_REGISTRADO", detalle);

        return new GuardarContactoResultadoDto
        {
            Resultado = ResultadosContacto.Guardado,
            Contacto = contacto,
            PrincipalActual = principalActual,
            Mensaje = $"El contacto {CodigoContacto(id)} se registró y quedó vinculado a «{contacto.Empresa}»." +
                      (principalActual is not null ? $" «{principalActual.Nombre}» dejó de ser el contacto principal." : "")
        };
    }

    // CRMGPSC-006
    public async Task<GuardarContactoResultadoDto> EditarContactoAsync(int idContactoEmpresa, EditarContactoEmpresaDto dto, int idUsuario)
    {
        var errores = new List<string>();
        var datos = ValidarDatosContacto(dto.Nombre, dto.Cargo, dto.Telefono, dto.Correo, dto.FechaCumpleanos, dto.PreferenciaContacto, errores, out var mensajeError);
        if (errores.Count > 0) throw new ValidacionException(mensajeError!, errores);

        var actual = await da.ObtenerContactoAsync(idContactoEmpresa) ?? throw new ReglaNegocioException("El contacto indicado no existe.");
        if (!actual.Activo)
            throw new ReglaNegocioException("El contacto está inactivo y no se puede editar. Reactívelo para modificar sus datos.");

        // Solo se revisa el correo o teléfono que cambia.
        var correoNuevo = datos.Correo is not null && !string.Equals(datos.Correo, actual.Correo, StringComparison.OrdinalIgnoreCase) ? datos.Correo : null;
        var telefonoNuevo = datos.Telefono is not null && SoloDigitos(datos.Telefono) != SoloDigitos(actual.Telefono) ? datos.Telefono : null;
        if (correoNuevo is not null || telefonoNuevo is not null)
        {
            var coincidencias = await da.BuscarCoincidenciasContactoAsync(actual.Tipo, actual.IdEmpresa, correoNuevo, telefonoNuevo, idContactoEmpresa);
            if (coincidencias.Count > 0)
            {
                var otro = coincidencias[0];
                throw new ReglaNegocioException($"El dato ingresado ya pertenece al contacto «{otro.Nombre}» ({CodigoContacto(otro.IdContactoEmpresa)}) de la misma empresa ({otro.MotivoCoincidencia}). Corrija el dato para guardar los cambios.");
            }
        }

        ContactoEmpresaDto? principalActual = null;
        if (dto.EsPrincipal && !actual.EsPrincipal)
        {
            principalActual = (await da.ListarContactosAsync(actual.Tipo, actual.IdEmpresa, null, true)).FirstOrDefault(c => c.EsPrincipal && c.IdContactoEmpresa != idContactoEmpresa);
            if (principalActual is not null && !dto.ConfirmarCambioPrincipal)
                return SolicitarConfirmacionPrincipal(principalActual, datos.Nombre);
        }

        var anterior = await da.EditarContactoAsync(idContactoEmpresa, datos.Nombre, datos.Cargo, datos.Telefono, datos.Correo, datos.FechaCumpleanos,
            datos.Preferencia, dto.EsPrincipal, dto.ConfirmarCambioPrincipal, idUsuario);

        var actualizado = await da.ObtenerContactoAsync(idContactoEmpresa) ?? throw new ReglaNegocioException("No se pudo leer el contacto actualizado.");

        var cambios = new List<string>();
        AgregarCambio(cambios, "Nombre", anterior.Nombre, actualizado.Nombre);
        AgregarCambio(cambios, "Cargo", anterior.Cargo, actualizado.Cargo);
        AgregarCambio(cambios, "Teléfono", anterior.Telefono, actualizado.Telefono);
        AgregarCambio(cambios, "Correo", anterior.Correo, actualizado.Correo);
        AgregarCambio(cambios, "Fecha de cumpleaños", anterior.FechaCumpleanos?.ToString("dd/MM/yyyy"), actualizado.FechaCumpleanos?.ToString("dd/MM/yyyy"));
        AgregarCambio(cambios, "Preferencia de contacto", anterior.PreferenciaContacto, actualizado.PreferenciaContacto);
        AgregarCambio(cambios, "Contacto principal", anterior.EsPrincipal ? "Sí" : "No", actualizado.EsPrincipal ? "Sí" : "No");
        if (principalActual is not null && dto.ConfirmarCambioPrincipal) cambios.Add($"«{principalActual.Nombre}» dejó de ser el contacto principal");

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoEmpresa", idContactoEmpresa, "CONTACTO_EDITADO",
            cambios.Count > 0 ? string.Join("; ", cambios) : "Se guardó sin cambios en los datos.");

        return new GuardarContactoResultadoDto
        {
            Resultado = ResultadosContacto.Guardado,
            Contacto = actualizado,
            PrincipalActual = principalActual,
            Mensaje = $"Los datos del contacto {CodigoContacto(idContactoEmpresa)} se actualizaron." +
                      (principalActual is not null && dto.ConfirmarCambioPrincipal ? $" «{principalActual.Nombre}» dejó de ser el contacto principal." : "")
        };
    }

    // CRMGPSC-007: desactivar
    public async Task<ContactoAccionResultadoDto> DesactivarContactoAsync(int idContactoEmpresa, DesactivarContactoDto dto, int idUsuario)
    {
        var motivo = Normalizar(dto.Motivo);
        if (motivo is null)
            throw new ValidacionException("Debe indicar el motivo de la desactivación del contacto.", new List<string> { "Motivo" });
        if (motivo.Length > 300)
            throw new ValidacionException("El motivo no puede superar los 300 caracteres.", new List<string> { "Motivo: no puede superar los 300 caracteres." });

        var actual = await da.ObtenerContactoAsync(idContactoEmpresa) ?? throw new ReglaNegocioException("El contacto indicado no existe.");
        if (!actual.Activo)
            return new ContactoAccionResultadoDto
            {
                Resultado = ResultadosProspecto.SinCambios,
                Contacto = actual,
                Mensaje = $"El contacto {CodigoContacto(idContactoEmpresa)} ya se encuentra inactivo. No se registró ningún cambio."
            };

        if (actual.EsPrincipal)
        {
            var otros = (await da.ListarContactosAsync(actual.Tipo, actual.IdEmpresa, null, true)).Where(c => c.IdContactoEmpresa != idContactoEmpresa).ToList();
            if (otros.Count > 0)
            {
                if (dto.IdNuevoPrincipal is null)
                    throw new ReglaNegocioException("Elija otro contacto activo como principal antes de desactivar.");
                if (otros.All(c => c.IdContactoEmpresa != dto.IdNuevoPrincipal))
                    throw new ReglaNegocioException("El contacto elegido como nuevo principal debe ser un contacto activo de la misma empresa.");
            }
        }

        var fila = await da.DesactivarContactoAsync(idContactoEmpresa, motivo, dto.IdNuevoPrincipal, idUsuario);
        var contacto = await da.ObtenerContactoAsync(idContactoEmpresa);

        if (fila.Resultado == "SinCambios")
            return new ContactoAccionResultadoDto
            {
                Resultado = ResultadosProspecto.SinCambios,
                Contacto = contacto,
                Mensaje = $"El contacto {CodigoContacto(idContactoEmpresa)} ya se encuentra inactivo. No se registró ningún cambio."
            };

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoEmpresa", idContactoEmpresa, "CONTACTO_DESACTIVADO",
            $"{fila.Nombre} pasó de Activo a Inactivo. Motivo: {motivo}" + (fila.NombreNuevoPrincipal is null ? "" : $". Nuevo contacto principal: {fila.NombreNuevoPrincipal}"));

        return new ContactoAccionResultadoDto
        {
            Resultado = ResultadosProspecto.Aplicado,
            Contacto = contacto,
            Mensaje = $"El contacto {CodigoContacto(idContactoEmpresa)} quedó Inactivo; sus interacciones y seguimientos pasados se conservan." +
                      (fila.NombreNuevoPrincipal is null ? "" : $" «{fila.NombreNuevoPrincipal}» es ahora el contacto principal.")
        };
    }

    // CRMGPSC-007: reactivar
    public async Task<ContactoAccionResultadoDto> ReactivarContactoAsync(int idContactoEmpresa, int idUsuario)
    {
        var actual = await da.ObtenerContactoAsync(idContactoEmpresa) ?? throw new ReglaNegocioException("El contacto indicado no existe.");
        if (actual.Activo)
            return new ContactoAccionResultadoDto
            {
                Resultado = ResultadosProspecto.SinCambios,
                Contacto = actual,
                Mensaje = $"El contacto {CodigoContacto(idContactoEmpresa)} ya se encuentra activo. No se registró ningún cambio."
            };

        var fila = await da.ReactivarContactoAsync(idContactoEmpresa, idUsuario);
        var contacto = await da.ObtenerContactoAsync(idContactoEmpresa);

        if (fila.Resultado == "SinCambios")
            return new ContactoAccionResultadoDto
            {
                Resultado = ResultadosProspecto.SinCambios,
                Contacto = contacto,
                Mensaje = $"El contacto {CodigoContacto(idContactoEmpresa)} ya se encuentra activo. No se registró ningún cambio."
            };

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoEmpresa", idContactoEmpresa, "CONTACTO_REACTIVADO",
            $"{fila.Nombre} pasó de Inactivo a Activo" + (fila.SinMarcaPrincipal ? ". Se reactivó sin marca de contacto principal porque la empresa ya tiene otro" : ""));

        return new ContactoAccionResultadoDto
        {
            Resultado = ResultadosProspecto.Aplicado,
            SinMarcaPrincipal = fila.SinMarcaPrincipal,
            Contacto = contacto,
            Mensaje = $"El contacto {CodigoContacto(idContactoEmpresa)} quedó Activo y ya puede usarse en seguimientos." +
                      (fila.SinMarcaPrincipal ? " Se reactivó sin la marca de contacto principal porque la empresa ya tiene otro." : "")
        };
    }

    private static GuardarContactoResultadoDto SolicitarConfirmacionPrincipal(ContactoEmpresaDto principalActual, string nombreNuevo) => new()
    {
        Resultado = ResultadosContacto.RequiereConfirmacion,
        RequiereConfirmacion = true,
        CodigoConfirmacion = "CAMBIO_PRINCIPAL",
        PrincipalActual = principalActual,
        Mensaje = $"Esta empresa ya tiene como contacto principal a «{principalActual.Nombre}». ¿Desea que «{nombreNuevo}» pase a ser el contacto principal? Al confirmar se retira la marca al contacto anterior."
    };

    // ====================================================================================================================
    // Validaciones y utilidades
    // ====================================================================================================================

    private sealed record DatosProspecto(string Empresa, string? Contacto, string? Correo, string? Telefono, string? Sector, string? Direccion, int? TamanoFlota, string? Fuente);
    private sealed record DatosContacto(string Nombre, string? Cargo, string? Telefono, string? Correo, DateTime? FechaCumpleanos, string Preferencia);

    // Junta TODOS los problemas (obligatorios, medio de contacto y formatos) para que la pantalla marque cada campo a corregir.
    // Cada elemento de `errores` empieza con el nombre del campo; si trae una explicación, va después de «: ».
    private static DatosProspecto ValidarDatosProspecto(string? empresaIn, string? sectorIn, string? direccionIn, string? telefonoIn, string? correoIn, string? contactoIn,
        decimal? flotaIn, string? fuenteIn, List<string> errores, out string? mensaje)
    {
        var empresa = NormalizarNombre(empresaIn);
        var sector = Normalizar(sectorIn);
        var direccion = Normalizar(direccionIn);
        var telefono = Normalizar(telefonoIn);
        var correo = Normalizar(correoIn);
        var contacto = Normalizar(contactoIn);
        var fuente = Normalizar(fuenteIn);

        var faltantes = new List<string>();
        if (empresa is null) faltantes.Add("Empresa");
        if (sector is null) faltantes.Add("Sector");
        if (fuente is null) faltantes.Add("Fuente del contacto");

        var sinMedio = correo is null && telefono is null;
        var formatos = new List<string>();
        if (empresa is { Length: > 150 }) formatos.Add("Empresa: no puede superar los 150 caracteres.");
        if (sector is not null && !CrmCatalogos.SectoresEmpresa.Contains(sector)) formatos.Add("Sector: seleccione un valor de la lista.");
        if (direccion is { Length: > 300 }) formatos.Add("Dirección: no puede superar los 300 caracteres.");
        if (contacto is { Length: > 150 }) formatos.Add("Contacto: no puede superar los 150 caracteres.");
        if (fuente is not null && !CrmCatalogos.FuentesProspecto.Contains(fuente)) formatos.Add("Fuente del contacto: seleccione un valor de la lista.");
        if (correo is not null && (correo.Length > 150 || !PatronCorreo.IsMatch(correo)))
            formatos.Add("Correo electrónico: formato inválido (ejemplo: nombre@empresa.com).");
        if (telefono is not null && !TelefonoValido(telefono))
            formatos.Add("Teléfono: formato inválido (use de 7 a 20 caracteres: números, +, -, espacios y paréntesis).");
        int? flota = null;
        if (flotaIn is not null)
        {
            if (flotaIn < 0 || flotaIn > MaximoFlota || flotaIn != decimal.Truncate(flotaIn.Value))
                formatos.Add($"Tamaño estimado de la flota: debe ser un número entero entre 0 y {MaximoFlota}.");
            else
                flota = (int)flotaIn.Value;
        }

        errores.AddRange(faltantes);
        if (sinMedio)
        {
            errores.Add("Teléfono");
            errores.Add("Correo electrónico");
        }
        errores.AddRange(formatos);

        mensaje = faltantes.Count > 0
            ? "Debe completar los campos obligatorios del prospecto."
            : sinMedio
                ? "Debe ingresar al menos un medio de contacto: teléfono o correo electrónico."
                : formatos.Count > 0
                    ? "Hay campos con formato inválido. Corrija los campos indicados."
                    : null;

        return new DatosProspecto(empresa ?? "", contacto, correo, telefono, sector, direccion, flota, fuente);
    }

    private DatosContacto ValidarDatosContacto(string? nombreIn, string? cargoIn, string? telefonoIn, string? correoIn, DateTime? cumpleIn, string? preferenciaIn,
        List<string> errores, out string? mensaje)
    {
        var nombre = NormalizarNombre(nombreIn);
        var cargo = Normalizar(cargoIn);
        var telefono = Normalizar(telefonoIn);
        var correo = Normalizar(correoIn);
        var preferencia = Normalizar(preferenciaIn) ?? "Cualquiera";

        var sinNombre = nombre is null;
        var sinMedio = correo is null && telefono is null;
        var formatos = new List<string>();
        if (nombre is { Length: > 150 }) formatos.Add("Nombre completo: no puede superar los 150 caracteres.");
        if (cargo is { Length: > 100 }) formatos.Add("Cargo: no puede superar los 100 caracteres.");
        if (correo is not null && (correo.Length > 150 || !PatronCorreo.IsMatch(correo)))
            formatos.Add("Correo electrónico: formato inválido (ejemplo: nombre@empresa.com).");
        if (telefono is not null && !TelefonoValido(telefono))
            formatos.Add("Teléfono: formato inválido (use de 7 a 20 caracteres: números, +, -, espacios y paréntesis).");
        if (!CrmCatalogos.PreferenciasContacto.Contains(preferencia))
            formatos.Add("Preferencia de contacto: elija Teléfono, Correo o Cualquiera.");
        DateTime? cumple = null;
        if (cumpleIn is not null)
        {
            cumple = cumpleIn.Value.Date;
            if (cumple < FechaMinimaCumpleanos) formatos.Add("Fecha de cumpleaños: no puede ser anterior a 1900.");
            else if (cumple > AhoraCostaRica().Date) formatos.Add("Fecha de cumpleaños: no puede ser futura.");
        }

        if (sinNombre) errores.Add("Nombre completo");
        if (sinMedio)
        {
            errores.Add("Teléfono");
            errores.Add("Correo electrónico");
        }
        errores.AddRange(formatos);

        mensaje = sinNombre || sinMedio
            ? sinNombre && sinMedio ? "Debe ingresar el nombre completo del contacto y al menos un medio de contacto (teléfono o correo electrónico)."
              : sinNombre ? "Debe ingresar el nombre completo del contacto."
              : "Debe ingresar al menos un medio de contacto: teléfono o correo electrónico."
            : formatos.Count > 0 ? "Hay campos con formato inválido. Corrija los campos indicados." : null;

        return new DatosContacto(nombre ?? "", cargo, telefono, correo, cumple, preferencia);
    }

    private static bool TelefonoValido(string telefono) => PatronTelefono.IsMatch(telefono) && SoloDigitos(telefono).Length >= 7;

    private static string SoloDigitos(string? texto) => new((texto ?? "").Where(char.IsDigit).ToArray());

    private static string? Normalizar(string? texto)
    {
        var limpio = texto?.Trim();
        return string.IsNullOrEmpty(limpio) ? null : limpio;
    }

    // Nombres de empresa y de personas: sin espacios al inicio, al final ni repetidos.
    private static string? NormalizarNombre(string? texto)
    {
        var limpio = Normalizar(texto);
        return limpio is null ? null : EspaciosRepetidos.Replace(limpio, " ");
    }

    private static string ConDeterminante(string motivo) => motivo.Replace("mismo", "el mismo");

    private static void AgregarCambio(List<string> cambios, string campo, string? anterior, string? nuevo)
    {
        if (string.Equals(anterior ?? "", nuevo ?? "", StringComparison.Ordinal)) return;
        cambios.Add($"{campo}: «{(string.IsNullOrEmpty(anterior) ? "(vacío)" : anterior)}» -> «{(string.IsNullOrEmpty(nuevo) ? "(vacío)" : nuevo)}»");
    }
}
