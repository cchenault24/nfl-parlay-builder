import type { ParlayStatus } from '@shared/parlays'

import { Chip } from '@/components/ui/Chip'
import { colors, semanticColor } from '@/lib/theme/designTokens'

// One chip for a saved parlay's status, on the card and on its screen.
export function ParlayStatusChip({ status }: { status: ParlayStatus }) {
  const tint = status.tone === 'muted' ? colors.textSecondary : semanticColor[status.tone]
  return <Chip label={status.label} tint={tint} />
}
