using SIGRA.Abstracciones.Conexion;
using SIGRA.DA.Conexion;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//CORS
const string PoliticaCorsReact = "PoliticaCorsReact";
builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy(PoliticaCorsReact, politica =>
    {
        politica.WithOrigins("http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod();
    });
});

builder.Services.AddScoped<IConexionFactory, ConexionFactory>();



var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(PoliticaCorsReact); 

app.UseAuthorization();

app.MapControllers();

app.Run();