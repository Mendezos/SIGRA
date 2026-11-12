namespace SIGRA.Abstracciones.Servicios;

public interface IEncuestaCorreoService
{
    Task EnviarEnlaceAsync(
        string correo,
        string cliente,
        string numeroFactura,
        string token,
        DateTimeOffset fechaVencimiento);
}
