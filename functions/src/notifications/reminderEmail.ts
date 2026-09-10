export interface ReminderContent {
  subject: string
  text: string
}

function kickoffLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Plain text on purpose: it renders everywhere, cannot break in a client, and
// there is nothing here that markup would make clearer.
export function buildReminder(
  gameContext: string,
  gameDateTime: string,
  legs: Array<{ selection?: string }>,
  appUrl: string
): ReminderContent {
  const lines = legs.map(leg => `  - ${leg.selection ?? 'leg'}`).join('\n')
  return {
    subject: `Kickoff soon: ${gameContext}`,
    text: [
      `${gameContext} kicks off at ${kickoffLabel(gameDateTime)} ET.`,
      '',
      'Your parlay:',
      lines,
      '',
      `See it in ParlAId: ${appUrl}`,
      '',
      'For entertainment only. You are receiving this because you turned on',
      'kickoff reminders in ParlAId; turn them off there to stop.',
    ].join('\n'),
  }
}
