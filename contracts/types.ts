import { z } from "zod";
import * as schema from "@db/schema";

// Re-export schema types
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;

export type Invitation = typeof schema.invitations.$inferSelect;
export type NewInvitation = typeof schema.invitations.$inferInsert;

export type UserProgramEnrollment =
  typeof schema.userProgramEnrollments.$inferSelect;
export type NewUserProgramEnrollment =
  typeof schema.userProgramEnrollments.$inferInsert;

export type Program = typeof schema.programs.$inferSelect;
export type NewProgram = typeof schema.programs.$inferInsert;

export type ProgramVersion = typeof schema.programVersions.$inferSelect;
export type NewProgramVersion = typeof schema.programVersions.$inferInsert;

export type Course = typeof schema.courses.$inferSelect;
export type NewCourse = typeof schema.courses.$inferInsert;

export type CourseVersion = typeof schema.courseVersions.$inferSelect;
export type NewCourseVersion = typeof schema.courseVersions.$inferInsert;

export type Module = typeof schema.modules.$inferSelect;
export type NewModule = typeof schema.modules.$inferInsert;

export type ModuleVersion = typeof schema.moduleVersions.$inferSelect;
export type NewModuleVersion = typeof schema.moduleVersions.$inferInsert;

export type ModuleContent = typeof schema.moduleContents.$inferSelect;
export type NewModuleContent = typeof schema.moduleContents.$inferInsert;

export type Assessment = typeof schema.assessments.$inferSelect;
export type NewAssessment = typeof schema.assessments.$inferInsert;

export type AssessmentVersion = typeof schema.assessmentVersions.$inferSelect;
export type NewAssessmentVersion =
  typeof schema.assessmentVersions.$inferInsert;

export type AssessmentAttempt = typeof schema.assessmentAttempts.$inferSelect;
export type NewAssessmentAttempt =
  typeof schema.assessmentAttempts.$inferInsert;

export type Question = typeof schema.questions.$inferSelect;
export type NewQuestion = typeof schema.questions.$inferInsert;

export type AnswerOption = typeof schema.answerOptions.$inferSelect;
export type NewAnswerOption = typeof schema.answerOptions.$inferInsert;

export type ProgramProgress = typeof schema.programProgress.$inferSelect;
export type NewProgramProgress = typeof schema.programProgress.$inferInsert;

export type CourseProgress = typeof schema.courseProgress.$inferSelect;
export type NewCourseProgress = typeof schema.courseProgress.$inferInsert;

export type ModuleProgress = typeof schema.moduleProgress.$inferSelect;
export type NewModuleProgress = typeof schema.moduleProgress.$inferInsert;

export type CertificateTemplate =
  typeof schema.certificateTemplates.$inferSelect;
export type NewCertificateTemplate =
  typeof schema.certificateTemplates.$inferInsert;

export type Certificate = typeof schema.certificates.$inferSelect;
export type NewCertificate = typeof schema.certificates.$inferInsert;

export type ImportJob = typeof schema.importJobs.$inferSelect;
export type NewImportJob = typeof schema.importJobs.$inferInsert;

export type Notification = typeof schema.notifications.$inferSelect;
export type NewNotification = typeof schema.notifications.$inferInsert;

export type AuditLog = typeof schema.auditLogs.$inferSelect;
export type NewAuditLog = typeof schema.auditLogs.$inferInsert;

export type Setting = typeof schema.settings.$inferSelect;
export type NewSetting = typeof schema.settings.$inferInsert;

export type EmailSetting = typeof schema.emailSettings.$inferSelect;
export type NewEmailSetting = typeof schema.emailSettings.$inferInsert;

export type RutubeCheck = typeof schema.rutubeChecks.$inferSelect;
export type NewRutubeCheck = typeof schema.rutubeChecks.$inferInsert;

export type ReportExport = typeof schema.reportExports.$inferSelect;
export type NewReportExport = typeof schema.reportExports.$inferInsert;

// Custom schemas
export const LessonContentSchema = z
  .object({
    html: z.string().max(50000).optional(),
    s3HtmlKey: z.string().optional(),
    s3CssKey: z.string().optional(),
    posterUrl: z.string().optional(),
  })
  .refine(
    (d) => !(d.html && d.s3HtmlKey),
    "Укажите либо html, либо s3HtmlKey, но не оба"
  )
  .refine(
    (d) => d.html || d.s3HtmlKey,
    "Требуется указать html или s3HtmlKey"
  );

export type LessonContent = z.infer<typeof LessonContentSchema>;

export const CertificateFieldsSchema = z.object({
  name: z.object({ x: z.number(), y: z.number(), fontSize: z.number() }),
  program: z.object({ x: z.number(), y: z.number(), fontSize: z.number() }),
  date: z.object({ x: z.number(), y: z.number(), fontSize: z.number() }),
  score: z.object({ x: z.number(), y: z.number(), fontSize: z.number() }),
  number: z.object({ x: z.number(), y: z.number(), fontSize: z.number() }),
  qr: z.object({ x: z.number(), y: z.number(), size: z.number() }),
});

export type CertificateFields = z.infer<typeof CertificateFieldsSchema>;

// API response types
export interface CourseWithModules extends Course {
  modules: Module[];
}

export interface ModuleWithContents extends Module {
  contents: ModuleContent[];
}

export interface AssessmentWithQuestions extends Assessment {
  questions: (Question & { answerOptions: AnswerOption[] })[];
}

export interface ProgramWithCourses extends Program {
  courses: Course[];
}

export interface UserWithProgress extends User {
  programProgress: ProgramProgress[];
  certificates: Certificate[];
}

// Auth types
export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface TrpcContext {
  user: User | null;
  req: Request;
  resHeaders: Headers;
}
