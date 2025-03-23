// EntityHandle.ts
export class EntityHandle {
    private static readonly _usedIds = new Set<string>();

    constructor(public readonly id: string) {
        if (!id) {
            throw new Error('Entity ID cannot be empty');
        }
        if (EntityHandle._usedIds.has(id)) {
            throw new Error(`Entity ID '${id}' is already in use`);
        }
        EntityHandle._usedIds.add(id);
    }

    dispose(): void {
        EntityHandle._usedIds.delete(this.id);
    }

    equals(other: EntityHandle): boolean {
        return this.id === other.id;
    }
}
  