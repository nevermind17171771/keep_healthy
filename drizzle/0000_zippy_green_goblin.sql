CREATE TABLE `workout_backups` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `workout_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`modified` text NOT NULL
);
