using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using SIGRA.API.Middlewares;
using SIGRA.DA.Conexion;
using SIGRA.DA.Repositorios;
using SIGRA.DA.Servicios;
using SIGRA.Flujo.Flujos;
using SIGRA.Flujo.Servicios;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

const string PoliticaCorsReact = "PoliticaCorsReact";
builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy(PoliticaCorsReact, politica =>
    {
        politica.WithOrigins("http://localhost:5173", "http://localhost:5174")
                .AllowAnyHeader()
                .AllowAnyMethod();

    });
});

var jwtSecreto = builder.Configuration["Jwt:Secreto"]
    ?? throw new InvalidOperationException("Falta Jwt:Secreto en la configuracion.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SIGRA.API";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SIGRA.Frontend";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        // Evita que el handler renombre claims como "jti"/"sub" a URIs largas de WS-Fed al validar el token,
        // lo que rompía la búsqueda del claim "jti" en SesionActivaMiddleware y provocaba 401 falsos.
        opciones.MapInboundClaims = false;
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecreto)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(opciones =>
{
    opciones.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddScoped<IConexionFactory, ConexionFactory>();

builder.Services.AddScoped<IUsuarioDA, UsuarioDA>();
builder.Services.AddScoped<IAuditoriaDA, AuditoriaDA>();
builder.Services.AddScoped<ITokenRecuperacionDA, TokenRecuperacionDA>();
builder.Services.AddScoped<IPoliticaSeguridadDA, PoliticaSeguridadDA>();
builder.Services.AddScoped<ISesionDA, SesionDA>();
builder.Services.AddScoped<IRolPermisoDA, RolPermisoDA>();
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtService, JwtService>();

builder.Services.AddScoped<IAutenticacionFlujo, AutenticacionFlujo>();
builder.Services.AddScoped<IPoliticaSeguridadFlujo, PoliticaSeguridadFlujo>();
builder.Services.AddScoped<ICuentaFlujo, CuentaFlujo>();
builder.Services.AddScoped<IRecuperacionPasswordFlujo, RecuperacionPasswordFlujo>();

var app = builder.Build();

app.UseMiddleware<ManejadorGlobalExcepcionesMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(PoliticaCorsReact);

app.UseAuthentication();
app.UseMiddleware<SesionActivaMiddleware>();
app.UseAuthorization();

app.MapControllers();

app.Run();
