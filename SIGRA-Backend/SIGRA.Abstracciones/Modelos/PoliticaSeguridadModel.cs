namespace SIGRA.Abstracciones.Modelos;

public class PoliticaSeguridadModel
{
    public int IdPolitica { get; set; }
    public int MinutosInactividad { get; set; }
    public int MaxIntentosFallidos { get; set; }
    public int LongitudMinimaPassword { get; set; }
    public int MinutosBloqueo { get; set; }
    public int VigenciaEnlaceMinutos { get; set; }
    public int? IdUsuarioCreador { get; set; }
    public DateTime FechaCreacion { get; set; }
    public bool Activa { get; set; }
}