// lib/surveys/intercultural-fluency-2026-05-27.ts
// Seed for the post-event feedback survey on the 2026-05-27 in-person
// Intercultural Fluency gathering (Cres Casimong).
//
// The center of gravity is *not* "rate the speaker" — it's "are days like
// this worth doing more often, and what shape should they take." Section 4
// only references the three segments Cres actually got through; segments
// 4–6 from the handout (Cultural Intelligence, Ethnocentrism, Cultural
// Agility) are intentionally omitted.
//
// This seed is copied into cohort_event_surveys.questions at creation
// time. Editing this file does not change already-created surveys.

import type { SurveyTemplate } from './types'

export const INTERCULTURAL_FLUENCY_2026_05_27: SurveyTemplate = {
  slug:  'intercultural-fluency-2026-05-27',
  title: 'CMD Cohort In-Person Gathering — Feedback',
  intro:
    "Today was a rare chance to gather in person — all the cohorts together " +
    "in one room, time with the Ordination Council, and Dr. Casimong's session " +
    "on Intercultural Fluency. We want to know whether days like this are " +
    "worth doing more often, and what shape they should take. Your answers " +
    "go to the OC and the district team; you can also choose to submit " +
    "anonymously at the bottom.",
  sections: [
    {
      heading: 'The value of gathering in person',
      questions: [
        {
          id: 'q1_overall_value',
          type: 'scale',
          prompt: 'How valuable was today’s gathering overall?',
          scale_min: 1,
          scale_max: 5,
          scale_labels: { min: 'Not really', max: "I'd build my year around this" },
          required: true,
        },
        {
          id: 'q2_frequency',
          type: 'single',
          prompt:
            'We currently do this once a year. Would you want to gather twice a year instead?',
          options: [
            { value: 'once_is_right',  label: 'No, once a year is right' },
            { value: 'twice_a_year',   label: 'Yes, twice a year would be better' },
          ],
          required: true,
        },
        {
          id: 'q3_duration',
          type: 'single',
          prompt:
            'Today was a single day (~6 hours together). Would a longer format — e.g. an overnight or multi-day retreat — be worth it to you?',
          options: [
            { value: 'one_day',         label: 'No, one day is the right length' },
            { value: 'overnight',       label: 'Yes, an overnight (1.5–2 days) would be worth it' },
            { value: 'multi_day',       label: 'Yes, a multi-day retreat (2–3 days) would be worth it' },
            { value: 'need_more_info',  label: "I'd need to know more before answering" },
          ],
          required: true,
        },
        {
          id: 'q4_value_drivers',
          type: 'multi',
          prompt: 'What makes a gathering like this worth the travel for you?',
          options: [
            { value: 'whole_group',       label: 'Being with the whole group of ordinands across all cohorts' },
            { value: 'oc_time',            label: 'Time with the Ordination Council' },
            { value: 'teaching',           label: 'Teaching/training content' },
            { value: 'worship_prayer',     label: 'Worship and prayer together' },
            { value: 'unstructured',       label: 'Unstructured time / meals / hallway conversation' },
          ],
          allow_other_text: true,
          required: false,
        },
      ],
    },
    {
      heading: 'Being together as a whole group',
      questions: [
        {
          id: 'q5_whole_group_value',
          type: 'scale',
          prompt:
            'How valuable was it to be in the room with ordinands from all the cohorts today (not just your own)?',
          scale_min: 1,
          scale_max: 5,
          scale_labels: { min: 'Not at all', max: 'Deeply valuable' },
          required: true,
        },
        {
          id: 'q6_whole_group_open',
          type: 'text',
          prompt:
            "What does gathering with the wider group of ordinands give you that you don’t get the rest of the year?",
          multiline: true,
          required: false,
        },
      ],
    },
    {
      heading: 'Time with the Ordination Council',
      questions: [
        {
          id: 'q7_oc_value',
          type: 'scale',
          prompt: 'How valuable was the time spent with the OC today?',
          scale_min: 1,
          scale_max: 5,
          scale_labels: { min: 'Not at all', max: 'Deeply valuable' },
          required: true,
        },
        {
          id: 'q8_oc_missed',
          type: 'text',
          prompt:
            "Was there anything you wished you’d had time to discuss with the OC but didn’t get to?",
          multiline: true,
          required: false,
        },
      ],
    },
    {
      heading: "Today’s teaching (Intercultural Fluency)",
      questions: [
        {
          id: 'q9_speaker_rating',
          type: 'scale',
          prompt: "How would you rate Dr. Casimong’s session?",
          scale_min: 1,
          scale_max: 5,
          scale_labels: { min: 'Weak', max: 'Excellent' },
          required: true,
        },
        {
          id: 'q10_strongest_segment',
          type: 'single',
          prompt: 'Which of the three segments we covered landed most strongly?',
          options: [
            { value: 'theology_of_diversity', label: 'Theology of Diversity (Genesis → Galatians arc)' },
            { value: 'race_diversity_culture', label: 'Race, Diversity & Culture (construction of race, power & privilege, diversity in Canada)' },
            { value: 'value_of_intercultural', label: 'The Value of Intercultural Fluency (multi- / cross- / inter-, cultural iceberg, truth about culture)' },
          ],
          required: false,
        },
        {
          id: 'q11_apply_30_days',
          type: 'text',
          prompt:
            "One thing from the teaching you’ll carry into your ministry in the next 30 days.",
          multiline: true,
          required: false,
        },
      ],
    },
    {
      heading: 'Honest feedback',
      questions: [
        {
          id: 'q12_shortcomings',
          type: 'text',
          prompt:
            'Where did today fall short? Format, content, logistics, anything — honest critique welcome. The anonymous toggle is at the bottom of the form if you want it.',
          multiline: true,
          required: false,
        },
        {
          id: 'q13_anything_else',
          type: 'text',
          prompt: 'Anything else for the district team or OC?',
          multiline: true,
          required: false,
        },
      ],
    },
  ],
}
