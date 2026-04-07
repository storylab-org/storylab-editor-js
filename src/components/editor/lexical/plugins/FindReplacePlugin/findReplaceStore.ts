/**
 * Singleton store for Find & Replace state.
 * Ensures there's only one instance of the state shared across all components.
 */

let stateInstance: any = null

export function setStateInstance(instance: any) {
  stateInstance = instance
}

export function getStateInstance() {
  return stateInstance
}
