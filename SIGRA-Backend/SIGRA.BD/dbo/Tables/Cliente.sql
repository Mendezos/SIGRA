CREATE TABLE [dbo].[Cliente] (
    [IdCliente]          INT           IDENTITY (1, 1) NOT NULL,
    [Empresa]            VARCHAR (150) NOT NULL,
    [Contacto]           VARCHAR (150) NULL,
    [Correo]             VARCHAR (150) NULL,
    [Telefono]           VARCHAR (20)  NULL,
    [Activo]             BIT           CONSTRAINT [DF_Cliente_Activo] DEFAULT ((1)) NOT NULL,
    [Sector]             VARCHAR (100) NULL,
    [Direccion]          VARCHAR (300) NULL,
    [TamanoFlota]        INT           NULL,
    [IdVendedor]         INT           NULL,
    [FechaRegistro]      DATETIME2 (0) CONSTRAINT [DF_Cliente_FechaRegistro] DEFAULT (sysutcdatetime()) NOT NULL,
    [MotivoInactivacion] VARCHAR (300) NULL,
    [FechaInactivacion]  DATETIME2 (0) NULL,
    [IdUsuarioInactiva]  INT           NULL,
    CONSTRAINT [PK_Cliente] PRIMARY KEY CLUSTERED ([IdCliente] ASC),
    CONSTRAINT [CK_Cliente_TamanoFlota] CHECK ([TamanoFlota] IS NULL OR [TamanoFlota] >= 0)
);

-- Las llaves foráneas Cliente.IdVendedor -> Usuario y Cliente.IdUsuarioInactiva -> Usuario no se declaran aquí
-- porque Usuario ya referencia a Cliente (dependencia circular); las crea la migración Sprint3 (T-01).

