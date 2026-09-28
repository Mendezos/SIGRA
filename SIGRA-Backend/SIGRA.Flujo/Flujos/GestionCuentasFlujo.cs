using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using SIGRA.Flujo.Utilidades;
using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.RegularExpressions;

namespace SIGRA.Flujo.Flujos;

public class GestionCuentasFlujo : IGestionCuentasFlujo
{
    private readonly IGestionCuentasDA _cuentas;
    private readonly IPoliticaSeguridadDA _politicas;
    private readonly IRolPermisoDA _permisos;
    private readonly IPasswordHasher _hasher;

    public GestionCuentasFlujo(
        IGestionCuentasDA cuentas,
        IPoliticaSeguridadDA politicas,
        IRolPermisoDA permisos,
        IPasswordHasher hasher)
    {
        _cuentas = cuentas;
        _politicas = politicas;
        _permisos = permisos;
        _hasher = hasher;
    }

    public async Task<List<CuentaDto>> ListarAsync(FiltroCuentasDto filtro)
    {
        filtro.Texto = Opcional(filtro.Texto);

        if (filtro.Texto?.Length > 150 || filtro.IdRol <= 0)
            throw new ReglaNegocioException("Revise los filtros de cuentas.");

        var cuentas = await _cuentas.ListarAsync(filtro);

        foreach (var cuenta in cuentas)
        {
            cuenta.FechaCreacion = Utc(cuenta.FechaCreacion);
            cuenta.UltimoAcceso = Utc(cuenta.UltimoAcceso);
        }

        return cuentas;
    }

    public async Task<int> CrearAsync(CrearCuentaDto dto, int idAutor)
    {
        ValidarDatos(dto);

        dto.Cedula = Regex.Replace(dto.Cedula ?? "", @"[\s-]", "");

        if (!Regex.IsMatch(dto.Cedula, @"^[0-9]{9}$"))
            throw new ReglaNegocioException("La cédula debe tener nueve dígitos.");

        ValidarId(dto.IdRol);

        var politica = await _politicas.ObtenerActivaAsync()
            ?? throw new ReglaNegocioException(
                "No hay una política de seguridad configurada.");

        var password = dto.Password ?? "";
        var errores = PoliticaPasswordValidador.Validar(
            password, politica.LongitudMinimaPassword);

        if (Encoding.UTF8.GetByteCount(password) > 72)
            errores.Add("La contraseña no puede superar 72 bytes en UTF-8.");

        if (errores.Count > 0)
            throw new ValidacionException(
                "La contraseña no cumple los requisitos.", errores);

        var cambio = Datos(dto, idAutor) with
        {
            Operacion = "Crear",
            Cedula = dto.Cedula,
            IdRol = dto.IdRol,
            Activo = dto.Activo,
            PasswordHash = _hasher.Hash(password)
        };

        return await _cuentas.GuardarAsync(cambio);
    }

    public async Task EditarAsync(int idUsuario, DatosCuentaDto dto, int idAutor)
    {
        ValidarId(idUsuario);
        ValidarDatos(dto);

        await _cuentas.GuardarAsync(
            Datos(dto, idAutor) with { IdUsuario = idUsuario });
    }

    public async Task CambiarEstadoAsync(
        int idUsuario, CambiarEstadoCuentaDto dto, int idAutor)
    {
        ValidarId(idUsuario);
        dto.Motivo = Opcional(dto.Motivo);

        if (!dto.Activo && dto.Motivo is null)
            throw new ReglaNegocioException(
                "Indique el motivo de la desactivación.");

        if (dto.Motivo?.Length > 500)
            throw new ReglaNegocioException(
                "El motivo no puede superar 500 caracteres.");

        if (!dto.Activo && idUsuario == idAutor)
            throw new ReglaNegocioException(
                "No puede desactivar su propia cuenta.");

        if (dto.Activo && (!dto.IdRol.HasValue || dto.IdRol.Value <= 0))
            throw new ReglaNegocioException(
                "Seleccione el rol para reactivar la cuenta.");

        await _cuentas.GuardarAsync(new CambioCuenta(
            "Estado", idAutor, idUsuario,
            IdRol: dto.Activo ? dto.IdRol : null,
            Activo: dto.Activo,
            Motivo: dto.Motivo));
    }

    public async Task CambiarRolAsync(
        int idUsuario, CambiarRolCuentaDto dto, int idAutor)
    {
        ValidarId(idUsuario);
        ValidarId(dto.IdRol);

        await _cuentas.GuardarAsync(new CambioCuenta(
            "Rol", idAutor, idUsuario, IdRol: dto.IdRol));
    }

