import { AsyncLocalStorage } from "node:async_hooks";

import type { JsonObject } from "../../../shared/src/transport";

export interface RpcRequestContext {
  request_id: string;
  action: string;
  tab_id: string;
  params: JsonObject;
}

const requestContextStorage = new AsyncLocalStorage<RpcRequestContext>();

export function runWithRpcRequestContext<T>(context: RpcRequestContext, callback: () => Promise<T>): Promise<T> {
  return requestContextStorage.run(context, callback);
}

export function getRpcRequestContext(): RpcRequestContext | undefined {
  return requestContextStorage.getStore();
}
