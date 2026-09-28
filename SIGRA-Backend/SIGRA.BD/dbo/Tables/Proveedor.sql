CREATE TABLE [dbo].[Proveedor] (
    [IdProveedor] INT           IDENTITY (1, 1) NOT NULL,
    [Nombre]      VARCHAR (150) NOT NULL,
    [Contacto]    VARCHAR (150) NULL,
    [Correo]      VARCHAR (150) NULL,
    [Telefono]    VARCHAR (20)  NULL,
    CONSTRAINT [PK_Proveedor] PRIMARY KEY CLUSTERED ([IdProveedor] ASC)
);

