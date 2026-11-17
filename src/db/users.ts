import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { roles, users } from './schema.ts';

export async function ensureBaseRoles() {
  try {
    const baseRoles = [
      { name: 'ADMIN', description: 'Full platform governance, role assignment, data source, and Spark job control' },
      { name: 'ANALYST', description: 'Run sentiment batch jobs, ingest CSV/TXT datasets, and export analytics reports' },
      { name: 'USER', description: 'Explore dashboards, submit single comments, and inspect sport insights' },
    ];

    for (const r of baseRoles) {
      await db
        .insert(roles)
        .values(r)
        .onConflictDoNothing({ target: roles.name });
    }
    return await db.select().from(roles);
  } catch (error) {
    console.error('Database role initialization failed:', error);
    throw new Error('Failed to initialize user roles.', { cause: error });
  }
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string | null,
) {
  try {
    await ensureBaseRoles();
    const existing = await db.select().from(users).where(eq(users.uid, uid));

    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email,
          displayName: displayName || existing[0].displayName,
          photoUrl: photoUrl ?? existing[0].photoUrl,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const allUsersCount = await db.select({ id: users.id }).from(users);
    const defaultRoleName = allUsersCount.length === 0 ? 'ADMIN' : 'ANALYST';
    const roleRows = await db.select().from(roles).where(eq(roles.name, defaultRoleName));
    const roleId = roleRows[0]?.id ?? 1;

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Sports Analyst',
        photoUrl: photoUrl ?? null,
        roleId,
        roleName: defaultRoleName,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}
