namespace SIGRA.Abstracciones.Excepciones;

public class SesionInvalidaException : Exception
{
    public SesionInvalidaException(string mensaje) : base(mensaje) { }
}
