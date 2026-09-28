CREATE TABLE [dbo].[Prospecto] (
    [IdProspecto] INT           IDENTITY (1, 1) NOT NULL,
    [Empresa]     VARCHAR (150) NOT NULL,
    [Contacto]    VARCHAR (150) NULL,
    [Correo]      VARCHAR (150) NULL,
    [Telefono]    VARCHAR (20)  NULL,
    [Estado]      VARCHAR (30)  CONSTRAINT [DF_Prospecto_Estado] DEFAULT ('Nuevo') NOT NULL,
    CONSTRAINT [PK_Prospecto] PRIMARY KEY CLUSTERED ([IdProspecto] ASC)
);

