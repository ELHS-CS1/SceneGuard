// types.ts
import type { AbstractMesh, Behavior, Scene, Vector3 } from '@babylonjs/core';
import type { EntityHandle } from '../utils/EntityHandle';

export interface IBaseMeshOptions {
  position?: Vector3;
}

export interface IBoxMeshOptions extends IBaseMeshOptions {
  type: 'box';
  size?: number;
  width?: number;
  height?: number;
  depth?: number;
}

export interface ISphereMeshOptions extends IBaseMeshOptions {
  type: 'sphere';
  diameter?: number;
  segments?: number;
}

export interface ICylinderMeshOptions extends IBaseMeshOptions {
  type: 'cylinder';
  height?: number;
  diameter?: number;
  tessellation?: number;
}

export interface IGroundMeshOptions extends IBaseMeshOptions {
  type: 'ground';
  width?: number;
  height?: number;
  subdivisions?: number;
}

export interface IPlaneMeshOptions extends IBaseMeshOptions {
  type: 'plane';
  size?: number;
  width?: number;
  height?: number;
  sideOrientation?: number;
}

export interface ITorusMeshOptions extends IBaseMeshOptions {
  type: 'torus';
  diameter?: number;
  thickness?: number;
  tessellation?: number;
}

export interface ITorusKnotMeshOptions extends IBaseMeshOptions {
  type: 'torusKnot';
  radius?: number;
  tube?: number;
  radialSegments?: number;
  tubularSegments?: number;
  p?: number;
  q?: number;
}

export interface ITubeMeshOptions extends IBaseMeshOptions {
  type: 'tube';
  path: Vector3[];
  radius?: number;
  tessellation?: number;
  radiusFunction?: (i: number, distance: number) => number;
  cap?: number;
}

export type IMeshOptions =
  | IBoxMeshOptions
  | ISphereMeshOptions
  | ICylinderMeshOptions
  | IGroundMeshOptions
  | IPlaneMeshOptions
  | ITorusMeshOptions
  | ITorusKnotMeshOptions
  | ITubeMeshOptions;

export interface ISerializedVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ISerializedScene {
  timestamp: number;
}

export interface IParticleOptions {
  capacity: number;
  textureUrl?: string;
  emitRate?: number;
}

export type BehaviorType = 'rotate' | 'scale' | 'move';

export interface IRotateBehaviorOptions {
  axis: Vector3;
  speed: number;
}

export interface IScaleBehaviorOptions {
  target: Vector3;
  duration: number;
}

export interface IMoveBehaviorOptions {
  target: Vector3;
  speed: number;
}

export type IBehaviorOptions = {
  [K in BehaviorType]: K extends 'rotate'
    ? IRotateBehaviorOptions
    : K extends 'scale'
      ? IScaleBehaviorOptions
      : K extends 'move'
        ? IMoveBehaviorOptions
        : never;
};

export interface IBehaviorConfig<T extends BehaviorType = BehaviorType> {
  type: T;
  options: IBehaviorOptions[T];
}

export interface IBabylonEntity<T extends AbstractMesh = AbstractMesh> {
  nativeObject: T;
  behaviors: Set<Behavior<T>>;
}

export type EntityType = 'mesh' | 'light' | 'particleSystem' | 'model';

export type ObservableType = 'position' | 'rotation' | 'scaling' | 'beforeRender';

export type ObservableValueType<T extends ObservableType> = T extends 'beforeRender'
  ? Scene
  : T extends 'position' | 'rotation' | 'scaling'
    ? Vector3
    : never;

export type SerializedObservableValueType<T extends ObservableType> = T extends 'beforeRender'
  ? ISerializedScene
  : T extends 'position' | 'rotation' | 'scaling'
    ? ISerializedVector3
    : never;

// Message type definitions
export type GuardedAPIMessageType =
  | { type: 'createMesh'; id: string; options: IMeshOptions }
  | { type: 'addBehavior'; entityId: string; behavior: IBehaviorConfig }
  | {
      type: 'registerObserver';
      entityId: string;
      observerId: string;
      observableType: ObservableType;
    }
  | { type: 'disposeEntity'; entityId: string }
  | { type: 'unobserve'; observerId: string };

export type ObservableMessage<T extends ObservableType> = {
  type: 'observable';
  observerId: string;
  entityId: string;
  value: SerializedObservableValueType<T>;
};

export interface IErrorMessage {
  type: 'error';
  error: string;
  source: string;
  url?: string; // Optional URL for script loading errors
}

export type ScriptMessage =
  | {
      type: 'scriptLoaded';
      url: string;
    }
  | {
      type: 'loadScript';
      url: string;
    };

export type WorkerMessage =
  | GuardedAPIMessageType
  | ObservableMessage<ObservableType>
  | IErrorMessage
  | ScriptMessage;

export type MessageHandler<T extends GuardedAPIMessageType> = (message: T) => void;

// Type definition for the static GuardedAPI interface exposed globally in the worker
export interface IGuardedAPIStatic {
  createMesh(options: IMeshOptions): EntityHandle;
  addBehavior(entity: EntityHandle, config: IBehaviorConfig): void;
  observe<T extends ObservableType>(
    entity: EntityHandle,
    type: T,
    callback: (data: SerializedObservableValueType<T>) => void
  ): string;
  disposeEntity(entity: EntityHandle): void;
  unobserve(observerId: string): void;
  getEntity?(id: string): EntityHandle | undefined;
}

export type GuardedAPIMethodMap = {
  [K in GuardedAPIMessageType['type']]: MessageHandler<Extract<GuardedAPIMessageType, { type: K }>>;
};
