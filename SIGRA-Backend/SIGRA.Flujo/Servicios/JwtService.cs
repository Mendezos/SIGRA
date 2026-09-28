using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SIGRA.Abstracciones.Servicios;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SIGRA.Flujo.Servicios;

public class JwtService : IJwtService
{
    private readonly string _secreto;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _duracionHoras;

    public JwtService(IConfiguration configuracion)
    {
        _secreto = configuracion["Jwt:Secreto"]
            ?? throw new InvalidOperationException("Falta Jwt:Secreto en la configuracion.");
        _issuer = configuracion["Jwt:Issuer"] ?? "SIGRA.API";
        _audience = configuracion["Jwt:Audience"] ?? "SIGRA.Frontend";
        _duracionHoras = int.TryParse(configuracion["Jwt:DuracionHoras"], out var horas) ? horas : 12;
    }

    public (string Token, string Jti, DateTime Expira) GenerarToken(int idUsuario, string nombre, string rol)
    {
        var jti = Guid.NewGuid().ToString("N");
        var ahora = DateTime.UtcNow;
        var expira = ahora.AddHours(_duracionHoras);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, idUsuario.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(ClaimTypes.NameIdentifier, idUsuario.ToString()),
            new Claim(ClaimTypes.Name, nombre),
            new Claim(ClaimTypes.Role, rol),
        };

        var llave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secreto));
        var credenciales = new SigningCredentials(llave, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(_issuer, _audience, claims, ahora, expira, credenciales);
        var tokenSerializado = new JwtSecurityTokenHandler().WriteToken(token);

        return (tokenSerializado, jti, expira);
    }
}
