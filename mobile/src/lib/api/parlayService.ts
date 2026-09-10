import { AgentParlayService } from '@shared/api/AgentParlayService'

// The web client also picks between this and a MockParlayService behind a dev
// flag. Mobile is deliberately agent-only, so anything the UI shows came from
// a real run.
let instance: AgentParlayService | undefined

export const getParlayService = () => (instance ??= new AgentParlayService())
