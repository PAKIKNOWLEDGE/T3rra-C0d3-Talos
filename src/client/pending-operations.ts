export type PendingOperation = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

/** Reject every in-flight client operation wait (disconnect / transport loss). */
export function rejectAllPendingOperations(
  pending: Map<string, PendingOperation>,
  message: string,
): void {
  const error = new Error(message);
  for (const [operationId, operation] of pending) {
    operation.reject(error);
    pending.delete(operationId);
  }
}
