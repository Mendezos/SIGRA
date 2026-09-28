CREATE TABLE [dbo].[Cliente] (
    [IdCliente] INT           IDENTITY (1, 1) NOT NULL,
    [Empresa]   VARCHAR (150) NOT NULL,
    [Contacto]  VARCHAR (150) NULL,
    [Correo]    VARCHAR (150) NULL,
    [Telefono]  VARCHAR (20)  NULL,
    [Activo]    BIT           CONSTRAINT [DF_Cliente_Activo] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_Cliente] PRIMARY KEY CLUSTERED ([IdCliente] ASC)
);

