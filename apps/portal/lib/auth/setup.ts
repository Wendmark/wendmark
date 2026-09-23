import { db } from '../db'

/**
 * A fresh install has an empty database and no way in, so the setup screen
 * creates the first administrator — and only while there is nobody at all.
 * Once a user exists it is closed for good.
 */
export async function needsSetup(): Promise<boolean> {
  return (await db.user.count()) === 0
}
