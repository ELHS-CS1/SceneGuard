// SceneBridge.ts
import type { Scene, AbstractMesh, Vector3, Observer, TransformNode } from '@babylonjs/core';
import { MeshBuilder, Observable } from '@babylonjs/core';
import type {
  BehaviorConfig,
  GuardedAPIMessageType,
  GuardedAPIMethodMap,
  ObservableType,
  ObservableValueType,
  MessageHandler,
  BehaviorType,
  WorkerMessage,
} from '../../shared/types/types';
import { BehaviorFactory } from './BehaviorFactory';

type TransformType = Exclude<ObservableType, 'beforeRender'>;

type TransformObservables = {
  [K in TransformType]: Observable<Vector3>;
};

interface SceneObserverInfo {
  observer: Observer<Scene>;
  type: 'beforeRender';
}

interface TransformObserverInfo {
  observer: Observer<Vector3>;
  entityId: string;
  type: TransformType;
}

interface MatrixObserverInfo {
  observer: Observer<TransformNode>;
  entityId: string;
}

type ObserverInfo = SceneObserverInfo | TransformObserverInfo;

export class SceneBridge {
  private _entities = new Map<string, AbstractMesh>();
  private _behaviorFactory: BehaviorFactory;
  private _transformObservables = new Map<string, TransformObservables>();
  private _observers = new Map<string, ObserverInfo>();
  private _matrixObservers = new Map<string, MatrixObserverInfo>();

  private readonly _messageHandlers: GuardedAPIMethodMap = {
    createMesh: message => {
      const mesh = MeshBuilder.CreateBox(message.id, message.options, this._scene);
      if (message.options.position) {
        mesh.position.copyFrom(message.options.position);
      }
      this._entities.set(message.id, mesh);

      // Set up transformation tracking
      const observables: TransformObservables = {
        position: new Observable<Vector3>(),
        rotation: new Observable<Vector3>(),
        scaling: new Observable<Vector3>(),
      };

      const matrixObserver = mesh.onAfterWorldMatrixUpdateObservable.add(() => {
        observables.position.notifyObservers(mesh.position.clone());
        observables.rotation.notifyObservers(mesh.rotation.clone());
        observables.scaling.notifyObservers(mesh.scaling.clone());
      });

      this._transformObservables.set(message.id, observables);

      // Store the matrix update observer separately
      this._matrixObservers.set(message.id, {
        observer: matrixObserver,
        entityId: message.id,
      });
    },

    addBehavior: <T extends BehaviorType>(message: {
      entityId: string;
      behavior: BehaviorConfig<T>;
    }) => {
      const entity = this._entities.get(message.entityId);
      if (!entity) {
        console.warn(`Entity ${message.entityId} not found for behavior addition`);
        return;
      }
      this._behaviorFactory.createBehavior(entity, message.behavior);
    },

    registerObserver: (message: {
      entityId: string;
      observerId: string;
      observableType: ObservableType;
    }) => {
      const entity = this._entities.get(message.entityId);
      if (!entity) {
        console.warn(`Entity ${message.entityId} not found for observer registration`);
        return;
      }

      if (message.observableType === 'beforeRender') {
        const observer = this._scene.onBeforeRenderObservable.add(scene => {
          this._postObservableMessage(message.observerId, message.entityId, scene);
        });

        this._observers.set(message.observerId, {
          observer,
          type: 'beforeRender',
        });
        return;
      }

      const transformObservables = this._transformObservables.get(message.entityId);
      if (!transformObservables || !(message.observableType in transformObservables)) {
        console.warn(`No transform observable found for type ${message.observableType}`);
        return;
      }

      const observable = transformObservables[message.observableType as TransformType];
      const observer = observable.add(value => {
        this._postObservableMessage(message.observerId, message.entityId, value);
      });

      this._observers.set(message.observerId, {
        observer,
        entityId: message.entityId,
        type: message.observableType as TransformType,
      });
    },
  };

  constructor(private _scene: Scene) {
    this._behaviorFactory = new BehaviorFactory(_scene);
  }

  private _postObservableMessage<T extends ObservableType>(
    observerId: string,
    entityId: string,
    value: ObservableValueType<T>
  ): void {
    postMessage({
      type: 'observable',
      observerId,
      entityId,
      value,
    } satisfies WorkerMessage);
  }

  handleWorkerMessage<T extends GuardedAPIMessageType>(message: T): void {
    const handler = this._messageHandlers[message.type] as MessageHandler<T>;
    if (!handler) {
      console.warn(`No handler found for message type: ${message.type}`);
      return;
    }
    handler(message);
  }

  dispose(): void {
    // Clean up entities
    this._entities.forEach(entity => {
      entity.dispose();
    });
    this._entities.clear();

    // Clean up observers
    this._observers.forEach(info => {
      if (info.type === 'beforeRender') {
        this._scene.onBeforeRenderObservable.remove(info.observer);
      } else {
        const transformObservables = this._transformObservables.get(info.entityId);
        if (transformObservables) {
          transformObservables[info.type].remove(info.observer);
        }
      }
    });
    this._observers.clear();

    // Clean up matrix observers
    this._matrixObservers.forEach((info, entityId) => {
      const mesh = this._entities.get(entityId);
      if (mesh) {
        mesh.onAfterWorldMatrixUpdateObservable.remove(info.observer);
      }
    });
    this._matrixObservers.clear();

    // Clean up observables
    this._transformObservables.clear();
  }
}
