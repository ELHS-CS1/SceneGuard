// SceneBridge.ts
import type { AbstractMesh, Mesh, Observer, Scene, TransformNode } from '@babylonjs/core';
import { Scene as BabylonScene, MeshBuilder, Observable, Vector3 } from '@babylonjs/core';
// Use renamed types
import type {
  GuardedAPIMessageType,
  IBoxMeshOptions,
  ICylinderMeshOptions,
  IErrorMessage,
  IGroundMeshOptions,
  IMeshOptions,
  IPlaneMeshOptions,
  ISphereMeshOptions,
  ITorusKnotMeshOptions,
  ITorusMeshOptions,
  ITubeMeshOptions,
  ObservableType,
  ObservableValueType,
  SerializedObservableValueType,
  WorkerMessage,
} from '../../shared/types/types';
import { BehaviorFactory } from './BehaviorFactory';
// Import EntityHandle directly

// Rename internal types/interfaces
type TransformType = Exclude<ObservableType, 'beforeRender'>;
type ITransformObservables = {
  // Renamed
  [K in TransformType]: Observable<Vector3>;
};

interface ISceneObserverInfo {
  // Renamed
  observer: Observer<Scene>;
  type: 'beforeRender';
}

interface ITransformObserverInfo {
  // Renamed
  observer: Observer<Vector3>;
  entityId: string;
  type: TransformType;
}

interface IMatrixObserverInfo {
  // Renamed
  observer: Observer<TransformNode>;
  entityId: string;
}

type IObserverInfo = ISceneObserverInfo | ITransformObserverInfo; // Renamed

/**
 * Bridges the communication between the Worker thread (GuardedAPI) and the Main thread (Babylon.js Scene).
 * Manages scene entities (meshes), behaviors, and observables based on messages received from the worker.
 * Responsible for interacting directly with the Babylon.js Scene object.
 */
export class SceneBridge {
  /** Maps unique entity IDs (generated by GuardedAPI) to Babylon.js AbstractMesh objects. */
  private _entities = new Map<string, AbstractMesh>();
  /** Factory instance for creating and managing Babylon.js behaviors based on configurations. */
  private _behaviorFactory: BehaviorFactory;
  /** Maps entity IDs to a structure holding observables for their position, rotation, and scaling. */
  private _transformObservables = new Map<string, ITransformObservables>(); // Use renamed type
  /** Maps observer IDs (generated by GuardedAPI) to their corresponding Babylon.js Observer object and metadata. */
  private _observers = new Map<string, IObserverInfo>(); // Use renamed type
  /** Maps entity IDs to observers specifically watching the mesh's world matrix updates for efficient transform tracking. */
  private _matrixObservers = new Map<string, IMatrixObserverInfo>(); // Use renamed type

  /**
   * Defines handlers for messages received from the GuardedAPI worker.
   * Each key corresponds to a message type defined in `GuardedAPIMessageType['type']`,
   * and the value is the bound instance method responsible for handling that message type.
   */
  private readonly _messageHandlers: {
    [K in GuardedAPIMessageType['type']]: (
      message: Extract<GuardedAPIMessageType, { type: K }>
    ) => void;
  } = {
    createMesh: this._handleCreateMesh.bind(this),
    addBehavior: this._handleAddBehavior.bind(this),
    registerObserver: this._handleRegisterObserver.bind(this),
    disposeEntity: this._handleDisposeEntity.bind(this),
    unobserve: this._handleUnobserve.bind(this),
  };

  /**
   * Initializes the SceneBridge with the main Babylon.js scene.
   * @param _scene The Babylon.js Scene instance to interact with.
   */
  constructor(private _scene: Scene) {
    this._behaviorFactory = new BehaviorFactory(_scene);
  }

