// utils/selfAssessmentQuestions.ts
// Self-assessment question sets for each theological paper topic

export type SelfAssessmentQuestion = {
  id: string
  question: string
}

export type SelfAssessmentTopic = {
  topic: string
  title: string
  questions: SelfAssessmentQuestion[]
  rubricItems: string[]
}

export type PaperSectionId =
  | 'completeness'
  | 'theological_depth'
  | 'scripture'
  | 'personal_reflection'
  | 'sources'
  | 'grammar'

export type PaperSectionDef = {
  id: PaperSectionId
  title: string
  prompt: string
  note?: string // optional note shown below the section (e.g. AI policy)
}

// The 6 standard assessment sections — identical across all paper topics
export const PAPER_SECTIONS: PaperSectionDef[] = [
  {
    id: 'completeness',
    title: 'Completeness',
    prompt: 'Have you addressed each of the key questions as outlined in the assignment guide?',
  },
  {
    id: 'theological_depth',
    title: 'Theological Depth and Precision',
    prompt: 'Does your paper demonstrate a level of theological depth and accuracy that befits the seriousness of the topic?',
  },
  {
    id: 'scripture',
    title: 'Appropriate Use of Scripture',
    prompt:
      'Does your paper demonstrate a faithful engagement with the biblical text? Have you grounded your conclusions in scripture? Is there any place where you have misused the text to support a point that is alien to its original meaning?',
  },
  {
    id: 'personal_reflection',
    title: 'Thoughtful Personal Reflection',
    prompt:
      'Have you demonstrated integration between your thesis, conclusions, and your personal life and ministry? Does your paper point to actions or convictions that will be lived out within your own relationship with God, or your ministry among his people?',
  },
  {
    id: 'sources',
    title: 'Sufficiency of Sources and Citations',
    prompt:
      'A paper of this type requires meaningful interaction with at least eight quality academic sources, including theological dictionaries, biblical commentaries, and theological texts. Does your bibliography meet this standard? Have you consulted broadly with authors who may not agree with your positions? Have you appropriately cited all ideas that are not your own?',
  },
  {
    id: 'grammar',
    title: 'Grammar and Formatting',
    prompt:
      'Does your paper demonstrate clean, clear formatting? Is your paper organized into proper sections, with headings, tables of contents, page numbers? Is the paper free of grammar and spelling errors?',
    note:
      'While AI tools such as Grammarly are useful for fixing grammatical errors, they also contain a generative component that can change the wording or voice of a text. The use of Generative AI (e.g. ChatGPT) is strongly discouraged, and if used, must be properly documented and cited.',
  },
]

/**
 * Convert a v1 self-assessment to v2 shape (in-memory only — does not mutate the DB).
 * v1 stores per-question text answers and per-question ratings.
 * v2 groups feedback into 6 standard sections (completeness, theological_depth, etc.).
 *
 * Mapping:
 *  - v1 per-question ratings → v2 completeness.question_ratings
 *  - v1 per-question answers → v2 completeness.evidence (concatenated with Q numbers)
 *  - Sections 2-6 have no v1 equivalent and remain empty.
 */
export function convertV1ToV2(
  answers: Record<string, string>,
  selfAssessments: Record<string, string>,
  topicQuestions: { id: string; question: string }[],
): { version: 2; sections: Record<string, any> } {
  const questionRatings: Record<string, string> = {}
  for (const q of topicQuestions) {
    if (selfAssessments[q.id]) {
      questionRatings[q.id] = selfAssessments[q.id]
    }
  }

  const evidenceParts: string[] = []
  topicQuestions.forEach((q, i) => {
    if (answers[q.id]) {
      evidenceParts.push(`Q${i + 1}: ${answers[q.id]}`)
    }
  })

  return {
    version: 2,
    sections: {
      completeness: {
        question_ratings: questionRatings,
        evidence: evidenceParts.join('\n\n') || '',
      },
      theological_depth: { rating: '', evidence: '' },
      scripture: { rating: '', evidence: '' },
      personal_reflection: { rating: '', evidence: '' },
      sources: { rating: '', evidence: '' },
      grammar: { rating: '', evidence: '' },
    },
  }
}

