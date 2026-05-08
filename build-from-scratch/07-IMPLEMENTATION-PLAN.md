# Final Implementation Plan: DreamDocs Academy

> Based on: tzDAc.md (full spec, 20K+ lines)
> Methodology: Epic -> Feature -> Story -> Task
> Skills: writing-plans, project_planner, task_tracker, test-driven-development, code_reviewer, design-system, skill_router, auto_skill_selector

---

## Table of Contents

1. [Architecture and Entities](#1-architecture-and-entities)
2. [Full Database Schema](#2-full-database-schema)
3. [Full API Endpoints](#3-full-api-endpoints)
4. [Full Frontend Pages](#4-full-frontend-pages)
5. [Epics and Tasks](#5-epics-and-tasks)
6. [Roadmap](#6-roadmap)
7. [Agent Workflow](#7-agent-workflow)
8. [Risks and Mitigation](#8-risks-and-mitigation)
9. [Task Tracker](#9-task-tracker)
10. [Pre-Launch Checklist](#10-pre-launch-checklist)


---

## 1. Architecture and Entities

### 1.1. Data Hierarchy

```
Program (top-level learning program)
  -> ProgramVersion (published version, immutable)
    -> Course (course inside program)
      -> CourseVersion
        -> Module (module inside course)
          -> ModuleVersion
            -> Content (HTML ZIP / PDF / Rutube / native_builder)
            -> Assessment (mini-test for module)
              -> AssessmentVersion
          -> ModuleProgress (user progress per module)
        -> CourseProgress
        -> Assessment (course final test)
          -> AssessmentVersion
    -> ProgramProgress
    -> Assessment (program final certification)
      -> AssessmentVersion
    -> Certificate (certificate for program completion)
      -> CertificateTemplate (PDF template)

User
  -> Invitation (email invitation with one-time link)
  -> UserProgramEnrollment (assigned programs)
  -> Notification (system notifications)

Admin / Superadmin
  -> AuditLog (all administrative actions)
  -> Settings (system settings)
  -> EmailSettings (SMTP configuration)
  -> ImportJob (ZIP import tracking)
  -> ReportExport (async report generation)
```

### 1.2. Roles and Middleware

| Procedure | Check | Usage |
|-----------|-------|-------|
| `publicProcedure` | None | Health check, public certificate verify, login |
| `authedProcedure` | ctx.user exists | All user APIs |
| `adminProcedure` | authed + role in [admin, superadmin] | Administrative APIs |
| `superAdminProcedure` | authed + role = superadmin | System settings, admin management |

### 1.3. Key Architectural Principles

1. **Backend is single source of truth** for progress, tests, certificates
2. **Published versions are immutable** - any change creates new draft version
3. **All critical actions are logged** in AuditLog
4. **Users created only by Admin/Superadmin** - no free registration
5. **Single superadmin** - created only via backend
6. **Certificate issued per ProgramVersion** - tied to specific version
7. **HTML ZIP opens in sandboxed iframe** - no access to tokens
8. **HTML test results accepted only with active backend attempt**

---

## 2. Full Database Schema

### 2.1. Users and Access Tables

**users**
- id serial PK, union_id varchar(255), name varchar(255), email varchar(320) unique not null
- password_hash varchar(255), avatar text
- role enum("employee","partner","integrator","admin","superadmin") not null
- status enum("active","blocked","pending_activation") default "pending_activation"
- created_at, updated_at, last_sign_in_at timestamp default now()
- indexes: email (unique), union_id, role, status

**invitations**
- id serial PK, user_id bigint unsigned not null FK -> users
- email varchar(320) not null, token_hash varchar(255) not null
- status enum("pending","accepted","expired","revoked") default "pending"
- expires_at timestamp not null, sent_at timestamp, accepted_at timestamp
- created_by bigint unsigned not null FK -> users
- ip_address varchar(45), user_agent text
- created_at timestamp default now()
- indexes: user_id, email, token_hash, status, expires_at

**user_program_enrollments**
- id serial PK, user_id bigint unsigned not null FK -> users
- program_version_id bigint unsigned not null FK -> program_versions
- status enum("active","completed","dropped") default "active"
- enrolled_at timestamp default now(), completed_at timestamp nullable
- assigned_by bigint unsigned not null FK -> users
- indexes: user_id, program_version_id, status
- unique: (user_id, program_version_id)

### 2.2. Programs and Versioning

**programs**
- id serial PK, slug varchar(50) unique not null, title varchar(100) not null
- description text, target_audience enum("employee","partner","integrator","mixed") not null
- language varchar(10) default "ru", image varchar(255)
- is_certification_enabled boolean default false, passing_score int default 80
- created_by bigint unsigned not null FK -> users
- created_at, updated_at timestamp default now()
- indexes: slug (unique), target_audience, is_certification_enabled

**program_versions**
- id serial PK, program_id bigint unsigned not null FK -> programs
- version_number int not null, status enum("draft","published","archived") default "draft"
- published_at timestamp nullable, archived_at timestamp nullable
- created_by bigint unsigned not null FK -> users
- created_at timestamp default now()
- indexes: program_id, version_number, status
- unique: (program_id, version_number)

**courses**
- id serial PK, program_id bigint unsigned not null FK -> programs
- slug varchar(50) not null, title varchar(100) not null
- description text, sort_order int default 0
- role_branch enum("common","employee","partner","integrator") default "common"
- is_required boolean default true, status enum("draft","published","archived") default "draft"
- created_at timestamp default now()
- indexes: program_id, slug, role_branch, status

**course_versions**
- id serial PK, course_id bigint unsigned not null FK -> courses
- program_version_id bigint unsigned not null FK -> program_versions
- version_number int not null, status enum("draft","published","archived") default "draft"
- snapshot_json json
- created_at timestamp default now()
- indexes: course_id, program_version_id, version_number

**modules**
- id serial PK, course_id bigint unsigned not null FK -> courses
- title varchar(100) not null, description text, sort_order int default 0
- module_type enum("common","employee","partner","integrator") default "common"
- content_mode enum("html_zip","pdf","rutube","native_builder") default "html_zip"
- is_required boolean default true, is_locked boolean default false
- status enum("draft","published","archived") default "draft"
- created_at timestamp default now()
- indexes: course_id, sort_order, module_type, status

**module_versions**
- id serial PK, module_id bigint unsigned not null FK -> modules
- course_version_id bigint unsigned not null FK -> course_versions
- version_number int not null, status enum("draft","published","archived") default "draft"
- snapshot_json json
- created_at timestamp default now()
- indexes: module_id, course_version_id, version_number

**module_contents**
- id serial PK, module_version_id bigint unsigned not null FK -> module_versions
- content_type enum("html_zip","pdf","rutube","native_builder")
- html_zip_s3_key varchar(255), html_zip_checksum varchar(64)
- pdf_s3_key varchar(255), rutube_url varchar(255)
- content_json json, settings_json json
- created_at timestamp default now()
- indexes: module_version_id, content_type

### 2.3. Assessments (Testing)

**assessments**
- id serial PK, title varchar(100) not null, description text
- assessment_type enum("mini_test","course_final","program_final") not null
- module_id bigint unsigned nullable FK -> modules
- course_id bigint unsigned nullable FK -> courses
- program_id bigint unsigned nullable FK -> programs
- passing_score int default 80, max_attempts int default 2
- show_feedback enum("none","after_attempt","after_passed") default "after_attempt"
- time_limit_seconds int nullable, is_required boolean default true
- status enum("draft","ready_for_review","published","archived") default "draft"
- created_at timestamp default now()
- indexes: assessment_type, module_id, course_id, program_id, status

**assessment_versions**
- id serial PK, assessment_id bigint unsigned not null FK -> assessments
- version_number int not null, status enum("draft","published","archived") default "draft"
- snapshot_json json, html_zip_s3_key varchar(255), html_zip_checksum varchar(64)
- published_at timestamp nullable
- created_at timestamp default now()
- indexes: assessment_id, version_number, status

**assessment_attempts**
- id serial PK, user_id bigint unsigned not null FK -> users
- assessment_version_id bigint unsigned not null FK -> assessment_versions
- status enum("started","submitted","cancelled","expired") default "started"
- score int nullable, is_passed boolean nullable
- answers_json json, started_at timestamp default now()
- submitted_at timestamp nullable, expires_at timestamp nullable
- attempt_number int not null
- created_at timestamp default now()
- indexes: user_id, assessment_version_id, status, attempt_number

**questions** (architectural foundation for native_test builder)
- id serial PK, assessment_id bigint unsigned not null FK -> assessments
- sort_order int, question_type enum("single_choice","multiple_choice","true_false")
- question_text text not null, explanation text, points int default 1
- settings_json json, created_at timestamp default now()
- indexes: assessment_id, sort_order

**answer_options**
- id serial PK, question_id bigint unsigned not null FK -> questions
- option_text text not null, is_correct boolean default false
- sort_order int, created_at timestamp default now()
- indexes: question_id, sort_order

### 2.4. Progress Tables

**program_progress**
- id serial PK, user_id bigint unsigned not null FK -> users
- program_version_id bigint unsigned not null FK -> program_versions
- status enum("not_started","in_progress","completed") default "not_started"
- progress_percent int default 0, started_at timestamp nullable
- completed_at timestamp nullable, current_course_id bigint unsigned nullable
- current_module_id bigint unsigned nullable
- created_at, updated_at timestamp default now()
- indexes: user_id, program_version_id, status
- unique: (user_id, program_version_id)

**course_progress**
- id serial PK, user_id bigint unsigned not null FK -> users
- course_version_id bigint unsigned not null FK -> course_versions
- program_progress_id bigint unsigned not null FK -> program_progress
- status enum("not_started","in_progress","completed") default "not_started"
- progress_percent int default 0, started_at timestamp nullable, completed_at timestamp nullable
- created_at, updated_at timestamp default now()
- indexes: user_id, course_version_id, program_progress_id, status
- unique: (user_id, course_version_id)

**module_progress**
- id serial PK, user_id bigint unsigned not null FK -> users
- module_version_id bigint unsigned not null FK -> module_versions
- course_progress_id bigint unsigned not null FK -> course_progress
- status enum("not_started","in_progress","completed") default "not_started"
- is_opened boolean default false, opened_at timestamp nullable
- is_completed boolean default false, completed_at timestamp nullable
- mini_test_status enum("not_available","available","in_progress","passed","failed","attempts_exhausted") default "not_available"
- created_at, updated_at timestamp default now()
- indexes: user_id, module_version_id, course_progress_id, status
- unique: (user_id, module_version_id)

### 2.5. Certificates

**certificate_templates**
- id serial PK, program_id bigint unsigned not null FK -> programs
- program_version_id bigint unsigned not null FK -> program_versions
- title varchar(100), template_file_url varchar(255) not null
- template_type enum("pdf") default "pdf"
- field_coordinates_json json, is_active boolean default false
- created_by bigint unsigned not null FK -> users
- created_at, updated_at timestamp default now()
- indexes: program_id, program_version_id, is_active

**certificates**
- id serial PK, user_id bigint unsigned not null FK -> users
- program_version_id bigint unsigned not null FK -> program_versions
- certificate_number varchar(50) unique not null
- status enum("issued","revoked","reissued") default "issued"
- issued_at timestamp default now(), revoked_at timestamp nullable
- revoke_reason text nullable, reissued_certificate_id bigint unsigned nullable
- score_at_issue int nullable, pdf_url varchar(255)
- verification_token_hash varchar(255) not null
- issued_by enum("system","manual") default "system"
- manual_reason text nullable, created_by bigint unsigned nullable
- created_at timestamp default now()
- indexes: user_id, program_version_id, certificate_number (unique), status, verification_token_hash
- unique: (user_id, program_version_id, status) where status="issued"

### 2.6. Service Tables

**import_jobs**
- id serial PK, file_name varchar(255), file_s3_key varchar(255)
- import_type enum("program","course","module") default "program"
- status enum("pending","processing","completed","failed","cancelled") default "pending"
- manifest_json json, report_json json, error_message text
- started_at timestamp nullable, completed_at timestamp nullable
- created_by bigint unsigned not null FK -> users
- created_at timestamp default now()
- indexes: status, import_type, created_by

**notifications**
- id serial PK, recipient_user_id bigint unsigned nullable FK -> users
- recipient_role enum("admin","superadmin") nullable
- type enum("invitation_send_failed","certificate_issued","certificate_email_failed",
         "rutube_video_unavailable","import_completed","import_failed",
         "program_published") not null
- title varchar(200) not null, message text not null
- status enum("unread","read") default "unread"
- metadata_json json, read_at timestamp nullable
- created_at timestamp default now()
- indexes: recipient_user_id, recipient_role, type, status, created_at

**audit_logs**
- id serial PK, actor_id bigint unsigned nullable FK -> users
- actor_role enum("employee","partner","integrator","admin","superadmin","system") nullable
- action varchar(100) not null, target_entity_type varchar(50)
- target_entity_id bigint unsigned, before_json json, after_json json
- ip_address varchar(45), user_agent text
- created_at timestamp default now()
- indexes: actor_id, action, target_entity_type, target_entity_id, created_at

**settings**
- id serial PK, category varchar(50) not null, key varchar(100) not null
- value text, is_encrypted boolean default false
- updated_by bigint unsigned nullable FK -> users
- updated_at timestamp default now()
- indexes: category, key
- unique: (category, key)

**email_settings**
- id serial PK, smtp_host varchar(255), smtp_port int
- smtp_username varchar(255), smtp_password_encrypted text
- smtp_use_tls boolean default true, smtp_use_ssl boolean default false
- from_email varchar(320), from_name varchar(100), reply_to_email varchar(320)
- is_active boolean default false, updated_by bigint unsigned nullable
- updated_at timestamp default now()

**rutube_checks**
- id serial PK, rutube_url varchar(255) not null, video_id varchar(100)
- is_available boolean, checked_at timestamp default now()
- error_message text, module_version_id bigint unsigned nullable
- created_at timestamp default now()
- indexes: rutube_url, is_available, checked_at

**report_exports**
- id serial PK, report_type varchar(50) not null
- requested_by bigint unsigned not null FK -> users
- status enum("pending","processing","completed","failed","expired") default "pending"
- filters_json json, file_url varchar(255), file_format enum("xlsx","csv") default "xlsx"
- error_message text, created_at timestamp default now(), finished_at timestamp nullable
- indexes: requested_by, status, report_type

### 2.7. Index Summary

| Table | Indexes |
|-------|---------|
| users | email (unique), union_id, role, status |
| invitations | user_id, email, token_hash, status, expires_at |
| user_program_enrollments | user_id, program_version_id, status. Unique: (user_id, program_version_id) |
| programs | slug (unique), target_audience, is_certification_enabled |
| program_versions | program_id, version_number, status. Unique: (program_id, version_number) |
| courses | program_id, slug, role_branch, status |
| course_versions | course_id, program_version_id, version_number |
| modules | course_id, sort_order, module_type, status |
| module_versions | module_id, course_version_id, version_number |
| module_contents | module_version_id, content_type |
| assessments | assessment_type, module_id, course_id, program_id, status |
| assessment_versions | assessment_id, version_number, status |
| assessment_attempts | user_id, assessment_version_id, status, attempt_number |
| questions | assessment_id, sort_order |
| answer_options | question_id, sort_order |
| program_progress | user_id, program_version_id, status. Unique: (user_id, program_version_id) |
| course_progress | user_id, course_version_id, program_progress_id, status |
| module_progress | user_id, module_version_id, course_progress_id, status |
| certificate_templates | program_id, program_version_id, is_active |
| certificates | user_id, program_version_id, certificate_number (unique), status, verification_token_hash |
| import_jobs | status, import_type, created_by |
| notifications | recipient_user_id, recipient_role, type, status, created_at |
| audit_logs | actor_id, action, target_entity_type, target_entity_id, created_at |
| settings | category, key. Unique: (category, key) |
| rutube_checks | rutube_url, is_available, checked_at |
| report_exports | requested_by, status, report_type |


---

## 3. Full API Endpoints

### 3.1. Public API (no auth)

```
GET  /health                    -> health check
POST /api/trpc/auth.login       -> login
POST /api/trpc/auth.register    -> registration (MVP: disabled)
GET  /api/trpc/auth.me          -> current user (null if not auth)
POST /api/trpc/auth.logout      -> logout
GET  /api/public/certificates/verify/{token}  -> public certificate verification
```

### 3.2. User API (authedProcedure)

```
-- My data
GET  /api/trpc/user.me
PATCH /api/trpc/user.updateProfile
POST /api/trpc/user.changePassword

-- My programs
GET  /api/trpc/user.programs.list
GET  /api/trpc/user.programs.getById
POST /api/trpc/user.programs.open

-- My courses
GET  /api/trpc/user.courses.list
GET  /api/trpc/user.courses.getById
POST /api/trpc/user.courses.open

-- My modules
GET  /api/trpc/user.modules.list
GET  /api/trpc/user.modules.getById
POST /api/trpc/user.modules.open
POST /api/trpc/user.modules.complete

-- Assessments
GET  /api/trpc/user.assessments.getById
POST /api/trpc/user.assessments.start
POST /api/trpc/user.assessments.submit
GET  /api/trpc/user.assessments.results

-- Progress
GET  /api/trpc/user.progress.program
GET  /api/trpc/user.progress.course
GET  /api/trpc/user.progress.module

-- Certificates
GET  /api/trpc/user.certificates.list
GET  /api/trpc/user.certificates.getById
GET  /api/trpc/user.certificates.download

-- Notifications
GET  /api/trpc/user.notifications.list
POST /api/trpc/user.notifications.markRead
POST /api/trpc/user.notifications.markAllRead
```

### 3.3. Admin API (adminProcedure)

```
-- Dashboard
GET  /api/trpc/admin.dashboard.stats
GET  /api/trpc/admin.dashboard.recentActivity

-- Users
GET  /api/trpc/admin.users.list
GET  /api/trpc/admin.users.getById
POST /api/trpc/admin.users.create
POST /api/trpc/admin.users.block
POST /api/trpc/admin.users.unblock
POST /api/trpc/admin.users.assignProgram
POST /api/trpc/admin.users.revokeProgram

-- Invitations
GET  /api/trpc/admin.invitations.list
POST /api/trpc/admin.invitations.send
POST /api/trpc/admin.invitations.resend
POST /api/trpc/admin.invitations.revoke

-- Programs
GET  /api/trpc/admin.programs.list
GET  /api/trpc/admin.programs.getById
POST /api/trpc/admin.programs.create
POST /api/trpc/admin.programs.update
POST /api/trpc/admin.programs.publish
POST /api/trpc/admin.programs.archive
POST /api/trpc/admin.programs.createNewVersion

-- Courses
GET  /api/trpc/admin.courses.list
GET  /api/trpc/admin.courses.getById
POST /api/trpc/admin.courses.create
POST /api/trpc/admin.courses.update
POST /api/trpc/admin.courses.reorder
POST /api/trpc/admin.courses.delete

-- Modules
GET  /api/trpc/admin.modules.list
GET  /api/trpc/admin.modules.getById
POST /api/trpc/admin.modules.create
POST /api/trpc/admin.modules.update
POST /api/trpc/admin.modules.reorder
POST /api/trpc/admin.modules.delete
POST /api/trpc/admin.modules.uploadHtmlZip
POST /api/trpc/admin.modules.uploadPdf
POST /api/trpc/admin.modules.setRutubeUrl

-- Assessments
GET  /api/trpc/admin.assessments.list
GET  /api/trpc/admin.assessments.getById
POST /api/trpc/admin.assessments.create
POST /api/trpc/admin.assessments.update
POST /api/trpc/admin.assessments.publish
POST /api/trpc/admin.assessments.delete

-- ZIP Import
POST /api/trpc/admin.import.upload
GET  /api/trpc/admin.import.getStatus
GET  /api/trpc/admin.import.getReport

-- Certificates
GET  /api/trpc/admin.certificates.list
GET  /api/trpc/admin.certificates.getById
POST /api/trpc/admin.certificates.issueManual
POST /api/trpc/admin.certificates.revoke
POST /api/trpc/admin.certificates.reissue
POST /api/trpc/admin.certificates.resendEmail
POST /api/trpc/admin.certificates.uploadTemplate
POST /api/trpc/admin.certificates.previewTemplate
POST /api/trpc/admin.certificates.confirmPreview

-- Reports
GET  /api/trpc/admin.reports.usersProgress
GET  /api/trpc/admin.reports.programs
GET  /api/trpc/admin.reports.courses
GET  /api/trpc/admin.reports.modules
GET  /api/trpc/admin.reports.assessments
GET  /api/trpc/admin.reports.certificates
GET  /api/trpc/admin.reports.imports
GET  /api/trpc/admin.reports.rutube
POST /api/trpc/admin.reports.export
GET  /api/trpc/admin.reports.exportStatus

-- Notifications
GET  /api/trpc/admin.notifications.list
POST /api/trpc/admin.notifications.markRead

-- Audit
GET  /api/trpc/admin.audit.list
GET  /api/trpc/admin.audit.getByEntity
```

### 3.4. Superadmin API (superAdminProcedure)

```
-- System settings
GET  /api/trpc/superadmin.settings.getAll
POST /api/trpc/superadmin.settings.update

-- Email (SMTP)
GET  /api/trpc/superadmin.emailSettings.get
POST /api/trpc/superadmin.emailSettings.update
POST /api/trpc/superadmin.emailSettings.test

-- Domain
GET  /api/trpc/superadmin.domain.get
POST /api/trpc/superadmin.domain.update

-- HTML security
GET  /api/trpc/superadmin.security.html.get
POST /api/trpc/superadmin.security.html.update

-- Rutube settings
GET  /api/trpc/superadmin.rutubeSettings.get
POST /api/trpc/superadmin.rutubeSettings.update

-- Admin management
GET  /api/trpc/superadmin.admins.list
POST /api/trpc/superadmin.admins.create
POST /api/trpc/superadmin.admins.updateRole
POST /api/trpc/superadmin.admins.delete

-- Full audit
GET  /api/trpc/superadmin.audit.fullList
```

### 3.5. Upload API (authedProcedure)

```
POST /api/trpc/upload.getPresignedUrl
-- folder: "programs" | "courses" | "modules" | "certificates" | "avatars"
-- contentType whitelist: image/*, application/pdf, text/html, text/css, application/zip
-- Limits: images 5MB, PDF 10MB, HTML 5MB, CSS 1MB, ZIP 50MB
```

---

## 4. Full Frontend Pages

### 4.1. Public Pages (PublicLayout)

| Page | Route | Description |
|------|-------|-------------|
| LandingPage | `/` | DreamDocs Academy landing |
| LoginPage | `/login` | Login (tabs: login / invitation) |
| AcceptInvitationPage | `/invitation/:token` | Accept invitation, set password |
| CertificateVerifyPage | `/verify/:token` | Public certificate verification |

### 4.2. User Dashboard (UserLayout)

| Page | Route | Description |
|------|-------|-------------|
| UserDashboardPage | `/dashboard` | Dashboard: assigned programs, progress |
| UserProgramsPage | `/programs` | List of assigned programs |
| UserProgramPage | `/programs/:id` | Program details: courses, progress, certificate status |
| UserCoursePage | `/courses/:id` | Course details: modules, progress |
| UserModulePage | `/modules/:id` | Module: HTML iframe / PDF / Rutube |
| UserAssessmentPage | `/assessments/:id` | Test: questions, timer, submit |
| UserCertificatesPage | `/certificates` | My certificates |
| UserProfilePage | `/profile` | Profile, change password |

### 4.3. Admin Interface (AdminLayout)

| Page | Route | Description |
|------|-------|-------------|
| AdminDashboardPage | `/admin` | Dashboard: stats, activity |
| AdminUsersPage | `/admin/users` | Users table, search, filters |
| AdminUserDetailPage | `/admin/users/:id` | User card, progress, programs |
| AdminInvitationsPage | `/admin/invitations` | Invitations status, resend |
| AdminProgramsPage | `/admin/programs` | Programs table |
| AdminProgramBuilderPage | `/admin/programs/:id` | Program editor: courses, settings |
| AdminProgramPublishPage | `/admin/programs/:id/publish` | Publish validation, preview |
| AdminCoursesPage | `/admin/courses` | Courses table |
| AdminCourseBuilderPage | `/admin/courses/:id` | Course editor: modules, final test |
| AdminModulesPage | `/admin/modules` | Modules table |
| AdminModuleBuilderPage | `/admin/modules/:id` | Module editor: content upload, preview |
| AdminAssessmentsPage | `/admin/assessments` | Assessments table |
| AdminAssessmentBuilderPage | `/admin/assessments/:id` | Assessment editor: settings, HTML upload |
| AdminImportPage | `/admin/import` | ZIP upload, import report |
| AdminCertificatesPage | `/admin/certificates` | All certificates |
| AdminCertificateDetailPage | `/admin/certificates/:id` | Certificate details, revoke, reissue |
| AdminReportsPage | `/admin/reports` | Reports list |
| AdminReportViewPage | `/admin/reports/:type` | Report view, filters, export |
| AdminAuditPage | `/admin/audit` | Audit log (limited for admin) |

### 4.4. Superadmin Interface (SuperadminLayout)

| Page | Route | Description |
|------|-------|-------------|
| SuperadminDashboardPage | `/superadmin` | System dashboard |
| SuperadminSettingsPage | `/superadmin/settings` | System settings |
| SuperadminEmailPage | `/superadmin/settings/email` | SMTP settings, test send |
| SuperadminDomainPage | `/superadmin/settings/domain` | Base URL |
| SuperadminSecurityPage | `/superadmin/settings/security` | HTML security, CSP |
| SuperadminRutubePage | `/superadmin/settings/rutube` | Rutube check settings |
| SuperadminAdminsPage | `/superadmin/admins` | Admin management |
| SuperadminAuditPage | `/superadmin/audit` | Full audit log |
| SuperadminSystemPage | `/superadmin/system` | System operations |

---

## 5. Epics and Tasks

### Summary

| Epic | Name | SP | Priority | Agent |
|------|------|----|----------|-------|
| 1 | Project Initialization | 21 | Must | DevOps |
| 2 | Full Database Schema | 89 | Must | Backend |
| 3 | Backend Core (Auth, Middleware) | 45 | Must | Backend |
| 4 | Services (Audit, Notification, Email, Rutube, ZIP) | 55 | Must | Backend |
| 5 | Backend API - Auth and User | 34 | Must | Backend |
| 6 | Backend API - Domain (Programs, Courses, Modules, Assessments) | 89 | Must | Backend |
| 7 | Backend API - Certificates | 55 | Must | Backend |
| 8 | Backend API - Progress, Reports, Settings | 55 | Must | Backend |
| 9 | Frontend - Infrastructure and UI-kit | 55 | Must | Frontend |
| 10 | Frontend - Public Pages | 34 | Must | Frontend |
| 11 | Frontend - User Dashboard | 89 | Must | Frontend |
| 12 | Frontend - Admin Panel | 144 | Must | Frontend |
| 13 | Integration, E2E, QA | 55 | Must | QA |
| 14 | DevOps and Deployment | 34 | Should | DevOps |
| **Total** | | **854 SP** | | |

---

### Epic 1: Project Initialization (SP: 21)

**Priority:** Must have  
**Agent:** DevOps  
**Skills:** `writing-plans`, `code_reviewer`

#### Feature 1.1: Project Structure

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 1.1.1 | Create `package.json` with type:module, scripts, all dependencies | 2 | `package.json` | `npm install` passes |
| 1.1.2 | Create `tsconfig.json` (strict, aliases: @/, @db/, @contracts/, @api/, @src/) | 2 | `tsconfig.json` | `npx tsc --noEmit` clean |
| 1.1.3 | Create `vite.config.ts` (Hono dev server entry api/boot.ts, Vue plugin, port 3000) | 3 | `vite.config.ts` | `npm run dev` on :3000 |
| 1.1.4 | Create `drizzle.config.ts` (schema db/schema.ts, out db/migrations, dialect mysql) | 2 | `drizzle.config.ts` | `npm run db:generate` works |
| 1.1.5 | Create `tailwind.config.js` + `postcss.config.js` + `src/index.css` | 2 | 3 files | Tailwind works, custom colors from spec |
| 1.1.6 | Create `.env.example` with all variables | 1 | `.env.example` | All env vars described |
| 1.1.7 | Create `.gitignore` | 1 | `.gitignore` | Git ignores node_modules, dist, .env |

#### Feature 1.2: Environment and Validation

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 1.2.1 | Create `api/lib/env.ts` - Zod schema for all env vars | 3 | `api/lib/env.ts` | Process exits with clear error if env missing |
| 1.2.2 | Create `api/lib/cookies.ts` - HTTP-only cookie options | 2 | `api/lib/cookies.ts` | httpOnly, secure (prod), sameSite strict, maxAge 7 days |
| 1.2.3 | Create `api/lib/s3.ts` - AWS S3 SDK client | 2 | `api/lib/s3.ts` | Client initializes, bucket accessible |
| 1.2.4 | Create `api/lib/vite.ts` - serve static dist/public in production | 2 | `api/lib/vite.ts` | Static files served in production |
| 1.2.5 | Create `.kimi/skills.config.yaml` for auto-activation | 1 | `.kimi/skills.config.yaml` | Skills auto-load by file patterns |

---

### Epic 2: Full Database Schema (SP: 89)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 2.1: Users and Access

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.1.1 | Create `users` table | 2 | `db/schema.ts` | Fields + indexes: email (unique), union_id, role, status |
| 2.1.2 | Create `invitations` table | 2 | `db/schema.ts` | Fields + indexes: user_id, email, token_hash, status, expires_at |
| 2.1.3 | Create `user_program_enrollments` table | 2 | `db/schema.ts` | Fields + unique (user_id, program_version_id) + indexes |

#### Feature 2.2: Programs and Versioning

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.2.1 | Create `programs` table | 2 | `db/schema.ts` | Fields + indexes: slug (unique), target_audience, is_certification_enabled |
| 2.2.2 | Create `program_versions` table | 3 | `db/schema.ts` | Fields + unique (program_id, version_number) + indexes |
| 2.2.3 | Create `courses` table | 2 | `db/schema.ts` | Fields + indexes: program_id, slug, role_branch, status |
| 2.2.4 | Create `course_versions` table | 2 | `db/schema.ts` | Fields + indexes: course_id, program_version_id, version_number |
| 2.2.5 | Create `modules` table | 2 | `db/schema.ts` | Fields + indexes: course_id, sort_order, module_type, status |
| 2.2.6 | Create `module_versions` table | 2 | `db/schema.ts` | Fields + indexes: module_id, course_version_id, version_number |
| 2.2.7 | Create `module_contents` table | 2 | `db/schema.ts` | Fields + indexes: module_version_id, content_type |

#### Feature 2.3: Assessments

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.3.1 | Create `assessments` table | 2 | `db/schema.ts` | Fields + indexes: assessment_type, module_id, course_id, program_id, status |
| 2.3.2 | Create `assessment_versions` table | 2 | `db/schema.ts` | Fields + indexes: assessment_id, version_number, status |
| 2.3.3 | Create `assessment_attempts` table | 3 | `db/schema.ts` | Fields + indexes: user_id, assessment_version_id, status, attempt_number |
| 2.3.4 | Create `questions` and `answer_options` tables (architectural) | 2 | `db/schema.ts` | Fields + FKs + indexes for future native test builder |

#### Feature 2.4: Progress

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.4.1 | Create `program_progress` table | 2 | `db/schema.ts` | Fields + unique (user_id, program_version_id) + indexes |
| 2.4.2 | Create `course_progress` table | 2 | `db/schema.ts` | Fields + unique (user_id, course_version_id) + indexes |
| 2.4.3 | Create `module_progress` table | 2 | `db/schema.ts` | Fields + unique (user_id, module_version_id) + indexes |

#### Feature 2.5: Certificates

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.5.1 | Create `certificate_templates` table | 2 | `db/schema.ts` | Fields + indexes: program_id, program_version_id, is_active |
| 2.5.2 | Create `certificates` table | 3 | `db/schema.ts` | Fields + unique certificate_number + unique (user_id, program_version_id, status=issued) + indexes |

#### Feature 2.6: Service Tables

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.6.1 | Create `import_jobs` table | 2 | `db/schema.ts` | Fields + indexes: status, import_type, created_by |
| 2.6.2 | Create `notifications` table | 2 | `db/schema.ts` | Fields + indexes: recipient_user_id, recipient_role, type, status, created_at |
| 2.6.3 | Create `audit_logs` table | 3 | `db/schema.ts` | Fields + indexes: actor_id, action, target_entity_type, target_entity_id, created_at |
| 2.6.4 | Create `settings` table | 2 | `db/schema.ts` | Fields + unique (category, key) + indexes |
| 2.6.5 | Create `email_settings` table | 2 | `db/schema.ts` | All SMTP fields |
| 2.6.6 | Create `rutube_checks` table | 2 | `db/schema.ts` | Fields + indexes: rutube_url, is_available, checked_at |
| 2.6.7 | Create `report_exports` table | 2 | `db/schema.ts` | Fields + indexes: requested_by, status, report_type |

#### Feature 2.7: Relations, Migrations, Seed

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 2.7.1 | Create `db/relations.ts` - Drizzle relations | 3 | `db/relations.ts` | All 1:N and N:1 relations defined |
| 2.7.2 | Create `contracts/types.ts` - re-export + custom types | 3 | `contracts/types.ts` | LessonContent, ProgramWithCourses, AssessmentWithQuestions, etc. |
| 2.7.3 | Create `contracts/constants.ts` - AUTH_COOKIE, enums, error messages | 2 | `contracts/constants.ts` | All constants centralized |
| 2.7.4 | Create `contracts/errors.ts` - TRPCError mapping | 2 | `contracts/errors.ts` | All errors typed |
| 2.7.5 | Create `db/migrate.ts` - programmatic migrations | 2 | `db/migrate.ts` | `npm run db:migrate` applies migrations |
| 2.7.6 | Generate first migration with drizzle-kit | 2 | Command | SQL file in db/migrations/ without errors |
| 2.7.7 | Create `db/seed.ts` - test data | 8 | `db/seed.ts` | 1 superadmin, 1 admin, 2 programs, 2 courses, 3 modules, tests, template |
| 2.7.8 | Verify `npm run db:push` creates all tables | 2 | Command | All tables created, indexes in place |


---

### Epic 3: Backend Core - Auth, Middleware, Context (SP: 45)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 3.1: DB Connection and Utilities

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 3.1.1 | Create `api/queries/connection.ts` - Drizzle singleton with mysql2 | 2 | `api/queries/connection.ts` | `getDb()` returns typed client |
| 3.1.2 | Create `api/lib/hash.ts` - bcryptjs hashPassword / verifyPassword | 2 | `api/lib/hash.ts` | Hashes and verifies password |
| 3.1.3 | Create `api/lib/jwt.ts` - jose createToken / verifyToken (HS256, 7 days) | 3 | `api/lib/jwt.ts` | Creates and verifies JWT, secret from env.APP_SECRET |
| 3.1.4 | Create `api/lib/audit.ts` - `logAudit()` function | 3 | `api/lib/audit.ts` | Writes action with actor, target, before/after JSON |
| 3.1.5 | Create `api/lib/notify.ts` - `createNotification()` function | 3 | `api/lib/notify.ts` | Creates notification for user or role |

#### Feature 3.2: Cookie Auth and Context

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 3.2.1 | Create `api/lib/auth.ts` - setAuthCookie, clearAuthCookie, getUserFromCookie | 3 | `api/lib/auth.ts` | Cookie set (httpOnly, secure, sameSite strict, 7 days), read, verified |
| 3.2.2 | Create `api/context.ts` - createContext({req, resHeaders}) | 3 | `api/context.ts` | Context typed, user from cookie or Bearer header |
| 3.2.3 | Create `api/middleware.ts` - publicProcedure | 2 | `api/middleware.ts` | Base tRPC procedure without checks |
| 3.2.4 | Create `authedProcedure` - check ctx.user, else UNAUTHORIZED | 2 | `api/middleware.ts` | Blocks without auth, writes to audit |
| 3.2.5 | Create `adminProcedure` - authed + role in [admin, superadmin] | 2 | `api/middleware.ts` | Blocks non-admin, returns 403 |
| 3.2.6 | Create `superAdminProcedure` - authed + role = superadmin | 2 | `api/middleware.ts` | Blocks non-superadmin, writes unauthorized_admin_access_attempt to audit |

#### Feature 3.3: Boot and Graceful Shutdown

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 3.3.1 | Create `api/boot.ts` - Hono app, tRPC adapter at /api/trpc, health check GET /health -> 200 | 5 | `api/boot.ts` | `/health` returns 200, tRPC router connected |
| 3.3.2 | Add serve static dist/public in production via api/lib/vite.ts | 2 | `api/boot.ts` | Static files served in production mode |
| 3.3.3 | Add graceful shutdown (SIGINT/SIGTERM) - close server, close DB connections | 2 | `api/boot.ts` | Ctrl+C exits cleanly |
| 3.3.4 | Add global error handler - logging, secret masking | 3 | `api/boot.ts` | Errors logged, stack trace not leaked in production |

---

### Epic 4: Backend Services - Audit, Notification, Email, Rutube, ZIP (SP: 55)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 4.1: Audit Service

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 4.1.1 | Implement `logAudit()` - write to audit_logs with validation | 3 | `api/services/audit.ts` | Record created, all fields filled |
| 4.1.2 | Add middleware for auto-logging CRUD operations | 3 | `api/middleware.ts` | After each admin mutation calls logAudit |
| 4.1.3 | Implement `audit.list` - pagination, filters by actor/action/entity_type/date | 3 | `api/services/audit.ts` | Returns list with filters |
| 4.1.4 | Implement visibility restriction for admin vs superadmin | 2 | `api/services/audit.ts` | Admin sees limited list (no system settings), superadmin sees full |

#### Feature 4.2: Notification Service

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 4.2.1 | Implement `createNotification()` - create notification | 2 | `api/services/notification.ts` | Notification created with type, title, message, metadata |
| 4.2.2 | Implement `markAsRead()` / `markAllAsRead()` | 2 | `api/services/notification.ts` | Status changes to read |
| 4.2.3 | Implement `listNotifications()` - pagination, filter by status | 2 | `api/services/notification.ts` | Returns list with unread count |
| 4.2.4 | Add auto-notifications on key events (certificate_issued, import_failed, rutube_unavailable) | 3 | Various files | Notification created on event |

#### Feature 4.3: Email Service

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 4.3.1 | Create `api/services/email.ts` - SMTP client (nodemailer) | 3 | `api/services/email.ts` | Client initializes from EmailSettings |
| 4.3.2 | Implement `sendInvitationEmail()` - email with one-time link | 3 | `api/services/email.ts` | Email sent, link contains token |
| 4.3.3 | Implement `sendCertificateEmail()` - certificate issuance email | 3 | `api/services/email.ts` | Email with PDF attachment or link |
| 4.3.4 | Implement `sendPasswordResetEmail()` - password recovery | 2 | `api/services/email.ts` | Email with reset token |
| 4.3.5 | Implement `testEmailConnection()` - test send for superadmin | 2 | `api/services/email.ts` | Superadmin can test SMTP |
| 4.3.6 | Add email error handling - do not cancel main operation, create notification | 2 | `api/services/email.ts` | Email error does not break certificate issuance |

#### Feature 4.4: Rutube Checker Service

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 4.4.1 | Create `api/services/rutube.ts` - `checkRutubeVideo(url)` | 3 | `api/services/rutube.ts` | Parses video_id from URL, makes HEAD request to Rutube |
| 4.4.2 | Implement background task - check all rutube_url once per day | 3 | `api/services/rutube.ts` | Runs on cron/scheduler, updates rutube_checks |
| 4.4.3 | Add auto-notification to admin on unavailable video | 2 | `api/services/rutube.ts` | Creates notification type=rutube_video_unavailable |
| 4.4.4 | Add graceful degradation - module opens with "Video unavailable" message | 2 | `api/services/rutube.ts` | User sees message, not error |

#### Feature 4.5: ZIP Import Service

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 4.5.1 | Create `api/services/import/validator.ts` - validate ZIP structure | 3 | `api/services/import/validator.ts` | Checks manifest.json, structure, no dangerous paths |
| 4.5.2 | Create `api/services/import/parser.ts` - parse manifest.json | 3 | `api/services/import/parser.ts` | Extracts program, courses, modules, tests from manifest |
| 4.5.3 | Create `api/services/import/processor.ts` - create entities in DB | 5 | `api/services/import/processor.ts` | Creates draft program, courses, modules, tests from ZIP. Transactional |
| 4.5.4 | Add path traversal and zip bomb protection | 3 | `api/services/import/validator.ts` | Blocks ../, limits size, checks extensions |
| 4.5.5 | Add import report - created entities, warnings, errors | 2 | `api/services/import/processor.ts` | Report JSON saved to import_jobs.report_json |
| 4.5.6 | Add audit - zip_import_started, zip_import_completed, zip_import_failed | 2 | `api/services/import/processor.ts` | Events written to audit_logs |

---

### Epic 5: Backend API - Auth and User (SP: 34)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 5.1: Auth Router

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 5.1.1 | Create `api/routers/auth.ts` - Zod schemas (LoginSchema, RegisterSchema) | 2 | `api/routers/auth.ts` | Validation: email, password min 6 |
| 5.1.2 | Implement `auth.login` - find by email, verifyPassword, createToken, setAuthCookie | 3 | `api/routers/auth.ts` | Returns {token, user}, sets cookie |
| 5.1.3 | Implement `auth.me` - returns ctx.user (null if not auth) | 2 | `api/routers/auth.ts` | Public endpoint, safely returns user |
| 5.1.4 | Implement `auth.logout` - clearAuthCookie, clear localStorage token | 2 | `api/routers/auth.ts` | Cookie and localStorage cleared |
| 5.1.5 | Implement `auth.acceptInvitation` - verify token, set password, activate user | 3 | `api/routers/auth.ts` | User activated, invitation status -> accepted |
| 5.1.6 | Implement `auth.requestPasswordReset` - generate reset token, send email | 3 | `api/routers/auth.ts` | Token created, email sent |
| 5.1.7 | Implement `auth.resetPassword` - verify reset token, update password_hash | 2 | `api/routers/auth.ts` | Password changed, token invalidated |

#### Feature 5.2: User Router

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 5.2.1 | Create `api/routers/user.ts` - `user.me` (extended: with progress, programs) | 2 | `api/routers/user.ts` | Returns user + enrollments + progress |
| 5.2.2 | Implement `user.updateProfile` - name, avatar | 2 | `api/routers/user.ts` | Fields updated, audit log |
| 5.2.3 | Implement `user.changePassword` - old + new password | 3 | `api/routers/user.ts` | Old password verified, new hashed |
| 5.2.4 | Implement `user.myPrograms` - list of assigned programs with progress | 3 | `api/routers/user.ts` | Only assigned, only published versions |
| 5.2.5 | Implement `user.myCertificates` - list of certificates | 2 | `api/routers/user.ts` | Only own certificates |
| 5.2.6 | Implement `user.myNotifications` - list of notifications | 2 | `api/routers/user.ts` | Pagination, unread count |

---

### Epic 6: Backend API - Domain (Programs, Courses, Modules, Assessments) (SP: 89)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 6.1: Program Router (admin)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.1.1 | Create `api/routers/admin/program.ts` - Zod schemas | 2 | `api/routers/admin/program.ts` | CreateProgramSchema, UpdateProgramSchema |
| 6.1.2 | Implement `admin.program.list` - list with pagination, filters | 3 | `api/routers/admin/program.ts` | Filters: status, target_audience, search by title |
| 6.1.3 | Implement `admin.program.getById` - program with courses, latest version | 3 | `api/routers/admin/program.ts` | Returns nested: program -> versions -> courses |
| 6.1.4 | Implement `admin.program.create` - create program (slug unique) | 3 | `api/routers/admin/program.ts` | Check unique slug, create draft version v1 |
| 6.1.5 | Implement `admin.program.update` - update draft version | 3 | `api/routers/admin/program.ts` | Only draft editable |
| 6.1.6 | Implement `admin.program.createNewVersion` - copy published -> draft vN+1 | 5 | `api/routers/admin/program.ts` | Copies full structure: courses, modules, tests |
| 6.1.7 | Implement `admin.program.publish` - validation + publish version | 5 | `api/routers/admin/program.ts` | Validates: title, audience, courses, modules, tests, certificate template (if certification enabled) |
| 6.1.8 | Implement `admin.program.archive` - archive | 2 | `api/routers/admin/program.ts` | Status -> archived, new assignments disabled |
| 6.1.9 | Implement `admin.program.delete` - delete draft only | 2 | `api/routers/admin/program.ts` | Published cannot be deleted |

#### Feature 6.2: Course Router (admin)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.2.1 | Create `api/routers/admin/course.ts` | 2 | `api/routers/admin/course.ts` | CRUD + reorder |
| 6.2.2 | Implement `admin.course.list` - by program_id | 2 | `api/routers/admin/course.ts` | Filter by program |
| 6.2.3 | Implement `admin.course.create` - inside program | 3 | `api/routers/admin/course.ts` | Link to program, auto sort_order |
| 6.2.4 | Implement `admin.course.update` | 2 | `api/routers/admin/course.ts` | Fields updated |
| 6.2.5 | Implement `admin.course.reorder` - transaction update sort_order | 3 | `api/routers/admin/course.ts` | Atomic order update |
| 6.2.6 | Implement `admin.course.delete` - cascade delete modules | 3 | `api/routers/admin/course.ts` | Cascade deletion (or soft delete) |

#### Feature 6.3: Module Router (admin)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.3.1 | Create `api/routers/admin/module.ts` | 2 | `api/routers/admin/module.ts` | CRUD + upload + reorder |
| 6.3.2 | Implement `admin.module.list` - by course_id | 2 | `api/routers/admin/module.ts` | Sort by sort_order |
| 6.3.3 | Implement `admin.module.create` | 2 | `api/routers/admin/module.ts` | Link to course, auto sort_order |
| 6.3.4 | Implement `admin.module.update` | 2 | `api/routers/admin/module.ts` | Fields updated |
| 6.3.5 | Implement `admin.module.reorder` - transaction | 3 | `api/routers/admin/module.ts` | Atomic update |
| 6.3.6 | Implement `admin.module.delete` | 2 | `api/routers/admin/module.ts` | Module deletion |
| 6.3.7 | Implement `admin.module.uploadHtmlZip` - ZIP validation, S3 upload, checksum | 5 | `api/routers/admin/module.ts` | Checks index.html, path traversal protection, zip bomb protection. Saves S3 key and checksum |
| 6.3.8 | Implement `admin.module.uploadPdf` - PDF validation, S3 upload | 3 | `api/routers/admin/module.ts` | PDF check, save S3 key |
| 6.3.9 | Implement `admin.module.setRutubeUrl` - URL validation, extract video_id | 2 | `api/routers/admin/module.ts` | URL valid, video_id extracted |

#### Feature 6.4: Assessment Router (admin)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.4.1 | Create `api/routers/admin/assessment.ts` | 2 | `api/routers/admin/assessment.ts` | CRUD for tests |
| 6.4.2 | Implement `admin.assessment.list` - filter by type, module_id, course_id, program_id | 2 | `api/routers/admin/assessment.ts` | Filters work |
| 6.4.3 | Implement `admin.assessment.create` - mini_test / course_final / program_final | 3 | `api/routers/admin/assessment.ts` | Validation: program_final only at program level, course_final at course, mini_test at module |
| 6.4.4 | Implement `admin.assessment.update` | 2 | `api/routers/admin/assessment.ts` | Fields updated |
| 6.4.5 | Implement `admin.assessment.uploadHtmlZip` - HTML ZIP for test | 3 | `api/routers/admin/assessment.ts` | Upload, validation, checksum |
| 6.4.6 | Implement `admin.assessment.publish` - publish test version | 3 | `api/routers/admin/assessment.ts` | Creates assessment_version, snapshot_json |
| 6.4.7 | Implement `admin.assessment.delete` | 2 | `api/routers/admin/assessment.ts` | Only draft deletable |

#### Feature 6.5: User Programs (enrollment)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.5.1 | Implement `admin.users.assignProgram` - assign program to user | 3 | `api/routers/admin/user.ts` | Check: program published, user active. Create enrollment + program_progress |
| 6.5.2 | Implement `admin.users.revokeProgram` - revoke assignment | 2 | `api/routers/admin/user.ts` | Enrollment status -> dropped, audit log |
| 6.5.3 | Implement `user.programs.list` - assigned programs | 3 | `api/routers/user/program.ts` | Only assigned, only published versions, with progress |
| 6.5.4 | Implement `user.programs.getById` - program details with progress | 3 | `api/routers/user/program.ts` | Returns: program + courses + modules + progress + next_step |
| 6.5.5 | Implement `user.programs.open` - track program opening | 2 | `api/routers/user/program.ts` | Program_progress status -> in_progress, started_at |

#### Feature 6.6: User Courses and Modules

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.6.1 | Implement `user.courses.getById` - course with modules and progress | 3 | `api/routers/user/course.ts` | Only courses from assigned program |
| 6.6.2 | Implement `user.courses.open` - track course opening | 2 | `api/routers/user/course.ts` | Course_progress created/updated |
| 6.6.3 | Implement `user.modules.getById` - module with content | 3 | `api/routers/user/module.ts` | Returns content (HTML iframe src / PDF url / Rutube embed) |
| 6.6.4 | Implement `user.modules.open` - track module opening | 2 | `api/routers/user/module.ts` | Module_progress: is_opened=true, opened_at |
| 6.6.5 | Implement `user.modules.complete` - complete module | 3 | `api/routers/user/module.ts` | Check: content viewed, mini-test passed (if required). Module_progress -> completed |
| 6.6.6 | Implement module locking - module N available only if N-1 completed | 3 | `api/routers/user/module.ts` | 403 if module locked |
| 6.6.7 | Implement `user.modules.getNext` - next module/course | 2 | `api/routers/user/module.ts` | Returns next_module or next_course or program_complete |

#### Feature 6.7: Assessment Attempts

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 6.7.1 | Implement `user.assessments.getById` - test with questions or HTML | 3 | `api/routers/user/assessment.ts` | Returns assessment_version with content |
| 6.7.2 | Implement `user.assessments.start` - create attempt | 3 | `api/routers/user/assessment.ts` | Check: maxAttempts not exhausted, module available. Create assessment_attempts with status=started |
| 6.7.3 | Implement `user.assessments.submit` - submit answers | 5 | `api/routers/user/assessment.ts` | Check: attempt active (started), not expired. Calculate score, is_passed. Update module_progress, course_progress, program_progress |
| 6.7.4 | Implement maxAttempts check - block after exhaustion | 2 | `api/routers/user/assessment.ts` | Returns attempts_exhausted |
| 6.7.5 | Implement `user.assessments.results` - attempt history | 2 | `api/routers/user/assessment.ts` | List of attempts with score |
| 6.7.6 | Implement timer - expires_at on start, auto-expired on check | 2 | `api/routers/user/assessment.ts` | If time_limit_seconds set, expires_at = now + limit |

---

### Epic 7: Backend API - Certificates (SP: 55)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 7.1: Certificate Templates

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 7.1.1 | Implement `admin.certificates.uploadTemplate` - upload PDF template | 3 | `api/routers/admin/certificate.ts` | S3 upload, link to program_version |
| 7.1.2 | Implement `admin.certificates.updateTemplateFields` - field coordinates | 2 | `api/routers/admin/certificate.ts` | field_coordinates_json: {name: {x,y}, program: {x,y}, number: {x,y}, date: {x,y}, score: {x,y}, qr: {x,y}} |
| 7.1.3 | Implement `admin.certificates.previewTemplate` - generate preview PDF | 5 | `api/routers/admin/certificate.ts` | Generate PDF with dummy data on template |
| 7.1.4 | Implement `admin.certificates.confirmPreview` - activate template | 2 | `api/routers/admin/certificate.ts` | is_active=true, audit log |

#### Feature 7.2: Certificate Generation and Management

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 7.2.1 | Create `api/services/pdf.ts` - PDF generation with QR | 5 | `api/services/pdf.ts` | Uses pdf-lib + qrcode. Overlays text and QR on template |
| 7.2.2 | Implement `admin.certificates.issueManual` - manual issuance | 3 | `api/routers/admin/certificate.ts` | Check unmet conditions, require reason, audit log |
| 7.2.3 | Implement `admin.certificates.revoke` - revoke certificate | 3 | `api/routers/admin/certificate.ts` | Require reason, status -> revoked, audit log |
| 7.2.4 | Implement `admin.certificates.reissue` - reissue certificate | 3 | `api/routers/admin/certificate.ts` | New number, new PDF, old kept in history |
| 7.2.5 | Implement `admin.certificates.resendEmail` - resend email | 2 | `api/routers/admin/certificate.ts` | Resend email with PDF |
| 7.2.6 | Implement `admin.certificates.list` - list certificates | 3 | `api/routers/admin/certificate.ts` | Filters: program, user, status, date. Pagination |
| 7.2.7 | Implement `user.certificates.list` - own certificates | 2 | `api/routers/user/certificate.ts` | Only own, with download link |
| 7.2.8 | Implement `user.certificates.download` - download PDF | 2 | `api/routers/user/certificate.ts` | Check ownership, return PDF |
| 7.2.9 | Implement `public.certificates.verify` - public verification by token | 3 | `api/routers/public.ts` | No auth. Shows: number, name, program, date, status. NO email or test results |
| 7.2.10 | Implement auto-certificate issuance - hook after program completion | 5 | `api/services/certificate.ts` | Check all conditions: courses, modules, tests, passing score. Generate number DD-{CODE}-{YEAR}-{SEQUENCE}. Generate PDF. Send email. Notify. Audit log |

---

### Epic 8: Backend API - Progress, Reports, Settings (SP: 55)

**Priority:** Must have  
**Agent:** Backend  
**Skills:** `writing-plans`, `test-driven-development`

#### Feature 8.1: Progress Calculation

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 8.1.1 | Implement `calculateModuleProgress()` - module status | 3 | `api/services/progress.ts` | Check: opened, content viewed, test passed (if required) |
| 8.1.2 | Implement `calculateCourseProgress()` - course progress | 3 | `api/services/progress.ts` | % completed modules / total required |
| 8.1.3 | Implement `calculateProgramProgress()` - program progress | 3 | `api/services/progress.ts` | % completed courses / total required |
| 8.1.4 | Implement `updateNextStep()` - determine next step | 3 | `api/services/progress.ts` | Returns: current module or next available |
| 8.1.5 | Implement `admin.progress.getUserProgress` - specific user progress | 2 | `api/routers/admin/progress.ts` | All programs, courses, modules with progress |
| 8.1.6 | Implement `admin.progress.getProgramProgress` - all users per program | 3 | `api/routers/admin/progress.ts` | Stats: assigned, in progress, completed |

#### Feature 8.2: Reports

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 8.2.1 | Implement `admin.reports.usersProgress` - users and progress report | 3 | `api/routers/admin/report.ts` | Table: user, program, progress%, status |
| 8.2.2 | Implement `admin.reports.programs` - program stats | 3 | `api/routers/admin/report.ts` | Stats: assigned, in progress, completed, certificates |
| 8.2.3 | Implement `admin.reports.assessments` - test results | 3 | `api/routers/admin/report.ts` | Average score, pass %, exhausted attempts |
| 8.2.4 | Implement `admin.reports.certificates` - issued certificates | 2 | `api/routers/admin/report.ts` | List with numbers, dates, statuses |
| 8.2.5 | Implement `admin.reports.rutube` - unavailable videos | 2 | `api/routers/admin/report.ts` | List of rutube_url with is_available=false |
| 8.2.6 | Implement `admin.reports.export` - async export | 5 | `api/routers/admin/report.ts` | Create report_export (status=pending). Background XLSX/CSV generation. Status and download |

#### Feature 8.3: Settings (superadmin)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 8.3.1 | Implement `superadmin.settings.getAll` - all settings by category | 2 | `api/routers/superadmin/settings.ts` | Returns settings grouped by category |
| 8.3.2 | Implement `superadmin.settings.update` - update setting | 2 | `api/routers/superadmin/settings.ts` | Upsert by (category, key), audit log |
| 8.3.3 | Implement `superadmin.emailSettings.get` | 2 | `api/routers/superadmin/settings.ts` | Returns email_settings |
| 8.3.4 | Implement `superadmin.emailSettings.update` - SMTP with encrypted password | 3 | `api/routers/superadmin/settings.ts` | Password encrypted before save |
| 8.3.5 | Implement `superadmin.emailSettings.test` - test send | 2 | `api/routers/superadmin/settings.ts` | Send test email to superadmin |
| 8.3.6 | Implement `superadmin.domain.get` / `update` | 2 | `api/routers/superadmin/settings.ts` | Base system URL |
| 8.3.7 | Implement `superadmin.security.html.get` / `update` | 2 | `api/routers/superadmin/settings.ts` | Sandbox mode, CSP, whitelist |
| 8.3.8 | Implement `superadmin.rutubeSettings.get` / `update` | 2 | `api/routers/superadmin/settings.ts` | Check frequency, behavior |
| 8.3.9 | Implement `superadmin.admins.list` / `create` / `updateRole` / `delete` | 3 | `api/routers/superadmin/admin.ts` | Admin management |


---

### Epic 9: Frontend - Infrastructure and UI-kit (SP: 55)

**Priority:** Must have  
**Agent:** Frontend  
**Skills:** `writing-plans`, `design-system`, `test-driven-development`

#### Feature 9.1: App Core

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 9.1.1 | Create `src/main.ts` - createApp(App), use(router), use(pinia), use(VueQueryPlugin), vue-sonner | 2 | `src/main.ts` | App mounts to #app |
| 9.1.2 | Create `src/App.vue` - root layout with router-view | 2 | `src/App.vue` | Renders, includes index.css |
| 9.1.3 | Create `src/router/index.ts` - hash mode, all routes, meta.layout | 5 | `src/router/index.ts` | Routes for all zones: public, user, admin, superadmin |
| 9.1.4 | Create router guards - beforeEach with requiresAuth, guestOnly, requiresAdmin, requiresSuperadmin | 3 | `src/router/index.ts` | Redirects: /login, /admin, /403 |
| 9.1.5 | Create `src/lib/trpc.ts` - vanilla tRPC client, httpBatchLink, superjson, Bearer header | 3 | `src/lib/trpc.ts` | AppRouter types propagated |
| 9.1.6 | Create `src/stores/auth.ts` (Pinia) - state: user, isLoading, isAdmin, isSuperadmin | 3 | `src/stores/auth.ts` | Actions: fetchUser, login, logout, register |
| 9.1.7 | Create `src/stores/ui.ts` - sidebar state, toast queue | 2 | `src/stores/ui.ts` | UI state management |
| 9.1.8 | Create `src/composables/useAuth.ts` - permission checks, redirect | 2 | `src/composables/useAuth.ts` | Helpers for role checks |
| 9.1.9 | Create `src/composables/useTrpcQuery.ts` - TanStack Query wrapper with error handling | 3 | `src/composables/useTrpcQuery.ts` | Handles 401, 403, network errors |

#### Feature 9.2: Layout Components

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 9.2.1 | Create `src/layouts/PublicLayout.vue` - minimal (header + footer) | 2 | `src/layouts/PublicLayout.vue` | For landing, login, verify |
| 9.2.2 | Create `src/layouts/UserLayout.vue` - sidebar + main (dashboard nav) | 3 | `src/layouts/UserLayout.vue` | Programs, courses, profile, certificates |
| 9.2.3 | Create `src/layouts/AdminLayout.vue` - sidebar + main (admin tree) | 3 | `src/layouts/AdminLayout.vue` | All admin sections |
| 9.2.4 | Create `src/layouts/SuperadminLayout.vue` - sidebar + main (system sections) | 2 | `src/layouts/SuperadminLayout.vue` | Settings, audit, admin management |
| 9.2.5 | Create `src/components/AppHeader.vue` - logo, role-based nav, avatar | 3 | `src/components/AppHeader.vue` | Public nav + auth state |
| 9.2.6 | Create `src/components/AppSidebar.vue` - dynamic menu by layout | 3 | `src/components/AppSidebar.vue` | Menu items depend on role and layout |
| 9.2.7 | Create `src/components/AppFooter.vue` | 1 | `src/components/AppFooter.vue` | Simple footer |

#### Feature 9.3: UI Components (Design System)

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 9.3.1 | Create `Button.vue` - CVA: default, outline, ghost, destructive, link. Sizes: sm, md, lg | 3 | `src/components/ui/Button.vue` | All variants render, hover/active states |
| 9.3.2 | Create `Input.vue` - text, email, password. States: default, error, disabled | 2 | `src/components/ui/Input.vue` | v-model, label, error message |
| 9.3.3 | Create `Textarea.vue` | 1 | `src/components/ui/Textarea.vue` | v-model, resize, rows |
| 9.3.4 | Create `Select.vue` - dropdown with options | 2 | `src/components/ui/Select.vue` | v-model, placeholder, disabled options |
| 9.3.5 | Create `Badge.vue` - variants: default, success, warning, danger, info | 2 | `src/components/ui/Badge.vue` | All colors from spec |
| 9.3.6 | Create `Skeleton.vue` - w/h props, pulse animation | 1 | `src/components/ui/Skeleton.vue` | Loading state placeholder |
| 9.3.7 | Create `Progress.vue` - value/max, label, color | 2 | `src/components/ui/Progress.vue` | Progress bar with percentage |
| 9.3.8 | Create `Spinner.vue` - loading indicator | 1 | `src/components/ui/Spinner.vue` | Centered spinner |
| 9.3.9 | Create `Table.vue` + `TableHead.vue` + `TableRow.vue` + `TableCell.vue` | 3 | 4 files | Slot-based table with sorting and pagination |
| 9.3.10 | Create `Dialog.vue` (radix-vue) - overlay, close on escape/click outside | 3 | `src/components/ui/Dialog.vue` | Animation, focus trap |
| 9.3.11 | Create `Tabs.vue` (radix-vue) - list, trigger, content | 2 | `src/components/ui/Tabs.vue` | Tab switching |
| 9.3.12 | Create `Accordion.vue` (radix-vue) - collapsible items | 2 | `src/components/ui/Accordion.vue` | Accordion for courses/modules |
| 9.3.13 | Create `DropdownMenu.vue` (radix-vue) | 2 | `src/components/ui/DropdownMenu.vue` | For table actions |
| 9.3.14 | Create `Toast.vue` (vue-sonner) - integration | 2 | `src/components/ui/Toast.vue` | Success, error, warning |
| 9.3.15 | Create `EmptyState.vue` - icon, title, description, CTA | 2 | `src/components/ui/EmptyState.vue` | For empty lists |
| 9.3.16 | Create `ErrorState.vue` - error code, message, retry | 2 | `src/components/ui/ErrorState.vue` | For load errors |
| 9.3.17 | Create `Breadcrumb.vue` - hierarchy navigation | 2 | `src/components/ui/Breadcrumb.vue` | Program > Course > Module |
| 9.3.18 | Create `SearchInput.vue` - with search icon, debounce 300ms | 2 | `src/components/ui/SearchInput.vue` | Debounce via useDebounce |
| 9.3.19 | Create `Pagination.vue` - prev/next, page numbers | 2 | `src/components/ui/Pagination.vue` | Works with backend pagination |
| 9.3.20 | Create `FileUpload.vue` - drag & drop, progress, type/size validation | 3 | `src/components/ui/FileUpload.vue` | For ZIP, PDF, HTML upload |
| 9.3.21 | Create `PDFViewer.vue` - embedded PDF viewer | 3 | `src/components/ui/PDFViewer.vue` | iframe or object tag |
| 9.3.22 | Create `IframePreview.vue` - sandboxed iframe for HTML | 3 | `src/components/ui/IframePreview.vue` | sandbox="allow-same-origin", src or srcdoc |
| 9.3.23 | Create `StatusBadge.vue` - status to color and text mapping | 2 | `src/components/ui/StatusBadge.vue` | draft, published, archived, completed, failed, etc. |
| 9.3.24 | Create `ConfirmDialog.vue` - confirm dangerous actions | 2 | `src/components/ui/ConfirmDialog.vue` | Title, description, Cancel/Confirm buttons |

---

### Epic 10: Frontend - Public Pages (SP: 34)

**Priority:** Must have  
**Agent:** Frontend  
**Skills:** `writing-plans`, `design-system`

#### Feature 10.1: Landing and Auth

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 10.1.1 | Create `LandingPage.vue` - Hero, audiences (3 cards), learning structure, formats, CTA | 5 | `src/pages/LandingPage.vue` | Responsive, no free registration |
| 10.1.2 | Create `LoginPage.vue` - tabs: Login / Invitation | 3 | `src/pages/LoginPage.vue` | Email+password login. Invitation tab: token input |
| 10.1.3 | Create `AcceptInvitationPage.vue` - password setup form | 3 | `src/pages/AcceptInvitationPage.vue` | Token verification, password + confirm, validation |
| 10.1.4 | Create `CertificateVerifyPage.vue` - public verification | 3 | `src/pages/CertificateVerifyPage.vue` | No auth. Shows: number, name, program, date, status. Optional QR scanner |
| 10.1.5 | Create `NotFoundPage.vue` | 1 | `src/pages/NotFoundPage.vue` | 404 with link to home |
| 10.1.6 | Create `ForbiddenPage.vue` - 403 | 1 | `src/pages/ForbiddenPage.vue` | "Access denied" |

---

### Epic 11: Frontend - User Dashboard (SP: 89)

**Priority:** Must have  
**Agent:** Frontend  
**Skills:** `writing-plans`, `design-system`

#### Feature 11.1: Dashboard and Programs

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 11.1.1 | Create `UserDashboardPage.vue` - greeting, program list, progress | 3 | `src/pages/user/DashboardPage.vue` | Program cards with progress bar |
| 11.1.2 | Create `UserProgramsPage.vue` - all assigned programs | 3 | `src/pages/user/ProgramsPage.vue` | Filter by status, sort |
| 11.1.3 | Create `UserProgramPage.vue` - program details | 5 | `src/pages/user/ProgramPage.vue` | Program -> courses (accordion) -> modules. Progress per item. Certificate status. "Continue" button |
| 11.1.4 | Create `UserCoursePage.vue` - course details | 3 | `src/pages/user/CoursePage.vue` | Module list with progress, locked/unlocked status |
| 11.1.5 | Create `UserModulePage.vue` - module viewer | 5 | `src/pages/user/ModulePage.vue` | HTML: iframe (srcdoc or src). PDF: viewer. Rutube: embed. Navigation <- ->. "Complete module" button |
| 11.1.6 | Create module locking - visual locked indicator | 2 | `src/pages/user/CoursePage.vue` | Lock on unavailable modules |
| 11.1.7 | Create "Next step" - highlight current module | 2 | `src/pages/user/ProgramPage.vue` | Current step highlighted |

#### Feature 11.2: Testing

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 11.2.1 | Create `UserAssessmentPage.vue` - test page | 5 | `src/pages/user/AssessmentPage.vue` | Load assessment_version. If HTML ZIP -> iframe. If native -> render questions |
| 11.2.2 | Create `SingleChoiceQuestion.vue` - radio buttons | 3 | `src/components/assessment/SingleChoiceQuestion.vue` | Radio buttons, v-model |
| 11.2.3 | Create `MultipleChoiceQuestion.vue` - checkboxes | 3 | `src/components/assessment/MultipleChoiceQuestion.vue` | Checkboxes, v-model array |
| 11.2.4 | Create `AssessmentTimer.vue` - countdown timer | 2 | `src/components/assessment/AssessmentTimer.vue` | Countdown, warning on low time |
| 11.2.5 | Create test submit - confirmation, send | 3 | `src/pages/user/AssessmentPage.vue` | Confirm dialog, mutation, loading state |
| 11.2.6 | Create `AssessmentResult.vue` - score, passed/failed, attempts | 3 | `src/components/assessment/AssessmentResult.vue` | Result with explanation, "Retry" button (if attempts remain) |
| 11.2.7 | Create attempts_exhausted state | 2 | `src/components/assessment/AssessmentResult.vue` | Clear message, admin contact |

#### Feature 11.3: Profile and Certificates

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 11.3.1 | Create `UserProfilePage.vue` - data, password change | 3 | `src/pages/user/ProfilePage.vue` | Name, email, role. Password change form |
| 11.3.2 | Create `UserCertificatesPage.vue` - certificate list | 3 | `src/pages/user/CertificatesPage.vue` | Cards: number, program, date, status, download button |
| 11.3.3 | Create certificate download - PDF | 2 | `src/pages/user/CertificatesPage.vue` | Link to download endpoint |
| 11.3.4 | Create `UserNotificationsPage.vue` - notification list | 2 | `src/pages/user/NotificationsPage.vue` | Unread/read, mark as read |

---

### Epic 12: Frontend - Admin Panel (SP: 144)

**Priority:** Must have  
**Agent:** Frontend  
**Skills:** `writing-plans`, `design-system`

#### Feature 12.1: Dashboard and Users

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 12.1.1 | Create `AdminDashboardPage.vue` - stat cards, charts | 5 | `src/pages/admin/DashboardPage.vue` | Users, programs, progress, certificates |
| 12.1.2 | Create `AdminUsersPage.vue` - users table | 5 | `src/pages/admin/UsersPage.vue` | Columns: name, email, role, status, programs. Search 300ms debounce, filters, pagination |
| 12.1.3 | Create `AdminUserDetailPage.vue` - user card | 3 | `src/pages/admin/UserDetailPage.vue` | Profile, assigned programs, progress per program |
| 12.1.4 | Create `AdminCreateUserModal.vue` - create user form | 3 | `src/components/admin/CreateUserModal.vue` | Name, email, role, assign program. Send invitation |
| 12.1.5 | Create `AdminInvitationsPage.vue` - invitations table | 3 | `src/pages/admin/InvitationsPage.vue` | Statuses, resend, revoke |

#### Feature 12.2: Programs

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 12.2.1 | Create `AdminProgramsPage.vue` - programs table | 5 | `src/pages/admin/ProgramsPage.vue` | Columns: name, audience, status, version, courses, assigned, completed. Filters, search, pagination |
| 12.2.2 | Create `AdminProgramBuilderPage.vue` - program editor | 5 | `src/pages/admin/ProgramBuilderPage.vue` | Form: name, slug, description, audience, language, certification, passing score. Course list (drag-and-drop reorder) |
| 12.2.3 | Create `AdminProgramPublishPage.vue` - publish page | 5 | `src/pages/admin/ProgramPublishPage.vue` | Validation: all required fields, courses exist, tests exist, certificate template uploaded (if needed). Certificate preview. Confirmation |
| 12.2.4 | Create `AdminCreateVersionModal.vue` - create new version | 3 | `src/components/admin/CreateVersionModal.vue` | Confirmation, copy structure |

#### Feature 12.3: Courses and Modules

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 12.3.1 | Create `AdminCoursesPage.vue` - courses table | 3 | `src/pages/admin/CoursesPage.vue` | Filters by program |
| 12.3.2 | Create `AdminCourseBuilderPage.vue` - course editor | 5 | `src/pages/admin/CourseBuilderPage.vue` | Form: name, description, role branch, required. Module list (reorder). Final test |
| 12.3.3 | Create `AdminModulesPage.vue` - modules table | 3 | `src/pages/admin/ModulesPage.vue` | Filters by course |
| 12.3.4 | Create `AdminModuleBuilderPage.vue` - module editor | 5 | `src/pages/admin/ModuleBuilderPage.vue` | Form: name, type, required, locked. Content: tabs (HTML ZIP / PDF / Rutube). Upload components. Preview iframe |
| 12.3.5 | Create drag-and-drop reorder for courses and modules | 5 | `src/components/admin/SortableList.vue` | @vueuse/components useSortable or buttons |

#### Feature 12.4: Tests

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 12.4.1 | Create `AdminAssessmentsPage.vue` - tests table | 3 | `src/pages/admin/AssessmentsPage.vue` | Filters by type, module, course, program |
| 12.4.2 | Create `AdminAssessmentBuilderPage.vue` - test editor | 5 | `src/pages/admin/AssessmentBuilderPage.vue` | Form: name, type, passing score, attempts, feedback, timer. HTML ZIP upload. Preview |

#### Feature 12.5: Import, Certificates, Reports

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 12.5.1 | Create `AdminImportPage.vue` - ZIP upload | 3 | `src/pages/admin/ImportPage.vue` | Drag & drop, validation, upload progress, import report |
| 12.5.2 | Create `AdminCertificatesPage.vue` - all certificates | 3 | `src/pages/admin/CertificatesPage.vue` | Table: number, user, program, date, status. Filters |
| 12.5.3 | Create `AdminCertificateDetailPage.vue` - certificate details | 3 | `src/pages/admin/CertificateDetailPage.vue` | Data, buttons: revoke (with reason), reissue, resend email |
| 12.5.4 | Create `AdminReportsPage.vue` - reports list | 3 | `src/pages/admin/ReportsPage.vue` | Report cards: users, programs, tests, certificates, rutube |
| 12.5.5 | Create `AdminReportViewPage.vue` - report view | 5 | `src/pages/admin/ReportViewPage.vue` | Data table, filters, sort, "Export" button (XLSX/CSV) |
| 12.5.6 | Create `AdminAuditPage.vue` - audit log | 3 | `src/pages/admin/AuditPage.vue` | Table: date, actor, action, entity, filters. Admin sees limited |

#### Feature 12.6: Superadmin

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 12.6.1 | Create `SuperadminSettingsPage.vue` - system settings | 3 | `src/pages/superadmin/SettingsPage.vue` | Forms by category |
| 12.6.2 | Create `SuperadminEmailPage.vue` - SMTP settings | 3 | `src/pages/superadmin/EmailPage.vue` | Host, port, login, password, TLS, from. "Test send" button |
| 12.6.3 | Create `SuperadminSecurityPage.vue` - HTML security | 2 | `src/pages/superadmin/SecurityPage.vue` | Sandbox, CSP, whitelist |
| 12.6.4 | Create `SuperadminAdminsPage.vue` - admin management | 3 | `src/pages/superadmin/AdminsPage.vue` | Admin table, create, delete |
| 12.6.5 | Create `SuperadminAuditPage.vue` - full audit | 2 | `src/pages/superadmin/AuditPage.vue` | All events, filters |
| 12.6.6 | Create `SuperadminSystemPage.vue` - system operations | 2 | `src/pages/superadmin/SystemPage.vue` | Superadmin recovery (backend command) |

---

### Epic 13: Integration, E2E, QA (SP: 55)

**Priority:** Must have  
**Agent:** QA + Backend + Frontend  
**Skills:** `test-driven-development`, `code_reviewer`

#### Feature 13.1: Integration Testing

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 13.1.1 | E2E: Create superadmin -> create admin -> create user -> send invitation | 3 | `tests/e2e/01-auth-flow.test.ts` | Full auth and invitation cycle |
| 13.1.2 | E2E: Accept invitation -> login to dashboard | 2 | `tests/e2e/01-auth-flow.test.ts` | Account activation, password setup |
| 13.1.3 | E2E: Admin creates program -> course -> module (HTML ZIP) -> test -> publish | 5 | `tests/e2e/02-program-creation.test.ts` | Program published, validation passes |
| 13.1.4 | E2E: Admin assigns program to user | 2 | `tests/e2e/02-program-creation.test.ts` | Enrollment created |
| 13.1.5 | E2E: User takes program: opens module -> completes -> takes test | 5 | `tests/e2e/03-user-journey.test.ts` | Progress saved, module completes |
| 13.1.6 | E2E: User takes final assessment -> auto-certificate issued | 3 | `tests/e2e/03-user-journey.test.ts` | Certificate created, PDF generated |
| 13.1.7 | E2E: Public certificate verification by QR | 2 | `tests/e2e/04-certificate.test.ts` | /verify/:token shows data |
| 13.1.8 | E2E: ZIP import program | 3 | `tests/e2e/05-import.test.ts` | ZIP uploads, draft program created |
| 13.1.9 | E2E: Permission check - user cannot open admin, admin cannot open superadmin | 3 | `tests/e2e/06-security.test.ts` | 403 on forbidden URLs |
| 13.1.10 | E2E: Published version cannot be directly edited | 2 | `tests/e2e/06-security.test.ts` | Error on edit published |
| 13.1.11 | E2E: HTML ZIP sandbox - no cookie/localStorage access | 2 | `tests/e2e/06-security.test.ts` | iframe sandbox works |
| 13.1.12 | E2E: Rutube video unavailable - module opens with message | 2 | `tests/e2e/07-rutube.test.ts` | Graceful degradation |

#### Feature 13.2: Code Review and Security

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 13.2.1 | Review `api/` - OWASP Top 10, SQL injection (Drizzle parameterized), XSS (no v-html user content), CSRF (sameSite strict) | 3 | `reviews/2026-05-api-security.md` | No critical vulnerabilities |
| 13.2.2 | Review auth - JWT secret min 32, cookie httpOnly, bcrypt salt rounds >= 10 | 2 | `reviews/2026-05-auth-security.md` | Auth follows best practices |
| 13.2.3 | Review `db/schema.ts` - indexes on all FKs, unique constraints, cascade rules | 2 | `reviews/2026-05-db-schema.md` | Schema optimized |
| 13.2.4 | Review `src/` - TypeScript strict, no any, no inline styles, Tailwind only | 2 | `reviews/2026-05-frontend-quality.md` | Linter clean |
| 13.2.5 | Review ZIP import - path traversal protection, zip bomb protection, whitelist extensions | 2 | `reviews/2026-05-import-security.md` | Protection implemented |
| 13.2.6 | Review certificate - check all conditions before issuance, no spoofing | 2 | `reviews/2026-05-certificate-security.md` | Backend is single source of truth |
| 13.2.7 | Verify build: `npm run build` + `npm run start` | 2 | Command | `dist/public` and `dist/boot.js` created |
| 13.2.8 | Verify TypeScript: `npx tsc --noEmit` | 1 | Command | No TS errors |
| 13.2.9 | Verify logs - no ERROR / CRITICAL | 1 | Command | Logs clean |
| 13.2.10 | Final checklist `QUALITY_CHECKLIST.md` | 3 | `QUALITY_CHECKLIST.md` | All items passed |

---

### Epic 14: DevOps and Deployment (SP: 34)

**Priority:** Should have  
**Agent:** DevOps  
**Skills:** `writing-plans`, `code_reviewer`

#### Feature 14.1: Containerization and CI/CD

| # | Task | SP | Files | DoD |
|---|------|----|-------|-----|
| 14.1.1 | Create `Dockerfile` - multi-stage: build (Node + deps) -> runtime (Node slim) | 3 | `Dockerfile` | Image builds, ~200MB |
| 14.1.2 | Create `docker-compose.yml` - app + MySQL 8 + MinIO (S3) + Redis (optional) | 3 | `docker-compose.yml` | `docker compose up` starts everything |
| 14.1.3 | Create `.dockerignore` | 1 | `.dockerignore` | Does not copy unnecessary files |
| 14.1.4 | Create `.github/workflows/ci.yml` - lint, tsc, build, test on push/PR | 5 | `.github/workflows/ci.yml` | Pipeline green |
| 14.1.5 | Create `.github/workflows/cd-stage.yml` - deploy to stage | 5 | `.github/workflows/cd-stage.yml` | Auto-deploy on merge to develop |
| 14.1.6 | Create `.github/workflows/cd-prod.yml` - deploy to production | 3 | `.github/workflows/cd-prod.yml` | Deploy on tag |
| 14.1.7 | Create `DEPLOY.md` - deployment instructions | 3 | `DEPLOY.md` | Step-by-step guide |


---

## 6. Roadmap

```
Week 1: Backend Foundation (Epics 1-5)
|-- Mon: Epic 1 - Project Initialization
|   |-- package.json, tsconfig, vite, env, drizzle, s3, tailwind
|   |-- skills.config.yaml
|-- Tue: Epic 2 - Full Database Schema
|   |-- All tables: users, invitations, enrollments
|   |-- programs, program_versions, courses, course_versions
|   |-- modules, module_versions, module_contents
|   |-- assessments, assessment_versions, assessment_attempts, questions, answer_options
|   |-- program_progress, course_progress, module_progress
|   |-- certificates, certificate_templates
|   |-- import_jobs, notifications, audit_logs, settings, email_settings, rutube_checks, report_exports
|-- Wed: Epic 2 - Relations, Migrations, Seed
|   |-- Drizzle relations, contracts/types, constants, errors
|   |-- Migrations, seed (superadmin, admin, 2 programs, 2 courses, 3 modules, tests, template)
|   |-- Verify db:push
|-- Thu: Epic 3 - Auth, Middleware, Context, Boot
|   |-- DB connection, hash, JWT, audit helper, notify helper
|   |-- Cookie auth, context, 4 procedure types
|   |-- Boot.ts, health check, graceful shutdown, error handler
|-- Fri: Epic 4 - Services (Audit, Notification, Email, Rutube, ZIP Import)
|   |-- Audit service + middleware
|   |-- Notification service + auto-notifications
|   |-- Email service (SMTP, invitation, certificate, password reset)
|   |-- Rutube checker + cron
|   |-- ZIP import (validator, parser, processor, security)

Week 2: Backend API (Epics 5-8)
|-- Mon: Epic 5 - Auth Router + User Router
|   |-- login, me, logout, acceptInvitation, password reset
|   |-- user.me, updateProfile, changePassword, myPrograms, myCertificates
|-- Tue: Epic 6 - Domain API (Programs, Courses, Modules, Assessments)
|   |-- Admin: program CRUD, versions, publish, archive
|   |-- Admin: course CRUD, reorder
|   |-- Admin: module CRUD, uploadHtmlZip, uploadPdf, setRutubeUrl, reorder
|   |-- Admin: assessment CRUD, uploadHtmlZip, publish
|-- Wed: Epic 6 - User Journey (enrollment, progress, module access)
|   |-- assignProgram, revokeProgram, myPrograms, myCourses, myModules
|   |-- module.open, module.complete, next step, module locking
|   |-- assessment.start, assessment.submit, maxAttempts, timer
|-- Thu: Epic 7 - Certificates (templates, generation, management)
|   |-- Upload template, field coordinates, preview, confirm
|   |-- PDF generation (pdf-lib), QR code
|   |-- Manual issue, revoke, reissue, resend email
|   |-- Auto-issue hook, public verify
|   |-- User: list, download
|-- Fri: Epic 8 - Progress, Reports, Settings
|   |-- Progress calculation (module, course, program)
|   |-- Reports: usersProgress, programs, assessments, certificates, rutube
|   |-- Async export (XLSX/CSV)
|   |-- Superadmin settings: SMTP, domain, security, rutube, admin management

Week 3: Frontend (Epics 9-11)
|-- Mon: Epic 9 - Frontend Infrastructure + UI-kit
|   |-- main.ts, router (all routes), guards, trpc client, Pinia stores
|   |-- Layouts: Public, User, Admin, Superadmin
|   |-- UI-kit: Button, Input, Select, Badge, Skeleton, Progress, Table, Dialog, Tabs, Accordion, Dropdown, Toast, EmptyState, ErrorState, Breadcrumb, SearchInput, Pagination, FileUpload, PDFViewer, IframePreview, StatusBadge, ConfirmDialog
|-- Tue: Epic 10 - Public Pages
|   |-- LandingPage, LoginPage, AcceptInvitationPage
|   |-- CertificateVerifyPage, NotFound, Forbidden
|-- Wed: Epic 11 - User Dashboard
|   |-- Dashboard, Programs, Program detail (accordion courses/modules)
|   |-- Course detail, Module viewer (HTML iframe / PDF / Rutube)
|   |-- Module locking, next step, complete module
|-- Thu: Epic 11 - User Testing
|   |-- Assessment page (HTML iframe / native questions)
|   |-- SingleChoice, MultipleChoice components
|   |-- Timer, submit, result display
|   |-- Attempts exhausted state
|-- Fri: Epic 11 - Profile and Certificates
|   |-- Profile, change password
|   |-- Certificates list, download
|   |-- Notifications

Week 4: Admin Panel, QA, DevOps (Epics 12-14)
|-- Mon: Epic 12 - Admin Panel (Part 1)
|   |-- Dashboard, Users (table, search, filters, create user modal)
|   |-- Invitations, User detail
|   |-- Programs (table, builder, publish, versions)
|-- Tue: Epic 12 - Admin Panel (Part 2)
|   |-- Courses (builder, reorder), Modules (builder, upload, preview)
|   |-- Assessments (builder, HTML upload)
|   |-- Import ZIP, Certificates (list, detail, revoke, reissue)
|-- Wed: Epic 12 - Admin Panel (Part 3) + Superadmin
|   |-- Reports (list, view, export), Audit
|   |-- Superadmin: Settings, SMTP, Security, Admins, System
|-- Thu: Epic 13 - Integration, E2E, QA
|   |-- 12 E2E scenarios
|   |-- Code review: security, performance, architecture
|   |-- Bug fixes
|-- Fri: Epic 14 - DevOps + Final
|   |-- Dockerfile, docker-compose, CI/CD
|   |-- Deploy instructions
|   |-- Final acceptance checklist
```

---

## 7. Agent Workflow

### 7.1. Development Cycle for One Task

```
[Coordinator]
    -> Defines Epic/Feature/Task from plan
    -> Launches agent with context (spec files, mocks, API spec)
[Agent]
    -> Activates writing-plans -> reads spec -> implements Task
    -> Activates test-driven-development -> writes test -> code -> refactor
    -> Runs checks: lint, tsc --noEmit, build
[Coordinator]
    -> Checks status, updates task_tracker
[QA Agent]
    -> code_reviewer -> code review -> feedback (critical / important / suggestion)
[Agent]
    -> Fixes -> re-check
[Coordinator]
    -> Task Done, next Task
```

### 7.2. Rules per Skill

| Skill | Rule |
|-------|------|
| `writing-plans` | Each task - 2-10 minutes, with exact file, code, DoD |
| `test-driven-development` | RED -> GREEN -> REFACTOR. Code without tests is deleted |
| `code_reviewer` | Check: security, performance, readability, architecture, tests |
| `design-system` | Tailwind only, no inline styles. v-html only for trusted content |
| `task_tracker` | Daily standup, status updates, blocker tracking |
| `project_planner` | MoSCoW prioritization, RICE scoring for features |

### 7.3. Auto-activation Config

```yaml
# .kimi/skills.config.yaml
project_type: fullstack
auto_activate:
  - writing-plans
  - project_planner
  - task_tracker
  - test-driven-development
  - code_reviewer
  - design-system
  - skill_router
  - auto_skill_selector

custom_rules:
  - pattern: "api/**/*.ts"
    activate: test-driven-development
  - pattern: "db/**/*.ts"
    activate: test-driven-development
  - pattern: "src/**/*.vue"
    activate: design-system
  - pattern: "src/components/ui/*.vue"
    activate: design-system
  - pattern: "tests/**/*.test.ts"
    activate: test-driven-development
```

---

## 8. Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Versioning complexity (ProgramVersion -> CourseVersion -> ModuleVersion -> AssessmentVersion) | High | High | Start with simple copying (snapshot_json), gradually complicate. MVP: copy structure on createNewVersion |
| PDF generation with QR code | Medium | High | Use pdf-lib + qrcode. Test on real template |
| S3 integration (presigned URLs) | Medium | Medium | Use MinIO for local development. Test on stage |
| HTML ZIP security | Medium | High | Sandboxed iframe, path traversal protection, zip bomb protection, whitelist extensions |
| ZIP import of complex structures | High | Medium | Start with simple manifest.json, gradually add validation. MVP: basic import |
| Email/SMTP configuration | Medium | Medium | Make email optional for dev. Test send via superadmin |
| Frontend agent overload (144 SP on admin panel) | High | Medium | Split admin panel into 3 days. Start with simple tables, then builder |
| Rutube API changes | Low | Medium | HEAD request to video page instead of API. Graceful degradation |
| MySQL vs PostgreSQL in spec | High | Medium | **MySQL 8** as specified in 01-TZ.md. Drizzle ORM supports both |
| Missing invitations in 01-TZ.md | High | High | Added in full plan: invitations table, acceptInvitation endpoint, email service |
| Missing programs in 01-TZ.md | High | High | Full plan uses Program -> Course -> Module hierarchy from tzDAc.md |
| Missing versioning in 01-TZ.md | High | High | Full plan includes ProgramVersion, CourseVersion, ModuleVersion, AssessmentVersion |
| Missing audit in 01-TZ.md | High | High | Full plan includes audit_logs table, logAudit service, audit middleware |
| Missing notifications in 01-TZ.md | High | High | Full plan includes notifications table, createNotification service |
| Missing certificate templates in 01-TZ.md | High | High | Full plan includes certificate_templates table, PDF generation |
| Missing report exports in 01-TZ.md | Medium | Medium | Full plan includes report_exports table, async export |

---

## 9. Task Tracker

File: `notes/TASKS.md`

```markdown
# Task Tracker - DreamDocs Academy (Detailed Plan)

## High Priority (Week 1)

- [ ] Epic 1: Initialization - package.json, tsconfig, vite, env, drizzle, s3, tailwind
  - Owner: @devops-agent
  - Due: 2026-05-08
  - Status: Todo

- [ ] Epic 2: Full Database Schema - all 26 tables, relations, migrations, seed
  - Owner: @backend-agent
  - Due: 2026-05-09
  - Status: Todo
  - Blocks: Epic 3, 4, 5, 6, 7, 8

- [ ] Epic 3: Auth and Middleware - cookies, JWT, context, 4 procedure types, boot, graceful shutdown
  - Owner: @backend-agent
  - Due: 2026-05-10
  - Status: Todo
  - Blocks: Epic 4, 5, 6, 7, 8

## High Priority (Week 2)

- [ ] Epic 4: Services - Audit, Notification, Email, Rutube checker, ZIP Import
  - Owner: @backend-agent
  - Due: 2026-05-12
  - Status: Todo

- [ ] Epic 5: Auth Router + User Router
  - Owner: @backend-agent
  - Due: 2026-05-12
  - Status: Todo

- [ ] Epic 6: Domain API - Programs, Courses, Modules, Assessments, enrollment, progress
  - Owner: @backend-agent
  - Due: 2026-05-14
  - Status: Todo

- [ ] Epic 7: Certificates - templates, PDF generation, manual/auto issue, revoke, reissue, verify
  - Owner: @backend-agent
  - Due: 2026-05-14
  - Status: Todo

- [ ] Epic 8: Progress, Reports, Settings
  - Owner: @backend-agent
  - Due: 2026-05-15
  - Status: Todo

## High Priority (Week 3)

- [ ] Epic 9: Frontend Infrastructure + UI-kit
  - Owner: @frontend-agent
  - Due: 2026-05-12
  - Status: Todo

- [ ] Epic 10: Public Pages
  - Owner: @frontend-agent
  - Due: 2026-05-13
  - Status: Todo

- [ ] Epic 11: User Dashboard - programs, courses, modules, tests, profile, certificates
  - Owner: @frontend-agent
  - Due: 2026-05-15
  - Status: Todo

## High Priority (Week 4)

- [ ] Epic 12: Admin Panel - dashboard, users, programs, courses, modules, tests, import, certificates, reports, audit, superadmin
  - Owner: @frontend-agent
  - Due: 2026-05-20
  - Status: Todo

- [ ] Epic 13: Integration, E2E, QA
  - Owner: @qa-agent
  - Due: 2026-05-21
  - Status: Todo

## Medium Priority

- [ ] Epic 14: DevOps - Docker, CI/CD
  - Owner: @devops-agent
  - Due: 2026-05-22
  - Status: Waiting

## Done

- [x] Detailed Implementation Plan - Full plan with epics, skills, database schema, API, frontend pages
  - Completed: 2026-05-07
```

---

## 10. Pre-Launch Checklist

- [ ] Plan approved (this document)
- [ ] `.env` configured (per `.env.example`)
- [ ] MySQL 8 accessible
- [ ] S3/MinIO accessible
- [ ] Agent skills activated (`writing-plans`, `test-driven-development`, `code_reviewer`, `design-system`)
- [ ] Task tracker created (`notes/TASKS.md`)
- [ ] Agents assigned to epics
- [ ] All 26 database tables designed with indexes and constraints
- [ ] All API endpoints mapped (public, user, admin, superadmin, upload)
- [ ] All frontend pages mapped (public, user, admin, superadmin)
- [ ] ZIP import security requirements documented
- [ ] Certificate generation flow documented
- [ ] Audit log events documented
- [ ] Versioning strategy documented (ProgramVersion -> CourseVersion -> ModuleVersion -> AssessmentVersion)
- [ ] Rutube check strategy documented
- [ ] Email service fallback strategy documented

---

**Plan is ready for launch!** The detailed plan covers:
- 26 database tables with full schema, indexes, and constraints
- 80+ API endpoints across public, user, admin, superadmin zones
- 40+ frontend pages across public, user, admin, superadmin layouts
- 14 epics with ~250 tasks totaling 854 story points
- 4 specialized agents with assigned skills
- Complete 4-week roadmap
- Risk mitigation for all identified gaps
