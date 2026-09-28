CREATE TABLE [dbo].[Permiso] (
    [IdPermiso] INT IDENTITY (1, 1) NOT NULL,
    [IdModulo]  INT NOT NULL,
    CONSTRAINT [PK_Permiso] PRIMARY KEY CLUSTERED ([IdPermiso] ASC),
    CONSTRAINT [UQ_Permiso_IdModulo] UNIQUE NONCLUSTERED ([IdModulo] ASC)
);

