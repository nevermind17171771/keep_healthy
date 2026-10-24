import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const workoutState = sqliteTable('workout_state', {
  userId: text('user_id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(0),
  modified: text('modified').notNull(),
  mutationId: text('mutation_id'),
  mutationHash: text('mutation_hash')
});
export const workoutBackups = sqliteTable('workout_backups', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull(),
  created: text('created').notNull()
}, t => [primaryKey({
  columns: [t.userId, t.id]
})]);
