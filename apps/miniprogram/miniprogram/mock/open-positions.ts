export interface OpenPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string;
}

export const OPEN_POSITIONS: OpenPosition[] = [
  {
    id: '1',
    title: '系统工程师 (Systems Engineer)',
    department: 'Systems Engineering',
    location: 'Suzhou, China',
    type: 'Full-time',
    description:
      '1. Responsible for system level requirement analysis, specification and design for braking systems.\n2. Work closely with cross-functional teams to ensure system performance and reliability.\n3. Support customer technical communication and system troubleshooting.\n4. Ensure compliance with railway safety standards.',
    requirements:
      '1. Bachelor degree or above in Mechanical, Electrical, Mechatronics Engineering.\n2. 3+ years experience in system engineering, preferably in rail or automotive industry.\n3. Good English communication skills.\n4. Strong problem-solving abilities and teamwork spirit.',
  },
  {
    id: '2',
    title: '软件工程师 (Software Engineer)',
    department: 'Software Development',
    location: 'Suzhou, China',
    type: 'Full-time',
    description:
      '1. Design, develop and test embedded software for train control systems.\n2. Follow software development lifecycle processes (V-Model, Agile).\n3. Perform code reviews and software verification activities.\n4. Maintain and improve existing software architectures.',
    requirements:
      '1. Bachelor degree or above in Computer Science, Software Engineering or related.\n2. Proficient in C/C++ programming for embedded systems.\n3. Experience with RTOS and microcontrollers.\n4. Knowledge of EN 50128 or ISO 26262 is a plus.',
  },
  {
    id: '3',
    title: '质量工程师 (Quality Engineer)',
    department: 'Quality Assurance',
    location: 'Suzhou, China',
    type: 'Full-time',
    description:
      '1. Handle customer complaints and lead 8D problem-solving processes.\n2. Conduct process audits and drive continuous improvement in manufacturing.\n3. Support New Product Introduction (NPI) quality planning.\n4. Monitor and analyze quality metrics to reduce scrap and rework.',
    requirements:
      '1. Bachelor degree in Engineering or Quality Management.\n2. 5+ years experience in quality assurance in manufacturing.\n3. Familiar with quality tools (FMEA, APQP, PPAP, SPC).\n4. ISO 9001/IRIS internal auditor certification is preferred.',
  },
];

export function getOpenPositionById(id: string): OpenPosition | undefined {
  return OPEN_POSITIONS.find((item) => item.id === id);
}