    public async Task<List<RolCuentaDto>> RolesAsync()
    {
        var roles = await _cuentas.RolesAsync();

        foreach (var rol in roles)
            rol.Permisos = await _permisos.ObtenerPorRolAsync(rol.IdRol);

        return roles;
    }

    public async Task<List<RegistroAuditoriaDto>> AuditoriaAsync(
        FiltroAuditoriaDto filtro)
    {
        filtro.Entidad = Opcional(filtro.Entidad);
        filtro.Accion = Opcional(filtro.Accion);
        filtro.Desde = filtro.Desde?.Date;
        filtro.Hasta = filtro.Hasta?.Date;

        if (filtro.Entidad?.Length > 100 || filtro.Accion?.Length > 50
            || filtro.IdEntidad <= 0 || filtro.IdUsuarioAfectado <= 0
            || filtro.IdAutor <= 0)
            throw new ReglaNegocioException(
                "Revise los filtros de auditoría.");

        if (filtro.Desde > filtro.Hasta)
            throw new ReglaNegocioException(
                "La fecha inicial no puede ser posterior a la final.");

        if (filtro.Hasta == DateTime.MaxValue.Date)
            throw new ReglaNegocioException(
                "La fecha final está fuera del rango permitido.");

        var registros = await _cuentas.AuditoriaAsync(filtro);

        foreach (var registro in registros)
            registro.Fecha = DateTime.SpecifyKind(
                registro.Fecha, DateTimeKind.Utc);

        return registros;
    }

    private static CambioCuenta Datos(DatosCuentaDto d, int autor) =>
        new("Editar", autor,
            Nombre: d.Nombre,
            Correo: d.Correo,
            FechaNacimiento: d.FechaNacimiento?.Date,
            Telefono: d.Telefono,
            Direccion: d.Direccion,
            EstadoCivil: d.EstadoCivil,
            GradoAcademico: d.GradoAcademico,
            Salario: d.Salario);

    private static void ValidarDatos(DatosCuentaDto dto)
    {
        dto.Nombre = (dto.Nombre ?? "").Trim();
        dto.Correo = (dto.Correo ?? "").Trim().ToLowerInvariant();
        dto.Direccion = (dto.Direccion ?? "").Trim();
        dto.EstadoCivil = (dto.EstadoCivil ?? "").Trim();
        dto.GradoAcademico = (dto.GradoAcademico ?? "").Trim();
        dto.Telefono = Regex.Replace(dto.Telefono ?? "", @"[\s()-]", "");

        if (dto.Telefono.StartsWith("+506"))
            dto.Telefono = dto.Telefono[4..];

        var errores = new List<string>();

        RevisarTexto(dto.Nombre, 150, "El nombre", errores);
        RevisarTexto(dto.Correo, 150, "El correo", errores);
        RevisarTexto(dto.Direccion, 300, "La dirección", errores);
        RevisarTexto(dto.EstadoCivil, 50, "El estado civil", errores);
        RevisarTexto(dto.GradoAcademico, 100, "El grado académico", errores);

        if (!new EmailAddressAttribute().IsValid(dto.Correo))
            errores.Add("El correo no es válido.");

        if (!Regex.IsMatch(dto.Telefono, @"^[0-9]{8}$"))
            errores.Add("El teléfono debe tener ocho dígitos.");

        var hoy = DateTime.UtcNow.AddHours(-6).Date;

        if (!dto.FechaNacimiento.HasValue
            || dto.FechaNacimiento.Value.Date > hoy)
            errores.Add("Indique una fecha de nacimiento que no sea futura.");

        if (!dto.Salario.HasValue
            || dto.Salario < 0
            || dto.Salario > 9999999999999999.99m
            || (dto.Salario.HasValue
                && decimal.Round(dto.Salario.Value, 2) != dto.Salario.Value))
            errores.Add(
                "Indique un salario no negativo con un máximo de dos decimales.");

        if (errores.Count > 0)
            throw new ValidacionException(
                "Revise los datos de la cuenta.", errores);
    }

    private static void RevisarTexto(
        string valor, int maximo, string campo, List<string> errores)
    {
        if (string.IsNullOrWhiteSpace(valor) || valor.Length > maximo)
            errores.Add(
                $"{campo} es obligatorio y admite hasta {maximo} caracteres.");
    }

    private static void ValidarId(int id)
    {
        if (id <= 0)
            throw new ReglaNegocioException(
                "El identificador indicado no es válido.");
    }

    private static string? Opcional(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private static DateTime? Utc(DateTime? fecha) =>
        fecha.HasValue
            ? DateTime.SpecifyKind(fecha.Value, DateTimeKind.Utc)
            : null;
}