// utils/interviewQuestions.ts
// CMD Ordination Interview Questions — codified from the May 2025 interview-questions.pdf.
// Used by the council live interview console for question display, highlight selection,
// and section-based scoring.

export interface InterviewQuestion {
  id: string
  text: string
}

export interface InterviewSubSection {
  id: string
  title: string
  questions: InterviewQuestion[]
}

export interface InterviewSection {
  id: string
  title: string
  timeMinutes: number
  objective: string
  primaryQuestions: InterviewQuestion[]
  supplementalQuestions: InterviewQuestion[]
  subSections?: InterviewSubSection[]
}

export const INTERVIEW_SECTIONS: InterviewSection[] = [
  {
    id: 'personal_history',
    title: 'Personal History',
    timeMinutes: 15,
    objective: 'The ordinand understands the story of God at work in their life and how that connects to their ordination journey.',
    primaryQuestions: [
      { id: 'ph_p1', text: 'What spiritual rhythms, practices, and connections keep you growing and abiding in Christ?' },
      { id: 'ph_p2', text: 'Tell us about any changes in your thoughts, beliefs, or practices since your licensing interview.' },
      { id: 'ph_p3', text: 'How do you intentionally pursue sexual purity and resist the temptations of pornography or any other form of sexual brokenness?' },
      { id: 'ph_p4', text: 'Understanding that ministry is often difficult, how do you cope with stress/pain/disappointment? What are some of the unhealthy coping strategies that you are tempted by, and what are some healthy alternatives that you are pursuing?' },
      { id: 'ph_p5', text: 'Is there anything about you that, if discovered, would disqualify you from your ministry position or bring dishonour to Christ, the Church, or The Alliance Canada?' },
    ],
    supplementalQuestions: [
      { id: 'ph_s1', text: 'What has been the most unexpected thing you have learned about vocational ministry since your licensing interview?' },
      { id: 'ph_s2', text: 'What is it about your lifestyle and walk with Christ that you think people in your ministry want to emulate?' },
      { id: 'ph_s3', text: 'What has been holding you back from becoming the pastor/worker that you feel Jesus has called you to be?' },
      { id: 'ph_s4', text: 'How has God gifted you for ministry and how do you live out your giftedness in your current ministry role?' },
      { id: 'ph_s5', text: 'How have the demands and rhythms of ministry life affected your family? What are the things you do to protect them amid the pressures and demands of your calling?' },
    ],
  },
  {
    id: 'holy_scripture',
    title: 'Holy Scripture',
    timeMinutes: 10,
    objective: 'The ordinand expresses and explains a thorough understanding of Holy Scripture and how they engage with it.',
    primaryQuestions: [
      { id: 'hs_p1', text: 'Describe the grand narrative of Scripture. What about this grand narrative most captures your heart and shows up regularly in your discipling, preaching, and teaching?' },
      { id: 'hs_p2', text: 'What is your understanding of the importance of Holy Scripture, how it was created/compiled, and its authority for life and ministry?' },
      { id: 'hs_p3', text: 'Explain the statement: "The Old and New Testaments, inerrant as originally given, were verbally inspired by God and are a complete revelation of His will for the salvation of people." What limitations are there to the term inerrancy?' },
      { id: 'hs_p4', text: 'How does God use the Holy Scripture to speak to us today? How does he use it to speak to you?' },
      { id: 'hs_p5', text: "Are there additional forms of revelation by which we can hear God's voice? Describe the relationship that these forms of revelation have with Holy Scripture." },
    ],
    supplementalQuestions: [
      { id: 'hs_s1', text: 'Define "revelation." Provide examples.' },
      { id: 'hs_s2', text: 'What do you understand the relationship between revelation and divine guidance to be?' },
      { id: 'hs_s3', text: 'How do you distinguish between revelation, inspiration, and illumination?' },
      { id: 'hs_s4', text: 'What is the difference between the authority of Holy Scripture, and an authoritative interpretation of Holy Scripture? Give an example of when confusion between those two concepts has been an issue and how you have handled it as a pastor.' },
      { id: 'hs_s5', text: 'In light of your understanding of the relationship between inspiration and translations, how would you advise your congregation regarding the value and use of translations and paraphrases? What translation do you use and why?' },
      { id: 'hs_s6', text: 'Define progressive revelation.' },
    ],
  },
  {
    id: 'trinity',
    title: 'Trinity and the Persons of God',
    timeMinutes: 20,
    objective: 'The ordinand expresses a thorough understanding of the doctrine of the Trinity, and how its development came to be; as well as a thorough understanding of the persons of the Trinity and how they relate to each other and to us.',
    primaryQuestions: [
      { id: 'tr_p1', text: 'Why do we confess that there is one God?' },
      { id: 'tr_p2', text: 'What is the doctrine of the Trinity and why does it matter in the life of the believer?' },
      { id: 'tr_p3', text: 'What is meant by the pre-existence of the Son? Is He eternal? Does He have a beginning or an end?' },
      { id: 'tr_p4', text: 'Where do we find examples that show Jesus is conscious of His divinity?' },
      { id: 'tr_p5', text: 'Why does the Church assert that Christ has both a divine nature and a human nature?' },
      { id: 'tr_p6', text: 'What are some common Christological heresies that you see active in the Church today? How would you seek to correct them?' },
      { id: 'tr_p7', text: "How do Jesus' references to the Holy Spirit indicate that the Spirit is a person?" },
    ],
    supplementalQuestions: [],
    subSections: [
      {
        id: 'trinity_sub',
        title: 'The Trinity',
        questions: [
          { id: 'tr_st1', text: 'Are there any attributes truly unique to each person of the Trinity?' },
          { id: 'tr_st2', text: 'How has the doctrine of the Trinity shaped your mission and ministry?' },
          { id: 'tr_st3', text: 'How have you grown in your relationship with each person of the Trinity?' },
          { id: 'tr_st4', text: 'How do the three persons relate to creation? revelation? salvation? the church?' },
          { id: 'tr_st5', text: 'Which contemporary theological positions are raising serious questions for the traditional doctrine of the Trinity?' },
          { id: 'tr_st6', text: 'Which contemporary groups evidence deviation from the traditional doctrine of the Trinity?' },
        ],
      },
      {
        id: 'father_sub',
        title: 'Person of God the Father',
        questions: [
          { id: 'tr_sf1', text: 'What is the basis for the Christian concept of God as person?' },
          { id: 'tr_sf2', text: 'Give some New Testament definitions of God. (e.g., 1 John 1:5, 4:8; Hebrews 12:29)' },
          { id: 'tr_sf3', text: 'Explain the terms theism, deism, atheism, monotheism, polytheism, pantheism, and agnosticism.' },
          { id: 'tr_sf4', text: 'Trace the "development" of Christology through the major ecumenical councils. What was decided at each council?' },
          { id: 'tr_sf5', text: 'Describe the relationship between the Father and the Son.' },
          { id: 'tr_sf6', text: 'What are some of the evidence and arguments for the existence of God?' },
          { id: 'tr_sf7', text: 'What is your belief regarding evolution?' },
          { id: 'tr_sf8', text: 'How do you reconcile the goodness of God and the presence of evil?' },
        ],
      },
      {
        id: 'son_sub',
        title: 'Person of God the Son',
        questions: [
          { id: 'tr_ss1', text: 'State some of the names referring to Christ and explain their meanings (such as Messiah, Lord Jesus, etc.)' },
          { id: 'tr_ss2', text: 'Why do you believe Christ is God?' },
          { id: 'tr_ss3', text: 'How is the person of Christ dealt with in the Old Testament? What are some Old Testament prophecies pertaining to Him?' },
          { id: 'tr_ss4', text: 'Where does Scripture show us that Christ was truly human?' },
          { id: 'tr_ss5', text: 'How do you know that Christ is alive today?' },
          { id: 'tr_ss6', text: 'What does the ascended and mediating Christ mean to you pastorally, and personally?' },
          { id: 'tr_ss7', text: 'Was the virgin birth necessary to the atoning work of Christ? How so?' },
        ],
      },
      {
        id: 'spirit_sub',
        title: 'Person of God the Holy Spirit',
        questions: [
          { id: 'tr_sp1', text: 'What ministries, possible only for a person, are attributed to Him?' },
          { id: 'tr_sp2', text: 'How does the Old Testament assert His personality?' },
          { id: 'tr_sp3', text: 'How is He affected by the same things and in the same manner as other persons?' },
          { id: 'tr_sp4', text: 'Why is belief in the personality of the Holy Spirit essential to orthodoxy?' },
          { id: 'tr_sp5', text: 'How are these gifts given to believers today? How does a person find their spiritual gift?' },
          { id: 'tr_sp6', text: 'In what measure are the gifts that were exercised by the Apostles manifest today? Discuss the apostolic gift and office.' },
          { id: 'tr_sp7', text: 'Which biblical passages speak of the fruit of the Holy Spirit? Name them.' },
          { id: 'tr_sp8', text: 'What was the role of the Holy Spirit in the Old Testament?' },
          { id: 'tr_sp9', text: 'What is the role of the Holy Spirit regarding conviction of sin? Comment on the place of conscience as it relates to conviction and guilt.' },
          { id: 'tr_sp10', text: 'How do you test the spirits to determine if they are from God?' },
        ],
      },
    ],
  },
  {
    id: 'alliance_theology',
    title: 'Alliance Theology, Missions, Polity, and Ethos',
    timeMinutes: 15,
    objective: 'The ordinand expresses a thorough understanding of Christian and Missionary Alliance (C&MA or "Alliance") theology, missiology, polity, and practice.',
    primaryQuestions: [
      { id: 'at_p1', text: 'Describe the Fourfold gospel as A.B. Simpson articulated it.' },
      { id: 'at_p2', text: 'The Alliance emphasizes the deeper life and mission. What does this mean? How have you experienced this integration in your own life and ministry?' },
      { id: 'at_p3', text: 'Describe the structure of authority in the Alliance (locally, regionally, nationally). What is your attitude toward submitting to this authority?' },
      { id: 'at_p4', text: 'Have you read and are you in full agreement with the current Statement of Faith? Which part have you most struggled with and how do you resolve this tension?' },
      { id: 'at_p5', text: 'The Alliance is a family of churches made up of believers from a diverse background of traditions and beliefs, and our doctrines afford sufficient latitude to believe differently on several issues that people hold as sacred — where have you seen tension in your ministry around these matters and how have you handled it?' },
    ],
    supplementalQuestions: [
      { id: 'at_s1', text: 'In what sense does the Christian calling involve a missionary obligation for every believer and every church?' },
      { id: 'at_s2', text: 'How does Scripture recognize and authorize constituted authority in the church?' },
      { id: 'at_s3', text: 'How are you leading your specific ministry to focus on Alliance missions?' },
    ],
  },
  {
    id: 'salvation',
    title: 'Fourfold Gospel: Christ our Salvation',
    timeMinutes: 10,
    objective: 'The ordinand expresses a thorough understanding of the doctrine of salvation through the lens of the atonement, justification, and regeneration.',
    primaryQuestions: [
      { id: 'sv_p1', text: 'How does Jesus redeem sinful humanity?' },
      { id: 'sv_p2', text: "What is the extent of Christ's redemption?" },
      { id: 'sv_p3', text: 'Imagine that your friend is a sincere seeker after God. Using the Scriptures, lead your friend into an adequate knowledge of the plan of salvation, covering: why they need a Saviour; what Christ did for them through His life, death, resurrection, and ascension; how they can be changed by the life and power of Christ\'s Spirit; how they may receive the gift of salvation.' },
      { id: 'sv_p4', text: 'Using Scripture, define the terms atonement, justification, and regeneration.' },
      { id: 'sv_p5', text: "How do Romans 3:21-25, Romans 5:8, and 2 Corinthians 5:21 shape your understanding of Christ's atonement?" },
      { id: 'sv_p6', text: 'What is the nature of change brought about by justification?' },
      { id: 'sv_p7', text: 'What is regeneration? Where does Jesus speak about it? What does he say?' },
      { id: 'sv_p8', text: 'Describe the relationship between justification and regeneration.' },
      { id: 'sv_p9', text: 'In what ways does The Alliance understand the doctrine of salvation to be Christ-centred?' },
    ],
    supplementalQuestions: [],
    subSections: [
      {
        id: 'atonement_sub',
        title: 'Atonement',
        questions: [
          { id: 'sv_sa1', text: "What does the atonement teach us about God's love? mercy? justice? holiness?" },
          { id: 'sv_sa2', text: 'Where did the plan of the atonement originate?' },
          { id: 'sv_sa3', text: 'Why is the atonement necessary as far as God is concerned?' },
          { id: 'sv_sa4', text: 'What makes the atonement necessary as far as humanity is concerned?' },
          { id: 'sv_sa5', text: 'What qualifies Christ to be the offering for sin?' },
          { id: 'sv_sa6', text: 'Could anyone other than Christ have made an acceptable offering?' },
          { id: 'sv_sa7', text: 'Can the atonement be effective in human lives in any way where Christ is unknown?' },
          { id: 'sv_sa8', text: 'What are the Atonement Theories? What one or two would you say is/are primary? What are limitations to your primary theory that the other theories fill out?' },
        ],
      },
      {
        id: 'justification_sub',
        title: 'Justification',
        questions: [
          { id: 'sv_sj1', text: "What is the basis of God's justification of sinners?" },
          { id: 'sv_sj2', text: 'How did the Reformers help shape the Protestant Church\'s understanding of "justification by faith"?' },
        ],
      },
      {
        id: 'regeneration_sub',
        title: 'Regeneration',
        questions: [
          { id: 'sv_sr1', text: 'What attitudes must be present in the individual before regeneration can take place?' },
          { id: 'sv_sr2', text: 'What is the nature of the change brought about by regeneration?' },
          { id: 'sv_sr3', text: 'What is the continuing purpose of regeneration in a Christian?' },
          { id: 'sv_sr4', text: 'How were those in the Old Testament saved?' },
        ],
      },
    ],
  },
  {
    id: 'sanctification',
    title: 'Fourfold Gospel: Christ our Sanctification',
    timeMinutes: 10,
    objective: 'The ordinand expresses a thorough understanding of the doctrine of sanctification.',
    primaryQuestions: [
      { id: 'sn_p1', text: 'Define sanctification.' },
      { id: 'sn_p2', text: 'In what ways does The Alliance understand the doctrine of sanctification to be Christ-centred?' },
      { id: 'sn_p3', text: 'When does sanctification start? When does it end?' },
      { id: 'sn_p4', text: 'We believe the filling of the Spirit is a distinct event and progressive experience that takes place subsequent to salvation. Tell us how you have experienced this in your own life and how biblically you would lead someone to experience the filling of the Spirit as both a distinct moment and a progressive experience.' },
      { id: 'sn_p5', text: "How would you help someone experience greater spiritual renewal if they are 'thirsty'?" },
      { id: 'sn_p6', text: 'What is your understanding of the filling of the Holy Spirit?' },
      { id: 'sn_p7', text: 'What does Holy Spirit empowerment look like in the life of the believer and what are possible indicators that someone is truly walking in Spirit empowerment?' },
    ],
    supplementalQuestions: [
      { id: 'sn_s1', text: 'Comment on the filling of and baptism in the Holy Spirit.' },
      { id: 'sn_s2', text: "In what way is the believer 'dead to sin and alive to God'?" },
      { id: 'sn_s3', text: "What is meant by the phrase 'the indwelling Christ'?" },
      { id: 'sn_s4', text: "What does it mean to be 'wholly sanctified'?" },
    ],
  },
  {
    id: 'healing',
    title: 'Fourfold Gospel: Christ our Healer',
    timeMinutes: 10,
    objective: 'The ordinand expresses a thorough understanding of the doctrine of healing and how this doctrine integrates into the life of the church.',
    primaryQuestions: [
      { id: 'hl_p1', text: 'What is your position on divine healing? What does the Bible teach about it?' },
      { id: 'hl_p2', text: 'What is meant by the statement, "healing in the atonement"?' },
      { id: 'hl_p3', text: 'In what ways does The Alliance understand the doctrine of healing to be Christ-centred?' },
      { id: 'hl_p4', text: 'Describe a time when you have had the opportunity to pray with someone for healing.' },
      { id: 'hl_p5', text: 'What do you do when it appears that God has chosen not to heal? Share a pastoral experience of this, and what that conversation and relationship with that person has looked like going forward.' },
      { id: 'hl_p6', text: 'What is your theology of suffering? How might this play out in the life of the church?' },
      { id: 'hl_p7', text: 'How might we practically equip someone to pray for healing?' },
      { id: 'hl_p8', text: 'What can the church and its members do to facilitate the healing ministry of Jesus?' },
    ],
    supplementalQuestions: [
      { id: 'hl_s1', text: 'What do you believe concerning the relationship of spiritual gifts to the ministry of healing?' },
      { id: 'hl_s2', text: "In the anointing and prayer ministry for the sick by the elders, what is meant by 'the prayer of faith'?" },
      { id: 'hl_s3', text: 'What is the difference between divine healing, the operation of the gift of healing, medical healing, and faith healing?' },
    ],
  },
  {
    id: 'coming_king',
    title: 'Fourfold Gospel: Christ our Coming King',
    timeMinutes: 10,
    objective: 'The ordinand expresses a thorough understanding of their eschatological framework including resurrection and the lostness of humanity.',
    primaryQuestions: [
      { id: 'ck_p1', text: "Discuss your present convictions about the nature of, and circumstances surrounding, Christ's return to earth." },
      { id: 'ck_p2', text: "What views has the Church historically taken on Christ's return?" },
      { id: 'ck_p3', text: 'Comment on these sentences in the Statement of Faith: "The second coming of the Lord Jesus Christ is imminent and will be personal and visible. As the believer\'s blessed hope, this vital truth is an incentive for holy living and sacrificial service toward the completion of Christ\'s commission."' },
      { id: 'ck_p4', text: 'In what ways does The Alliance understand the doctrine of eschatology to be Christ-centred?' },
      { id: 'ck_p5', text: 'Describe your understanding of the nature of resurrection.' },
      { id: 'ck_p6', text: 'What does the Bible say about heaven? How would you equate or differentiate "heaven" from "the kingdom of God"?' },
      { id: 'ck_p7', text: 'What is the future destiny of those who die apart from faith in Christ? Is this different from those who died without ever hearing the Gospel?' },
      { id: 'ck_p8', text: 'What does the Bible say about Hell? Comment on the phrase in the Statement of Faith that says, "existence forever in conscious torment"?' },
      { id: 'ck_p9', text: "How does Scripture describe the new creation and the role of God's people in it?" },
    ],
    supplementalQuestions: [],
    subSections: [
      {
        id: 'return_sub',
        title: 'Return of The Lord',
        questions: [
          { id: 'ck_sr1', text: 'On what basis do you believe that the Lord Jesus Christ will personally and physically return to the earth?' },
          { id: 'ck_sr2', text: 'How will the second coming of Christ differ from the first coming?' },
          { id: 'ck_sr3', text: 'What are the differences among the doctrines of premillennialism, postmillennialism, and amillennialism? What does hope look like for the Christian considering your personal position on eschatology?' },
          { id: 'ck_sr4', text: 'How does the Bible describe the Great Tribulation?' },
          { id: 'ck_sr5', text: "Comment on God's covenants with Israel as they relate to eschatology." },
          { id: 'ck_sr6', text: 'What is the future of Satan and his demons?' },
        ],
      },
      {
        id: 'resurrection_sub',
        title: 'Resurrection',
        questions: [
          { id: 'ck_srs1', text: 'What does the term "resurrection" mean?' },
          { id: 'ck_srs2', text: 'Is it possible for a resurrection to occur without a physical body?' },
          { id: 'ck_srs3', text: 'Define the nature of the resurrection of Jesus Christ.' },
          { id: 'ck_srs4', text: 'How important is the doctrine of the resurrection to the Christian faith?' },
          { id: 'ck_srs5', text: 'What is the relationship between the resurrection of Jesus Christ and future resurrection?' },
          { id: 'ck_srs6', text: 'How does resurrection differ for believers and unbelievers?' },
        ],
      },
      {
        id: 'lostness_sub',
        title: 'The Lostness of Humanity',
        questions: [
          { id: 'ck_sl1', text: 'Is there any possibility to be saved after one has died?' },
          { id: 'ck_sl2', text: 'To what degree does a Christian bear personal responsibility for sharing the Good News?' },
          { id: 'ck_sl3', text: 'Define universalism, soul sleep, and annihilationism.' },
        ],
      },
    ],
  },
  {
    id: 'the_church',
    title: 'The Church',
    timeMinutes: 10,
    objective: 'The ordinand expresses a thorough understanding of the Church and its mission and purpose.',
    primaryQuestions: [
      { id: 'ch_p1', text: 'What is the Church?' },
      { id: 'ch_p2', text: "What role does the Church play in Jesus' redemption of the world?" },
      { id: 'ch_p3', text: 'What does the Church do?' },
      { id: 'ch_p4', text: 'What analogies for the Church can be found in the New Testament?' },
      { id: 'ch_p5', text: 'What is a disciple?' },
      { id: 'ch_p6', text: 'Describe your strategy and current practice for reproducing disciples within your ministry.' },
    ],
    supplementalQuestions: [
      { id: 'ch_s1', text: 'What is the function of the pastor in relation to body life?' },
      { id: 'ch_s2', text: 'What are the qualifications and functions of elders?' },
      { id: 'ch_s3', text: 'What is the significance of water baptism?' },
      { id: 'ch_s4', text: 'Outline the positive and negative aspects of episcopal, congregational, and presbyterian styles of governance.' },
      { id: 'ch_s5', text: 'What is a biblical procedure for conflict resolution?' },
      { id: 'ch_s6', text: 'State the characteristics of the servant of the Lord as they were given to Timothy.' },
      { id: 'ch_s7', text: 'What is the relationship between the pastor and the elders?' },
    ],
  },
  {
    id: 'anthropology',
    title: 'Anthropology',
    timeMinutes: 10,
    objective: 'The ordinand expresses a thorough understanding of what it means to be human according to Scripture.',
    primaryQuestions: [
      { id: 'an_p1', text: 'In secular culture, a person is encouraged to discover their identity by looking within and then to conform their outward behaviour with their inward reality. How does a Christian understanding of identity differ?' },
      { id: 'an_p2', text: 'What does Scripture teach about the significance of being embodied beings?' },
      { id: 'an_p3', text: "What is the significance of being made in God's Image as male and female?" },
      { id: 'an_p4', text: "What are some implications of both genders being created in God's image as it relates to issues of marriage, sex, and gender?" },
      { id: 'an_p5', text: "As it relates to our society's culture, what are some of the pressing issues you deal with at your church or in your ministry? How does Scripture inform your response to at least one of these issues?" },
    ],
    supplementalQuestions: [
      { id: 'an_s1', text: 'Discuss how you would counsel a couple/person inquiring about divorce.' },
      { id: 'an_s2', text: 'How would you counsel someone in your church who is struggling with their gender identity?' },
    ],
  },
]

