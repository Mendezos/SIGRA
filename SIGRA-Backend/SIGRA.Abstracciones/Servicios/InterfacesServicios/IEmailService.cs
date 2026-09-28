namespace SIGRA.Abstracciones.Servicios;

public interface IEmailService
{
    Task EnviarAsync(string destinatarioCorreo, string destinatarioNombre, string asunto, string cuerpoHtml);
}

public interface IJwtService
{
    (string Token, string Jti, DateTime Expira) GenerarToken(int idUsuario, string nombre, string rol);
}