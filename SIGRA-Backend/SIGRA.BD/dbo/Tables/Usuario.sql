CREATE TABLE [dbo].[Usuario] (
    [IdUsuario]        INT IDENTITY(1, 1) NOT NULL,
    [IdRol]            INT NOT NULL,
    [IdCliente]        INT NULL,
    [Nombre]           VARCHAR(150) NOT NULL,
    [Correo]           VARCHAR(150) NOT NULL,
    [Telefono]         VARCHAR(20) NULL,
    [PasswordHash]     VARCHAR(255) NOT NULL,
    [Foto]             VARCHAR(300) NULL,

    [Activo]           BIT NOT NULL
        CONSTRAINT [DF_Usuario_Activo] DEFAULT (1),

    [IntentosFallidos] INT NOT NULL
        CONSTRAINT [DF_Usuario_IntentosFallidos] DEFAULT (0),

    [BloqueadoHasta]   DATETIME NULL,
    [FechaBloqueo]     DATETIME NULL,

    [Cedula]           VARCHAR(20) NULL,
    [FechaNacimiento]  DATE NULL,
    [Direccion]        VARCHAR(300) NULL,
    [EstadoCivil]      VARCHAR(50) NULL,
    [GradoAcademico]   VARCHAR(100) NULL,
    [Salario]          DECIMAL(18,2) NULL,

    [FechaCreacion]    DATETIME2 NULL
        CONSTRAINT [DF_Usuario_FechaCreacion] DEFAULT SYSUTCDATETIME(),

    [UltimoAcceso]     DATETIME2 NULL,

    CONSTRAINT [PK_Usuario]
        PRIMARY KEY CLUSTERED ([IdUsuario] ASC),

    CONSTRAINT [CK_Usuario_IntentosFallidos]
        CHECK ([IntentosFallidos] >= 0),

    CONSTRAINT [CK_Usuario_Salario]
        CHECK ([Salario] IS NULL OR [Salario] >= 0),

    CONSTRAINT [FK_Usuario_Cliente]
        FOREIGN KEY ([IdCliente])
        REFERENCES [dbo].[Cliente] ([IdCliente]),

    CONSTRAINT [FK_Usuario_Rol]
        FOREIGN KEY ([IdRol])
        REFERENCES [dbo].[Rol] ([IdRol]),

    CONSTRAINT [UQ_Usuario_Correo]
        UNIQUE NONCLUSTERED ([Correo] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_Usuario_IdRol]
ON [dbo].[Usuario] ([IdRol] ASC);
GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_Usuario_Cedula]
ON [dbo].[Usuario] ([Cedula] ASC)
WHERE [Cedula] IS NOT NULL;
GO