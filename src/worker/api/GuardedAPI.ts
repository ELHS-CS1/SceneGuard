// GuardedAPI.ts
import { EntityHandle } from '../../shared/utils/EntityHandle';
import type { MeshOptions, BehaviorConfig, ObservableType, ObservableValueType } from '../../shared/types/types';

export class GuardedAPI {
  private static _entityMap = new Map<string, EntityHandle>();

  static getEntity(id: string): EntityHandle | undefined {
    return this._entityMap.get(id);
  }

  static createMesh(options: MeshOptions): EntityHandle {
    const id = crypto.randomUUID();
    postMessage({ type: 'createMesh', id, options });
    const handle = new EntityHandle(id);
    this._entityMap.set(id, handle);
    return handle;
  }

  static addBehavior(entity: EntityHandle, config: BehaviorConfig) {
    postMessage({ type: 'addBehavior', entityId: entity.id, behavior: config });
  }

  static observe<T extends ObservableType>(
    entity: EntityHandle, 
    type: T, 
    callback: (data: ObservableValueType<T>) => void
  ): string {
    const observerId = crypto.randomUUID();
    addEventListener('message', (event) => {
      if (event.data.type === 'observable' && 
          event.data.entityId === entity.id &&
          event.data.observerId === observerId) {
        callback(event.data.value);
      }
    });
    postMessage({ type: 'registerObserver', observerId, entityId: entity.id, observableType: type });
    return observerId;
  }

  static cleanup(entity: EntityHandle): void {
    this._entityMap.delete(entity.id);
  }
}
