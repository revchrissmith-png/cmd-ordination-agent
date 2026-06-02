// lib/mentor-report-sections.ts
// The monthly mentor report's section + question set — the single source of
// truth shared by the ordinand-facing form (app/dashboard/ordinand/mentor-report)
// and the server-side email builder (lib/mentor-report-email.ts).
//
// Kept import-free on purpose so the client form can import it without pulling
// any email/templating code into the browser bundle.

export type ReportSection = { title: string; icon: string; questions: string[] }

export const SECTIONS: ReportSection[] = [
  {
    title: 'Spiritual Formation and Relationship with God',
    icon: '🙏',
    questions: [
      'What meaningful spiritual practices did you engage in this month? What was your frequency rhythm?',
      'What spiritual practices would you like to explore?',
      'How is God speaking to you right now? What is God\'s invitation to you in the area of personal growth and transformation?',
    ],
  },
  {
    title: 'Preaching / Teaching Ministry',
    icon: '📖',
    questions: [
      'How have you had the opportunity to minister in this way this month? Please list the events and frequency.',
      'What are some examples of encouragements or challenges you experienced in this area?',
      'How have you had the opportunity to receive training or learning in this area?',
      'How would you like to grow and develop in your preaching/teaching ministry?',
    ],
  },
  {
    title: 'Shepherding Ministry',
    icon: '🤝',
    questions: [
      'What are some examples of how you were able to minister to others in this way? This may include visitation, counselling, evangelism, baptisms, hospital visits, etc.',
      'What did you learn about your own shepherding practices?',
      'In what ways do you hope to grow in this area? In what ways have you seen growth?',
      'Within the context in which you serve, both vocationally and within the congregation, who are examples of a shepherding heart and what can you learn from their example?',
    ],
  },
  {
    title: 'Administrative Ministry',
    icon: '📋',
    questions: [
      'What types of meetings have you been part of this month? (examples: committee meetings, staff meetings, ministerial, ministry events)',
      'What was your participation in those meetings?',
      'What are areas of effectiveness in how you were part of the team? What are areas in which you can grow as a team member?',
      'Were there areas of conflict? How did you engage in those areas?',
    ],
  },
  {
    title: 'Personal Development',
    icon: '🌱',
    questions: [
      'How have you engaged your mind in worship this month? What books have you read, etc.?',
      'What theological issue is present for you personally or in your ministry context?',
      'How is your attention to your physical health?',
      'Do you have healthy rhythms of Sabbath? Explain.',
      'Any problems or challenges in your personal life that are limiting your ability to be fully engaged with your ministry?',
    ],
  },
  {
    title: 'Mentor / Mentee Relationship',
    icon: '💬',
    questions: [
      'How can your mentor support you in prayer this month?',
      'Do you need advice or assistance with a particular issue or area?',
      'What do you hope to discuss at your next meeting with your mentor?',
    ],
  },
]
