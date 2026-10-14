CREATE TABLE [dbo].[ChecklistInstalacionItem] (
    [IdChecklist] INT NOT NULL,
    [IdRequisito] INT NOT NULL,
    [Cumplido]    BIT NOT NULL,
    CONSTRAINT [PK_ChecklistInstalacionItem] PRIMARY KEY CLUSTERED ([IdChecklist] ASC, [IdRequisito] ASC),
    CONSTRAINT [FK_ChecklistInstalacionItem_Checklist] FOREIGN KEY ([IdChecklist]) REFERENCES [dbo].[ChecklistInstalacion] ([IdChecklist]),
    CONSTRAINT [FK_ChecklistInstalacionItem_Requisito] FOREIGN KEY ([IdRequisito]) REFERENCES [dbo].[RequisitoInstalacion] ([IdRequisito])
);
