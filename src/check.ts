import { PermissionManager } from './manager.js'
import type { PermissionCheckInput, PermissionDecision } from './types/index.js'

export function checkPermission(input: PermissionCheckInput): PermissionDecision {
  const manager = new PermissionManager()
  return manager.check(input)
}