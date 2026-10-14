using System.Net;
using System.Text.Json;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;

namespace SIGRA.Flujo.Servicios;

public class CorreosPendientesService(INotificacionesDA notificaciones, IEmailService email) : ICorreosPendientesService
{
    public async Task<bool> EnviarAhoraAsync(long? idCorreo = null)
    {
        var correo = await notificaciones.TomarCorreoAsync(idCorreo);
        if (correo is null) return false;
        try
        {
            var adjuntos = JsonSerializer.Deserialize<List<AdjuntoCorreoDto>>(correo.AdjuntosJson, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new();
            var html = "<p>" + WebUtility.HtmlEncode(correo.Cuerpo).Replace("\n", "<br>") + "</p>";
            await email.EnviarAsync(correo.Destinatario, correo.Nombre, correo.Asunto, html, adjuntos);
            await notificaciones.FinalizarCorreoAsync(correo.IdCorreo, true, null);
            return true;
        }
        catch (Exception ex)
        {
            await notificaciones.FinalizarCorreoAsync(correo.IdCorreo, false, ex.Message.Length > 500 ? ex.Message[..500] : ex.Message);
            return false;
        }
    }
}
