CREATE TABLE `progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text NOT NULL,
	`level` integer NOT NULL,
	`srs_stage` integer DEFAULT 1 NOT NULL,
	`next_review_at` integer,
	`started_at` integer NOT NULL,
	`passed_at` integer,
	`burned_at` integer,
	`meaning_correct` integer DEFAULT 0 NOT NULL,
	`meaning_incorrect` integer DEFAULT 0 NOT NULL,
	`reading_correct` integer DEFAULT 0 NOT NULL,
	`reading_incorrect` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_user_item` ON `progress` (`user_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `progress_due` ON `progress` (`user_id`,`next_review_at`);--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`stage_before` integer NOT NULL,
	`stage_after` integer NOT NULL,
	`meaning_incorrect` integer DEFAULT 0 NOT NULL,
	`reading_incorrect` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_events_user` ON `review_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`current_level` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`leveled_up_at` integer
);
