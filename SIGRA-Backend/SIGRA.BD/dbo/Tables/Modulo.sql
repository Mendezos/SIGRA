CREATE TABLE [dbo].[Modulo] (
    [IdModulo] INT          NOT NULL,
    [Nombre]   VARCHAR (100) NOT NULL,
    [Activo]   BIT          CONSTRAINT [DF_Modulo_Activo] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_Modulo] PRIMARY KEY CLUSTERED ([IdModulo] ASC),
    CONSTRAINT [UQ_Modulo_Nombre] UNIQUE NONCLUSTERED ([Nombre] ASC)
);
