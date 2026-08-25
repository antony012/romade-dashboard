import { userDisplayName } from "./format";
import type { User } from "./types";

export function flattenReferralTree(
  users: User[],
): { user: User; depth: number }[] {
  const byParent = new Map<string | null, User[]>();
  for (const user of users) {
    const key = user.referredById ?? null;
    const list = byParent.get(key) ?? [];
    list.push(user);
    byParent.set(key, list);
  }

  const sortUsers = (list: User[]) =>
    [...list].sort((a, b) =>
      userDisplayName(a).localeCompare(userDisplayName(b), "es"),
    );

  const result: { user: User; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const child of sortUsers(byParent.get(parentId) ?? [])) {
      result.push({ user: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);

  const seen = new Set(result.map((row) => row.user.id));
  for (const user of sortUsers(users)) {
    if (!seen.has(user.id)) {
      result.push({ user, depth: 0 });
    }
  }
  return result;
}

export function descendantIds(users: User[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const user of users) {
    if (!user.referredById) continue;
    const list = children.get(user.referredById) ?? [];
    list.push(user.id);
    children.set(user.referredById, list);
  }

  const ids = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop();
    if (!id || ids.has(id)) continue;
    ids.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return ids;
}

export function childrenOf(users: User[], parentId: string): User[] {
  return users
    .filter((user) => user.referredById === parentId)
    .sort((a, b) =>
      userDisplayName(a).localeCompare(userDisplayName(b), "es"),
    );
}
