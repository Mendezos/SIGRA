CREATE TABLE [dbo].[AlertaAtencion] (
    [IdAtencion] INT            IDENTITY (1, 1) NOT NULL,
    [Clave]      NVARCHAR (120) NOT NULL,
    [IdModulo]   INT            NOT NULL,
    [Titulo]     NVARCHAR (200) NOT NULL,
    [Nota]       NVARCHAR (500) NOT NULL,
    [IdUsuario]  INT            NOT NULL,
    [Fecha]      DATETIME2 (0)  CONSTRAINT [DF_AlertaAtencion_Fecha] DEFAULT (SYSUTCDATETIME()) NOT NULL,
    CONSTRAINT [PK_AlertaAtencion] PRIMARY KEY CLUSTERED ([IdAtencion] ASC),
    CONSTRAINT [UQ_AlertaAtencion_Clave] UNIQUE NONCLUSTERED ([Clave] ASC),
    CONSTRAINT [FK_AlertaAtencion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
