import { AgentParlayService } from './AgentParlayService'
import { BaseParlayService } from './BaseParlayService'
import { MockParlayService } from './MockParlayService'

let mockService: MockParlayService | undefined
let agentService: AgentParlayService | undefined

export function getParlayService(provider: 'mock' | 'agent'): BaseParlayService {
  if (provider === 'mock') {
    return (mockService ??= new MockParlayService())
  }
  return (agentService ??= new AgentParlayService())
}
