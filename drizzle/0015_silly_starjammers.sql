ALTER TABLE `institutions` ADD `logoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `institutions` ADD `primaryColor` varchar(20) DEFAULT '#B69A5E' NOT NULL;--> statement-breakpoint
ALTER TABLE `institutions` ADD `secondaryColor` varchar(20) DEFAULT '#1B201D' NOT NULL;