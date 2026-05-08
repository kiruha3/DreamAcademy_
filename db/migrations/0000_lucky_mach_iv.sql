CREATE TABLE `answer_options` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`sort_order` int NOT NULL,
	`option_text` text NOT NULL,
	`is_correct` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `answer_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_attempts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`assessment_version_id` bigint unsigned NOT NULL,
	`attempt_number` int NOT NULL,
	`status` enum('in_progress','completed','expired') NOT NULL DEFAULT 'in_progress',
	`score` int,
	`max_score` int,
	`is_passed` boolean,
	`answers_json` longtext,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_versions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`assessment_id` bigint unsigned NOT NULL,
	`version_number` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`snapshot_json` longtext,
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `av_assessment_version_idx` UNIQUE(`assessment_id`,`version_number`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`module_version_id` bigint unsigned,
	`course_version_id` bigint unsigned,
	`assessment_type` enum('mini_test','final','certification') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`passing_score` int NOT NULL DEFAULT 80,
	`max_attempts` int NOT NULL DEFAULT 2,
	`time_limit_minutes` int,
	`show_correct_answers` boolean NOT NULL DEFAULT true,
	`allow_retake` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`actor_id` bigint unsigned,
	`actor_type` enum('user','system') NOT NULL DEFAULT 'user',
	`target_type` varchar(50) NOT NULL,
	`target_id` varchar(50) NOT NULL,
	`action` varchar(100) NOT NULL,
	`before_json` longtext,
	`after_json` longtext,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`s3_key` text NOT NULL,
	`fields_json` longtext,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`program_version_id` bigint unsigned NOT NULL,
	`certificate_number` varchar(100) NOT NULL,
	`verification_token` varchar(255) NOT NULL,
	`score` int,
	`max_score` int,
	`pdf_s3_key` text,
	`issued_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`revoke_reason` text,
	`is_manual` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `cert_number_idx` UNIQUE(`certificate_number`),
	CONSTRAINT `cert_token_idx` UNIQUE(`verification_token`)
);
--> statement-breakpoint
CREATE TABLE `course_progress` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_version_id` bigint unsigned NOT NULL,
	`program_progress_id` bigint unsigned NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`progress_percent` int NOT NULL DEFAULT 0,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `course_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `cp_user_cv_idx` UNIQUE(`user_id`,`course_version_id`)
);
--> statement-breakpoint
CREATE TABLE `course_versions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`course_id` bigint unsigned NOT NULL,
	`version_number` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`snapshot_json` longtext,
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `cv_course_version_idx` UNIQUE(`course_id`,`version_number`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`program_version_id` bigint unsigned NOT NULL,
	`sort_order` int NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`target_role` enum('all','employee','partner','integrator') NOT NULL DEFAULT 'all',
	`is_mandatory` boolean NOT NULL DEFAULT true,
	`image` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL,
	`secure` boolean NOT NULL DEFAULT true,
	`auth_user` varchar(255) NOT NULL,
	`auth_password_encrypted` text NOT NULL,
	`from_address` varchar(255) NOT NULL,
	`from_name` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT false,
	`updated_by` bigint unsigned NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_jobs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`s3_key` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`result_program_id` bigint unsigned,
	`report_json` longtext,
	`error_message` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `import_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(255) NOT NULL,
	`role` enum('user','employee','partner','integrator','admin','superadmin') NOT NULL DEFAULT 'user',
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`revoked_at` timestamp,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `module_contents` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`module_version_id` bigint unsigned NOT NULL,
	`content_type` enum('html_zip','pdf','rutube') NOT NULL,
	`s3_key` text,
	`s3_checksum` varchar(64),
	`rutube_video_id` varchar(100),
	`rutube_url` text,
	`duration_seconds` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_contents_id` PRIMARY KEY(`id`),
	CONSTRAINT `mc_mv_idx` UNIQUE(`module_version_id`)
);
--> statement-breakpoint
CREATE TABLE `module_progress` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`module_version_id` bigint unsigned NOT NULL,
	`course_progress_id` bigint unsigned NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`progress_percent` int NOT NULL DEFAULT 0,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `mp_user_mv_idx` UNIQUE(`user_id`,`module_version_id`)
);
--> statement-breakpoint
CREATE TABLE `module_versions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`module_id` bigint unsigned NOT NULL,
	`version_number` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`snapshot_json` longtext,
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `module_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mv_module_version_idx` UNIQUE(`module_id`,`version_number`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`course_version_id` bigint unsigned NOT NULL,
	`sort_order` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`module_type` enum('common','employee','partner','integrator') NOT NULL DEFAULT 'common',
	`is_mandatory` boolean NOT NULL DEFAULT true,
	`is_locked` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`type` enum('program_assigned','module_completed','assessment_reminder','certificate_issued','invitation_received','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`metadata_json` text,
	`is_read` boolean NOT NULL DEFAULT false,
	`read_at` timestamp,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `program_progress` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`program_version_id` bigint unsigned NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`progress_percent` int NOT NULL DEFAULT 0,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `program_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `pp_user_pv_idx` UNIQUE(`user_id`,`program_version_id`)
);
--> statement-breakpoint
CREATE TABLE `program_versions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`program_id` bigint unsigned NOT NULL,
	`version_number` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`snapshot_json` longtext,
	`published_at` timestamp,
	`archived_at` timestamp,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `program_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pv_program_version_idx` UNIQUE(`program_id`,`version_number`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`target_audience` enum('all','employee','partner','integrator') NOT NULL DEFAULT 'all',
	`has_certification` boolean NOT NULL DEFAULT false,
	`certificate_template_id` bigint unsigned,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `programs_slug_idx` UNIQUE(`slug`),
	CONSTRAINT `programs_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`assessment_version_id` bigint unsigned NOT NULL,
	`sort_order` int NOT NULL,
	`question_text` text NOT NULL,
	`question_type` enum('single','multiple','text') NOT NULL DEFAULT 'single',
	`explanation` text,
	`points` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_exports` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`report_type` varchar(50) NOT NULL,
	`filters_json` longtext,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`file_name` varchar(255),
	`s3_key` text,
	`error_message` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `report_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rutube_checks` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`module_content_id` bigint unsigned NOT NULL,
	`video_id` varchar(100) NOT NULL,
	`status` enum('available','unavailable','error') NOT NULL,
	`checked_at` timestamp NOT NULL DEFAULT (now()),
	`error_message` text,
	CONSTRAINT `rutube_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`category` enum('general','security','email','appearance') NOT NULL DEFAULT 'general',
	`is_encrypted` boolean NOT NULL DEFAULT false,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_idx` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `user_program_enrollments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`program_id` bigint unsigned NOT NULL,
	`assigned_by` bigint unsigned NOT NULL,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	CONSTRAINT `user_program_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `upe_user_program_idx` UNIQUE(`user_id`,`program_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`union_id` varchar(255),
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255),
	`avatar` text,
	`role` enum('user','employee','partner','integrator','admin','superadmin') NOT NULL DEFAULT 'user',
	`status` enum('active','blocked','pending') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_sign_in_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `answer_options` ADD CONSTRAINT `answer_options_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `aa_av_id_av_id_fk` FOREIGN KEY (`assessment_version_id`) REFERENCES `assessment_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_versions` ADD CONSTRAINT `assessment_versions_assessment_id_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_module_version_id_module_versions_id_fk` FOREIGN KEY (`module_version_id`) REFERENCES `module_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_course_version_id_course_versions_id_fk` FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_templates` ADD CONSTRAINT `certificate_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_program_version_id_program_versions_id_fk` FOREIGN KEY (`program_version_id`) REFERENCES `program_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_course_version_id_course_versions_id_fk` FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_program_progress_id_program_progress_id_fk` FOREIGN KEY (`program_progress_id`) REFERENCES `program_progress`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_versions` ADD CONSTRAINT `course_versions_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_program_version_id_program_versions_id_fk` FOREIGN KEY (`program_version_id`) REFERENCES `program_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_settings` ADD CONSTRAINT `email_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_jobs` ADD CONSTRAINT `import_jobs_result_program_id_programs_id_fk` FOREIGN KEY (`result_program_id`) REFERENCES `programs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_jobs` ADD CONSTRAINT `import_jobs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_contents` ADD CONSTRAINT `module_contents_module_version_id_module_versions_id_fk` FOREIGN KEY (`module_version_id`) REFERENCES `module_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_progress` ADD CONSTRAINT `module_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_progress` ADD CONSTRAINT `module_progress_module_version_id_module_versions_id_fk` FOREIGN KEY (`module_version_id`) REFERENCES `module_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_progress` ADD CONSTRAINT `module_progress_course_progress_id_course_progress_id_fk` FOREIGN KEY (`course_progress_id`) REFERENCES `course_progress`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_versions` ADD CONSTRAINT `module_versions_module_id_modules_id_fk` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `modules` ADD CONSTRAINT `modules_course_version_id_course_versions_id_fk` FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `program_progress` ADD CONSTRAINT `program_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `program_progress` ADD CONSTRAINT `program_progress_program_version_id_program_versions_id_fk` FOREIGN KEY (`program_version_id`) REFERENCES `program_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `program_versions` ADD CONSTRAINT `program_versions_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `program_versions` ADD CONSTRAINT `program_versions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `programs` ADD CONSTRAINT `programs_certificate_template_id_certificate_templates_id_fk` FOREIGN KEY (`certificate_template_id`) REFERENCES `certificate_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `programs` ADD CONSTRAINT `programs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_assessment_version_id_assessment_versions_id_fk` FOREIGN KEY (`assessment_version_id`) REFERENCES `assessment_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report_exports` ADD CONSTRAINT `report_exports_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rutube_checks` ADD CONSTRAINT `rutube_checks_module_content_id_module_contents_id_fk` FOREIGN KEY (`module_content_id`) REFERENCES `module_contents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_program_enrollments` ADD CONSTRAINT `user_program_enrollments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_program_enrollments` ADD CONSTRAINT `user_program_enrollments_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_program_enrollments` ADD CONSTRAINT `user_program_enrollments_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ao_question_idx` ON `answer_options` (`question_id`);--> statement-breakpoint
CREATE INDEX `aa_user_av_idx` ON `assessment_attempts` (`user_id`,`assessment_version_id`);--> statement-breakpoint
CREATE INDEX `aa_user_idx` ON `assessment_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `aa_av_idx` ON `assessment_attempts` (`assessment_version_id`);--> statement-breakpoint
CREATE INDEX `av_assessment_idx` ON `assessment_versions` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `assessments_mv_idx` ON `assessments` (`module_version_id`);--> statement-breakpoint
CREATE INDEX `assessments_cv_idx` ON `assessments` (`course_version_id`);--> statement-breakpoint
CREATE INDEX `assessments_type_idx` ON `assessments` (`assessment_type`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `ct_default_idx` ON `certificate_templates` (`is_default`);--> statement-breakpoint
CREATE INDEX `cert_user_idx` ON `certificates` (`user_id`);--> statement-breakpoint
CREATE INDEX `cert_pv_idx` ON `certificates` (`program_version_id`);--> statement-breakpoint
CREATE INDEX `cp_user_idx` ON `course_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `cp_cv_idx` ON `course_progress` (`course_version_id`);--> statement-breakpoint
CREATE INDEX `cv_course_idx` ON `course_versions` (`course_id`);--> statement-breakpoint
CREATE INDEX `courses_pv_idx` ON `courses` (`program_version_id`);--> statement-breakpoint
CREATE INDEX `courses_slug_idx` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `courses_sort_idx` ON `courses` (`program_version_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `es_active_idx` ON `email_settings` (`is_active`);--> statement-breakpoint
CREATE INDEX `ij_status_idx` ON `import_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `ij_created_by_idx` ON `import_jobs` (`created_by`);--> statement-breakpoint
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX `mp_user_idx` ON `module_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `mp_mv_idx` ON `module_progress` (`module_version_id`);--> statement-breakpoint
CREATE INDEX `mv_module_idx` ON `module_versions` (`module_id`);--> statement-breakpoint
CREATE INDEX `modules_cv_idx` ON `modules` (`course_version_id`);--> statement-breakpoint
CREATE INDEX `modules_sort_idx` ON `modules` (`course_version_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `notif_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notif_user_read_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `notif_type_idx` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `pp_user_idx` ON `program_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `pp_pv_idx` ON `program_progress` (`program_version_id`);--> statement-breakpoint
CREATE INDEX `pv_program_idx` ON `program_versions` (`program_id`);--> statement-breakpoint
CREATE INDEX `pv_status_idx` ON `program_versions` (`status`);--> statement-breakpoint
CREATE INDEX `programs_target_idx` ON `programs` (`target_audience`);--> statement-breakpoint
CREATE INDEX `questions_av_idx` ON `questions` (`assessment_version_id`);--> statement-breakpoint
CREATE INDEX `questions_sort_idx` ON `questions` (`assessment_version_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `re_status_idx` ON `report_exports` (`status`);--> statement-breakpoint
CREATE INDEX `re_created_by_idx` ON `report_exports` (`created_by`);--> statement-breakpoint
CREATE INDEX `rc_mc_idx` ON `rutube_checks` (`module_content_id`);--> statement-breakpoint
CREATE INDEX `rc_status_idx` ON `rutube_checks` (`status`);--> statement-breakpoint
CREATE INDEX `settings_category_idx` ON `settings` (`category`);--> statement-breakpoint
CREATE INDEX `upe_user_idx` ON `user_program_enrollments` (`user_id`);--> statement-breakpoint
CREATE INDEX `upe_program_idx` ON `user_program_enrollments` (`program_id`);--> statement-breakpoint
CREATE INDEX `users_union_id_idx` ON `users` (`union_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);