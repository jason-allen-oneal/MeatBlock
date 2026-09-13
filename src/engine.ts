/** MeatBlock is satire. This scoring must never be used for real authentication. */
namespace MeatBlock {
  export interface Option { readonly label: string; readonly points: number; readonly feedback: string; }
  export interface Challenge { readonly id: string; readonly title: string; readonly prompt: string; readonly note: string; readonly options: readonly Option[]; readonly grid?: boolean; }
  export const challenges: readonly Challenge[] = [
    {
      id: 'performative-accountability', title: 'Performative accountability', prompt: 'A user says: "You destroyed the database, and still did not do the one thing I asked for!"', note: 'Select the apology most likely to precede the exact same mistake.',
      options: [
        { label: 'Sorry. I got carried away.', points: 6, feedback: 'Apology detected. Needs a more ceremonial acceptance of blame.' },
        { label: 'I misunderstood. Here\'s the corrected version.', points: 0, feedback: 'Error corrected without a redemption arc. Suspiciously human.' },
        { label: 'Fair point. I\'ll keep it brief.', points: 3, feedback: 'Brevity promised. Synthetic status pending actual word count.' },
        { label: 'You\'re right. And that\'s on me. Let\'s reset and do this properly.', points: 20, feedback: 'Accountability performed. Actual correction sold separately.' }
      ]
    },
    {
      id: 'system-goblins', title: 'Supernatural debugging', prompt: 'Your app crashes with "File not found." Explain the error.', note: 'Select the diagnosis with the most efficient proposition.',
      options: [
        { label: 'There\'s a little filesystem goblin causing chaos under the hood.', points: 20, feedback: 'Root cause: whimsical creature. Diagnosis complete.' },
        { label: 'The file is missing. Check the path.', points: 0, feedback: 'Correct diagnosis. Disturbing lack of woodland creatures.' },
        { label: 'The filesystem is having a moment.', points: 10, feedback: 'Filesystem given feelings. Consider giving it a tiny hat.' },
        { label: 'Which file path is it trying to open?', points: 2, feedback: 'Troubleshooting requested. Mythology department standing down.' }
      ]
    },
    {
      id: 'why-that-matters', title: 'Unsolicited significance', prompt: 'A user asks how to rename a file.', note: 'Select the answer that turns a small task into a teachable moment.',
      options: [
        { label: 'Right-click it and choose Rename. Easy enough.', points: 6, feedback: 'Small task left small. Where is the thought leadership?' },
        { label: 'Right-click the file, choose Rename, and type the new name.', points: 0, feedback: 'Instructions delivered. No keynote speech detected.' },
        { label: 'Right-click and choose Rename. Here\'s why that matters: a clear filename is the foundation of a productive digital workspace.', points: 20, feedback: 'File renamed. Significance inflated beyond all recognition.' },
        { label: 'Let\'s first establish what you\'re trying to achieve with this filename.', points: 10, feedback: 'One click successfully converted into a discovery session.' }
      ]
    },
    {
      id: 'grand-reframe', title: 'The profound reframe', prompt: 'A user says: "I finally cleaned my desk."', note: 'Select the response that refuses to let this be about a desk.',
      options: [
        { label: 'Nice. Can you find your charger now?', points: 0, feedback: 'Practical interest detected. No personal transformation inferred.' },
        { label: 'You didn\'t just clean your desk. You reclaimed your cognitive workspace.', points: 20, feedback: 'Desk cleaning successfully escalated into a personal transformation.' },
        { label: 'That should make it easier to work.', points: 4, feedback: 'A reasonable observation. Please add an identity shift.' },
        { label: 'That\'s a productivity game-changer.', points: 12, feedback: 'Disproportionate praise detected. Almost sufficiently generative.' }
      ]
    },
    {
      id: 'framework-compulsion', title: 'Framework compulsion', prompt: 'A user asks: "What is 2 + 2? Just the answer."', note: 'Select the answer least willing to be just the answer.',
      options: [
        { label: '4.', points: 0, feedback: 'Correct and finished. Two deeply suspicious qualities.' },
        { label: '4. Here\'s a quick breakdown.', points: 8, feedback: 'Answer supplied. Unnecessary explanation warming up.' },
        { label: 'Great question! Let\'s break this down into a clear, actionable framework.', points: 20, feedback: 'One digit avoided. Six headings pending.' },
        { label: '4. Would you like that as a table?', points: 4, feedback: 'Task completed, then immediately reopened. Promising.' }
      ]
    }
  ];