export const SELF_ASSESSMENT_TOPICS: Record<string, SelfAssessmentTopic> = {

  christ_centred: {
    topic: 'christ_centred',
    title: 'Christ-Centred Life and Ministry',
    questions: [
      { id: 'cc_1', question: 'What is the biblical basis for the centrality of Christ in Christian worship? Why do we give preference to Christ-centred rather than Father-centred or Spirit-centred worship?' },
      { id: 'cc_2', question: 'In what ways does the all-sufficiency of Jesus impact your life and ministry? How might you teach this to help others experience the all-sufficiency of Jesus for themselves?' },
      { id: 'cc_3', question: 'How do the elements of the Fourfold Gospel have a practical impact on the life and ministry of a Christian worker? How can we restore the life-changing impact of these historic tenets of the Alliance tradition in our ministries today?' },
      { id: 'cc_4', question: 'What might it look like for a Christ-centred believer to have an active and intentional discipleship to Jesus, including the making of other disciples? How does the life and ministry of Jesus as revealed in the Gospels inform the way you centre your own life around Jesus as his disciple and help others to do the same?' },
      { id: 'cc_5', question: "Why is hearing the voice of Jesus essential to living a Christ-centred life? How would you disciple someone to hear Jesus' voice? What are the ways in which you would coach someone to listen for it?" },
    ],
    rubricItems: ['Completeness', 'Theological Depth and Precision', 'Appropriate Use of Scripture', 'Thoughtful Personal Reflection', 'Sufficiency of Sources and Citations', 'Grammar and Formatting'],
  },

  spirit_empowered: {
    topic: 'spirit_empowered',
    title: 'Spirit-Empowered Life and Ministry',
    questions: [
      { id: 'se_1', question: 'Part of the Fourfold Gospel is the proclamation that Jesus Christ is our Sanctifier. Explain the dynamic link between being Spirit-empowered and the sanctifying work of Christ. Why do we believe this, why does it matter, and what are the implications — for you personally? For the church? In a post-Christian Canada?' },
      { id: 'se_2', question: 'What does it mean to be filled with the Holy Spirit? What would be evidences that someone is Spirit-filled? How does one seek and experience the filling of the Holy Spirit?' },
      { id: 'se_3', question: 'What kinds of spiritual practices might someone utilize to invite a deeper work of the Spirit? How have these helped you personally? How might you disciple others to cultivate greater Spirit-empowerment?' },
      { id: 'se_4', question: 'Define the term cessationism and explain why the Alliance rejects the doctrine of cessationism.' },
    ],
    rubricItems: ['Completeness', 'Theological Depth and Precision', 'Appropriate Use of Scripture', 'Thoughtful Personal Reflection', 'Sufficiency of Sources and Citations', 'Grammar and Formatting'],
  },

  mission_focused: {
    topic: 'mission_focused',
    title: 'Mission-Focused Life and Ministry',
    questions: [
      { id: 'mf_1', question: 'Why is Mission important today? How does the fate of humanity motivate the Church to be engaged in mission?' },
      { id: 'mf_2', question: 'How would you articulate the Mission of God and what scriptures would you use to challenge all believers to participate, regardless of their vocation or where they live?' },
      { id: 'mf_3', question: 'Identify some key barriers of perception people have about believers being on mission. How would you address these?' },
      { id: 'mf_4', question: 'Describe how your life currently is aligned with the mission of God and how you are intentionally seeking to live out a missionary mindset in your community (outside the walls of the church and mission-specific programming). Reflect on your practice of prayer, time and energy, personal strategy, and financial habits. Make sure you reflect theologically on the mission of God.' },
      { id: 'mf_5', question: "How is mission motivated by the return of Christ? What role did the return of Christ play in the formation of the Alliance's doctrine of mission, and what role does/should it play today?" },
    ],
    rubricItems: ['Completeness', 'Theological Depth and Precision', 'Appropriate Use of Scripture', 'Thoughtful Personal Reflection', 'Sufficiency of Sources and Citations', 'Grammar and Formatting'],
  },

  scripture: {
    topic: 'scripture',
    title: 'The Scriptures',
    questions: [
      { id: 'sc_1', question: 'The Scriptures are the Word of God and are authoritative and foundational for all of life and ministry practice. Why do we believe this, why does it matter, and what are the implications — for you personally? For the church? In a post-Christian Canada?' },
      { id: 'sc_2', question: 'How did we get the Bible as we have it today? What role did the early church councils play in the development of a Christian understanding of the canonicity of Scripture? How does this support the validity of the scriptural claims?' },
      { id: 'sc_3', question: 'What is the basis for claiming the Bible as the authority for our lives?' },
      { id: 'sc_4', question: 'What are the range and limits of the terms: inspiration, inerrancy and infallibility? Why are these doctrines important in a post-modern culture where truth is often considered relative?' },
    ],
    rubricItems: ['Completeness', 'Theological Depth and Precision', 'Appropriate Use of Scripture', 'Thoughtful Personal Reflection', 'Sufficiency of Sources and Citations', 'Grammar and Formatting'],
  },

  divine_healing: {
    topic: 'divine_healing',
    title: 'Divine Healing',
    questions: [
      { id: 'dh_1', question: 'What do the Scriptures teach about the availability of divine healing for today? To whom and to what does it apply? What might it look like in practice?' },
      { id: 'dh_2', question: 'How might we wisely steward this gift of grace with those we encounter?' },
      { id: 'dh_3', question: 'What do we mean when we say that Christ is our Healer? Describe the relationship between the provision for healing and the atonement.' },
      { id: 'dh_4', question: 'How would you counsel someone who has been prayed for and yet not received healing? How do you integrate a theology of suffering with a theology of healing?' },
    ],
    rubricItems: ['Completeness', 'Theological Depth and Precision', 'Appropriate Use of Scripture', 'Thoughtful Personal Reflection', 'Sufficiency of Sources and Citations', 'Grammar and Formatting'],
  },

}