  /**
   * Handles 'createMesh' messages from the worker.
   * Uses type guards to determine the specific mesh type requested and calls the appropriate
   * Babylon.js `MeshBuilder` function with the provided options.
   * Sets the mesh position, stores the mesh instance, and sets up transformation tracking.
   * @param message The validated message object for creating a mesh.
   * @throws Error if the mesh type specified in the options is not supported.
   */
  private _handleCreateMesh(message: Extract<GuardedAPIMessageType, { type: 'createMesh' }>): void {
    const { id, options } = message;
    let mesh: Mesh;

    try {
      // Validate mesh options before creation
      if (!this._validateMeshOptions(options)) {
        throw new Error(`Invalid mesh options for type: ${(options as { type: string }).type}`);
      }

      // Create mesh based on type with error handling
      switch ((options as { type: string }).type) {
        case 'box':
          mesh = this._createBoxMesh(id, options as IBoxMeshOptions);
          break;
        case 'sphere':
          mesh = this._createSphereMesh(id, options as ISphereMeshOptions);
          break;
        case 'cylinder':
          mesh = this._createCylinderMesh(id, options as ICylinderMeshOptions);
          break;
        case 'ground':
          mesh = this._createGroundMesh(id, options as IGroundMeshOptions);
          break;
        case 'plane':
          mesh = this._createPlaneMesh(id, options as IPlaneMeshOptions);
          break;
        case 'torus':
          mesh = this._createTorusMesh(id, options as ITorusMeshOptions);
          break;
        case 'torusKnot':
          mesh = this._createTorusKnotMesh(id, options as ITorusKnotMeshOptions);
          break;
        case 'tube':
          mesh = this._createTubeMesh(id, options as ITubeMeshOptions);
          break;
        default:
          throw new Error(`Unsupported mesh type: ${(options as { type: string }).type}`);
      }

      // Set position if provided
      if (options.position) {
        mesh.position = options.position;
      }

      // Store mesh and setup transformation tracking
      this._entities.set(id, mesh);
      this._setupTransformationTracking(mesh);
      console.log(
        `[SceneBridge] Created ${(options as { type: string }).type} mesh with ID: ${id}`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`[SceneBridge] Failed to create mesh: ${errorMessage}`);
      // Post error message back to worker
      postMessage({
        type: 'error',
        error: errorMessage,
        source: 'SceneBridge',
      } as IErrorMessage);
    }
  }

  /**
   * Handles 'addBehavior' messages from the worker.
   * Finds the target entity (mesh) by its ID and uses the `BehaviorFactory`
   * to create and attach the specified behavior.
   * Logs a warning if the target entity is not found.
   * @param message The validated message object for adding a behavior.
   */
  private _handleAddBehavior(
    message: Extract<GuardedAPIMessageType, { type: 'addBehavior' }>
  ): void {
    const entity = this._entities.get(message.entityId);
    if (!entity) {
      console.warn(`[SceneBridge] Entity ${message.entityId} not found for behavior addition`);
      return;
    }
    // Pass the behavior config (already correctly typed via GuardedAPIMessageType)
    this._behaviorFactory.createBehavior(entity, message.behavior);
  }

  /**
   * Handles 'registerObserver' messages from the worker.
   * Finds the target entity (if required for the observable type).
   * Attaches an observer to the appropriate Babylon.js observable (`scene.onBeforeRenderObservable`
   * or a transform observable).
   * Stores the observer details for later removal during disposal.
   * Logs a warning if the target entity is not found when required.
   * @param message The validated message object for registering an observer.
   */
  private _handleRegisterObserver(
    message: Extract<GuardedAPIMessageType, { type: 'registerObserver' }>
  ): void {
    const entity = this._entities.get(message.entityId);
    if (!entity && message.observableType !== 'beforeRender') {
      console.warn(
        `[SceneBridge] Entity ${message.entityId} not found for observer registration of type ${message.observableType}`
      );
      return;
    }

    if (message.observableType === 'beforeRender') {
      const observer = this._scene.onBeforeRenderObservable.add(scene => {
        this._postObservableMessage(message.observerId, message.entityId, scene);
      });
      // Use renamed type
      this._observers.set(message.observerId, {
        observer,
        type: 'beforeRender',
      } as ISceneObserverInfo);
      return;
    }

    if (!entity) {
      console.error(
        `[SceneBridge] Logic error: Entity ${message.entityId} is null or undefined despite check for transform observer.`
      );
      return;
    }

    const transformObservables = this._transformObservables.get(message.entityId);
    if (!transformObservables || !(message.observableType in transformObservables)) {
      console.warn(
        `[SceneBridge] No transform observable found for type ${message.observableType} on entity ${message.entityId}`
      );
      return;
    }

    const observable = transformObservables[message.observableType as TransformType];
    const observer = observable.add(value => {
      this._postObservableMessage(message.observerId, message.entityId, value);
    });
    // Use renamed type
    this._observers.set(message.observerId, {
      observer,
      entityId: message.entityId,
      type: message.observableType as TransformType,
    } as ITransformObserverInfo);
  }