/** Total number of scorable sections */
export const TOTAL_INTERVIEW_SECTIONS = INTERVIEW_SECTIONS.length

/** The qualitative rubric scale used for interview scoring */
export const INTERVIEW_RATINGS = ['insufficient', 'adequate', 'good', 'excellent', 'exceptional'] as const
export type InterviewRating = typeof INTERVIEW_RATINGS[number]

export const INTERVIEW_RATING_LABELS: Record<InterviewRating, string> = {
  insufficient: 'Insufficient',
  adequate: 'Adequate',
  good: 'Good',
  excellent: 'Excellent',
  exceptional: 'Exceptional',
}

/** Numeric value for averaging (1-5) */
export const INTERVIEW_RATING_VALUE: Record<InterviewRating, number> = {
  insufficient: 1,
  adequate: 2,
  good: 3,
  excellent: 4,
  exceptional: 5,
}

/** Convert a numeric average back to the nearest qualitative rating */
export function averageToRating(avg: number): InterviewRating {
  if (avg < 1.5) return 'insufficient'
  if (avg < 2.5) return 'adequate'
  if (avg < 3.5) return 'good'
  if (avg < 4.5) return 'excellent'
  return 'exceptional'
}

/** Get all questions (primary + supplemental + sub-section) for a section */
export function getAllQuestions(section: InterviewSection): InterviewQuestion[] {
  const all = [...section.primaryQuestions, ...section.supplementalQuestions]
  if (section.subSections) {
    for (const sub of section.subSections) {
      all.push(...sub.questions)
    }
  }
  return all
}
