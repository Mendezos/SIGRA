using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// GCFS-001 a GCFS-004: reglas de las plantillas de contrato.
public class PlantillaContratoFlujoPruebas
{
    private readonly IPlantillaContratoDA _da = Substitute.For<IPlantillaContratoDA>();
    private readonly IAuditoriaDA _auditoria = Substitute.For<IAuditoriaDA>();
    private readonly PlantillaContratoFlujo _flujo;

    public PlantillaContratoFlujoPruebas()
    {
        _flujo = new PlantillaContratoFlujo(_da, _auditoria);
        _da.ObtenerAsync(5, null).Returns(new DetallePlantillaContratoDto { Id = 5, Nombre = "Radios portátiles", Activa = true, VersionActual = 2 });
    }

    private static GuardarPlantillaContratoDto Valida() => new()
    {
        Nombre = "Radios portátiles",
        Clausulas = "1. Uso de los equipos.",
        Responsabilidades = "El cliente cuida los equipos."
    };

    [Fact]
    public async Task Registrar_sin_nombre_clausulas_ni_responsabilidades_lista_todo_lo_que_falta()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(new GuardarPlantillaContratoDto(), 1));

        Assert.Contains("el nombre", ex.Message);
        Assert.Contains("las cláusulas", ex.Message);
        Assert.Contains("las responsabilidades del cliente", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().InsertarAsync(default!, default);
    }

    [Fact]
    public async Task Registrar_valida_guarda_y_deja_auditoria()
    {
        _da.InsertarAsync(default!, default).ReturnsForAnyArgs(5);

        await _flujo.RegistrarAsync(Valida(), 1);

        await _da.Received(1).InsertarAsync(Arg.Is<GuardarPlantillaContratoDto>(d => d.Nombre == "Radios portátiles"), 1);
        await _auditoria.Received(1).RegistrarAsync(1, "Alquiler", "PlantillaContrato", 5, "PLANTILLA_REGISTRADA", Arg.Any<string?>());
    }

    [Fact]
    public async Task Editar_sin_motivo_se_rechaza_y_no_crea_version()
    {
        var dto = Valida();
        dto.Nombre = null;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.EditarAsync(5, dto, 1));

        Assert.Contains("el motivo del cambio", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().EditarAsync(default, default!, default);
    }

    [Fact]
    public async Task Editar_con_motivo_crea_una_version_nueva()
    {
        var dto = Valida();
        dto.Motivo = "Se agrega el seguro";
        _da.EditarAsync(5, Arg.Any<GuardarPlantillaContratoDto>(), 1).Returns(3);

        await _flujo.EditarAsync(5, dto, 1);

        await _auditoria.Received(1).RegistrarAsync(1, "Alquiler", "PlantillaContrato", 5, "PLANTILLA_EDITADA", Arg.Is<string?>(s => s!.Contains("Versión 3")));
    }

    [Fact]
    public async Task Desactivar_sin_motivo_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CambiarEstadoAsync(5, new CambiarEstadoPlantillaDto { Activa = false }, 1));

        Assert.Contains("motivo", ex.Message);
    }

    [Fact]
    public async Task Cambiar_al_mismo_estado_no_duplica_el_cambio_ni_la_auditoria()
    {
        _da.CambiarEstadoAsync(5, true, null, 1).Returns(false);

        var resultado = await _flujo.CambiarEstadoAsync(5, new CambiarEstadoPlantillaDto { Activa = true }, 1);

        Assert.StartsWith("No hubo cambios", resultado.Mensaje);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Listar_con_estado_invalido_se_rechaza()
    {
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarAsync(null, null, "Pendiente"));
    }
}
