using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Flujo.Servicios;
using Xunit;
[assembly: CollectionBehavior(DisableTestParallelization = true)]
namespace SIGRA.Tests;
public class ReglasTicketsTests
{
    [Theory]
    [InlineData("2026-10-09T22:15:00Z",1,"2026-10-12T22:15:00Z")]
    [InlineData("2026-10-10T03:15:00Z",5,"2026-10-17T03:15:00Z")]
    [InlineData("2026-10-11T13:00:00Z",1,"2026-10-12T13:00:00Z")]
    public void PlazoUsaDiasLaboralesYHoraCostaRica(string entrada,int dias,string esperado) =>
        Assert.Equal(DateTimeOffset.Parse(esperado),ReglasTickets.Plazo(DateTimeOffset.Parse(entrada),dias));
    [Theory]
    [InlineData("Creada",false)] [InlineData("Asignada",false)] [InlineData("En proceso",false)]
    [InlineData("Cerrada",true)] [InlineData("Cancelada",true)]
    public void SoloBoletasAbiertasEditables(string estado,bool bloqueada)
    {var t=new TicketDetalleDto{Estado=estado}; if(bloqueada)Assert.Throws<ReglaNegocioException>(()=>ReglasTickets.Editable(t));else ReglasTickets.Editable(t);}
    [Fact] public void FacturaOInactivaImpideEdicion()
    {Assert.Throws<ReglaNegocioException>(()=>ReglasTickets.Editable(new(){FacturaEmitida=true}));Assert.Throws<ReglaNegocioException>(()=>ReglasTickets.Editable(new(){Activo=false}));}
    [Theory] [InlineData("",false)] [InlineData("correo",false)] [InlineData("a@b.com",true)] [InlineData("a @b.com",false)]
    public void CorreoSinEspaciosYValido(string valor,bool esperado)=>Assert.Equal(esperado,ReglasTickets.CorreoValido(valor));
    [Fact] public void SeriesNoSeRepitenEnLaMismaVisita()
    {var d=Entrada();d.Equipos.Add(new(){Marca="Kenwood",Modelo="TK",NumeroSerie=" serie-1 ",Problema="No enciende el radio"});Assert.Contains("No se puede registrar dos veces",Assert.Throws<ValidacionException>(()=>ReglasTickets.ValidarEntrada(d)).Errores[0]);}
    [Fact] public void EquipoNuloSeRechazaComoDatoInvalido()
    {
        var d = Entrada(); d.Equipos = [null!];
        var ex = Assert.Throws<ValidacionException>(() => ReglasTickets.ValidarEntrada(d));
        Assert.Contains(ex.Errores, e => e.Contains("equipo") && e.Contains("válido"));
    }
    [Fact] public void ObligatoriosEnumeranEtiquetas()
    {var d=Entrada();d.Contacto="";d.Telefono="";var ex=Assert.Throws<ValidacionException>(()=>ReglasTickets.ValidarEntrada(d));Assert.Contains(ex.Errores,x=>x.StartsWith("Nombre de contacto"));Assert.Contains(ex.Errores,x=>x.StartsWith("Teléfono de contacto"));}
    [Theory]
    [InlineData("88888888", true)] [InlineData("8888-8888", true)] [InlineData("8888 8888", true)]
    [InlineData("+50688888888", true)] [InlineData("+506 8888-8888", true)] [InlineData(" 88888888 ", true)]
    [InlineData("8888888", false)] [InlineData("888888888", false)] [InlineData("8888abcd", false)]
    [InlineData("+50788888888", false)] [InlineData("50688888888", false)] [InlineData("", false)] [InlineData(null, false)]
    public void TelefonoNacionalTieneOchoDigitosYPrefijoOpcional(string? telefono, bool valido)
        => Assert.Equal(valido, ReglasTickets.TelefonoValido(telefono));
    [Fact] public void EntradaRechazaTelefonoInvalidoYConservaFormatoValido()
    {
        var d = Entrada(); d.Telefono = "8888887";
        Assert.Contains(Assert.Throws<ValidacionException>(() => ReglasTickets.ValidarEntrada(d)).Errores, e => e.Contains("8 dígitos"));
        d.Telefono = "+506 8888-8888"; ReglasTickets.ValidarEntrada(d);
        Assert.Equal("+506 8888-8888", d.Telefono);
    }
    [Theory] [InlineData(false,true)] [InlineData(true,false)]
    public void ReparadoNecesitaFacturaSiNoEstaCubierto(bool cubierto,bool requiere)
    {var t=new TrabajoTicketDto{Hallazgos="Falla en placa",Resolucion="Reparado"};if(requiere)Assert.Throws<ValidacionException>(()=>ReglasTickets.ValidarTrabajo(t,true,true,cubierto));else ReglasTickets.ValidarTrabajo(t,true,true,cubierto);}
    [Theory] [InlineData(0)] [InlineData(-1)]
    public void CobroTieneMontoPositivo(int monto)
    {var t=new TrabajoTicketDto{Hallazgos="Falla en placa",Resolucion="Reparado",NumeroFactura="F-01",Monto=monto};Assert.Throws<ValidacionException>(()=>ReglasTickets.ValidarTrabajo(t,true,true,false));}
    [Fact] public void NoReparadoDebeJustificarse()
    {Assert.Throws<ValidacionException>(()=>ReglasTickets.ValidarTrabajo(new(){Hallazgos="Diagnóstico",Resolucion="No reparado",JustificacionTecnica="No"},true,true,false));}
    [Fact] public void GarantiaObligatoriosYNoFactura()
    {var t=new TrabajoTicketDto{Hallazgos="Defecto de fábrica",Resolucion="Garantía",DetallesTrabajo="Enviar a proveedor",Proveedor="Kenwood",CasoProveedor="CASO-1",TieneCobro=true,NumeroFactura="F",Monto=100};ReglasTickets.ValidarTrabajo(t,true,true,false);Assert.False(t.TieneCobro);Assert.Null(t.NumeroFactura);Assert.Null(t.Monto);}
    [Fact] public void EsperaNecesitaRepuestoInclusoEnBorrador()
    {Assert.Throws<ValidacionException>(()=>ReglasTickets.ValidarTrabajo(new(){Etapa="En espera de repuesto"},true,false,false));}
    [Fact] public void ExportacionVaciaNoGeneraArchivo()
    {Assert.Throws<ReglaNegocioException>(()=>new ExportacionService().Tabla("Reporte",["Fecha"],[],"pdf","vacio"));}
    [Fact] public void ExcelTrataFormulasComoTextoYConservaAcentos()
    {var f=new ExportacionService().Tabla("Reporte",["Cliente","Nota"],[new[]{"José Sánchez","=1+1"}],"xlsx","prueba");using var zip=new ZipArchive(new MemoryStream(f.Contenido));using var st=zip.GetEntry("xl/worksheets/sheet1.xml")!.Open();var x=XDocument.Load(st);XNamespace n="http://schemas.openxmlformats.org/spreadsheetml/2006/main";Assert.Empty(x.Descendants(n+"f"));Assert.Contains(x.Descendants(n+"t"),t=>t.Value=="José Sánchez");Assert.Contains(x.Descendants(n+"pane"),p=>p.Attribute("state")?.Value=="frozen");}
    [Fact] public void VersionExigeOchoBytes()
    {Assert.Throws<ReglaNegocioException>(()=>ReglasTickets.Version("inválido"));Assert.Throws<ReglaNegocioException>(()=>ReglasTickets.Version("AQ=="));Assert.Equal(8,ReglasTickets.Version(Convert.ToBase64String(new byte[8])).Length);}
    internal static RegistrarTicketDto Entrada(string tipo="Reparación",string? serie=null)=>new(){Solicitud=Guid.NewGuid(),Empresa="Cliente de pruebas",Contacto="María Fernández",Telefono="88888888",TipoServicio=tipo,Equipos=[new(){Marca="Kenwood",Modelo="TK-3170",NumeroSerie=serie??"SERIE-1",Problema="El equipo no enciende",Accesorios=["Antena","Batería"]}]};
}
