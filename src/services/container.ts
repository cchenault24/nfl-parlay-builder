import { AgentParlayService } from '@shared/api/AgentParlayService'
import { BaseParlayService } from '@shared/api/BaseParlayService'
import { MockParlayService } from './MockParlayService'

let mockService: MockParlayService | undefined
let agentService: AgentParlayService | undefined

export function getParlayService(
  provider: 'mock' | 'agent'
): BaseParlayService {
  if (provider === 'mock') {
    return (mockService ??= new MockParlayService())
  }
  return (agentService ??= new AgentParlayService())
}
