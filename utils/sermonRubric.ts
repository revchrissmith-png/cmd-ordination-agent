// utils/sermonRubric.ts
// Sermon marking rubric data — CMD Ordaining Council (March 2026)
// Used by council grading page and ordinand feedback display.

export type SermonRubricScores = Record<string, number>
export type RubricRating = 'insufficient' | 'adequate' | 'good' | 'excellent' | 'exceptional'

export const SERMON_RUBRIC_SECTIONS = [
  {
    id: 'intro',
    title: 'I. Introduction',
    criteria: [
      { id: 'intro_a', text: 'Little time was wasted with unnecessary distractions and banter.', low: 'Lots of distractions', high: 'Moved efficiently into the sermon' },
      { id: 'intro_b', text: "The introduction captured the audience's attention.", low: 'Not engaging', high: 'Very engaging' },
      { id: 'intro_c', text: 'The introduction oriented the audience to the main idea of the sermon.', low: 'No alignment to main idea', high: 'Clear alignment to main idea' },
    ],
  },
  {
    id: 'body',
    title: 'II. Body of Sermon',
    criteria: [
      { id: 'body_a', text: 'The context of the passage was properly explained.', low: 'No context given', high: 'Context clearly explained' },
      { id: 'body_b', text: 'The sermon revealed the main point of the text.', low: 'Main point had no correlation to text', high: 'Main point correlated with text' },
      { id: 'body_c', text: 'The preacher clearly preached Jesus from the text.', low: 'Jesus was not mentioned', high: 'Jesus was clearly understood from the text' },
      { id: 'body_d', text: 'The sermon was oriented around one main idea/big idea.', low: 'No identifiable main point', high: 'Main point guided the sermon' },
    ],
  },
  {
    id: 'conclusion',
    title: 'III. Conclusion',
    criteria: [
      { id: 'conclusion_a', text: 'The conclusion properly summarized the main idea of the sermon.', low: 'Conclusion had no correlation to the main idea', high: 'Conclusion summarized the main idea of the sermon' },
      { id: 'conclusion_b', text: "The conclusion was unhurried and allowed others to properly absorb the message's main idea.", low: 'The conclusion felt like a crash landing', high: 'The conclusion allowed the listener to respond to the sermon' },
    ],
  },
  {
    id: 'application',
    title: 'IV. Application',
    criteria: [
      { id: 'application_a', text: 'The preacher made a clear and helpful application of the text.', low: 'No application given', high: 'Clear application with appropriate next steps' },
      { id: 'application_b', text: 'Various groups of people represented in the congregation were considered in the application of the sermon.', low: 'Application was to a singular demographic', high: '4 or more demographics were given a point of application' },
      { id: 'application_c', text: 'The sermon was gospel-centered.', low: 'People were not pointed to Jesus (self-help application)', high: 'People were pointed to Jesus (gospel dependance application)' },
      { id: 'application_d', text: 'The preacher presented clear ways to respond to the sermon.', low: 'No opportunity for response', high: 'Opportunity for response given' },
      { id: 'application_e', text: "The preacher showed care for the audience by preaching to their hearts.", low: "The sermon didn't engage the listener's emotions", high: "The sermon engaged the listener's emotions" },
      { id: 'application_f', text: 'The preacher showed care for the audience by preaching to the minds.', low: "The sermon didn't engage the listener intellectually", high: 'The sermon engaged the listener intellectually' },
    ],
  },
  {
    id: 'delivery',
    title: 'V. Delivery',
    criteria: [
      { id: 'delivery_a', text: 'The preacher had a good flow of thoughts throughout the sermon.', low: 'Thoughts were disjointed', high: 'Thoughts were cohesive' },
      { id: 'delivery_b', text: 'The preacher had dynamic and appropriate voice inflection.', low: 'Presentation had no change in voice inflection', high: 'Presentation had differing and appropriate inflection' },
      { id: 'delivery_c', text: 'Was there a good cadence throughout the sermon (i.e. did the pace match the content)?', low: 'No change of pace throughout the sermon', high: 'Good use of changing pace' },
      { id: 'delivery_d', text: "The preacher's body language enhanced the sermon (i.e. were there any unnecessary or distracting movements?).", low: 'Distracting body language', high: 'Body language matched the content of what was being said' },
      { id: 'delivery_e', text: 'Was there a continual use of filler words (e.g. ums, uhs, etc.)?', low: '10 or more filler words', high: '5 filler words or less' },
    ],
  },
  {
    id: 'general',
    title: 'VI. General Comments',
    criteria: [
      { id: 'general_a', text: 'There were red flags and concerns about the sermon.', low: 'Many red flags throughout the sermon', high: 'No red flags' },
    ],
  },
]

export const TOTAL_RUBRIC_CRITERIA = SERMON_RUBRIC_SECTIONS.reduce((sum, s) => sum + s.criteria.length, 0)

export function suggestRubricGrade(scores: SermonRubricScores): RubricRating | null {
  const values = Object.values(scores).filter(v => v > 0)
  if (values.length < TOTAL_RUBRIC_CRITERIA) return null
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  if (avg < 1.75) return 'insufficient'
  if (avg < 2.25) return 'adequate'
  if (avg < 2.75) return 'good'
  if (avg < 3.5) return 'excellent'
  return 'exceptional'
}

export function sectionAverage(sectionId: string, scores: SermonRubricScores): number | null {
  const section = SERMON_RUBRIC_SECTIONS.find(s => s.id === sectionId)
  if (!section) return null
  const values = section.criteria.map(c => scores[c.id] || 0).filter(v => v > 0)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}