  /**
   * Handles 'disposeEntity' messages from the worker.
   * Finds the entity by ID, removes its matrix observer, removes it from internal maps,
   * and disposes of the Babylon.js mesh object.
   * Also implicitly removes any observers tied directly to this entity.
   * @param message The message containing the entity ID to dispose.
   */
  private _handleDisposeEntity(
    message: Extract<GuardedAPIMessageType, { type: 'disposeEntity' }>
  ): void {
    const entityId = message.entityId;
    const entity = this._entities.get(entityId);

    if (!entity) {
      console.warn(`[SceneBridge] Attempted to dispose unknown entity: ${entityId}`);
      return;
    }

    const matrixObserverInfo = this._matrixObservers.get(entityId);
    if (matrixObserverInfo) {
      entity.onAfterWorldMatrixUpdateObservable.remove(matrixObserverInfo.observer);
      this._matrixObservers.delete(entityId);
    }
    this._transformObservables.delete(entityId);
    entity.dispose();
    this._entities.delete(entityId);
    console.log(`[SceneBridge] Disposed entity: ${entityId}`);
  }

  /**
   * Handles 'unobserve' messages from the worker.
   * Finds the observer by its ID, removes it from the corresponding Babylon.js observable,
   * and removes it from the internal observers map.
   * @param message The message containing the observer ID to remove.
   */
  private _handleUnobserve(message: Extract<GuardedAPIMessageType, { type: 'unobserve' }>): void {
    // Use renamed type
    const observerId = message.observerId;
    const observerInfo = this._observers.get(observerId);

    if (!observerInfo) {
      console.warn(`[SceneBridge] Attempted to unobserve unknown observer: ${observerId}`);
      return;
    }

    if (observerInfo.type === 'beforeRender') {
      this._scene.onBeforeRenderObservable.remove(observerInfo.observer as Observer<Scene>);
    } else {
      const transformObservables = this._transformObservables.get(observerInfo.entityId);
      if (transformObservables) {
        const observable = transformObservables[observerInfo.type];
        if (observable) {
          observable.remove(observerInfo.observer as Observer<Vector3>);
        } else {
          console.warn(
            `[SceneBridge] Observable type ${observerInfo.type} not found for entity ${observerInfo.entityId} during unobserve.`
          );
        }
      } else {
        console.log(
          `[SceneBridge] Entity ${observerInfo.entityId} not found for transform observer ${observerId} during unobserve (possibly already disposed).`
        );
      }
    }
    this._observers.delete(observerId);
    console.log(`[SceneBridge] Unobserved: ${observerId}`);
  }

  /**
   * Posts a message containing observed data back to the worker thread.
   * Serializes complex Babylon.js objects (like `Vector3`) into simple
   * JavaScript objects suitable for `postMessage`.
   * For `beforeRender`, sends only a timestamp.
   * @template T The type of observable being handled.
   * @param observerId The unique ID of the observer that triggered this message.
   * @param entityId The ID of the entity associated with the observation.
   * @param value The raw value obtained from the Babylon.js observable.
   */
  private _postObservableMessage<T extends ObservableType>(
    observerId: string,
    entityId: string,
    value: ObservableValueType<T>
  ): void {
    // Use renamed type for serialized value
    let serializedValue: SerializedObservableValueType<T>;

    if (value instanceof BabylonScene) {
      // Use ISerializedScene here explicitly if needed, though SerializedObservableValueType handles it
      serializedValue = { timestamp: Date.now() } as SerializedObservableValueType<T>;
    } else if (value instanceof Vector3) {
      // Use ISerializedVector3 here explicitly if needed
      serializedValue = {
        x: value.x,
        y: value.y,
        z: value.z,
      } as SerializedObservableValueType<T>;
    } else {
      console.warn(
        `[SceneBridge] Attempting to serialize potentially complex/unsupported type for observer ${observerId}`
      );
      serializedValue = value as unknown as SerializedObservableValueType<T>;
    }

    const workerMsg: WorkerMessage = {
      type: 'observable',
      observerId,
      entityId,
      value: serializedValue,
    };
    postMessage(workerMsg);
  }

  /**
   * Central message handler for all messages incoming from the worker thread.
   * Uses a type-safe switch statement to determine the message type and delegate
   * to the appropriate private handler method.
   * Logs a warning if no handler is found for a received message type.
   * @param message The message object received from the worker.
   */
  handleWorkerMessage(message: GuardedAPIMessageType): void {
    const handler = this._messageHandlers[message.type] as (msg: GuardedAPIMessageType) => void;
    if (handler) {
      handler(message);
    } else {
      console.warn(
        `[SceneBridge] No handler found for message type: ${(message as { type: string }).type}`
      );
    }
  }

