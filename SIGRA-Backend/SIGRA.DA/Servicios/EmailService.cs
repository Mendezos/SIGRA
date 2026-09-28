using Microsoft.Extensions.Configuration;
using SendGrid;
using SendGrid.Helpers.Mail;
using SIGRA.Abstracciones.Servicios;
using System.Text.RegularExpressions;

namespace SIGRA.DA.Servicios;

public class EmailService : IEmailService
{
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public EmailService(IConfiguration configuracion)
    {
        _apiKey = configuracion["SendGrid:ApiKey"]
            ?? throw new InvalidOperationException("Falta SendGrid:ApiKey en la configuracion.");
        _fromEmail = configuracion["SendGrid:FromEmail"]
            ?? throw new InvalidOperationException("Falta SendGrid:FromEmail en la configuracion.");
        _fromName = configuracion["SendGrid:FromName"] ?? "SIGRA";
    }

    public async Task EnviarAsync(string destinatarioCorreo, string destinatarioNombre, string asunto, string cuerpoHtml)
    {
        var cliente = new SendGridClient(_apiKey);
        var origen = new EmailAddress(_fromEmail, _fromName);
        var destino = new EmailAddress(destinatarioCorreo, destinatarioNombre);
        var textoPlano = Regex.Replace(cuerpoHtml, "<[^>]+>", " ");

        var mensaje = MailHelper.CreateSingleEmail(origen, destino, asunto, textoPlano, cuerpoHtml);
        var respuesta = await cliente.SendEmailAsync(mensaje);

        if ((int)respuesta.StatusCode >= 400)
        {
            var cuerpo = await respuesta.Body.ReadAsStringAsync();
            throw new InvalidOperationException($"Error al enviar correo ({(int)respuesta.StatusCode}): {cuerpo}");
        }
    }
}
