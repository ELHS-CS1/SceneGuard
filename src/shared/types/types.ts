// types.ts
import type { Scene, AbstractMesh, Behavior, Vector3 } from '@babylonjs/core';

export interface MeshOptions {
  size?: number;
  width?: number;
  height?: number;
  depth?: number;
  position?: Vector3;
}

export interface ParticleOptions {
  capacity: number;
  textureUrl?: string;
  emitRate?: number;
}

export type BehaviorType = 'rotate' | 'scale' | 'move';

export interface RotateBehaviorOptions {
  axis: Vector3;
  speed: number;
}

export interface ScaleBehaviorOptions {
  target: Vector3;
  duration: number;
}

export interface MoveBehaviorOptions {
  target: Vector3;
  speed: number;
}

export type BehaviorOptions = {
  [K in BehaviorType]: K extends 'rotate' ? RotateBehaviorOptions :
                       K extends 'scale' ? ScaleBehaviorOptions :
                       K extends 'move' ? MoveBehaviorOptions :
                       never;
};

export interface BehaviorConfig<T extends BehaviorType = BehaviorType> {
  type: T;
  options: BehaviorOptions[T];
}

export interface BabylonEntity<T extends AbstractMesh = AbstractMesh> {
  nativeObject: T;
  behaviors: Set<Behavior<T>>;
}

export type EntityType = 'mesh' | 'light' | 'particleSystem' | 'model';

export type ObservableType = 'position' | 'rotation' | 'scaling' | 'beforeRender';

export type ObservableValueType<T extends ObservableType> = 
  T extends 'beforeRender' ? Scene :
  T extends 'position' | 'rotation' | 'scaling' ? Vector3 :
  never;

// Message type definitions
export type GuardedAPIMessageType = 
  | { type: 'createMesh'; id: string; options: MeshOptions }
  | { type: 'addBehavior'; entityId: string; behavior: BehaviorConfig }
  | { type: 'registerObserver'; entityId: string; observerId: string; observableType: ObservableType };

export type ObservableMessage<T extends ObservableType> = {
  type: 'observable';
  observerId: string;
  entityId: string;
  value: ObservableValueType<T>;
};

export interface ErrorMessage {
  type: 'error';
  error: string;
  source: string;
  url?: string; // Optional URL for script loading errors
}

export type ScriptMessage = {
  type: 'scriptLoaded';
  url: string;
} | {
  type: 'loadScript';
  url: string;
};

export type WorkerMessage = 
  | GuardedAPIMessageType 
  | ObservableMessage<ObservableType>
  | ErrorMessage
  | ScriptMessage;

export type MessageHandler<T extends GuardedAPIMessageType> = (message: T) => void;

export type GuardedAPIMethodMap = {
  [K in GuardedAPIMessageType['type']]: MessageHandler<Extract<GuardedAPIMessageType, { type: K }>>;
};
