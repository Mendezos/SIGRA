namespace SIGRA.Abstracciones.Modelos;

public class TokenRecuperacionModel
{
    public int IdToken { get; set; }
    public int IdUsuario { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime Expira { get; set; }
    public bool Usado { get; set; }
}