  /**
   * Cleans up ALL resources managed by the SceneBridge.
   * Should be called only when the entire bridge is being shut down.
   * For individual cleanup, use `disposeEntity` and `unobserve` messages.
   * Removes all Babylon.js observers and disposes of all created entities (meshes).
   */
  dispose(): void {
    this._matrixObservers.forEach((info, entityId) => {
      const mesh = this._entities.get(entityId);
      if (mesh) {
        mesh.onAfterWorldMatrixUpdateObservable.remove(info.observer);
      }
    });
    this._matrixObservers.clear();

    this._observers.forEach(info => {
      if (info.type === 'beforeRender') {
        this._scene.onBeforeRenderObservable.remove(info.observer as Observer<Scene>);
      } else {
        const transformObservables = this._transformObservables.get(info.entityId);
        if (transformObservables) {
          const observable = transformObservables[info.type];
          if (observable) {
            observable.remove(info.observer as Observer<Vector3>);
          }
        }
      }
    });
    this._observers.clear();

    this._entities.forEach(entity => {
      entity.dispose();
    });
    this._entities.clear();

    this._transformObservables.clear();
    console.log('[SceneBridge] Disposed successfully.');
  }

  // --- Type Guards for Mesh Options (Update to use renamed types) --- //

  /** Checks if the options object is specifically for creating a Box mesh. */
  private _isBoxMeshOptions(options: IMeshOptions): options is IBoxMeshOptions {
    return options.type === 'box';
  }

  /** Checks if the options object is specifically for creating a Sphere mesh. */
  private _isSphereMeshOptions(options: IMeshOptions): options is ISphereMeshOptions {
    return options.type === 'sphere';
  }

  /** Checks if the options object is specifically for creating a Cylinder mesh. */
  private _isCylinderMeshOptions(options: IMeshOptions): options is ICylinderMeshOptions {
    return options.type === 'cylinder';
  }

  /** Checks if the options object is specifically for creating a Ground mesh. */
  private _isGroundMeshOptions(options: IMeshOptions): options is IGroundMeshOptions {
    return options.type === 'ground';
  }

  /** Checks if the options object is specifically for creating a Plane mesh. */
  private _isPlaneMeshOptions(options: IMeshOptions): options is IPlaneMeshOptions {
    return options.type === 'plane';
  }

  /** Checks if the options object is specifically for creating a Torus mesh. */
  private _isTorusMeshOptions(options: IMeshOptions): options is ITorusMeshOptions {
    return options.type === 'torus';
  }

  /** Checks if the options object is specifically for creating a TorusKnot mesh. */
  private _isTorusKnotMeshOptions(options: IMeshOptions): options is ITorusKnotMeshOptions {
    return options.type === 'torusKnot';
  }

  /** Checks if the options object is specifically for creating a Tube mesh. */
  private _isTubeMeshOptions(options: IMeshOptions): options is ITubeMeshOptions {
    return options.type === 'tube';
  }

  /**
   * Sets up internal observables for tracking the position, rotation, and scaling of a given mesh.
   * Attaches an observer to the mesh's `onAfterWorldMatrixUpdateObservable` to efficiently
   * capture transform changes and notify internal observables.
   * @param mesh The `AbstractMesh` instance to track.
   */
  private _setupTransformationTracking(mesh: AbstractMesh): void {
    const observables: ITransformObservables = {
      position: new Observable<Vector3>(),
      rotation: new Observable<Vector3>(),
      scaling: new Observable<Vector3>(),
    };

    // Cache the last known values to avoid unnecessary updates
    let lastPosition = mesh.position.clone();
    let lastRotation = mesh.rotation.clone();
    let lastScaling = mesh.scaling.clone();

    const matrixObserver = mesh.onAfterWorldMatrixUpdateObservable.add(() => {
      // Only notify if values have actually changed
      if (!this._areVectorsEqual(lastPosition, mesh.position)) {
        lastPosition = mesh.position.clone();
        observables.position.notifyObservers(lastPosition);
      }
      if (!this._areVectorsEqual(lastRotation, mesh.rotation)) {
        lastRotation = mesh.rotation.clone();
        observables.rotation.notifyObservers(lastRotation);
      }
      if (!this._areVectorsEqual(lastScaling, mesh.scaling)) {
        lastScaling = mesh.scaling.clone();
        observables.scaling.notifyObservers(lastScaling);
      }
    });

    this._transformObservables.set(mesh.id, observables);
    this._matrixObservers.set(mesh.id, {
      observer: matrixObserver,
      entityId: mesh.id,
    });
  }

  private _areVectorsEqual(v1: Vector3, v2: Vector3): boolean {
    return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
  }

