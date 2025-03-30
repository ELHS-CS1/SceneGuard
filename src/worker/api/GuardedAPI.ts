// GuardedAPI.ts
import type { Vector3 } from '@babylonjs/core';
import type {
  IBehaviorConfig,
  IBoxMeshOptions,
  ICylinderMeshOptions,
  IGroundMeshOptions,
  IMeshOptions,
  IPlaneMeshOptions,
  ISphereMeshOptions,
  ITorusKnotMeshOptions,
  ITorusMeshOptions,
  ITubeMeshOptions,
  ObservableType,
  ObservableValueType,
} from '../../shared/types/types';
import { EntityHandle } from '../../shared/utils/EntityHandle';

export class GuardedAPI {
  private static _entityMap = new Map<string, EntityHandle>();

  static getEntity(id: string): EntityHandle | undefined {
    return this._entityMap.get(id);
  }

  static createMesh(options: IMeshOptions): EntityHandle {
    // Validate the mesh options
    this._validateMeshOptions(options);

    const id = crypto.randomUUID();
    postMessage({ type: 'createMesh', id, options });
    const handle = new EntityHandle(id);
    this._entityMap.set(id, handle);
    return handle;
  }

  private static _validateMeshOptions(options: IMeshOptions): void {
    // Validate common properties
    if (options.position && !this._isVector3(options.position)) {
      throw new Error('Invalid position: must be a Vector3 object');
    }

    // Validate specific mesh type options
    switch (options.type) {
      case 'box': {
        const boxOptions = options as IBoxMeshOptions;
        if (
          boxOptions.size === undefined &&
          (boxOptions.width === undefined ||
            boxOptions.height === undefined ||
            boxOptions.depth === undefined)
        ) {
          throw new Error('Box mesh requires either size or width/height/depth');
        }
        break;
      }
      case 'sphere': {
        const sphereOptions = options as ISphereMeshOptions;
        if (sphereOptions.diameter === undefined) {
          throw new Error('Sphere mesh requires diameter');
        }
        if (sphereOptions.segments !== undefined && sphereOptions.segments < 3) {
          throw new Error('Sphere segments must be at least 3');
        }
        break;
      }
      case 'cylinder': {
        const cylinderOptions = options as ICylinderMeshOptions;
        if (cylinderOptions.height === undefined || cylinderOptions.diameter === undefined) {
          throw new Error('Cylinder mesh requires height and diameter');
        }
        if (cylinderOptions.tessellation !== undefined && cylinderOptions.tessellation < 3) {
          throw new Error('Cylinder tessellation must be at least 3');
        }
        break;
      }
      case 'ground': {
        const groundOptions = options as IGroundMeshOptions;
        if (groundOptions.width === undefined || groundOptions.height === undefined) {
          throw new Error('Ground mesh requires width and height');
        }
        if (groundOptions.subdivisions !== undefined && groundOptions.subdivisions < 1) {
          throw new Error('Ground subdivisions must be at least 1');
        }
        break;
      }
      case 'plane': {
        const planeOptions = options as IPlaneMeshOptions;
        if (
          planeOptions.size === undefined &&
          (planeOptions.width === undefined || planeOptions.height === undefined)
        ) {
          throw new Error('Plane mesh requires either size or width/height');
        }
        break;
      }
      case 'torus': {
        const torusOptions = options as ITorusMeshOptions;
        if (torusOptions.diameter === undefined || torusOptions.thickness === undefined) {
          throw new Error('Torus mesh requires diameter and thickness');
        }
        if (torusOptions.tessellation !== undefined && torusOptions.tessellation < 3) {
          throw new Error('Torus tessellation must be at least 3');
        }
        break;
      }
      case 'torusKnot': {
        const torusKnotOptions = options as ITorusKnotMeshOptions;
        if (torusKnotOptions.radius === undefined || torusKnotOptions.tube === undefined) {
          throw new Error('TorusKnot mesh requires radius and tube');
        }
        if (torusKnotOptions.radialSegments !== undefined && torusKnotOptions.radialSegments < 3) {
          throw new Error('TorusKnot radialSegments must be at least 3');
        }
        if (
          torusKnotOptions.tubularSegments !== undefined &&
          torusKnotOptions.tubularSegments < 3
        ) {
          throw new Error('TorusKnot tubularSegments must be at least 3');
        }
        break;
      }
      case 'tube': {
        const tubeOptions = options as ITubeMeshOptions;
        if (!tubeOptions.path || tubeOptions.path.length < 2) {
          throw new Error('Tube mesh requires a path with at least 2 points');
        }
        if (tubeOptions.radius === undefined) {
          throw new Error('Tube mesh requires radius');
        }
        if (tubeOptions.tessellation !== undefined && tubeOptions.tessellation < 3) {
          throw new Error('Tube tessellation must be at least 3');
        }
        break;
      }
      default: {
        const unknownOptions = options as IMeshOptions;
        throw new Error(`Unsupported mesh type: ${unknownOptions.type}`);
      }
    }
  }

  private static _isVector3(value: unknown): value is Vector3 {
    return (
      value !== null &&
      typeof value === 'object' &&
      'x' in value &&
      'y' in value &&
      'z' in value &&
      typeof (value as Vector3).x === 'number' &&
      typeof (value as Vector3).y === 'number' &&
      typeof (value as Vector3).z === 'number'
    );
  }

  static addBehavior(entity: EntityHandle, config: IBehaviorConfig) {
    postMessage({ type: 'addBehavior', entityId: entity.id, behavior: config });
  }

  static observe<T extends ObservableType>(
    entity: EntityHandle,
    type: T,
    callback: (data: ObservableValueType<T>) => void
  ): string {
    const observerId = crypto.randomUUID();
    addEventListener('message', event => {
      if (
        event.data.type === 'observable' &&
        event.data.entityId === entity.id &&
        event.data.observerId === observerId
      ) {
        callback(event.data.value);
      }
    });
    postMessage({
      type: 'registerObserver',
      observerId,
      entityId: entity.id,
      observableType: type,
    });
    return observerId;
  }

  /**
   * Sends a message to the main thread to dispose of an entity (mesh) and its associated resources.
   * Removes the entity handle from the internal map.
   * @param entity The handle of the entity to dispose.
   */
  static disposeEntity(entity: EntityHandle): void {
    if (!this._entityMap.has(entity.id)) {
      console.warn(`[GuardedAPI] Attempted to dispose unknown entity: ${entity.id}`);
      return;
    }
    postMessage({ type: 'disposeEntity', entityId: entity.id });
    this._entityMap.delete(entity.id);
    // Note: Associated observers are cleaned up on the main thread via SceneBridge
  }

  /**
   * Sends a message to the main thread to remove an observer.
   * @param observerId The ID of the observer to remove (returned by `observe`).
   */
  static unobserve(observerId: string): void {
    // We don't track observers directly here, just send the message
    postMessage({ type: 'unobserve', observerId });
  }
}
