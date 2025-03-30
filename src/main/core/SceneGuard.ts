// SceneGuard.ts
import type { Scene } from '@babylonjs/core';
import type { GuardedAPIMessageType, IErrorMessage, WorkerMessage } from '../../shared/types/types';
import { SceneBridge } from './SceneBridge';

interface IMessageHandler {
  (event: MessageEvent<WorkerMessage>): void;
  timeoutId?: number;
  url: string;
}

interface IScriptErrorMessage extends IErrorMessage {
  source: 'loadScript';
  url: string;
}

function isScriptErrorMessage(message: IErrorMessage): message is IScriptErrorMessage {
  return message.source === 'loadScript' && 'url' in message;
}

export class SceneGuard {
  private _worker: Worker;
  private _bridge: SceneBridge;
  private _messageHandlers = new Map<string, IMessageHandler>();
  private _loadedScripts = new Set<string>();
  private _isDisposed = false;

  constructor(scene: Scene) {
    this._bridge = new SceneBridge(scene);
    this._worker = new Worker(new URL('../../worker/core/GuardedWorker.ts', import.meta.url), {
      type: 'module',
    });

    this._worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;

      if (data.type === 'error') {
        if (isScriptErrorMessage(data)) {
          const handler = Array.from(this._messageHandlers.values()).find(h => h.url === data.url);
          if (handler) {
            handler(event);
            return;
          }
        }
        console.error(`[SceneGuard Worker Error] (${data.source}):`, data.error);
        return;
      }

      if (data.type === 'scriptLoaded') {
        this._loadedScripts.add(data.url);
        const handler = Array.from(this._messageHandlers.values()).find(h => h.url === data.url);
        if (handler) {
          handler(event);
        }
        return;
      }

      if (this._isGuardedAPIMessage(data)) {
        this._bridge.handleWorkerMessage(data);
      }
    };

    this._worker.onerror = (error: ErrorEvent) => {
      console.error('[SceneGuard Worker onerror]:', error.message, error.filename, error.lineno);
    };
  }

  private _isGuardedAPIMessage(message: WorkerMessage): message is GuardedAPIMessageType {
    return ['createMesh', 'addBehavior', 'registerObserver', 'disposeEntity', 'unobserve'].includes(
      message.type
    );
  }

  private _clearMessageHandler(url: string): void {
    const handler = this._messageHandlers.get(url);
    if (handler) {
      if (handler.timeoutId) {
        clearTimeout(handler.timeoutId);
      }
      this._worker.removeEventListener('message', handler);
      this._messageHandlers.delete(url);
    }
  }

  async loadScript(url: string): Promise<void> {
    if (this._isDisposed) {
      throw new Error('SceneGuard instance is disposed');
    }

    if (this._loadedScripts.has(url)) {
      console.warn(`Script ${url} is already loaded`);
      return;
    }

    this._clearMessageHandler(url);

    return new Promise<void>((resolve, reject) => {
      const handler: IMessageHandler = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;

        if (data.type === 'scriptLoaded' && data.url === url) {
          this._clearMessageHandler(url);
          resolve();
        } else if (data.type === 'error' && isScriptErrorMessage(data) && data.url === url) {
          this._clearMessageHandler(url);
          reject(new Error(`Worker script load failed: ${data.error}`));
        }
      };

      handler.timeoutId = window.setTimeout(() => {
        this._clearMessageHandler(url);
        reject(new Error(`Worker script loading timed out: ${url}`));
      }, 30000);

      handler.url = url;
      this._messageHandlers.set(url, handler);
      this._worker.addEventListener('message', handler);
      this._worker.postMessage({ type: 'loadScript', url });
    });
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    this._messageHandlers.forEach((_, url) => {
      this._clearMessageHandler(url);
    });
    this._messageHandlers.clear();

    this._loadedScripts.clear();

    this._worker.terminate();
    this._bridge.dispose();
  }
}
