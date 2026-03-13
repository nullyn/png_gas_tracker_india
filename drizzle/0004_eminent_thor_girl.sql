CREATE TABLE `google_trends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`day` varchar(50) NOT NULL,
	`value` int NOT NULL,
	`keyword` varchar(255) DEFAULT 'induction cooking',
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `google_trends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `x_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`author` varchar(100) NOT NULL,
	`handle` varchar(255),
	`avatar` varchar(10),
	`text` text NOT NULL,
	`likes` int DEFAULT 0,
	`retweets` int DEFAULT 0,
	`url` varchar(1000),
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `x_posts_id` PRIMARY KEY(`id`)
);
