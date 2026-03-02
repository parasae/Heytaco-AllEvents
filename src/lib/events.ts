// Simple custom event for triggering data refreshes across components
export const TACO_GIVEN_EVENT = "taco:given";

export function emitTacoGiven() {
  window.dispatchEvent(new CustomEvent(TACO_GIVEN_EVENT));
}

export function onTacoGiven(callback: () => void): () => void {
  window.addEventListener(TACO_GIVEN_EVENT, callback);
  return () => window.removeEventListener(TACO_GIVEN_EVENT, callback);
}
