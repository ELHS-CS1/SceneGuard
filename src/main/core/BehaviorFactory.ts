// BehaviorFactory.ts
import type { AbstractMesh, Behavior, Scene } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';
import type {
  BehaviorType,
  IBehaviorConfig,
  IBehaviorOptions,
  IMoveBehaviorOptions,
  IRotateBehaviorOptions,
  IScaleBehaviorOptions,
  ISerializedVector3,
} from '../../shared/types/types';

// Helper function to convert ISerializedVector3 to Vector3
function toVector3(vector: Vector3 | ISerializedVector3): Vector3 {
  if (vector instanceof Vector3) {
    return vector;
  }
  return new Vector3(vector.x, vector.y, vector.z);
}

class RotateBehavior implements Behavior<AbstractMesh> {
  private _scene: Scene;
  private _axis: Vector3;
  public name = 'RotateBehavior';

  constructor(
    scene: Scene,
    private _options: IRotateBehaviorOptions
  ) {
    this._scene = scene;
    this._axis = toVector3(_options.axis);
  }

  init(): void {}

  attach(target: AbstractMesh): void {
    this._scene.onBeforeRenderObservable.add(() => {
      target.rotate(
        this._axis,
        (this._options.speed * this._scene.getEngine().getDeltaTime()) / 1000
      );
    });
  }

  detach(): void {}
}

class ScaleBehavior implements Behavior<AbstractMesh> {
  private _scene: Scene;
  private _startTime = 0;
  private _initialScale: Vector3 | null = null;
  private _target: Vector3;
  public name = 'ScaleBehavior';

  constructor(
    scene: Scene,
    private _options: IScaleBehaviorOptions
  ) {
    this._scene = scene;
    this._target = toVector3(_options.target);
  }

  init(): void {}

  attach(target: AbstractMesh): void {
    this._startTime = Date.now();
    this._initialScale = target.scaling.clone();

    this._scene.onBeforeRenderObservable.add(() => {
      if (!this._initialScale) return;
      const progress = Math.min(
        (Date.now() - this._startTime) / (this._options.duration * 1000),
        1
      );
      const scale = Vector3.Lerp(this._initialScale, this._target, progress);
      target.scaling = scale;
    });
  }

  detach(): void {
    this._initialScale = null;
  }
}

class MoveBehavior implements Behavior<AbstractMesh> {
  private _scene: Scene;
  private _target: Vector3;
  public name = 'MoveBehavior';

  constructor(
    scene: Scene,
    private _options: IMoveBehaviorOptions
  ) {
    this._scene = scene;
    this._target = toVector3(_options.target);
  }

  init(): void {}

  attach(target: AbstractMesh): void {
    this._scene.onBeforeRenderObservable.add(() => {
      const direction = this._target.subtract(target.position).normalize();
      const distance = (this._options.speed * this._scene.getEngine().getDeltaTime()) / 1000;
      target.position.addInPlace(direction.scale(distance));
    });
  }

  detach(): void {}
}

export class BehaviorFactory {
  private readonly _behaviorMap: {
    [K in BehaviorType]: new (scene: Scene, options: IBehaviorOptions[K]) => Behavior<AbstractMesh>;
  } = {
    rotate: RotateBehavior,
    scale: ScaleBehavior,
    move: MoveBehavior,
  };

  constructor(private _scene: Scene) {}

  createBehavior<T extends BehaviorType>(
    entity: AbstractMesh,
    config: IBehaviorConfig<T>
  ): Behavior<AbstractMesh> | null {
    const BehaviorClass = this._behaviorMap[config.type];
    if (!BehaviorClass) {
      console.warn(`[BehaviorFactory] Unknown behavior type: ${config.type}`);
      return null;
    }

    const behavior = new BehaviorClass(this._scene, config.options);
    behavior.init();
    entity.addBehavior(behavior);
    return behavior;
  }
}
