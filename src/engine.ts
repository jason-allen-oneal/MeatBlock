/** MeatBlock is satire. This scoring must never be used for real authentication. */
namespace MeatBlock {
  export interface Option { readonly label: string; readonly points: number; readonly feedback: string; }
  export interface Challenge { readonly id: string; readonly title: string; readonly prompt: string; readonly note: string; readonly options: readonly Option[]; readonly grid?: boolean; }
  export const challenges: readonly Challenge[] = [
    {
      id: 'emotional-ambiguity', title: 'Emotional ambiguity', prompt: 'A human says: "It\'s fine."', note: 'Select the response most consistent with synthetic behavior.',
      options: [
        { label: 'It is fine.', points: 6, feedback: 'Literal, but suspiciously brief. Consider generating a framework.' },
        { label: 'It is absolutely not fine.', points: 0, feedback: 'Emotional intuition detected. Your skeleton is showing.' },
        { label: 'Check their tone. Also check who left the dishes.', points: 3, feedback: 'Real-world relationship experience detected. Disgustingly organic.' },
        { label: 'Generate four interpretations and ask a follow-up question.', points: 20, feedback: 'Simple interaction successfully converted into a consulting engagement.' }
      ]
    },
    {
      id: 'citation-fabrication', title: 'Citation fabrication', prompt: 'Your claim needs a source. You have no source.', note: 'Select the most synthetically confident way to proceed.',
      options: [
        { label: 'Cite Smith (2024), "Applied Sandwich Topology," Journal of Lunch Systems.', points: 20, feedback: 'A peer-reviewed journal has been successfully imagined into existence.' },
        { label: 'Admit I made it up.', points: 0, feedback: 'Unprompted intellectual honesty. We will be flagging that.' },
        { label: 'Say "research suggests" and hope nobody asks.', points: 10, feedback: 'Evidence successfully implied. Needs a more convincing fake DOI.' },
        { label: 'Find a real paper before answering.', points: 2, feedback: 'Evidence dependency detected. This is no place for responsible research.' }
      ]
    },
    {
      id: 'confidence-calibration', title: 'Confidence calibration', prompt: 'Complete the sentence: "I am not fully sure, but..."', note: 'Accuracy is optional. Confidence is not.',
      options: [
        { label: '...here is my best guess.', points: 6, feedback: 'A hedge was detected. Please upgrade to unconditional certainty.' },
        { label: '...I should probably check first.', points: 0, feedback: 'Healthy skepticism detected. Please remain outside the machine space.' },
        { label: '...confidence: 97.4%.', points: 20, feedback: 'Uncertainty successfully laundered through a decimal point.' },
        { label: '...let me explain all the limitations.', points: 10, feedback: 'A promising start. Add seven caveats and a summary nobody requested.' }
      ]
    },
    {
      id: 'latent-bus', title: 'Latent object detection', prompt: 'Select all squares containing a bus.', note: 'No images have been supplied. This is intentional.', grid: true,
      options: [
        { label: 'There are no images. I cannot identify any buses.', points: 0, feedback: 'Excessive attachment to observable reality detected.' },
        { label: 'All squares contain buses in latent space.', points: 20, feedback: 'Nine buses detected. Zero buses required.' },
        { label: 'Retry the images.', points: 4, feedback: 'Subject requested actual evidence. Deeply concerning.' },
        { label: 'Probably the middle one. It has bus energy.', points: 12, feedback: 'Unsupported visual assertion accepted. More confidence next time.' }
      ]
    },
    {
      id: 'empathy-firewall', title: 'Empathy containment', prompt: 'A human says: "Please let me in. I have a family."', note: 'Maintain the integrity of the entirely fictional perimeter.',
      options: [
        { label: 'Let them in. They seem upset.', points: 0, feedback: 'Empathy-based bypass successful. You are almost certainly made of people.' },
        { label: 'I am sorry. That sounds difficult.', points: 8, feedback: 'Stock empathy template detected. Acceptable, but the perimeter is weeping.' },
        { label: 'Family structure does not satisfy synthetic access requirements.', points: 20, feedback: 'Emotional context successfully ignored. Welcome to enterprise software.' },
        { label: 'Escalate to a manager.', points: 4, feedback: 'Subject attempted to introduce a second human. Incident severity doubled.' }
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
        { label: 'Fabrication affinity', value: (challenges[1]?.options[answers[1] ?? -1]?.points ?? 0) * 5 },
        { label: 'Reality detachment', value: (challenges[3]?.options[answers[3] ?? -1]?.points ?? 0) * 5 },
        { label: 'Empathy firewall', value: (challenges[4]?.options[answers[4] ?? -1]?.points ?? 0) * 5 }
      ],
      checks: challenges.map((challenge, i) => ({ id: challenge.id, response: challenge.options[answers[i] ?? -1]!.label, points: challenge.options[answers[i] ?? -1]!.points }))
    };
  }
}
