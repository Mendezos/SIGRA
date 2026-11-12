using SIGRA.Abstracciones.Servicios;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;

namespace SIGRA.DA.Servicios;

public class EncuestaCorreoService(
    IEmailService email,
    IConfiguration configuration,
    ILogger<EncuestaCorreoService> logger) : IEncuestaCorreoService
{
    public Task EnviarEnlaceAsync(
        string correo,
        string cliente,
        string numeroFactura,
        string token,
        DateTimeOffset fechaVencimiento)
    {
        var envioActivado = bool.TryParse(
            configuration["SendGrid:Activado"],
            out var activado) && activado;

        if (!envioActivado)
        {
            logger.LogInformation(
                "Envío de encuestas desactivado. No se envió correo para la factura {NumeroFactura} a {Correo}.",
                numeroFactura,
                correo);
            return Task.CompletedTask;
        }

        var baseUrl = configuration["Encuestas:UrlBase"]
            ?? "http://localhost:5173";
        var enlace = $"{baseUrl.TrimEnd('/')}/encuestas/responder/{token}";
        var cuerpo = $"""
            <p>Hola {WebUtility.HtmlEncode(cliente)},</p>
            <p>Queremos conocer tu experiencia con la factura
            <strong>{WebUtility.HtmlEncode(numeroFactura)}</strong>.</p>
            <p><a href="{WebUtility.HtmlEncode(enlace)}">Responder encuesta de satisfacción</a></p>
            <p>El enlace vence el {fechaVencimiento:dd/MM/yyyy} y solo puede utilizarse una vez.</p>
            """;

        return email.EnviarAsync(
            correo,
            cliente,
            "Encuesta de satisfacción SIGRA",
            cuerpo);
    }
}
