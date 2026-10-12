using System.Globalization;
using System.Net.Mail;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Flujo.Servicios;

public static class ReglasTickets
{
    public static readonly string[] TiposServicio = ["Mantenimiento preventivo", "Mantenimiento correctivo", "Reparación", "Revisión diagnóstica"];
    public static readonly string[] Estados = ["Creada", "Asignada", "En proceso", "Cerrada", "Cancelada"];
    public static readonly string[] Etapas = ["En diagnóstico", "En espera de repuesto", "En reparación", "Reparado"];
    public static readonly string[] Especialidades = ["Radios", "Repetidoras"];
    public static readonly string[] Resoluciones = ["Reparado", "No reparado", "Garantía"];

    public static string Normalizar(string? texto) => string.Concat((texto ?? "").Trim().Normalize(System.Text.NormalizationForm.FormD)
        .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)).ToLowerInvariant();

    public static bool Rol(AccesoModuloModel actor, string rol) => Normalizar(actor.Rol) == Normalizar(rol);
    public static bool Administrador(AccesoModuloModel actor) => Rol(actor, "Administrador del sistema");
    public static bool Coordinador(AccesoModuloModel actor) => Rol(actor, "Coordinador técnico");
    public static bool Tecnico(AccesoModuloModel actor) => Rol(actor, "Técnico");
    public static bool Recepcionista(AccesoModuloModel actor) => Rol(actor, "Recepcionista");
    public static bool Gestion(AccesoModuloModel actor) => Administrador(actor) || Coordinador(actor);
    public static bool Abierta(TicketDetalleDto ticket) => ticket.Activo && ticket.Estado is "Creada" or "Asignada" or "En proceso";
    public static bool TipoReparacion(string tipo) => tipo is "Reparación" or "Revisión diagnóstica";

    public static void Exigir(bool permitido, string mensaje)
    {
        if (!permitido) throw new AccesoDenegadoException(mensaje);
    }

    public static void Editable(TicketDetalleDto ticket)
    {
        if (!Abierta(ticket)) throw new ReglaNegocioException("La boleta es de solo lectura por haber sido cerrada o cancelada, o por estar inactiva");
        if (ticket.FacturaEmitida) throw new ReglaNegocioException("Esta boleta tiene una factura emitida y no admite modificaciones. Solo puede corregirse mediante una nota de crédito desde facturación.");
    }

    public static byte[] Version(string version)
    {
        try
        {
            var bytes = Convert.FromBase64String(version);
            if (bytes.Length == 8) return bytes;
        }
        catch (FormatException) { }
        throw new ReglaNegocioException("Actualizá el detalle de la boleta antes de guardar los cambios.");
    }

    public static void ValidarPeriodo(DateOnly? desde, DateOnly? hasta)
    {
        if (desde.HasValue && hasta.HasValue && desde > hasta)
            throw new ReglaNegocioException("La fecha inicial no puede ser posterior a la fecha final");
    }

    public static string Canonico(string? valor, string[] opciones, string campo)
    {
        var resultado = opciones.FirstOrDefault(o => Normalizar(o) == Normalizar(valor));
        return resultado ?? throw new ValidacionException("Revise los datos enviados.", [$"Seleccione una opción válida para {campo}."]);
    }

    public static void ValidarEntrada(RegistrarTicketDto dto)
    {
        var errores = new List<string>();
        dto.Empresa = (dto.Empresa ?? "").Trim(); dto.Contacto = (dto.Contacto ?? "").Trim(); dto.Telefono = (dto.Telefono ?? "").Trim();
        dto.Correo = Limpio(dto.Correo); dto.Cargo = Limpio(dto.Cargo);
        Requerido(dto.Empresa, 150, "Empresa o cliente", errores);
        Requerido(dto.Contacto, 150, "Nombre de contacto", errores);
        Requerido(dto.Telefono, 20, "Teléfono de contacto", errores);
        if (dto.Cargo?.Length > 100) errores.Add("El cargo no puede superar los 100 caracteres.");
        if (dto.Correo is not null && !CorreoValido(dto.Correo)) errores.Add("El correo electrónico no es válido.");
        if (string.IsNullOrWhiteSpace(dto.TipoServicio)) errores.Add("Debe seleccionar un tipo de servicio.");
        else dto.TipoServicio = Canonico(dto.TipoServicio, TiposServicio, "tipo de servicio");
        dto.Equipos ??= new();
        if (dto.Equipos.Count == 0) errores.Add("Debe registrar al menos un equipo.");
        var series = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var equipo in dto.Equipos)
        {
            equipo.Marca = (equipo.Marca ?? "").Trim(); equipo.Modelo = (equipo.Modelo ?? "").Trim();
            equipo.NumeroSerie = (equipo.NumeroSerie ?? "").Trim(); equipo.Problema = (equipo.Problema ?? "").Trim();
            Requerido(equipo.Marca, 100, "Marca del equipo", errores);
            Requerido(equipo.Modelo, 100, "Modelo del equipo", errores);
            Requerido(equipo.NumeroSerie, 50, "Número de serie", errores);
            Requerido(equipo.Problema, 5000, "Descripción de la falla", errores);
            equipo.Tipo = Canonico(equipo.Tipo, ["Portátil", "Móvil", "Base", "Repetidora"], "tipo de equipo");
            equipo.Especialidad = Canonico(equipo.Especialidad, Especialidades, "especialidad del equipo");
            if (equipo.Tipo == "Repetidora") equipo.Especialidad = "Repetidoras";
            if (!series.Add(equipo.NumeroSerie)) errores.Add("No se puede registrar dos veces el mismo número de serie en una boleta.");
            if (TipoReparacion(dto.TipoServicio) && equipo.Problema.Length < 10)
                errores.Add("La descripción de la falla debe tener al menos 10 caracteres para generar la reparación.");
            equipo.Accesorios = (equipo.Accesorios ?? new()).Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (equipo.Accesorios.Any(a => a.Length > 150)) errores.Add("El nombre de un accesorio no puede superar los 150 caracteres.");
        }
        if (errores.Count > 0) throw new ValidacionException("Completá o corregí los campos obligatorios.", errores);
    }

    public static bool CorreoValido(string correo) => !string.IsNullOrEmpty(correo) && correo.Length <= 150 && MailAddress.TryCreate(correo, out var direccion)
        && direccion.Address == correo && correo.Contains('@') && !correo.Any(char.IsWhiteSpace);

    public static void ValidarTrabajo(TrabajoTicketDto trabajo, bool esReparacion, bool cierre, bool cubierto)
    {
        trabajo.DetallesTrabajo = Limpio(trabajo.DetallesTrabajo); trabajo.Observaciones = Limpio(trabajo.Observaciones);
        trabajo.Hallazgos = Limpio(trabajo.Hallazgos); trabajo.Acciones = Limpio(trabajo.Acciones);
        trabajo.Repuesto = Limpio(trabajo.Repuesto); trabajo.JustificacionTecnica = Limpio(trabajo.JustificacionTecnica);
        trabajo.NumeroFactura = Limpio(trabajo.NumeroFactura); trabajo.Proveedor = Limpio(trabajo.Proveedor); trabajo.CasoProveedor = Limpio(trabajo.CasoProveedor);
        var errores = new List<string>();
        foreach (var texto in new[] { trabajo.DetallesTrabajo, trabajo.Observaciones, trabajo.Hallazgos, trabajo.Acciones, trabajo.JustificacionTecnica })
            if (texto?.Length > 5000) errores.Add("Los detalles y observaciones no pueden superar los 5000 caracteres por campo.");
        if (trabajo.NumeroFactura?.Length > 30) errores.Add("El número de factura no puede superar los 30 caracteres.");
        if (trabajo.Proveedor?.Length > 150 || trabajo.CasoProveedor?.Length > 100 || trabajo.Repuesto?.Length > 300)
            errores.Add("Revise la longitud del proveedor, caso o repuesto.");
        if (esReparacion)
        {
            trabajo.Etapa = Canonico(trabajo.Etapa, Etapas, "etapa de reparación");
            if (trabajo.Etapa == "En espera de repuesto" && trabajo.Repuesto is null) errores.Add("Debe indicar el repuesto pendiente.");
            if (cierre || !string.IsNullOrWhiteSpace(trabajo.Resolucion))
                Requerido(trabajo.Hallazgos, 5000, "Hallazgos técnicos", errores);
            if (cierre)
            {
                trabajo.Resolucion = Canonico(trabajo.Resolucion, Resoluciones, "resolución");
                if (trabajo.Resolucion == "No reparado" && (trabajo.JustificacionTecnica?.Length ?? 0) < 15)
                    errores.Add("La justificación técnica debe tener al menos 15 caracteres.");
            }
        }
        else if (cierre)
        {
            trabajo.ServicioRealizado = Canonico(trabajo.ServicioRealizado, ["Mantenimiento estándar", "Reparación", "Garantía aplicada"], "servicio realizado");
            Requerido(trabajo.DetallesTrabajo, 5000, "Detalles del trabajo", errores);
            trabajo.Resolucion = trabajo.ServicioRealizado switch { "Reparación" => "Reparado", "Garantía aplicada" => "Garantía", _ => "Mantenimiento realizado" };
        }
        if (cierre)
        {
            if (trabajo.Resolucion == "Garantía")
            {
                Requerido(trabajo.Proveedor, 150, "Proveedor", errores);
                Requerido(trabajo.CasoProveedor, 100, "Número de caso del proveedor", errores);
                if (string.IsNullOrWhiteSpace(trabajo.DetallesTrabajo) && string.IsNullOrWhiteSpace(trabajo.Acciones))
                    errores.Add("Debe indicar el detalle de la garantía aplicada.");
                trabajo.TieneCobro = false; trabajo.NumeroFactura = null; trabajo.Monto = null;
            }
            else if (trabajo.TieneCobro || (esReparacion && trabajo.Resolucion == "Reparado" && !cubierto))
            {
                trabajo.TieneCobro = true;
                Requerido(trabajo.NumeroFactura, 30, "Número de factura", errores);
                if (trabajo.Monto is null || trabajo.Monto <= 0) errores.Add("El monto debe ser un valor numérico mayor a cero");
            }
        }
        if (trabajo.Monto is < 0 || trabajo.Monto > 9999999999.99m) errores.Add("El monto indicado no es válido.");
        if (errores.Count > 0) throw new ValidacionException("Revise los datos técnicos.", errores);
    }

    public static DateTimeOffset Plazo(DateTimeOffset recepcion, int diasHabiles)
    {
        if (diasHabiles < 1) throw new ReglaNegocioException("El plazo debe ser al menos un día hábil.");
        var fecha = recepcion.ToOffset(TimeSpan.FromHours(-6));
        for (var i = 0; i < diasHabiles;)
        {
            fecha = fecha.AddDays(1);
            if (fecha.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday) i++;
        }
        return fecha.ToUniversalTime();
    }

    public static DateTimeOffset FechaManual(DateOnly fecha) => new DateTimeOffset(fecha.ToDateTime(new TimeOnly(23,59,59)), TimeSpan.FromHours(-6)).ToUniversalTime();
    public static string? Limpio(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
    private static void Requerido(string? valor, int maximo, string campo, List<string> errores)
    {
        if (string.IsNullOrWhiteSpace(valor)) errores.Add($"{campo} es obligatorio.");
        else if (valor.Length > maximo) errores.Add($"{campo} no puede superar los {maximo} caracteres.");
    }
}
