namespace SIGRA.Abstracciones.Excepciones;

public class ValidacionException : Exception
{
    public List<string> Errores { get; }

    public ValidacionException(string mensaje, List<string> errores) : base(mensaje)
    {
        Errores = errores;
    }
}
