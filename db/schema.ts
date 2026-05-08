import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
  index,
  bigint,
  longtext,
} from "drizzle-orm/mysql-core";

// ============================================
// Group A: Users & Access
// ============================================

export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    unionId: varchar("union_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    avatar: text("avatar"),
    role: mysqlEnum("role", [
      "user",
      "employee",
      "partner",
      "integrator",
      "admin",
      "superadmin",
    ])
      .default("user")
      .notNull(),
    status: mysqlEnum("status", ["active", "blocked", "pending"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    lastSignInAt: timestamp("last_sign_in_at"),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    unionIdIdx: index("users_union_id_idx").on(table.unionId),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
  })
);

export const invitations = mysqlTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    role: mysqlEnum("role", [
      "user",
      "employee",
      "partner",
      "integrator",
      "admin",
      "superadmin",
    ])
      .default("user")
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    revokedAt: timestamp("revoked_at"),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("invitations_token_idx").on(table.token),
    emailIdx: index("invitations_email_idx").on(table.email),
  })
);

export const userProgramEnrollments = mysqlTable(
  "user_program_enrollments",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programId: bigint("program_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    assignedBy: bigint("assigned_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    userProgramIdx: uniqueIndex("upe_user_program_idx").on(
      table.userId,
      table.programId
    ),
    userIdx: index("upe_user_idx").on(table.userId),
    programIdx: index("upe_program_idx").on(table.programId),
  })
);

// ============================================
// Group B: Programs & Versioning
// ============================================

export const programs = mysqlTable(
  "programs",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    targetAudience: mysqlEnum("target_audience", [
      "all",
      "employee",
      "partner",
      "integrator",
    ])
      .default("all")
      .notNull(),
    hasCertification: boolean("has_certification").default(false).notNull(),
    certificateTemplateId: bigint("certificate_template_id", {
      mode: "number",
      unsigned: true,
    }).references(() => certificateTemplates.id),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("programs_slug_idx").on(table.slug),
    codeIdx: uniqueIndex("programs_code_idx").on(table.code),
    targetIdx: index("programs_target_idx").on(table.targetAudience),
  })
);

export const programVersions = mysqlTable(
  "program_versions",
  {
    id: serial("id").primaryKey(),
    programId: bigint("program_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    versionNumber: int("version_number").notNull(),
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .default("draft")
      .notNull(),
    snapshotJson: longtext("snapshot_json"),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    programVersionIdx: uniqueIndex("pv_program_version_idx").on(
      table.programId,
      table.versionNumber
    ),
    programIdx: index("pv_program_idx").on(table.programId),
    statusIdx: index("pv_status_idx").on(table.status),
  })
);

export const courses = mysqlTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    programVersionId: bigint("program_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => programVersions.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    targetRole: mysqlEnum("target_role", [
      "all",
      "employee",
      "partner",
      "integrator",
    ])
      .default("all")
      .notNull(),
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    programVersionIdx: index("courses_pv_idx").on(table.programVersionId),
    slugIdx: index("courses_slug_idx").on(table.slug),
    sortIdx: index("courses_sort_idx").on(table.programVersionId, table.sortOrder),
  })
);

export const courseVersions = mysqlTable(
  "course_versions",
  {
    id: serial("id").primaryKey(),
    courseId: bigint("course_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    versionNumber: int("version_number").notNull(),
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .default("draft")
      .notNull(),
    snapshotJson: longtext("snapshot_json"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    courseVersionIdx: uniqueIndex("cv_course_version_idx").on(
      table.courseId,
      table.versionNumber
    ),
    courseIdx: index("cv_course_idx").on(table.courseId),
  })
);

export const modules = mysqlTable(
  "modules",
  {
    id: serial("id").primaryKey(),
    courseVersionId: bigint("course_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => courseVersions.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    moduleType: mysqlEnum("module_type", [
      "common",
      "employee",
      "partner",
      "integrator",
    ])
      .default("common")
      .notNull(),
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    courseVersionIdx: index("modules_cv_idx").on(table.courseVersionId),
    sortIdx: index("modules_sort_idx").on(table.courseVersionId, table.sortOrder),
  })
);

