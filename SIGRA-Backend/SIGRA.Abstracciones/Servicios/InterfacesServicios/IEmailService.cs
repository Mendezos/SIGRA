namespace SIGRA.Abstracciones.Servicios;

public interface IEmailService
{
    Task EnviarAsync(string destinatarioCorreo, string destinatarioNombre, string asunto, string cuerpoHtml);
    Task EnviarAsync(string destinatarioCorreo, string destinatarioNombre, string asunto, string cuerpoHtml, IReadOnlyList<SIGRA.Abstracciones.Dtos.AdjuntoCorreoDto> adjuntos);
}

public interface IJwtService
{
    (string Token, string Jti, DateTime Expira) GenerarToken(int idUsuario, string nombre, string rol);
}
