// app/handbook/content.ts
// All section content for the CMD Ordination Handbook wiki

export type ContentBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning'; text: string }
  | { type: 'outcomes'; items: Array<{ label: string; desc: string; color: string }> }

export type SubSection = {
  id: string
  heading: string
  blocks: ContentBlock[]
}

export type WikiSection = {
  slug: string
  title: string
  icon: string
  tagline: string
  audience: string[]   // 'all' | 'ordinand' | 'mentor' | 'council' | 'church'
  subsections: SubSection[]
}

export const WIKI_SECTIONS: WikiSection[] = [
  {
    slug: 'introduction',
    title: 'Introduction',
    icon: '🏛️',
    tagline: 'Purpose, values, and alignment with The Alliance Canada policy',
    audience: ['all'],
    subsections: [
      {
        id: '1-1',
        heading: '1.1 Welcome from the District',
        blocks: [
          { type: 'p', text: 'Welcome to the Ordination Handbook for the Canadian Midwest District (CMD) of The Alliance Canada (TAC). This resource is designed to guide ordinands, mentors, council members, and church leaders through the three-year ordination process. Whether you are a pastor-in-training, a mentor walking alongside a developing leader, or a council member responsible for guiding and assessing candidates, this handbook is your centralized resource for expectations, timelines, assignments, and theological posture.' },
          { type: 'p', text: 'The CMD is committed to the development of Christ-centred, Spirit-empowered, and Mission-focused leaders. We believe ordination is not merely an administrative hurdle but a deeply formative journey. This handbook reflects our desire to see leaders not only meet the necessary requirements but flourish in their personal and pastoral calling.' },
        ]
      },
      {
        id: '1-2',
        heading: '1.2 Purpose and Scope of Ordination',
        blocks: [
          { type: 'p', text: 'Ordination in TAC is the solemn act whereby the Church corporately affirms and sets apart those called and equipped by God for vocational ministry. Through prayer and the laying on of hands, the church recognizes Christ\'s calling on an individual\'s life and formally entrusts them with the responsibilities of gospel ministry.' },
          { type: 'p', text: 'This process includes:' },
          { type: 'ul', items: [
            'Theological and ministry formation through readings, written work, and preaching',
            'Regular mentoring and reflection',
            'Assessment by the Ordaining Council',
            'A formal oral examination',
            'Commissioning at an ordination service',
          ]},
        ]
      },
      {
        id: '1-3',
        heading: '1.3 How to Use This Handbook',
        blocks: [
          { type: 'p', text: 'This handbook exists to:' },
          { type: 'ul', items: [
            'Clarify the full process of ordination in the CMD',
            'Outline the roles and responsibilities of all participants',
            'Provide guidelines for each component (papers, sermons, interviews)',
            'Offer templates, rubrics, and evaluation tools',
          ]},
          { type: 'p', text: 'Each section is designed to be self-contained. Use the sidebar navigation to jump directly to the information most relevant to your role.' },
          { type: 'callout', variant: 'tip', text: 'New to the process? Start with Section 2 (Key Stakeholders) to understand how the process works and where you fit, then move to the section most relevant to your role.' },
        ]
      },
      {
        id: '1-4',
        heading: '1.4 Guiding Values: Christ-Centred, Spirit-Empowered, Mission-Focused',
        blocks: [
          { type: 'p', text: 'TAC holds to a distinct theological vision known as the Fourfold Gospel:' },
          { type: 'ul', items: [
            'Jesus Christ is our Saviour',
            'Jesus Christ is our Sanctifier',
            'Jesus Christ is our Healer',
            'Jesus Christ is our Coming King',
          ]},
          { type: 'p', text: 'These truths shape our understanding of leadership and ministry. The CMD ordination process is designed to grow leaders who embody this vision — deeply dependent on Christ, open to the empowering work of the Holy Spirit, and passionately committed to God\'s mission.' },
        ]
      },
      {
        id: '1-5',
        heading: '1.5 Updates and Availability',
        blocks: [
          { type: 'p', text: 'This handbook is reviewed and revised periodically. The most up-to-date version is always available in the CMD Ordination Portal at ordination.canadianmidwest.ca. Ordinands, mentors, and council members may also access all resources directly through their Portal dashboard.' },
          { type: 'callout', variant: 'info', text: 'Current version: 2.0 · March 2026 · Next scheduled review: March 2027' },
        ]
      },
      {
        id: '1-6',
        heading: '1.6 Alignment with The Alliance Canada Ordination Policy',
        blocks: [
          { type: 'p', text: 'This district-level handbook is governed by and aligned with the national Ordination Policy of The Alliance Canada (November 2023). Key points include:' },
          { type: 'ul', items: [
            'A three-year timeline for ordination requirements',
            'Oral examination eligibility after a minimum of two years in ministry',
            'Oversight of the process by the District Superintendent or their designate',
            'Final ordination authority resting with the licensing body, in dialogue with the local church',
          ]},
          { type: 'p', text: 'This handbook reflects national standards contextualized for the CMD\'s unique support structures, cohort model, and mentorship emphasis.' },
        ]
      },
    ]
  },
  {
    slug: 'stakeholders',
    title: 'Key Stakeholders',
    icon: '👥',
    tagline: 'Roles and responsibilities of everyone involved in the ordination process',
    audience: ['all'],
    subsections: [
      {
        id: '2-1',
        heading: '2.1 The Ordinand',
        blocks: [
          { type: 'p', text: 'The ordinand is a portably licensed worker engaged in a three-year credentialing process that normally takes place during the early years of vocational ministry. Ordinands are sorted into spring or fall cohorts based on their anticipated interview season. They participate in quarterly cohort gatherings, submit ten book reports, four theological papers, and three sermons, and are mentored throughout.' },
          { type: 'p', text: 'Their responsibilities include:' },
          { type: 'ul', items: [
            'Attending all cohort gatherings and mentoring meetings',
            'Completing assignments in line with the cohort schedule',
            'Submitting monthly mentor reports',
            'Preparing for their final interview with the Ordaining Council',
          ]},
        ]
      },
      {
        id: '2-2',
        heading: '2.2 The Ordaining Council',
        blocks: [
          { type: 'p', text: 'The Ordaining Council is a DEXCOM-appointed body composed of seasoned, ordained pastors who serve two-year terms. The council is responsible for:' },
          { type: 'ul', items: [
            'Leading cohort gatherings and seminar discussions',
            'Reviewing and grading submitted assignments',
            'Coaching ordinands toward theological depth and pastoral maturity',
            'Conducting oral interviews and determining readiness for ordination',
          ]},
          { type: 'p', text: 'Council members are expected to:' },
          { type: 'ul', items: [
            'Commit approximately half a day per month to reviewing assignments',
            'Attend two in-person council meetings per year (May and October)',
            'Participate in or lead online cohort gatherings (September, November, February)',
            'Attend at least one in-person cohort gathering during their term',
          ]},
        ]
      },
      {
        id: '2-3',
        heading: '2.3 The Mentor',
        blocks: [
          { type: 'p', text: 'Each ordinand is matched with a mentor — an ordained pastor or experienced ministry worker who is not their direct supervisor. Mentors meet monthly with their ordinands to:' },
          { type: 'ul', items: [
            'Review assignment progress',
            'Discuss spiritual formation, ministry experience, and theological growth',
            'Reflect on the ordination journey using a guided reporting template',
          ]},
          { type: 'p', text: 'Mentors are expected to participate in two annual check-in contacts from the Ordaining Council and to provide formal evaluation feedback prior to the interview phase.' },
        ]
      },
      {
        id: '2-4',
        heading: '2.4 Lead Pastors and Church Boards',
        blocks: [
          { type: 'p', text: 'Where ordinands serve in a staff or leadership capacity, their supervising pastors and church boards are essential allies in the process. Their responsibilities include:' },
          { type: 'ul', items: [
            'Ensuring ordinands are given time and support for their assignments and cohort participation',
            'Budgeting for travel to the annual in-person cohort gathering',
            'Holding ordinands accountable to the expectations of the ordination process',
          ]},
          { type: 'callout', variant: 'warning', text: 'Because ordination is a licensing requirement in The Alliance Canada, failure to complete the process can affect an ordinand\'s employment eligibility. Supervising leaders are therefore expected to treat the ordination journey with both pastoral care and structural seriousness.' },
        ]
      },
      {
        id: '2-5',
        heading: '2.5 Collaboration and Communication',
        blocks: [
          { type: 'p', text: 'The strength of the ordination process lies in its relational accountability. Each stakeholder has a defined role, but effective communication between mentors, council members, and supervisors ensures that ordinands are well-supported. Regular updates, clear expectations, and shared commitment to the formation of leaders are the backbone of a successful ordination journey in the CMD.' },
        ]
      },
    ]
  },
  {
    slug: 'journey',
    title: "The Ordinand's Journey",
    icon: '🗺️',
    tagline: 'Cohorts, the Portal, Pardington, and the three-year arc of the process',
    audience: ['ordinand', 'all'],
    subsections: [
      {
        id: '3-1',
        heading: '3.1 Overview of the Three-Year Process',
        blocks: [
          { type: 'p', text: 'The CMD ordination process unfolds over a three-year timeline, beginning shortly after a pastor receives a portable license. While the schedule offers flexibility for local context and personal pace, ordinands are expected to complete all requirements before the end of their third year in ministry. Exceptions or extensions must be approved by the Chair of the Ordaining Council.' },
          { type: 'p', text: 'The general rhythm of the journey includes:' },
          { type: 'ul', items: [
            'Quarterly cohort gatherings (three virtual, one in-person annually)',
            'Regular mentor check-ins and monthly reporting',
            'Progressive completion of required book reports, theological papers, and sermon submissions',
            'Final preparation for and participation in an oral examination before the Ordaining Council',
          ]},
        ]
      },
      {
        id: '3-2',
        heading: '3.2 Cohorts and Calendar Structure',
        blocks: [
          { type: 'p', text: 'Upon entry into the ordination track, each ordinand is placed in a cohort corresponding to their anticipated final interview season — spring or fall. These cohorts provide peer learning, shared accountability, and group formation.' },
          { type: 'p', text: 'A typical year includes:' },
          { type: 'ul', items: [
            'September: Online cohort gathering',
            'November: Online cohort gathering',
            'February: Online cohort gathering',
            'June: In-person cohort gathering (location varies; costs covered by local church)',
          ]},
          { type: 'p', text: 'The CMD maintains a live cohort calendar in the Ordination Portal, updated annually. Ordinands can view all upcoming gatherings directly from their dashboard and from the Ordination Journey page.' },
          { type: 'callout', variant: 'warning', text: 'Attendance at all quarterly gatherings is expected. If an ordinand must miss a gathering due to illness, travel, or other unavoidable conflict, they must notify the Chair of the Ordaining Council in advance and complete any required catch-up work.' },
        ]
      },
      {
        id: '3-3',
        heading: '3.3 Submission of Assignments',
        blocks: [
          { type: 'p', text: 'All written assignments, sermons, and other required materials are submitted through the CMD Ordination Portal. Submissions are assigned to members of the Ordaining Council for evaluation. Ordinands receive login credentials and onboarding instructions upon entry into the process.' },
          { type: 'p', text: 'Council members provide written feedback using established rubrics. Ordinands are expected to review this feedback and adjust future work accordingly.' },
          { type: 'p', text: 'Key notes:' },
          { type: 'ul', items: [
            'Each submission is timestamped and linked to the appropriate requirement in the Portal',
            'Feedback is delivered through the Portal and can be viewed on each requirement\'s detail page',
            'If an assignment is deemed incomplete or unsatisfactory, the ordinand may be asked to revise and resubmit — revisions are intended to foster growth, not penalize failure',
            'Technical issues can be directed to the District Ministry Centre',
          ]},
        ]
      },
      {
        id: '3-4',
        heading: '3.4 The CMD Ordination Portal',
        blocks: [
          { type: 'p', text: 'The CMD Ordination Portal is the primary platform for all ordination-related activity. Ordinands access their personalized requirement checklist, submit written work, track their progress, and receive graded feedback — all in one place. Council members access their grading queue and submit evaluations through the same system.' },
          { type: 'p', text: 'Key features of the Portal include:' },
          { type: 'ul', items: [
            'Personalized dashboard showing progress across all 17 requirements',
            'File submission for book reports, papers, and sermons',
            'Built-in self-assessment forms for theological papers',
            'Council grading queue with feedback delivery',
            'Cohort calendar with upcoming gatherings',
            'Pardington, the AI theological study partner (see Section 3.6)',
          ]},
          { type: 'callout', variant: 'info', text: 'The Portal is accessible at ordination.canadianmidwest.ca. Access is provisioned by the District Ministry Centre following registration.' },
        ]
      },
      {
        id: '3-5',
        heading: '3.5 Communication and Support',
        blocks: [
          { type: 'p', text: 'The District Ministry Centre is available to assist with questions related to scheduling, Portal access, submission issues, or other administrative concerns. The Chair of the Ordaining Council may be contacted for academic or theological questions, or when challenges arise that affect progress in the process.' },
          { type: 'p', text: 'Ordinands are encouraged to reach out for support early when facing personal, vocational, or academic challenges that may affect their ability to complete assignments or attend gatherings. The goal of the process is to see every ordinand flourish in their calling, and support is available to help them succeed.' },
        ]
      },
      {
        id: '3-6',
        heading: '3.6 Pardington — AI Theological Study Partner',
        blocks: [
          { type: 'p', text: 'The CMD Ordination Portal includes Pardington, an AI-powered theological study partner available to all ordinands and council members. Pardington is named in honour of George Palmer Pardington (1858–1925), Alliance theologian, Bible teacher, and close colleague of A.B. Simpson at the Christian and Missionary Alliance. Pardington authored foundational Alliance texts and was known for his precision, warmth, and ability to make deep theology accessible to ordinary Christians in ministry.' },
          { type: 'p', text: 'Pardington can help ordinands:' },
          { type: 'ul', items: [
            'Think through Alliance theology and the Fourfold Gospel',
            'Prepare for their oral interview by walking through the Appendix A.5 questions interactively',
            'Explore the ideas behind their written work — though it will not write papers or sermons on their behalf',
            'Engage with the reading list and theological source material',
          ]},
          { type: 'callout', variant: 'tip', text: 'Pardington is accessible directly from the Portal dashboard and from the header of the council grading queue. Try asking: "Help me prepare for my oral interview" to begin an interactive walk-through of the interview questions.' },
        ]
      },
    ]
  },
  {
    slug: 'assignments',
    title: 'Assignment Requirements',
    icon: '📋',
    tagline: 'Book reports, theological papers, and sermons — what is required and how to submit',
    audience: ['ordinand'],
    subsections: [
      {
        id: '4-1',
        heading: '4.1 Book Reports',
        blocks: [
          { type: 'p', text: 'Ordinands are expected to read a curated list of books and submit ten book reports throughout the process. Each report should be approximately two pages in length, single-spaced, and should:' },
          { type: 'ul', items: [
            'Summarize key ideas and themes',
            'Reflect on how the material applies to your life and ministry',
            'Engage critically with the text in light of Alliance theology and values',
          ]},
          { type: 'p', text: 'Books are selected across various categories including Alliance history, theology, spiritual formation, missions, Scripture, anthropology, and leadership. The reading list includes:' },
          { type: 'ul', items: [
            'History (choose 1 of 2): All For Jesus (Niklaus); A.B. Simpson and the Making of Modern Evangelicalism (Henry)',
            'Theology (choose 2): Abide and Go (Gorman); Rethinking Holiness (Van De Walle); Surprised by Hope (Wright)',
            'Deeper Life (choose 1): Strengthening the Soul of Your Leadership (Barton); Hearing God (Willard)',
            'Missions (choose 1): Kairos course; Mission trip + On Mission (Brown); The Mission of God\'s People (C.J.H. Wright)',
            'Holy Scripture (choose 1): God Has Spoken (Packer); The Blue Parakeet (McKnight)',
            'Anthropology (choose 2): Strange New World (Trueman); The Genesis of Gender (Favale); Love Thy Body (Pearcy)',
            'Disciple-Making: The Great Omission (Willard)',
            'Specific Ministry Focus: one book pertaining to your field of ministry',
            'C&MA Manual (read only — no report required)',
            'Bible in a previously unread translation (read only — no report required)',
          ]},
          { type: 'callout', variant: 'tip', text: 'Book reports are submitted through the Portal under the appropriate requirement. See Appendix A.1 for a full checklist of what each report should include.' },
        ]
      },
      {
        id: '4-2',
        heading: '4.2 Theological Papers',
        blocks: [
          { type: 'p', text: 'Ordinands must submit four theological reflection papers, each 10–12 pages in length. These papers should:' },
          { type: 'ul', items: [
            'Demonstrate theological integration and personal reflection',
            'Answer the key questions provided for each topic',
            'Apply content to the ordinand\'s ministry context',
            'Include engagement with Scripture and relevant academic sources',
          ]},
          { type: 'p', text: 'Because of the desire to see personal reflection and theological engagement, writing in the first-person voice is acceptable and encouraged.' },
          { type: 'p', text: 'The five theological topics are: Christ-Centred Life and Ministry, Spirit-Empowered Life and Ministry, Mission-Focused Life and Ministry, The Scriptures, and Divine Healing. Each ordinand writes papers on four of the five topics — the topic assigned as their cohort\'s sermon topic is excluded from papers.' },
          { type: 'callout', variant: 'info', text: 'Each paper submission in the Portal includes a built-in self-assessment form. Before submitting, you rate your own work against each evaluation criterion and provide written evidence from your paper. This self-assessment is reviewed alongside the paper by the assigned council member.' },
        ]
      },
      {
        id: '4-3',
        heading: '4.3 Sermons',
        blocks: [
          { type: 'p', text: 'Three sermons must be submitted, each addressing your cohort\'s designated sermon topic. Sermons should:' },
          { type: 'ul', items: [
            'Engage with biblical text faithfully and demonstrate sound exegesis',
            'Reflect integration of theology and application to contemporary ministry contexts',
            'Be delivered in a realistic ministry environment, if possible',
          ]},
          { type: 'p', text: 'Those in regular teaching roles are expected to submit recordings from their primary worship services. Others may record sermons in alternate settings.' },
          { type: 'p', text: 'Each sermon submission must include a full manuscript (not just an outline) with the following at the top of the document:' },
          { type: 'ul', items: [
            'The date and occasion of the sermon (e.g. youth group, Sunday service)',
            'The theme of the sermon (e.g. Divine Healing, Christ-Centred, Mission-Focused)',
            'The specific question being addressed (marked with an asterisk in the assignment guide)',
          ]},
          { type: 'callout', variant: 'tip', text: 'The sermon evaluation rubric is visible on each sermon requirement page in the Portal. Review it before you preach so you know what the council is looking for. See also Appendix A.11.' },
        ]
      },
    ]
  },
  {
    slug: 'mentorship',
    title: 'Mentorship',
    icon: '🧭',
    tagline: 'The mentorship relationship — expectations, rhythm, and the monthly report',
    audience: ['ordinand', 'mentor'],
    subsections: [
      {
        id: '5-1',
        heading: '5.1 Purpose of Mentorship',
        blocks: [
          { type: 'p', text: 'Mentorship is one of the most vital components of the CMD ordination journey. It provides the ordinand with ongoing spiritual, theological, and pastoral formation in the context of trusted relationship. Mentors are not supervisors or evaluators in the formal sense — they are guides, discerners, and co-labourers who help ordinands reflect deeply on who they are becoming as ministers of the gospel.' },
          { type: 'p', text: 'The mentor\'s primary role is to listen, ask questions, offer challenge, and encourage growth. This relationship cultivates the inner life and emotional resilience that will serve the ordinand long after their ordination is complete.' },
        ]
      },
      {
        id: '5-2',
        heading: '5.2 Matching Process and Relationship Guidelines',
        blocks: [
          { type: 'p', text: 'Mentors are assigned shortly after an ordinand is welcomed into their cohort. When possible, the Chair of the Ordaining Council makes mentor pairings based on:' },
          { type: 'ul', items: [
            'Theological balance (e.g., pairing a theologically conservative ordinand with a more progressive mentor)',
            'Gender representation (when possible, we prioritize same-gender mentorship)',
            'Ministry context diversity',
            'Availability and experience of mentors',
          ]},
          { type: 'p', text: 'Mentors should not be the ordinand\'s direct supervisor or someone in close oversight of their current ministry setting.' },
          { type: 'p', text: 'Best practices include:' },
          { type: 'ul', items: [
            'Monthly meetings (in person or online) lasting 60–90 minutes',
            'A relationship marked by honesty, confidentiality, and spiritual attentiveness',
            'Focus on personal development, rather than performance review',
          ]},
        ]
      },
      {
        id: '5-3',
        heading: '5.3 Monthly Mentor Reports',
        blocks: [
          { type: 'p', text: 'Mentors are asked to submit a short report each month following a simple reflective template. These reports provide the council with insight into the ordinand\'s growth and engagement and also help track any concerns early in the process.' },
          { type: 'p', text: 'Reports typically address:' },
          { type: 'ul', items: [
            'What the mentor and ordinand discussed that month',
            'Observations of personal, spiritual, and theological development',
            'Any missed meetings or patterns of disengagement',
            'Prayer needs or pastoral concerns',
          ]},
          { type: 'p', text: 'These forms are submitted through the CMD Ordination Portal. See Appendix A.6 for the Mentor Report Template.' },
        ]
      },
      {
        id: '5-4',
        heading: '5.4 Mentor Check-ins and Feedback',
        blocks: [
          { type: 'p', text: 'Each mentor will receive two check-in contacts per year from a member of the Ordaining Council. These check-ins serve to:' },
          { type: 'ul', items: [
            'Clarify expectations and answer questions',
            'Support the mentor-ordinand relationship',
            'Ensure consistent understanding of the process',
          ]},
          { type: 'p', text: 'Mentors also complete a formal evaluation of the ordinand in the months leading up to the oral interview. This form helps the council prepare for the interview and highlights areas of strength and further growth.' },
        ]
      },
      {
        id: '5-5',
        heading: '5.5 Role of the Ordinand in Mentorship',
        blocks: [
          { type: 'p', text: 'Ordinands are expected to take responsibility for their mentorship relationship. This includes:' },
          { type: 'ul', items: [
            'Initiating meetings and communicating regularly',
            'Coming prepared with reflection on their current assignments or ministry situations',
            'Being open to feedback and spiritual challenge',
            'Respecting the mentor\'s time and presence',
          ]},
          { type: 'callout', variant: 'tip', text: 'Your mentor\'s name and contact information are visible on your Ordination Journey page in the Portal. If you have not yet been assigned a mentor, contact the District Ministry Centre.' },
        ]
      },
    ]
  },
  {
    slug: 'interview',
    title: 'Interview & Ordination',
    icon: '🎓',
    tagline: 'Eligibility, format, the four possible outcomes, and the ordination service',
    audience: ['ordinand'],
    subsections: [
      {
        id: '6-1',
        heading: '6.1 Interview Eligibility and Scheduling',
        blocks: [
          { type: 'p', text: 'The final step in the ordination process is a formal interview with the Ordaining Council. Ordinands are eligible for interview once they have:' },
          { type: 'ul', items: [
            'Completed all required book reports, papers, and sermon submissions',
            'Fulfilled the minimum two-year ministry requirement outlined by TAC',
            'Provided final evaluations from both the ordinand\'s mentor and their church board to the District Ministry Centre',
            'Received confirmation from the Chair of the Ordaining Council',
          ]},
          { type: 'p', text: 'Interviews take place each spring (May) and fall (October) during the council\'s in-person meetings.' },
        ]
      },
      {
        id: '6-2',
        heading: '6.2 Preparing for the Interview',
        blocks: [
          { type: 'p', text: 'The interview is a pastoral and theological conversation, typically lasting approximately 120 minutes, followed by 30 minutes of council deliberation and feedback. The entire experience lasts about 2.5 hours. It is not a defense or examination in the academic sense, but rather a formal opportunity for the council to discern the ordinand\'s readiness for ordination.' },
          { type: 'p', text: 'The council will assess:' },
          { type: 'ul', items: [
            'Theological maturity',
            'Spiritual formation and character',
            'Pastoral insight and experience',
            'Understanding of Alliance distinctives',
          ]},
          { type: 'p', text: 'Ordinands should come prepared to reflect on the Fourfold Gospel, the nature and authority of Scripture, the mission of the Church, their growth over the past three years, and their sense of calling.' },
          { type: 'callout', variant: 'tip', text: 'A full list of potential interview questions is provided in Appendix A.5. You can also explore them interactively through Pardington in the Portal — try: "Help me prepare for my oral interview."' },
        ]
      },
      {
        id: '6-3',
        heading: '6.3 Interview Format and Expectations',
        blocks: [
          { type: 'p', text: 'The interview will be conducted by the full Ordaining Council. Members will have reviewed the ordinand\'s submissions and the feedback provided. They will take turns acting as the primary interlocutor, with others contributing follow-up questions.' },
          { type: 'p', text: 'Ordinands are encouraged to:' },
          { type: 'ul', items: [
            'Speak clearly and authentically',
            'Be honest about areas of continued growth',
            'Demonstrate humility, clarity, and theological conviction',
          ]},
          { type: 'callout', variant: 'info', text: 'Ordinands are expected to treat this as a formal professional engagement and to dress accordingly. The posture is pastoral but serious.' },
        ]
      },
      {
        id: '6-4',
        heading: '6.4 Decision and Communication',
        blocks: [
          { type: 'p', text: 'At the conclusion of the interview, the council meets in closed session to prayerfully discern whether to sustain the ordinand\'s ordination. Their decision is based on the totality of the process. In most cases, the decision will be communicated within 30 minutes of the interview\'s conclusion.' },
          { type: 'outcomes', items: [
            { label: 'Sustained', desc: 'Approved for ordination pending affirmation by the licensing body', color: 'bg-green-50 border-green-200 text-green-800' },
            { label: 'Conditionally Sustained', desc: 'Additional steps required before scheduling an ordination service — no re-interview needed', color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { label: 'Deferred', desc: 'Additional assignments or growth required before rescheduling an interview', color: 'bg-amber-50 border-amber-200 text-amber-800' },
            { label: 'Not Sustained', desc: 'Reserved for cases with serious theological, spiritual, or vocational concerns', color: 'bg-red-50 border-red-200 text-red-800' },
          ]},
        ]
      },
      {
        id: '6-5',
        heading: '6.5 Ordination Service and Credential Update',
        blocks: [
          { type: 'p', text: 'Once an ordinand has been sustained by the council and affirmed by the licensing body in dialogue with the local church, the ordination is publicly celebrated through a local ordination service.' },
          { type: 'p', text: 'The service typically includes:' },
          { type: 'ul', items: [
            'Affirmation by the local church leadership',
            'Laying on of hands by district representatives',
            'Celebration of the ordinand\'s journey and calling',
          ]},
          { type: 'callout', variant: 'warning', text: 'Until the completion of the ordination service, the ordinand is not considered ordained, does not receive the privileges of ordination, and may not use the title "Reverend."' },
        ]
      },
    ]
  },
  {
    slug: 'council',
    title: 'Council Responsibilities',
    icon: '⚖️',
    tagline: 'Mandate, composition, time commitments, and discernment process',
    audience: ['council'],
    subsections: [
      {
        id: '7-1',
        heading: '7.1 Purpose and Mandate',
        blocks: [
          { type: 'p', text: 'The Ordaining Council serves as the primary body responsible for guiding, assessing, and ultimately sustaining candidates for ordination in the CMD. Appointed by the District Executive Committee (DEXCOM), the council ensures that all ordinands are evaluated with theological integrity, pastoral care, and a shared commitment to the vision and values of The Alliance Canada.' },
        ]
      },
      {
        id: '7-2',
        heading: '7.2 Composition and Terms',
        blocks: [
          { type: 'p', text: 'The council is composed of experienced, ordained pastors who have demonstrated spiritual maturity, theological discernment, and pastoral credibility.' },
          { type: 'p', text: 'Council members are:' },
          { type: 'ul', items: [
            'Appointed by DEXCOM',
            'Expected to serve a two-year term (renewable)',
            'Accountable to the Chair of the Ordaining Council and the District Superintendent',
          ]},
          { type: 'p', text: 'Membership is intentionally diverse, reflecting the theological breadth, cultural context, and gender representation of the CMD as much as possible.' },
        ]
      },
      {
        id: '7-3',
        heading: '7.3 Core Responsibilities',
        blocks: [
          { type: 'p', text: 'Council members are expected to:' },
          { type: 'ul', items: [
            'Attend all scheduled council meetings, both virtual and in person (typically in May and October)',
            'Review assigned ordinand submissions in a timely and thoughtful manner',
            'Participate in quarterly cohort gatherings (via Zoom), offering teaching and feedback',
            'Contribute to in-person cohort events, as available',
            'Provide feedback on written work using the established rubrics and self-assessment guides',
            'Conduct interviews and discern together the readiness of ordinands for ordination',
            'Support mentors as needed with clarification, guidance, or encouragement',
            'Uphold confidentiality and spiritual sensitivity in all matters',
          ]},
        ]
      },
      {
        id: '7-4',
        heading: '7.4 Time Commitments and Expectations',
        blocks: [
          { type: 'p', text: 'Members should expect to contribute approximately 6–8 hours per month to ordination-related duties, which may increase around council gatherings and interview seasons. The time commitment includes:' },
          { type: 'ul', items: [
            'Reading and evaluating assignments through the CMD Ordination Portal',
            'Attending online gatherings',
            'Participating in marking and interviews',
            'Engaging in mentor check-ins or ordinand follow-up, when assigned',
          ]},
          { type: 'callout', variant: 'info', text: 'Council members are not financially compensated for their time but may submit travel-related expenses for reimbursement as outlined in Appendix A.8.' },
        ]
      },
      {
        id: '7-5',
        heading: '7.5 Discerning Readiness for Ordination',
        blocks: [
          { type: 'p', text: 'The final responsibility of the council is to discern whether each ordinand is prepared for ordination. This includes assessing not only theological accuracy but also:' },
          { type: 'ul', items: [
            'Spiritual depth and character',
            'Pastoral posture and leadership readiness',
            'Alignment with the vision, values, and doctrinal position of The Alliance Canada',
          ]},
          { type: 'p', text: 'The council reaches its decisions through prayer, discussion, and consensus wherever possible. Where consensus is not achievable, a majority decision is used.' },
        ]
      },
    ]
  },
  {
    slug: 'appendices',
    title: 'Appendices & Resources',
    icon: '📎',
    tagline: 'Checklists, templates, rubrics, and links to all supporting documents',
    audience: ['all'],
    subsections: [
      {
        id: 'A-1',
        heading: 'A.1 — Book Report Checklist',
        blocks: [
          { type: 'p', text: 'Each ordinand must submit a total of ten book reports. Each report should include:' },
          { type: 'ul', items: [
            'Title and author of the book',
            'Date the book was read and the date the report was submitted',
            'Report is two pages in length, single-spaced',
            'Personal reflection and theological interaction',
            'Highlights areas of agreement, challenge, or new insight',
            'Connects the content to the ordinand\'s current ministry context',
            'Adheres to CMD formatting and citation standards (see A.4)',
          ]},
          { type: 'callout', variant: 'info', text: 'Reports are submitted through the CMD Ordination Portal under the appropriate requirement.' },
        ]
      },
      {
        id: 'A-2',
        heading: 'A.2 — CMD Ordination Requirements',
        blocks: [
          { type: 'p', text: 'The complete and current requirements are accessible through the CMD Ordination Portal. The Portal displays all 17 requirements personalized to each ordinand\'s cohort and sermon topic assignment — 10 book reports, 4 theological papers, and 3 sermons.' },
        ]
      },
      {
        id: 'A-3',
        heading: 'A.3 — Self-Assessment Guide',
        blocks: [
          { type: 'p', text: 'A self-assessment form is built into each theological paper submission in the CMD Ordination Portal. Before submitting a paper, ordinands rate their own work against each evaluation criterion and provide written evidence from their paper. This self-assessment is reviewed alongside the paper by the assigned council member.' },
          { type: 'p', text: 'For reference and offline study, a sample self-assessment guide for the Christ-Centred Life and Ministry paper is available from the District Ministry Centre.' },
        ]
      },
      {
        id: 'A-4',
        heading: 'A.4 — Paper Formatting and Style Guide',
        blocks: [
          { type: 'p', text: 'This guide provides detailed expectations for formatting, structure, and citation for all written submissions. Available from the District Ministry Centre and through the CMD Ordination Portal.' },
        ]
      },
      {
        id: 'A-5',
        heading: 'A.5 — Sample Interview Questions',
        blocks: [
          { type: 'p', text: 'The interview questions are available in two ways:' },
          { type: 'ul', items: [
            'As a PDF document available from the District Ministry Centre',
            'Interactively through Pardington in the CMD Ordination Portal — Pardington will walk ordinands through the questions one at a time and offer feedback on responses',
          ]},
          { type: 'callout', variant: 'tip', text: 'To start an interactive interview prep session, open Pardington and say: "Help me prepare for my oral interview."' },
        ]
      },
      {
        id: 'A-6',
        heading: 'A.6 — Mentor Report Template',
        blocks: [
          { type: 'p', text: 'This template provides mentors with a structured tool to assess and provide feedback on their ordinand\'s progress. The template is submitted monthly through the CMD Ordination Portal.' },
          { type: 'p', text: 'A copy of the template is available from the District Ministry Centre.' },
        ]
      },
      {
        id: 'A-7',
        heading: 'A.7 — Mentor Orientation Materials',
        blocks: [
          { type: 'p', text: 'This document equips mentors with background and expectations for their role, including theological and pastoral considerations. Available from the District Ministry Centre.' },
        ]
      },
      {
        id: 'A-8',
        heading: 'A.8 — CMD Ordaining Council Job Description',
        blocks: [
          { type: 'p', text: 'This document outlines the responsibilities and expectations of council members serving on the CMD Ordaining Council. Available from the District Ministry Centre.' },
        ]
      },
      {
        id: 'A-9',
        heading: 'A.9 — The Alliance Canada Ordination Policy',
        blocks: [
          { type: 'p', text: 'The national policy governing ordination within The Alliance Canada. All district-level ordination processes must adhere to this framework. Available from The Alliance Canada national office or through the District Ministry Centre.' },
        ]
      },
      {
        id: 'A-10',
        heading: 'A.10 — Reading Schedule for Cohort Gatherings',
        blocks: [
          { type: 'p', text: 'This document outlines which reading categories align with which cohort conversations and gathering schedule. Available through the CMD Ordination Portal and from the District Ministry Centre.' },
        ]
      },
      {
        id: 'A-11',
        heading: 'A.11 — Sermon Evaluation Rubric',
        blocks: [
          { type: 'p', text: 'This rubric is used by council members to evaluate submitted sermons. It assesses biblical faithfulness, theological integration, clarity of communication, and pastoral application.' },
          { type: 'ul', items: [
            'The rubric is visible in the CMD Ordination Portal on each sermon requirement page',
            'A PDF version is available from the District Ministry Centre',
          ]},
        ]
      },
    ]
  },
]

export const SECTION_SLUGS = WIKI_SECTIONS.map(s => s.slug)

export function getSectionBySlug(slug: string): WikiSection | undefined {
  return WIKI_SECTIONS.find(s => s.slug === slug)
}

export function getAdjacentSections(slug: string): { prev: WikiSection | null; next: WikiSection | null } {
  const idx = WIKI_SECTIONS.findIndex(s => s.slug === slug)
  return {
    prev: idx > 0 ? WIKI_SECTIONS[idx - 1] : null,
    next: idx < WIKI_SECTIONS.length - 1 ? WIKI_SECTIONS[idx + 1] : null,
  }
}
