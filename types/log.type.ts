
export type DataLogUserCreate = {
    type: "user_create"
    info: {
        user: {
            id: string
            name: string
        }
    }
    userId: string // the id of th user that do the action
    entityId: undefined
}

export type DataLogUserUpdate = {
    type: "user_update"
    info: {
        user: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogUserSetRole = {
    type: "user_set_role"
    info: {
        user: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogUserSetEntity = {
    type: "user_set_entity"
    info: {
        user: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogUserDisable = {
    type: "user_disable"
    info: {
        user: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogUserEmailVerified = {
    type: "user_email_verified"
    info: {
        user: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogRoleCreate = {
    type: "role_create"
    info: {
        role: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogRoleUpdate = {
    type: "role_update"
    info: {
        role: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogRoleDelete = {
    type: "role_delete"
    info: {
        role: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogRoleSetPermission = {
    type: "role_set_permission"
    info: {
        role: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: undefined
}

export type DataLogTagCreate = {
    type: "tag_create"
    info: {
        tag: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogTagUpdate = {
    type: "tag_update"
    info: {
        tag: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogTagDelete = {
    type: "tag_delete"
    info: {
        tag: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogCharacteristicCreate = {
    type: "characteristic_create"
    info: {
        characteristic: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogCharacteristicUpdate = {
    type: "characteristic_update"
    info: {
        characteristic: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogCharacteristicDelete = {
    type: "characteristic_delete"
    info: {
        characteristic: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogMaterialCreate = {
    type: "material_create"
    info: {
        material: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogMaterialUpdate = {
    type: "material_update"
    info: {
        material: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogEntityUpdate = {
    type: "entity_update"
    info: {
        entity: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type DataLogEntityDisable = {
    type: "entity_disable"
    info: {
        entity: {
            id: string
            name: string
        }
    }
    userId: string
    entityId: string
}

export type LogEntry = {
    id: string
    type: string
    info: any
    userId: string
    entityId?: string
    createdAt: Date
    user: {
        id: string
        name: string
    }
    entity?: {
        id: string
        name: string
    }
}

export type DataLog =
    | DataLogUserCreate
    | DataLogUserUpdate
    | DataLogUserSetRole
    | DataLogUserSetEntity
    | DataLogUserDisable
    | DataLogUserEmailVerified
    | DataLogRoleCreate
    | DataLogRoleUpdate
    | DataLogRoleDelete
    | DataLogRoleSetPermission
    | DataLogTagCreate
    | DataLogTagUpdate
    | DataLogTagDelete
    | DataLogCharacteristicCreate
    | DataLogCharacteristicUpdate
    | DataLogCharacteristicDelete
    | DataLogMaterialCreate
    | DataLogMaterialUpdate
    | DataLogEntityUpdate
    | DataLogEntityDisable
