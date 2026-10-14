namespace SIGRA.Abstracciones.Excepciones;

public class AccesoDenegadoException(string mensaje) : Exception(mensaje);

public class ConflictoDatosException(string mensaje) : Exception(mensaje);

public class ConfirmacionRequeridaException(string mensaje, string codigo) : Exception(mensaje)
{
    public string Codigo { get; } = codigo;
}
