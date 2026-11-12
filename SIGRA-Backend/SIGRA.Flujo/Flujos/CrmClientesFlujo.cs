using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Text.RegularExpressions;

namespace SIGRA.Flujo.Flujos;

// CRMGPSC-019 a 021: conversión de prospectos en clientes, responsable comercial y perfil del cliente
public class CrmClientesFlujo(ICrmClientesDA da, ICrmProspectosDA prospectos, ICrmCatalogosDA catalogos, IAuditoriaDA auditoria,
    IUsuarioDA usuarios, IRolPermisoDA permisos, TimeProvider? reloj = null) : ICrmClientesFlujo
{
    private const string ModuloAuditoria = "CRM";
    private const string RolAdministrador = "Administrador del sistema";
    private static readonly string[] Monedas = { "CRC", "USD" };
    private static readonly TimeZoneInfo ZonaCostaRica = ObtenerZonaCostaRica();

    private readonly TimeProvider _reloj = reloj ?? TimeProvider.System;

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

    private DateTime HoyCostaRica() => TimeZoneInfo.ConvertTime(_reloj.GetUtcNow(), ZonaCostaRica).Date;

    private static string? Normalizar(string? t) => string.IsNullOrWhiteSpace(t) ? null : t.Trim();

    private async Task<UsuarioModelAcceso> UsuarioAsync(int idUsuario)
    {
        var u = await usuarios.ObtenerPorIdAsync(idUsuario) ?? throw new AccesoDenegadoException("La cuenta ya no está activa.");
        return new UsuarioModelAcceso(u.IdUsuario, u.IdRol, string.Equals(u.NombreRol, RolAdministrador, StringComparison.OrdinalIgnoreCase));
    }

    private sealed record UsuarioModelAcceso(int IdUsuario, int IdRol, bool EsAdministrador);

    public Task<List<ClienteCrmDto>> ListarClientesAsync(string? texto, int? idVendedor, string? estado)
    {
        estado = Normalizar(estado);
        if (estado is not null && estado is not ("Activo" or "Inactivo"))
            throw new ReglaNegocioException("El estado indicado no es válido.");
        return da.ListarClientesAsync(Normalizar(texto), idVendedor, estado);
    }

    public async Task EditarAsync(int idCliente, EditarClienteDto dto, int idUsuario)
    {
        var usuario = await UsuarioAsync(idUsuario);
        var perfil = await da.ObtenerPerfilAsync(idCliente, idUsuario) ?? throw new ReglaNegocioException("El cliente indicado no existe.");
        if (!usuario.EsAdministrador && perfil.Cliente.IdVendedor != idUsuario)
            throw new AccesoDenegadoException("Solo el responsable del cliente o un administrador puede editar sus datos.");

        var empresa = Normalizar(dto.Empresa);
        var correo = Normalizar(dto.Correo);
        var contacto = Normalizar(dto.Contacto);
        var telefono = Normalizar(dto.Telefono);
        if (empresa is null) throw new ValidacionException("La empresa es obligatoria.", new List<string> { "Empresa" });
        if (empresa.Length > 150) throw new ReglaNegocioException("La empresa no puede superar 150 caracteres.");
        if (contacto?.Length > 150) throw new ReglaNegocioException("El contacto no puede superar 150 caracteres.");
        if (correo is not null && (correo.Length > 150 || !Regex.IsMatch(correo, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")))
            throw new ValidacionException("El correo no tiene un formato válido.", new List<string> { "Correo" });
        if (telefono is not null && (telefono.Length > 20 || !Regex.IsMatch(telefono, @"^[0-9+() -]{7,20}$")))
            throw new ValidacionException("El contacto telefónico no tiene un formato válido.", new List<string> { "Teléfono" });
        if (dto.TamanoFlota is < 0) throw new ReglaNegocioException("El tamaño de la flota no puede ser negativo.");

        await da.EditarAsync(idCliente, new EditarClienteDto
        {
            Empresa = empresa,
            Contacto = contacto,
            Correo = correo,
            Telefono = telefono,
            Sector = Normalizar(dto.Sector),
            Direccion = Normalizar(dto.Direccion),
            TamanoFlota = dto.TamanoFlota
        });
        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Cliente", idCliente, "CLIENTE_EDITADO",
            $"Se actualizaron los datos comerciales de {empresa}.");
    }

    public async Task<EstadoClienteResultadoDto> CambiarEstadoAsync(int idCliente, CambiarEstadoClienteDto dto, int idUsuario)
    {
        var usuario = await UsuarioAsync(idUsuario);
        var perfil = await da.ObtenerPerfilAsync(idCliente, idUsuario) ?? throw new ReglaNegocioException("El cliente indicado no existe.");
        if (!usuario.EsAdministrador && perfil.Cliente.IdVendedor != idUsuario)
            throw new AccesoDenegadoException("Solo el responsable del cliente o un administrador puede cambiar su estado.");

        var motivo = Normalizar(dto.Motivo);
        var resultado = await da.CambiarEstadoAsync(idCliente, dto.Activo, motivo, idUsuario);
        var cliente = (await da.ListarClientesAsync(null, null, null)).Single(c => c.IdCliente == idCliente);
        if (resultado.Obligaciones.Count > 0)
        {
            return new EstadoClienteResultadoDto
            {
                Cliente = cliente,
                Mensaje = $"No se puede desactivar el cliente: {string.Join(" y ", resultado.Obligaciones)}.",
                Obligaciones = resultado.Obligaciones
            };
        }

        if (resultado.Cambio)
        {
            await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Cliente", idCliente,
                dto.Activo ? "CLIENTE_REACTIVADO" : "CLIENTE_DESACTIVADO",
                dto.Activo ? "Se reactivó el cliente conservando su historial." : $"Se desactivó el cliente. Motivo: {motivo}");
        }

        return new EstadoClienteResultadoDto
        {
            Cliente = cliente,
            Mensaje = resultado.Cambio
                ? (dto.Activo ? "Cliente reactivado correctamente." : "Cliente desactivado correctamente.")
                : $"El cliente ya estaba {(dto.Activo ? "activo" : "inactivo")}.",
            Obligaciones = resultado.Obligaciones
        };
    }

    // CRMGPSC-021: todo el cliente en una pantalla. Las secciones sensibles se ocultan según el permiso del rol en su módulo.
    public async Task<PerfilClienteDto> ObtenerPerfilAsync(int idCliente, int idUsuario)
    {
        var perfil = await da.ObtenerPerfilAsync(idCliente, idUsuario) ?? throw new ReglaNegocioException("El cliente indicado no existe.");
        var u = await UsuarioAsync(idUsuario);
        var lectura = (await permisos.ObtenerPorRolAsync(u.IdRol)).Where(p => p.Lectura).Select(p => p.IdModulo).ToHashSet();
        bool Puede(params int[] modulos) => modulos.Any(lectura.Contains);

        static void Resolver<T>(SeccionPerfilDto<T> seccion, bool visible, string vacio)
        {
            seccion.Visible = visible;
            if (!visible) { seccion.Items = new(); seccion.Mensaje = "Su rol no tiene permiso para ver esta sección."; return; }
            seccion.Mensaje = seccion.Items.Count == 0 ? vacio : null;
        }

        Resolver(perfil.Contactos, true, "El cliente no tiene contactos registrados.");
        Resolver(perfil.Responsables, true, "Todavía no se ha cambiado el responsable de este cliente.");
        var verFacturas = Puede(7);
        if (!verFacturas) perfil.Ventas.Items = perfil.Ventas.Items.Where(v => v.Origen != "Factura de venta").ToList();
        Resolver(perfil.Ventas, true, "No hay ventas registradas para este cliente.");
        Resolver(perfil.Equipos, Puede(3, 7), "El cliente no tiene equipos en alquiler.");
        Resolver(perfil.Contratos, Puede(3, 7), "El cliente no tiene contratos de alquiler.");
        Resolver(perfil.Frecuencias, Puede(11), "El cliente no tiene frecuencias registradas.");
        Resolver(perfil.Tickets, Puede(2), "El cliente no tiene boletas de servicio técnico.");
        Resolver(perfil.Facturas, verFacturas, "El cliente no tiene facturas.");
        Resolver(perfil.Cotizaciones, true, "El cliente no tiene cotizaciones.");
        Resolver(perfil.Notas, true, "No hay notas registradas.");
        Resolver(perfil.Interacciones, true, "No hay interacciones registradas.");
        Resolver(perfil.Seguimientos, true, "No hay seguimientos programados.");
        return perfil;
    }

    // CRMGPSC-019: convierte un prospecto en cliente (o lo vincula a uno existente) conservando su historial.
    public async Task<ConvertirProspectoResultadoDto> ConvertirProspectoAsync(int idProspecto, ConvertirProspectoDto dto, int idUsuario)
    {
        var prospecto = await prospectos.ObtenerProspectoAsync(idProspecto) ?? throw new ReglaNegocioException("El prospecto indicado no existe.");
        var u = await UsuarioAsync(idUsuario);
        if (!u.EsAdministrador && prospecto.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo el vendedor responsable o el administrador pueden convertir este prospecto en cliente.");
        if (prospecto.Estado == "Convertido") throw new ReglaNegocioException("El prospecto ya fue convertido en cliente.");
        if (prospecto.Estado == "Descartado") throw new ReglaNegocioException("El prospecto está descartado: reactívelo antes de convertirlo en cliente.");

        // La venta inicial es obligatoria: se avisan juntos todos los datos que faltan.
        var venta = dto.VentaInicial ?? new VentaInicialDto();
        var producto = Normalizar(venta.Producto);
        var moneda = Normalizar(venta.Moneda)?.ToUpperInvariant();
        var pendientes = new List<string>();
        if (producto is null) pendientes.Add("Producto o servicio");
        if (venta.Cantidad is null or < 1) pendientes.Add("Cantidad");
        if (venta.Monto is null or <= 0) pendientes.Add("Monto");
        if (moneda is null) pendientes.Add("Moneda");
        if (venta.Fecha is null) pendientes.Add("Fecha");
        if (pendientes.Count > 0)
            throw new ValidacionException("Complete la venta inicial para convertir el prospecto en cliente.", pendientes);
        if (!Monedas.Contains(moneda!)) throw new ReglaNegocioException("El tipo de moneda no está permitido. Seleccione colones (CRC) o dólares (USD).");
        if (producto!.Length > 200) throw new ReglaNegocioException("El producto o servicio no puede superar los 200 caracteres.");
        if (venta.Cantidad > 100000) throw new ReglaNegocioException("La cantidad indicada no es válida.");
        if (venta.Fecha!.Value.Date > HoyCostaRica()) throw new ReglaNegocioException("La fecha de la venta no puede ser posterior a hoy.");

        // Si ya hay un cliente con el mismo correo, teléfono o nombre hay que vincular el prospecto a él (o confirmar que es otro).
        if (dto.IdClienteExistente is null)
        {
            var coincidencias = (await prospectos.BuscarCoincidenciasAsync(prospecto.Empresa, prospecto.Correo, prospecto.Telefono, idProspecto))
                .Where(c => c.Tipo == "Cliente").ToList();
            if (coincidencias.Count > 0)
                return new ConvertirProspectoResultadoDto
                {
                    Resultado = "RequiereVinculo",
                    Coincidencias = coincidencias,
                    Mensaje = "Ya existe un cliente con datos iguales a los del prospecto. Vincule el prospecto con ese cliente para no crear uno duplicado."
                };
        }

        var idCliente = await da.ConvertirProspectoAsync(idProspecto, dto.IdClienteExistente, producto, venta.Cantidad!.Value, venta.Monto!.Value, moneda!, venta.Fecha.Value, idUsuario);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Prospecto", idProspecto, "PROSPECTO_CONVERTIDO",
            $"{prospecto.Empresa} → cliente CL-{idCliente:0000}{(dto.IdClienteExistente is null ? "" : " (vinculado a un cliente existente)")}. Venta inicial: {venta.Cantidad} × {producto}, {moneda} {venta.Monto:0.##}");

        return new ConvertirProspectoResultadoDto
        {
            Resultado = "Convertido",
            IdCliente = idCliente,
            Mensaje = dto.IdClienteExistente is null
                ? $"El prospecto se convirtió en el cliente CL-{idCliente:0000}. Sus contactos, cotizaciones, notas, seguimientos e interacciones pasaron al cliente."
                : $"El prospecto se vinculó con el cliente CL-{idCliente:0000} sin crear uno nuevo. Su historial pasó a ese cliente."
        };
    }

    // CRMGPSC-020: la coordinación asigna o reasigna el vendedor responsable de un prospecto o de un cliente.
    public async Task<AsignarResponsableResultadoDto> AsignarResponsableAsync(string tipo, int idEmpresa, AsignarResponsableDto dto, int idUsuario)
    {
        var u = await UsuarioAsync(idUsuario);
        if (!u.EsAdministrador) throw new AccesoDenegadoException("Solo la coordinación de ventas (administrador) puede asignar o reasignar responsables.");

        var tipoCanonico = string.Equals(tipo, "prospectos", StringComparison.OrdinalIgnoreCase) || string.Equals(tipo, "prospecto", StringComparison.OrdinalIgnoreCase) ? "Prospecto"
            : string.Equals(tipo, "clientes", StringComparison.OrdinalIgnoreCase) || string.Equals(tipo, "cliente", StringComparison.OrdinalIgnoreCase) ? "Cliente"
            : throw new ReglaNegocioException("El tipo de registro no es válido.");

        if (dto.IdVendedor is null) throw new ValidacionException("Seleccione el vendedor responsable.", new List<string> { "Vendedor" });
        var motivo = Normalizar(dto.Motivo);
        if (motivo?.Length > 300) throw new ReglaNegocioException("El motivo no puede superar los 300 caracteres.");

        string? vendedorActual;
        if (tipoCanonico == "Prospecto")
        {
            var p = await prospectos.ObtenerProspectoAsync(idEmpresa) ?? throw new ReglaNegocioException("El prospecto indicado no existe.");
            if (p.Estado is "Convertido" or "Descartado") throw new ReglaNegocioException($"El prospecto está {p.Estado.ToLowerInvariant()}: ya no admite cambios de responsable.");
            vendedorActual = p.IdVendedor is null ? null : p.Vendedor;
            if (p.IdVendedor is not null && p.IdVendedor != dto.IdVendedor && motivo is null)
                throw new ValidacionException("Indique el motivo de la reasignación.", new List<string> { "Motivo" });
        }
        else
        {
            var perfil = await da.ObtenerPerfilAsync(idEmpresa, idUsuario) ?? throw new ReglaNegocioException("El cliente indicado no existe.");
            vendedorActual = perfil.Cliente.IdVendedor is null ? null : perfil.Cliente.Vendedor;
            if (perfil.Cliente.IdVendedor is not null && perfil.Cliente.IdVendedor != dto.IdVendedor && motivo is null)
                throw new ValidacionException("Indique el motivo de la reasignación.", new List<string> { "Motivo" });
        }

        var vendedores = await catalogos.ListarVendedoresAsync();
        var nuevo = vendedores.FirstOrDefault(v => v.IdUsuario == dto.IdVendedor)
            ?? throw new ReglaNegocioException("El vendedor seleccionado está inactivo o no está disponible. Elija un vendedor activo.");

        var r = await da.AsignarResponsableAsync(tipoCanonico, idEmpresa, dto.IdVendedor.Value, motivo, idUsuario);
        if (!r.Cambio)
        {
            r.Mensaje = $"No hubo cambios: {nuevo.Nombre} ya es el responsable vigente.";
            return r;
        }

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, tipoCanonico, idEmpresa, vendedorActual is null ? "RESPONSABLE_ASIGNADO" : "RESPONSABLE_REASIGNADO",
            vendedorActual is null ? $"Asignado a {nuevo.Nombre}" : $"{vendedorActual} → {nuevo.Nombre}. {motivo}");

        r.Mensaje = vendedorActual is null
            ? $"Se asignó a {nuevo.Nombre} como responsable."
            : $"El responsable cambió de {vendedorActual} a {nuevo.Nombre}." + (r.SeguimientosMovidos > 0 ? $" Se trasladaron {r.SeguimientosMovidos} seguimiento(s) pendiente(s)." : "");
        return r;
    }
}
