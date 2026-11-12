CREATE TABLE [dbo].[SerieContactoCRM] (
    [IdSerie]              INT           IDENTITY (1, 1) NOT NULL,
    [IdProspecto]          INT           NULL,
    [IdCliente]            INT           NULL,
    [IdContactoEmpresa]    INT           NULL,
    [Periodicidad]         VARCHAR (15)  NOT NULL,
    [FechaInicial]         DATE          NOT NULL,
    [Hora]                 TIME (0)      NOT NULL,
    [Tipo]                 VARCHAR (20)  NOT NULL,
    [Motivo]               VARCHAR (500) NOT NULL,
    [Prioridad]            VARCHAR (10)  CONSTRAINT [DF_SerieContactoCRM_Prioridad] DEFAULT ('Media') NOT NULL,
    [IdResponsable]        INT           NOT NULL,
    [Estado]               VARCHAR (15)  CONSTRAINT [DF_SerieContactoCRM_Estado] DEFAULT ('Activa') NOT NULL,
    [OcurrenciasGeneradas] INT           CONSTRAINT [DF_SerieContactoCRM_Ocurrencias] DEFAULT ((0)) NOT NULL,
    [MotivoCancelacion]    VARCHAR (500) NULL,
    [FechaCancelacion]     DATETIME2 (0) NULL,
    [IdUsuarioCancela]     INT           NULL,
    [FechaCreacion]        DATETIME2 (0) CONSTRAINT [DF_SerieContactoCRM_Creacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]        INT           NULL,
    CONSTRAINT [PK_SerieContactoCRM] PRIMARY KEY CLUSTERED ([IdSerie] ASC),
    CONSTRAINT [CK_SerieContactoCRM_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [CK_SerieContactoCRM_Periodicidad] CHECK ([Periodicidad] IN ('Mensual', 'Trimestral', 'Semestral')),
    CONSTRAINT [CK_SerieContactoCRM_Tipo] CHECK ([Tipo] IN ('Llamada', 'Visita', 'Correo', 'Reunión', 'WhatsApp', 'Otro')),
    CONSTRAINT [CK_SerieContactoCRM_Prioridad] CHECK ([Prioridad] IN ('Baja', 'Media', 'Alta')),
    CONSTRAINT [CK_SerieContactoCRM_Estado] CHECK ([Estado] IN ('Activa', 'Cancelada')),
    CONSTRAINT [FK_SerieContactoCRM_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_SerieContactoCRM_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_SerieContactoCRM_Contacto] FOREIGN KEY ([IdContactoEmpresa]) REFERENCES [dbo].[ContactoEmpresa] ([IdContactoEmpresa]),
    CONSTRAINT [FK_SerieContactoCRM_Responsable] FOREIGN KEY ([IdResponsable]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_SerieContactoCRM_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_SerieContactoCRM_UsuarioCancela] FOREIGN KEY ([IdUsuarioCancela]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_SerieContactoCRM_Estado]
    ON [dbo].[SerieContactoCRM]([Estado] ASC, [IdResponsable] ASC);
