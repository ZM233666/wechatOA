export interface HandbookChapter {
  id: string;
  title: string;
}

export const HANDBOOK_INTRO_CN =
  '欢迎查阅 Knorr-Bremse 员工手册。本手册包含了公司的规章制度、福利待遇、行为准则等重要信息。';

export const HANDBOOK_INTRO_EN =
  'Welcome to the Knorr-Bremse Employee Handbook. This manual contains important information about company policies, benefits, and code of conduct.';

export const HANDBOOK_CHAPTERS: HandbookChapter[] = [
  {
    id: 'chapter-1',
    title: '第一章：公司介绍与愿景 / Chapter 1: Intro & Vision',
  },
  {
    id: 'chapter-2',
    title: '第二章：考勤与休假制度 / Chapter 2: Attendance & Leave',
  },
  {
    id: 'chapter-3',
    title: '第三章：薪酬与福利 / Chapter 3: Comp & Benefits',
  },
  {
    id: 'chapter-4',
    title: '第四章：健康与安全规范 / Chapter 4: Health & Safety',
  },
];
