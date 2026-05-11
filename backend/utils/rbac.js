export const ROLE_PERMISSIONS = {
  user: ["upload", "view", "share", "delete"],
  admin: ["upload", "view", "share", "revoke", "delete", "audit", "manage_users"],
  auditor: ["view", "audit"],
  team_owner: ["upload", "view", "share", "revoke", "delete", "audit"]
};

export const getRolePermissions = (role = "user") => ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;

export const hasPermission = (user, permission) => getRolePermissions(user?.role).includes(permission);
