CREATE TABLE [dbo].[Rol] (
    [IdRol]  INT           IDENTITY (1, 1) NOT NULL,
    [Nombre] VARCHAR (100) NOT NULL,
    [Activo] BIT           CONSTRAINT [DF_Rol_Activo] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_Rol] PRIMARY KEY CLUSTERED ([IdRol] ASC),
    CONSTRAINT [UQ_Rol_Nombre] UNIQUE NONCLUSTERED ([Nombre] ASC)
);

