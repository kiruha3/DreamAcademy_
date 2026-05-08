import { relations } from "drizzle-orm";
import {
  users,
  invitations,
  userProgramEnrollments,
  programs,
  programVersions,
  courses,
  courseVersions,
  modules,
  moduleVersions,
  moduleContents,
  assessments,
  assessmentVersions,
  assessmentAttempts,
  questions,
  answerOptions,
  programProgress,
  courseProgress,
  moduleProgress,
  certificateTemplates,
  certificates,
  importJobs,
  notifications,
  auditLogs,

  rutubeChecks,
  reportExports,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  invitationsCreated: many(invitations),
  enrollments: many(userProgramEnrollments),
  programProgress: many(programProgress),
  courseProgress: many(courseProgress),
  moduleProgress: many(moduleProgress),
  certificates: many(certificates),
  assessmentAttempts: many(assessmentAttempts),
  notifications: many(notifications),
  importJobs: many(importJobs),
  reportExports: many(reportExports),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  createdByUser: one(users, {
    fields: [invitations.createdBy],
    references: [users.id],
  }),
}));

export const userProgramEnrollmentsRelations = relations(
  userProgramEnrollments,
  ({ one }) => ({
    user: one(users, {
      fields: [userProgramEnrollments.userId],
      references: [users.id],
    }),
    program: one(programs, {
      fields: [userProgramEnrollments.programId],
      references: [programs.id],
    }),
    assignedByUser: one(users, {
      fields: [userProgramEnrollments.assignedBy],
      references: [users.id],
    }),
  })
);

export const programsRelations = relations(programs, ({ one, many }) => ({
  versions: many(programVersions),
  enrollments: many(userProgramEnrollments),
  certificateTemplate: one(certificateTemplates, {
    fields: [programs.certificateTemplateId],
    references: [certificateTemplates.id],
  }),
  createdByUser: one(users, {
    fields: [programs.createdBy],
    references: [users.id],
  }),
}));

export const programVersionsRelations = relations(
  programVersions,
  ({ one, many }) => ({
    program: one(programs, {
      fields: [programVersions.programId],
      references: [programs.id],
    }),
    courses: many(courses),
    progress: many(programProgress),
    certificates: many(certificates),
  })
);

export const coursesRelations = relations(courses, ({ one, many }) => ({
  programVersion: one(programVersions, {
    fields: [courses.programVersionId],
    references: [programVersions.id],
  }),
  versions: many(courseVersions),
}));

export const courseVersionsRelations = relations(
  courseVersions,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [courseVersions.courseId],
      references: [courses.id],
    }),
    modules: many(modules),
    progress: many(courseProgress),
    assessments: many(assessments),
  })
);

export const modulesRelations = relations(modules, ({ one, many }) => ({
  courseVersion: one(courseVersions, {
    fields: [modules.courseVersionId],
    references: [courseVersions.id],
  }),
  versions: many(moduleVersions),
}));

export const moduleVersionsRelations = relations(
  moduleVersions,
  ({ one, many }) => ({
    module: one(modules, {
      fields: [moduleVersions.moduleId],
      references: [modules.id],
    }),
    contents: many(moduleContents),
    progress: many(moduleProgress),
    assessments: many(assessments),
  })
);

export const moduleContentsRelations = relations(moduleContents, ({ one, many }) => ({
  moduleVersion: one(moduleVersions, {
    fields: [moduleContents.moduleVersionId],
    references: [moduleVersions.id],
  }),
  rutubeChecks: many(rutubeChecks),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  moduleVersion: one(moduleVersions, {
    fields: [assessments.moduleVersionId],
    references: [moduleVersions.id],
  }),
  courseVersion: one(courseVersions, {
    fields: [assessments.courseVersionId],
    references: [courseVersions.id],
  }),
  versions: many(assessmentVersions),
}));

export const assessmentVersionsRelations = relations(
  assessmentVersions,
  ({ one, many }) => ({
    assessment: one(assessments, {
      fields: [assessmentVersions.assessmentId],
      references: [assessments.id],
    }),
    attempts: many(assessmentAttempts),
    questions: many(questions),
  })
);

export const assessmentAttemptsRelations = relations(
  assessmentAttempts,
  ({ one }) => ({
    user: one(users, {
      fields: [assessmentAttempts.userId],
      references: [users.id],
    }),
    assessmentVersion: one(assessmentVersions, {
      fields: [assessmentAttempts.assessmentVersionId],
      references: [assessmentVersions.id],
    }),
  })
);

export const questionsRelations = relations(questions, ({ one, many }) => ({
  assessmentVersion: one(assessmentVersions, {
    fields: [questions.assessmentVersionId],
    references: [assessmentVersions.id],
  }),
  answerOptions: many(answerOptions),
}));

export const answerOptionsRelations = relations(answerOptions, ({ one }) => ({
  question: one(questions, {
    fields: [answerOptions.questionId],
    references: [questions.id],
  }),
}));

export const programProgressRelations = relations(programProgress, ({ one, many }) => ({
  user: one(users, {
    fields: [programProgress.userId],
    references: [users.id],
  }),
  programVersion: one(programVersions, {
    fields: [programProgress.programVersionId],
    references: [programVersions.id],
  }),
  courseProgress: many(courseProgress),
}));

export const courseProgressRelations = relations(courseProgress, ({ one, many }) => ({
  user: one(users, {
    fields: [courseProgress.userId],
    references: [users.id],
  }),
  courseVersion: one(courseVersions, {
    fields: [courseProgress.courseVersionId],
    references: [courseVersions.id],
  }),
  programProgress: one(programProgress, {
    fields: [courseProgress.programProgressId],
    references: [programProgress.id],
  }),
  moduleProgress: many(moduleProgress),
}));

export const moduleProgressRelations = relations(moduleProgress, ({ one }) => ({
  user: one(users, {
    fields: [moduleProgress.userId],
    references: [users.id],
  }),
  moduleVersion: one(moduleVersions, {
    fields: [moduleProgress.moduleVersionId],
    references: [moduleVersions.id],
  }),
  courseProgress: one(courseProgress, {
    fields: [moduleProgress.courseProgressId],
    references: [courseProgress.id],
  }),
}));

export const certificateTemplatesRelations = relations(
  certificateTemplates,
  ({ one, many }) => ({
    createdByUser: one(users, {
      fields: [certificateTemplates.createdBy],
      references: [users.id],
    }),
    programs: many(programs),
  })
);

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  programVersion: one(programVersions, {
    fields: [certificates.programVersionId],
    references: [programVersions.id],
  }),
}));

export const importJobsRelations = relations(importJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [importJobs.createdBy],
    references: [users.id],
  }),
  resultProgram: one(programs, {
    fields: [importJobs.resultProgramId],
    references: [programs.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const rutubeChecksRelations = relations(rutubeChecks, ({ one }) => ({
  moduleContent: one(moduleContents, {
    fields: [rutubeChecks.moduleContentId],
    references: [moduleContents.id],
  }),
}));

export const reportExportsRelations = relations(reportExports, ({ one }) => ({
  createdByUser: one(users, {
    fields: [reportExports.createdBy],
    references: [users.id],
  }),
}));