export const moduleVersions = mysqlTable(
  "module_versions",
  {
    id: serial("id").primaryKey(),
    moduleId: bigint("module_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    versionNumber: int("version_number").notNull(),
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .default("draft")
      .notNull(),
    snapshotJson: longtext("snapshot_json"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    moduleVersionIdx: uniqueIndex("mv_module_version_idx").on(
      table.moduleId,
      table.versionNumber
    ),
    moduleIdx: index("mv_module_idx").on(table.moduleId),
  })
);

export const moduleContents = mysqlTable(
  "module_contents",
  {
    id: serial("id").primaryKey(),
    moduleVersionId: bigint("module_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => moduleVersions.id, { onDelete: "cascade" }),
    contentType: mysqlEnum("content_type", ["html_zip", "pdf", "rutube"])
      .notNull(),
    s3Key: text("s3_key"),
    s3Checksum: varchar("s3_checksum", { length: 64 }),
    rutubeVideoId: varchar("rutube_video_id", { length: 100 }),
    rutubeUrl: text("rutube_url"),
    durationSeconds: int("duration_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    moduleVersionIdx: uniqueIndex("mc_mv_idx").on(table.moduleVersionId),
  })
);

// ============================================
// Group C: Assessments (Testing)
// ============================================

export const assessments = mysqlTable(
  "assessments",
  {
    id: serial("id").primaryKey(),
    moduleVersionId: bigint("module_version_id", {
      mode: "number",
      unsigned: true,
    }).references(() => moduleVersions.id, { onDelete: "cascade" }),
    courseVersionId: bigint("course_version_id", {
      mode: "number",
      unsigned: true,
    }).references(() => courseVersions.id, { onDelete: "cascade" }),
    assessmentType: mysqlEnum("assessment_type", [
      "mini_test",
      "final",
      "certification",
    ])
      .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    passingScore: int("passing_score").default(80).notNull(),
    maxAttempts: int("max_attempts").default(2).notNull(),
    timeLimitMinutes: int("time_limit_minutes"),
    showCorrectAnswers: boolean("show_correct_answers").default(true).notNull(),
    allowRetake: boolean("allow_retake").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    moduleVersionIdx: index("assessments_mv_idx").on(table.moduleVersionId),
    courseVersionIdx: index("assessments_cv_idx").on(table.courseVersionId),
    typeIdx: index("assessments_type_idx").on(table.assessmentType),
  })
);

export const assessmentVersions = mysqlTable(
  "assessment_versions",
  {
    id: serial("id").primaryKey(),
    assessmentId: bigint("assessment_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    versionNumber: int("version_number").notNull(),
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .default("draft")
      .notNull(),
    snapshotJson: longtext("snapshot_json"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    assessmentVersionIdx: uniqueIndex("av_assessment_version_idx").on(
      table.assessmentId,
      table.versionNumber
    ),
    assessmentIdx: index("av_assessment_idx").on(table.assessmentId),
  })
);

export const assessmentAttempts = mysqlTable(
  "assessment_attempts",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assessmentVersionId: bigint("assessment_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
    attemptNumber: int("attempt_number").notNull(),
    status: mysqlEnum("status", ["in_progress", "completed", "expired"])
      .default("in_progress")
      .notNull(),
    score: int("score"),
    maxScore: int("max_score"),
    isPassed: boolean("is_passed"),
    answersJson: longtext("answers_json"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userAssessmentIdx: index("aa_user_av_idx").on(
      table.userId,
      table.assessmentVersionId
    ),
    userIdx: index("aa_user_idx").on(table.userId),
    avIdx: index("aa_av_idx").on(table.assessmentVersionId),
  })
);

export const questions = mysqlTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    assessmentVersionId: bigint("assessment_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull(),
    questionText: text("question_text").notNull(),
    questionType: mysqlEnum("question_type", ["single", "multiple", "text"])
      .default("single")
      .notNull(),
    explanation: text("explanation"),
    points: int("points").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    assessmentVersionIdx: index("questions_av_idx").on(table.assessmentVersionId),
    sortIdx: index("questions_sort_idx").on(
      table.assessmentVersionId,
      table.sortOrder
    ),
  })
);

export const answerOptions = mysqlTable(
  "answer_options",
  {
    id: serial("id").primaryKey(),
    questionId: bigint("question_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull(),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    questionIdx: index("ao_question_idx").on(table.questionId),
  })
);

// ============================================
// Group D: Progress & Certificates
// ============================================

export const programProgress = mysqlTable(
  "program_progress",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programVersionId: bigint("program_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => programVersions.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["not_started", "in_progress", "completed"])
      .default("not_started")
      .notNull(),
    progressPercent: int("progress_percent").default(0).notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userProgramIdx: uniqueIndex("pp_user_pv_idx").on(
      table.userId,
      table.programVersionId
    ),
    userIdx: index("pp_user_idx").on(table.userId),
    pvIdx: index("pp_pv_idx").on(table.programVersionId),
  })
);

export const courseProgress = mysqlTable(
  "course_progress",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseVersionId: bigint("course_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => courseVersions.id, { onDelete: "cascade" }),
    programProgressId: bigint("program_progress_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => programProgress.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["not_started", "in_progress", "completed"])
      .default("not_started")
      .notNull(),
    progressPercent: int("progress_percent").default(0).notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userCourseIdx: uniqueIndex("cp_user_cv_idx").on(
      table.userId,
      table.courseVersionId
    ),
    userIdx: index("cp_user_idx").on(table.userId),
    cvIdx: index("cp_cv_idx").on(table.courseVersionId),
  })
);

export const moduleProgress = mysqlTable(
  "module_progress",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleVersionId: bigint("module_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => moduleVersions.id, { onDelete: "cascade" }),
    courseProgressId: bigint("course_progress_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => courseProgress.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["not_started", "in_progress", "completed"])
      .default("not_started")
      .notNull(),
    progressPercent: int("progress_percent").default(0).notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userModuleIdx: uniqueIndex("mp_user_mv_idx").on(
      table.userId,
      table.moduleVersionId
    ),
    userIdx: index("mp_user_idx").on(table.userId),
    mvIdx: index("mp_mv_idx").on(table.moduleVersionId),
  })
);

