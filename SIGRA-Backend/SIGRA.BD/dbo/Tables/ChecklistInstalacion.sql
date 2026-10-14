CREATE TABLE [dbo].[ChecklistInstalacion] (
    [IdChecklist]       INT           IDENTITY (1, 1) NOT NULL,
    [IdEquipo]          INT           NOT NULL,
    [Fecha]             DATE          CONSTRAINT [DF_ChecklistInstalacion_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [Completado]        BIT           CONSTRAINT [DF_ChecklistInstalacion_Completado] DEFAULT ((0)) NOT NULL,
    [Observaciones]     VARCHAR (MAX) NULL,
    [IdUsuario]         INT           NULL,
    [FechaVerificacion] DATETIME      CONSTRAINT [DF_ChecklistInstalacion_FechaVerificacion] DEFAULT (getdate()) NOT NULL,
    CONSTRAINT [PK_ChecklistInstalacion] PRIMARY KEY CLUSTERED ([IdChecklist] ASC),
    CONSTRAINT [FK_ChecklistInstalacion_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_ChecklistInstalacion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
