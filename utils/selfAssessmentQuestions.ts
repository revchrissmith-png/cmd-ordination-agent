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
    rubricItems: ['Completeness','Theological Depth and Precision','Appropriate Use of Scripture','Thoughtful Personal Reflection','Sufficiency of Sources and Citations','Grammar and Formatting'],
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
    rubricItems: ['Completeness','Theological Depth and Precision','Appropriate Use of Scripture','Thoughtful Personal Reflection','Sufficiency of Sources and Citations','Grammar and Formatting'],
  },

  mission_focused: {
    topic: 'mission_focused',
    title: 'Mission-Focused Life and Ministry',
    questions: [
      { id: 'mf_1', question: 'Why is Mission important today? How does the fate of humanity motivate the Church to be engaged in mission?' },
      { id: 'mf_2', question: 'How would you articulate the Mission of God and what scriptures would you use to challenge all believers to participate, regardless of their vocation or where they live?' },
      { id: 'mf_3', question: 'Identify some key barriers of perception people have about believers being on mission. How would you address these?' },
      { id: 'mf_4', question: 'Describe how your life currently is aligned with the mission of God and how you are intentionally seeking to live out a missionary mindset in your community (outside the walls of the church and mission-specific programming). Reflect on your practice of prayer, time & energy, personal strategy, and financial habits. Make sure you reflect theologically on the mission of God.' },
      { id: 'mf_5', question: "How is mission motivated by the return of Christ? What role did the return of Christ play in the formation of the Alliance's doctrine of mission, and what role does/should it play today?" },
    ],
    rubricItems: ['Completeness','Theological Depth and Precision','Appropriate Use of Scripture','Thoughtful Personal Reflection','Sufficiency of Sources and Citations','Grammar and Formatting'],
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
    rubricItems: ['Completeness','Theological Depth and Precision','Appropriate Use of Scripture','Thoughtful Personal Reflection','Sufficiency of Sources and Citations','Grammar and Formatting'],
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
    rubricItems: ['Completeness','Theological Depth and Precision','Appropriate Use of Scripture','Thoughtful Personal Reflection','Sufficiency of Sources and Citations','Grammar and Formatting'],
  },

}