export const certificateTemplates = mysqlTable(
  "certificate_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    s3Key: text("s3_key").notNull(),
    fieldsJson: longtext("fields_json"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    defaultIdx: index("ct_default_idx").on(table.isDefault),
  })
);

export const certificates = mysqlTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programVersionId: bigint("program_version_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => programVersions.id, { onDelete: "cascade" }),
    certificateNumber: varchar("certificate_number", { length: 100 })
      .notNull(),
    verificationToken: varchar("verification_token", { length: 255 })
      .notNull(),
    score: int("score"),
    maxScore: int("max_score"),
    pdfS3Key: text("pdf_s3_key"),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
    revokeReason: text("revoke_reason"),
    isManual: boolean("is_manual").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    numberIdx: uniqueIndex("cert_number_idx").on(table.certificateNumber),
    tokenIdx: uniqueIndex("cert_token_idx").on(table.verificationToken),
    userIdx: index("cert_user_idx").on(table.userId),
    pvIdx: index("cert_pv_idx").on(table.programVersionId),
  })
);

// ============================================
// Group E: Service Tables
// ============================================

export const importJobs = mysqlTable(
  "import_jobs",
  {
    id: serial("id").primaryKey(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    s3Key: text("s3_key").notNull(),
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed"])
      .default("pending")
      .notNull(),
    resultProgramId: bigint("result_program_id", {
      mode: "number",
      unsigned: true,
    }).references(() => programs.id),
    reportJson: longtext("report_json"),
    errorMessage: text("error_message"),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    statusIdx: index("ij_status_idx").on(table.status),
    createdByIdx: index("ij_created_by_idx").on(table.createdBy),
  })
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", [
      "program_assigned",
      "module_completed",
      "assessment_reminder",
      "certificate_issued",
      "invitation_received",
      "system",
    ])
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    metadataJson: text("metadata_json"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("notif_user_idx").on(table.userId),
    userReadIdx: index("notif_user_read_idx").on(table.userId, table.isRead),
    typeIdx: index("notif_type_idx").on(table.type),
  })
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: bigint("actor_id", { mode: "number", unsigned: true })
      .references(() => users.id),
    actorType: mysqlEnum("actor_type", ["user", "system"])
      .default("user")
      .notNull(),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: varchar("target_id", { length: 50 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    beforeJson: longtext("before_json"),
    afterJson: longtext("after_json"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index("audit_actor_idx").on(table.actorId),
    targetIdx: index("audit_target_idx").on(table.targetType, table.targetId),
    actionIdx: index("audit_action_idx").on(table.action),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  })
);

export const settings = mysqlTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    category: mysqlEnum("category", [
      "general",
      "security",
      "email",
      "appearance",
    ])
      .default("general")
      .notNull(),
    isEncrypted: boolean("is_encrypted").default(false).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    keyIdx: uniqueIndex("settings_key_idx").on(table.key),
    categoryIdx: index("settings_category_idx").on(table.category),
  })
);

export const emailSettings = mysqlTable(
  "email_settings",
  {
    id: serial("id").primaryKey(),
    host: varchar("host", { length: 255 }).notNull(),
    port: int("port").notNull(),
    secure: boolean("secure").default(true).notNull(),
    authUser: varchar("auth_user", { length: 255 }).notNull(),
    authPasswordEncrypted: text("auth_password_encrypted").notNull(),
    fromAddress: varchar("from_address", { length: 255 }).notNull(),
    fromName: varchar("from_name", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    updatedBy: bigint("updated_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    activeIdx: index("es_active_idx").on(table.isActive),
  })
);

export const rutubeChecks = mysqlTable(
  "rutube_checks",
  {
    id: serial("id").primaryKey(),
    moduleContentId: bigint("module_content_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => moduleContents.id, { onDelete: "cascade" }),
    videoId: varchar("video_id", { length: 100 }).notNull(),
    status: mysqlEnum("status", ["available", "unavailable", "error"])
      .notNull(),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
    errorMessage: text("error_message"),
  },
  (table) => ({
    moduleContentIdx: index("rc_mc_idx").on(table.moduleContentId),
    statusIdx: index("rc_status_idx").on(table.status),
  })
);

export const reportExports = mysqlTable(
  "report_exports",
  {
    id: serial("id").primaryKey(),
    reportType: varchar("report_type", { length: 50 }).notNull(),
    filtersJson: longtext("filters_json"),
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed"])
      .default("pending")
      .notNull(),
    fileName: varchar("file_name", { length: 255 }),
    s3Key: text("s3_key"),
    errorMessage: text("error_message"),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    statusIdx: index("re_status_idx").on(table.status),
    createdByIdx: index("re_created_by_idx").on(table.createdBy),
  })
);
