import { PermissionManager } from './manager.js';
export function checkPermission(input) {
    const manager = new PermissionManager();
    return manager.check(input);
}
//# sourceMappingURL=check.js.map