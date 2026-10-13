CREATE TABLE [dbo].[RequisitoInstalacion] (
    [IdRequisito] INT           IDENTITY (1, 1) NOT NULL,
    [Nombre]      VARCHAR (200) NOT NULL,
    [Orden]       INT           NOT NULL,
    [Activo]      BIT           CONSTRAINT [DF_RequisitoInstalacion_Activo] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_RequisitoInstalacion] PRIMARY KEY CLUSTERED ([IdRequisito] ASC),
    CONSTRAINT [UQ_RequisitoInstalacion_Nombre] UNIQUE NONCLUSTERED ([Nombre] ASC)
);
