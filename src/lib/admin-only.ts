export function adminOnlyFilter(isAdmin: boolean) {
  return isAdmin ? {} : { adminOnly: false };
}
