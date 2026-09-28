namespace SIGRA.Flujo.Utilidades;

public static class PoliticaPasswordValidador
{
    public static List<string> Validar(string? password, int longitudMinima)
    {
        password ??= string.Empty;
        var errores = new List<string>();

        if (password.Length < longitudMinima)
            errores.Add($"Debe tener al menos {longitudMinima} caracteres.");
        if (!password.Any(char.IsUpper))
            errores.Add("Debe incluir al menos una letra mayúscula.");
        if (!password.Any(char.IsLower))
            errores.Add("Debe incluir al menos una letra minúscula.");
        if (!password.Any(char.IsDigit))
            errores.Add("Debe incluir al menos un número.");
        if (!password.Any(c => !char.IsLetterOrDigit(c)))
            errores.Add("Debe incluir al menos un carácter especial (por ejemplo: !@#$%^&*).");

        return errores;
    }
}
