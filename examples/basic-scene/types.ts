import type {
  IBehaviorConfig,
  IMeshOptions,
  ObservableType,
  SerializedObservableValueType,
} from 'srcRoot/shared/types/types';
import type { EntityHandle } from 'srcRoot/shared/utils/EntityHandle';

// Type definition for the globally injected API
export interface GuardedAPIType {
  createMesh(options: IMeshOptions): EntityHandle;
  addBehavior(entity: EntityHandle, config: IBehaviorConfig): void;
  observe<T extends ObservableType>(
    entity: EntityHandle,
    type: T,
    callback: (data: SerializedObservableValueType<T>) => void
  ): string;
  disposeEntity(entity: EntityHandle): void;
  unobserve(observerId: string): void;
}

// Declare GuardedAPI as a global variable
declare global {
  const GuardedAPI: GuardedAPIType;
}
