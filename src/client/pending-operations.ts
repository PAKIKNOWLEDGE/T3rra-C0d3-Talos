export type PendingOperation = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type OperationWaitContext = {
  operationId: string;
  sessionId: string;
  connectionToken: number;
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

export function createOperationWaitContext(
  operationId: string,
  sessionId: string,
  connectionToken: number,
): OperationWaitContext {
  return { operationId, sessionId, connectionToken };
}

export function isOperationWaitContextCurrent(
  context: OperationWaitContext,
  current: { sessionId: string; connectionToken: number },
): boolean {
  return (
    context.sessionId === current.sessionId &&
    context.connectionToken === current.connectionToken
  );
}

export function tryRegisterApprovalFlight(
  flights: Map<string, OperationWaitContext>,
  requestId: string,
  context: OperationWaitContext,
): boolean {
  if (flights.has(requestId)) return false;
  flights.set(requestId, context);
  return true;
}

export function clearApprovalFlightIfCurrent(
  flights: Map<string, OperationWaitContext>,
  requestId: string,
  operationId: string,
): void {
  const flight = flights.get(requestId);
  if (flight?.operationId === operationId) {
    flights.delete(requestId);
  }
}

export function clearStopFlightIfCurrent(
  flight: OperationWaitContext | undefined,
  operationId: string,
): OperationWaitContext | undefined {
  if (flight?.operationId === operationId) return undefined;
  return flight;
}
