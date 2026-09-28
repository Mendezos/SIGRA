using SIGRA.Abstracciones.Servicios;

namespace SIGRA.Flujo.Servicios;

public class PasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

    public bool Verificar(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}
