using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Flujo.Flujos;

public class PoliticaSeguridadFlujo : IPoliticaSeguridadFlujo
{
    private readonly IPoliticaSeguridadDA _politicaDA;
    private readonly IAuditoriaDA _auditoriaDA;

    public PoliticaSeguridadFlujo(IPoliticaSeguridadDA politicaDA, IAuditoriaDA auditoriaDA)
    {
        _politicaDA = politicaDA;
        _auditoriaDA = auditoriaDA;
    }

    public async Task<PoliticaSeguridadModel> ObtenerActivaAsync()
    {
        return await _politicaDA.ObtenerActivaAsync()
            ?? throw new ReglaNegocioException("No hay una política de seguridad activa configurada.");
    }

    public async Task<PoliticaSeguridadModel> CrearNuevaVersionAsync(
        int minutosInactividad, int maxIntentosFallidos, int longitudMinimaPassword,
        int minutosBloqueo, int vigenciaEnlaceMinutos, int idUsuarioAdministrador)
    {
        var errores = new List<string>();

        if (minutosInactividad < 1 || minutosInactividad > 240)
            errores.Add("Los minutos máximos de inactividad deben estar entre 1 y 240.");
        if (maxIntentosFallidos < 3 || maxIntentosFallidos > 10)
            errores.Add("La cantidad máxima de intentos fallidos debe estar entre 3 y 10.");
        if (longitudMinimaPassword < 6 || longitudMinimaPassword > 32)
            errores.Add("La longitud mínima de contraseña debe estar entre 6 y 32.");
        if (minutosBloqueo < 1 || minutosBloqueo > 1440)
            errores.Add("Los minutos de bloqueo deben estar entre 1 y 1440.");
        if (vigenciaEnlaceMinutos < 5 || vigenciaEnlaceMinutos > 1440)
            errores.Add("La vigencia del enlace de recuperación debe estar entre 5 y 1440 minutos.");

        if (errores.Count > 0)
            throw new ValidacionException("Uno o más valores están fuera del rango permitido.", errores);

        var nueva = await _politicaDA.CrearVersionAsync(new PoliticaSeguridadModel
        {
            MinutosInactividad = minutosInactividad,
            MaxIntentosFallidos = maxIntentosFallidos,
            LongitudMinimaPassword = longitudMinimaPassword,
            MinutosBloqueo = minutosBloqueo,
            VigenciaEnlaceMinutos = vigenciaEnlaceMinutos,
            IdUsuarioCreador = idUsuarioAdministrador
        });

        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "PoliticaSeguridad", nueva.IdPolitica, "POLITICA_ACTUALIZADA");

        return nueva;
    }
}
