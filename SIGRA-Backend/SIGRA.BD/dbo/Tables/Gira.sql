CREATE TABLE [dbo].[Gira] (
    [IdGira]      INT           IDENTITY (1, 1) NOT NULL,
    [Nombre]      VARCHAR (150) NOT NULL,
    [FechaInicio] DATETIME      NOT NULL,
    [FechaFin]    DATETIME      NULL,
    [Estado]      VARCHAR (30)  CONSTRAINT [DF_Gira_Estado] DEFAULT ('Planificada') NOT NULL,
    CONSTRAINT [PK_Gira] PRIMARY KEY CLUSTERED ([IdGira] ASC),
    CONSTRAINT [CK_Gira_Fechas] CHECK ([FechaFin] IS NULL OR [FechaFin]>=[FechaInicio])
);

