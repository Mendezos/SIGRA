namespace SIGRA.Abstracciones.Excepciones;

public class CuentaBloqueadaException : Exception
{
    public int? MinutosRestantes { get; }

    public CuentaBloqueadaException(string mensaje, int? minutosRestantes) : base(mensaje)
    {
        MinutosRestantes = minutosRestantes;
    }
}
