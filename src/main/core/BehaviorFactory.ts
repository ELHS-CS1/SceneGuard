// BehaviorFactory.ts
import type { Scene, AbstractMesh, Behavior } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';
import type {
  BehaviorConfig,
  BehaviorType,
  RotateBehaviorOptions,
  ScaleBehaviorOptions,
  MoveBehaviorOptions,
} from '../../shared/types/types';

class RotateBehavior implements Behavior<AbstractMesh> {
  private _scene: Scene;
  public name = 'RotateBehavior';

  constructor(
    scene: Scene,
    private _options: RotateBehaviorOptions
  ) {
    this._scene = scene;
  }

  init(): void {}

  attach(target: AbstractMesh): void {
    this._scene.onBeforeRenderObservable.add(() => {
      target.rotate(
        this._options.axis,
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
  public name = 'ScaleBehavior';

  constructor(
    scene: Scene,
    private _options: ScaleBehaviorOptions
  ) {
    this._scene = scene;
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
      const scale = Vector3.Lerp(this._initialScale, this._options.target, progress);
      target.scaling = scale;
    });
  }

  detach(): void {
    this._initialScale = null;
  }
}

class MoveBehavior implements Behavior<AbstractMesh> {
  private _scene: Scene;
  public name = 'MoveBehavior';

  constructor(
    scene: Scene,
    private _options: MoveBehaviorOptions
  ) {
    this._scene = scene;
  }

  init(): void {}

  attach(target: AbstractMesh): void {
    this._scene.onBeforeRenderObservable.add(() => {
      const direction = this._options.target.subtract(target.position).normalize();
      const distance = (this._options.speed * this._scene.getEngine().getDeltaTime()) / 1000;
      target.position.addInPlace(direction.scale(distance));
    });
  }

  detach(): void {}
}

export class BehaviorFactory {
  private readonly _behaviorMap: {
    [K in BehaviorType]: new (
      scene: Scene,
      options: BehaviorConfig<K>['options']
    ) => Behavior<AbstractMesh>;
  } = {
    rotate: RotateBehavior,
    scale: ScaleBehavior,
    move: MoveBehavior,
  };

  constructor(private _scene: Scene) {}

  createBehavior<T extends BehaviorType>(
    target: AbstractMesh,
    config: BehaviorConfig<T>
  ): Behavior<AbstractMesh> | null {
    const BehaviorClass = this._behaviorMap[config.type];
    if (!BehaviorClass) {
      console.warn(`Behavior type '${config.type}' is not implemented`);
      return null;
    }

    if (!this._validateBehaviorOptions(config.type, config.options)) {
      console.warn(`Invalid options for behavior type '${config.type}'`);
      return null;
    }

    const behavior = new BehaviorClass(this._scene, config.options);
    behavior.init();
    target.addBehavior(behavior);
    return behavior;
  }

  private _validateBehaviorOptions<T extends BehaviorType>(
    type: T,
    options: unknown
  ): options is BehaviorConfig<T>['options'] {
    switch (type) {
      case 'rotate':
        return this._isRotateOptions(options);
      case 'scale':
        return this._isScaleOptions(options);
      case 'move':
        return this._isMoveOptions(options);
      default:
        return false;
    }
  }

  private _isRotateOptions(options: unknown): options is RotateBehaviorOptions {
    const opts = options as RotateBehaviorOptions;
    return opts && opts.axis instanceof Vector3 && typeof opts.speed === 'number';
  }

  private _isScaleOptions(options: unknown): options is ScaleBehaviorOptions {
    const opts = options as ScaleBehaviorOptions;
    return (
      opts &&
      opts.target instanceof Vector3 &&
      typeof opts.duration === 'number' &&
      opts.duration > 0
    );
  }

  private _isMoveOptions(options: unknown): options is MoveBehaviorOptions {
    const opts = options as MoveBehaviorOptions;
    return (
      opts && opts.target instanceof Vector3 && typeof opts.speed === 'number' && opts.speed > 0
    );
  }
}