  // Helper methods for mesh creation
  private _createBoxMesh(id: string, options: IBoxMeshOptions): Mesh {
    if (options.size !== undefined) {
      return MeshBuilder.CreateBox(id, { size: options.size }, this._scene);
    }
    return MeshBuilder.CreateBox(
      id,
      { width: options.width, height: options.height, depth: options.depth },
      this._scene
    );
  }

  private _createSphereMesh(id: string, options: ISphereMeshOptions): Mesh {
    const diameter = options.diameter;
    if (diameter === undefined) {
      throw new Error('Sphere requires diameter');
    }
    return MeshBuilder.CreateSphere(
      id,
      { diameter, segments: options.segments ?? 32 },
      this._scene
    );
  }

  private _createCylinderMesh(id: string, options: ICylinderMeshOptions): Mesh {
    const { height, diameter } = options;
    if (height === undefined || diameter === undefined) {
      throw new Error('Cylinder requires height and diameter');
    }
    return MeshBuilder.CreateCylinder(
      id,
      {
        height,
        diameter,
        tessellation: options.tessellation ?? 32,
      },
      this._scene
    );
  }

  private _createGroundMesh(id: string, options: IGroundMeshOptions): Mesh {
    const { width, height } = options;
    if (width === undefined || height === undefined) {
      throw new Error('Ground requires width and height');
    }
    return MeshBuilder.CreateGround(
      id,
      { width, height, subdivisions: options.subdivisions ?? 10 },
      this._scene
    );
  }

  private _createPlaneMesh(id: string, options: IPlaneMeshOptions): Mesh {
    if (options.size !== undefined) {
      return MeshBuilder.CreatePlane(id, { size: options.size }, this._scene);
    }
    return MeshBuilder.CreatePlane(
      id,
      { width: options.width, height: options.height },
      this._scene
    );
  }

  private _createTorusMesh(id: string, options: ITorusMeshOptions): Mesh {
    const { diameter, thickness } = options;
    if (diameter === undefined || thickness === undefined) {
      throw new Error('Torus requires diameter and thickness');
    }
    return MeshBuilder.CreateTorus(
      id,
      {
        diameter,
        thickness,
        tessellation: options.tessellation ?? 16,
      },
      this._scene
    );
  }

  private _createTorusKnotMesh(id: string, options: ITorusKnotMeshOptions): Mesh {
    const { radius, tube } = options;
    if (radius === undefined || tube === undefined) {
      throw new Error('TorusKnot requires radius and tube');
    }
    return MeshBuilder.CreateTorusKnot(
      id,
      {
        radius,
        tube,
        radialSegments: options.radialSegments ?? 16,
        tubularSegments: options.tubularSegments ?? 16,
        p: options.p ?? 2,
        q: options.q ?? 3,
      },
      this._scene
    );
  }

  private _createTubeMesh(id: string, options: ITubeMeshOptions): Mesh {
    if (!options.path || options.path.length < 2) {
      throw new Error('Tube requires a path with at least 2 points');
    }
    return MeshBuilder.CreateTube(
      id,
      {
        path: options.path,
        radius: options.radius ?? 0.5,
        tessellation: options.tessellation ?? 16,
        radiusFunction: options.radiusFunction,
        cap: options.cap,
      },
      this._scene
    );
  }

  private _validateMeshOptions(options: IMeshOptions): boolean {
    // Common validation for all mesh types
    if (!options.type) return false;

    // Type-specific validation
    switch (options.type) {
      case 'box':
        return (
          this._isBoxMeshOptions(options) &&
          (options.size !== undefined ||
            (options.width !== undefined &&
              options.height !== undefined &&
              options.depth !== undefined))
        );
      case 'sphere':
        return this._isSphereMeshOptions(options) && options.diameter! > 0;
      case 'cylinder':
        return this._isCylinderMeshOptions(options) && options.height! > 0 && options.diameter! > 0;
      case 'ground':
        return this._isGroundMeshOptions(options) && options.width! > 0 && options.height! > 0;
      case 'plane':
        return (
          this._isPlaneMeshOptions(options) &&
          (options.size !== undefined ||
            (options.width !== undefined && options.height !== undefined))
        );
      case 'torus':
        return this._isTorusMeshOptions(options) && options.diameter! > 0 && options.thickness! > 0;
      case 'torusKnot':
        return this._isTorusKnotMeshOptions(options) && options.radius! > 0 && options.tube! > 0;
      case 'tube':
        return this._isTubeMeshOptions(options) && options.path.length >= 2;
      default:
        return false;
    }
  }
}
