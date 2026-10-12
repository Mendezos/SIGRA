using SIGRA.Abstracciones.Dtos;
using SIGRA.Flujo.Servicios;
using Xunit;
namespace SIGRA.Tests;
public class ExportacionVisualTests
{
    [Fact] public void DocumentosMultipaginaConservanEquiposYTextoLargo()
    {
        var e=new ExportacionService();
        var t=new TicketDetalleDto{NumeroBoleta=123,CodigoSeguimiento="c1fdd97f57c147d989393ff51c99df15",Empresa="Empresa de comunicaciones José Sánchez S. A.",Contacto="María Fernández",Telefono="88888888",Correo="cliente@qa.invalid",TipoServicio="Reparación",RegistradoPor="Recepción",FechaRecepcion=DateTimeOffset.Parse("2026-10-12T18:00:00Z"),Equipos=Enumerable.Range(1,8).Select(i=>new EquipoEntradaDto{Marca="Kenwood",Modelo="TK-3170",Tipo="Portátil",NumeroSerie="RADIO-"+i,Accesorios=["Antena","Batería","Cargador"],Problema="El equipo no transmite y se apaga durante la comunicación. "+new string('W',i==8?150:10)}).ToList()};
        var pdf=e.Comprobante(t);Assert.True(pdf.Contenido.Length>1000);
        var filas=Enumerable.Range(1,30).Select(i=>(IReadOnlyList<string>)new[]{"12/10/2026",i.ToString(),"Mantenimiento preventivo","María Fernanda Sánchez", "No reparado", "Falla en tarjeta principal. El proveedor ya no fabrica el repuesto solicitado. "+new string('W',i==30?150:15)}).ToList();
        var reporte=e.Tabla("RADIFAX - Historial de servicio técnico",["Fecha","Boleta","Servicio","Técnico","Resolución","Observaciones"],filas,"pdf","historial");
        var x=e.Tabla("Reporte",["Fecha","Boleta","Servicio","Técnico","Resolución","Observaciones"],filas,"xlsx","historial");
        var folder=Environment.GetEnvironmentVariable("SIGRA_TEST_ARTIFACTS");
        if(!string.IsNullOrWhiteSpace(folder)){Directory.CreateDirectory(folder);File.WriteAllBytes(Path.Combine(folder,"comprobante-prueba.pdf"),pdf.Contenido);File.WriteAllBytes(Path.Combine(folder,"historial-prueba.pdf"),reporte.Contenido);File.WriteAllBytes(Path.Combine(folder,"historial-prueba.xlsx"),x.Contenido);}
    }
}
