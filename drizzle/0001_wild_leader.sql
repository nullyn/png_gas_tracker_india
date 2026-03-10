CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`severity` enum('low','medium','high','critical') NOT NULL,
	`category` enum('supply','price','shipping','reserve','futures','geopolitical') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`metric` varchar(100),
	`trigger_value` float,
	`threshold_value` float,
	`source` varchar(255),
	`notification_sent` boolean DEFAULT false,
	`notification_channel` varchar(50),
	`resolved_at` timestamp,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `futures_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`symbol` varchar(30) NOT NULL,
	`name` varchar(150),
	`category` enum('lng_benchmark','crude_oil','india_gas_stock','macro') NOT NULL,
	`price` float,
	`currency` varchar(10),
	`exchange` varchar(50),
	`change_percent` float,
	`prev_close` float,
	`rsi_14` float,
	`macd` float,
	`macd_signal` float,
	`macd_histogram` float,
	`sma_20` float,
	`sma_50` float,
	`bollinger_upper` float,
	`bollinger_mid` float,
	`bollinger_lower` float,
	`technical_signal` enum('strong_buy','buy','neutral','sell','strong_sell') DEFAULT 'neutral',
	`volume` float,
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `futures_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geopolitical_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`title` varchar(500) NOT NULL,
	`summary` text,
	`region` varchar(100),
	`severity` enum('low','medium','high','critical') DEFAULT 'medium',
	`source` varchar(255),
	`source_url` varchar(1000),
	`impact_on_lng` text,
	`is_active` boolean DEFAULT true,
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `geopolitical_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(30) NOT NULL,
	`date` timestamp NOT NULL,
	`open` float,
	`high` float,
	`low` float,
	`close` float,
	`volume` float,
	`adj_close` float,
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`lng_imports_mmtpa` float,
	`lng_imports_baseline` float DEFAULT 45,
	`import_change_percent` float,
	`lng_price_usd` float,
	`lng_price_baseline` float DEFAULT 8.5,
	`price_change_percent` float,
	`shipping_delay_days` float,
	`hormuz_status` enum('normal','elevated','critical') DEFAULT 'normal',
	`red_sea_status` enum('normal','elevated','critical') DEFAULT 'normal',
	`risk_score` float,
	`risk_level` enum('low','medium','high','critical') DEFAULT 'low',
	`data_source` varchar(255),
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `supply_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terminal_reserves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`terminal_name` varchar(100) NOT NULL,
	`operator` varchar(100),
	`state` varchar(50),
	`capacity_mmtpa` float,
	`current_reserve_mmtpa` float,
	`utilization_percent` float,
	`reserve_days` float,
	`status` enum('normal','low','critical') DEFAULT 'normal',
	`data_source` varchar(255),
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `terminal_reserves_id` PRIMARY KEY(`id`)
);
