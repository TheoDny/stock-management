export const materialCacheTag = {
    materialList: (entityId: string) => `materials:list:${entityId}`,
    materialById: (materialId: string) => `materials:item:${materialId}`,
    materialCharacteristics: (materialId: string) => `materials:characteristics:${materialId}`,
    materialHistory: (materialId: string) => `materials:history:${materialId}`,
}