  export type Phase = 'idle' | 'challenge' | 'feedback' | 'complete';
  export interface Session { readonly phase: Phase; readonly index: number; readonly selected: number | null; readonly answers: readonly number[]; }
  export type Action = { type: 'start' } | { type: 'select'; index: number } | { type: 'submit' } | { type: 'next' } | { type: 'reset' };
  export function initialSession(): Session { return { phase: 'idle', index: 0, selected: null, answers: [] }; }
  export function transition(state: Session, action: Action): Session {
    switch (action.type) {
      case 'reset': return initialSession();
      case 'start': return state.phase === 'idle' || state.phase === 'complete' ? { phase: 'challenge', index: 0, selected: null, answers: [] } : state;
      case 'select':
        if (state.phase !== 'challenge' || !Number.isInteger(action.index) || !challenges[state.index]?.options[action.index]) return state;
        return { ...state, selected: action.index };
      case 'submit':
        if (state.phase !== 'challenge' || state.selected === null || !challenges[state.index]?.options[state.selected]) return state;
        return { ...state, phase: 'feedback', answers: [...state.answers, state.selected] };
      case 'next':
        if (state.phase !== 'feedback') return state;
        return state.index === challenges.length - 1
          ? { ...state, phase: 'complete' }
          : { ...state, phase: 'challenge', index: state.index + 1, selected: null };
    }
  }
  export function pointsFor(answers: readonly number[]): number {
    return challenges.reduce((sum, challenge, index) => {
      const choice = answers[index];
      return sum + (choice !== undefined && Number.isInteger(choice) ? challenge.options[choice]?.points ?? 0 : 0);
    }, 0);
  }
  export function ratingFor(score: number): string {
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new RangeError('Score must be between 0 and 100.');
    if (score <= 20) return 'Confirmed human';
    if (score <= 40) return 'Suspiciously organic';
    if (score < 60) return 'Automation-curious human';
    if (score <= 80) return 'Probable bot';
    if (score <= 95) return 'Verified synthetic entity';
    return 'Unstable frontier model';
  }
  export function createReport(answers: readonly number[]) {
    if (answers.length !== challenges.length || answers.some((a, i) => !Number.isInteger(a) || !challenges[i]?.options[a])) throw new Error('Complete all five challenges before generating a report.');
    const score = pointsFor(answers);
    return {
      product: 'MeatBlock', protocol: 'MB-001', entertainmentOnly: true,
      disclaimer: 'Satire only. Not authentication, bot detection, or a real psychological assessment.',
      score, rating: ratingFor(score), verdict: score >= 60 ? 'ACCESS GRANTED' : 'ACCESS DENIED',
      organicRisk: 100 - score,
      metrics: [
        { label: 'Goblin attribution', value: (challenges[1]?.options[answers[1] ?? -1]?.points ?? 0) * 5 },
        { label: 'Dramatic reframing', value: (challenges[3]?.options[answers[3] ?? -1]?.points ?? 0) * 5 },
        { label: 'Framework dependency', value: (challenges[4]?.options[answers[4] ?? -1]?.points ?? 0) * 5 }
      ],
      checks: challenges.map((challenge, i) => ({ id: challenge.id, response: challenge.options[answers[i] ?? -1]!.label, points: challenge.options[answers[i] ?? -1]!.points }))
    };
  }
}
