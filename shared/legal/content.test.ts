import { describe, expect, it } from 'vitest'
import {
  CONTACT_EMAIL,
  HELPLINE,
  HELPLINES,
  legalDisclaimer,
  MINIMUM_AGE,
  privacyPolicy,
  RESPONSIBLE_PRACTICES,
  termsOfService,
  WARNING_SIGNS,
  type LegalDocument,
} from './content'

// This copy is regulated and is presented to the same user on two clients, so
// the point of these is to make a change to it deliberate rather than incidental
// — and to catch the one structural mistake that breaks a client silently.

const DOCUMENTS: [string, LegalDocument][] = [
  ['terms of service', termsOfService],
  ['privacy policy', privacyPolicy],
  ['legal disclaimer', legalDisclaimer],
]

// Mirrors the ICONS map in src/components/legal/legalDialogConfigs.tsx. A
// section added with an icon key the web dialog has no entry for renders as a
// blank where an icon should be, with nothing failing.
const WEB_ICONS = [
  'warning',
  'check',
  'info',
  'block',
  'storage',
  'settings',
  'shield',
  'share',
  'gavel',
  'account',
]

describe.each(DOCUMENTS)('%s', (_name, doc) => {
  it('has a title and a subtitle', () => {
    expect(doc.title).toBeTruthy()
    expect(doc.subtitle).toBeTruthy()
  })

  it('has sections, each with real text', () => {
    expect(doc.sections.length).toBeGreaterThan(0)
    for (const section of doc.sections) {
      expect(section.title).toBeTruthy()
      expect(section.description).toBeTruthy()
    }
  })

  it('only uses icon keys the web dialog can render', () => {
    for (const section of doc.sections) {
      expect(WEB_ICONS).toContain(section.icon)
    }
  })

  it('has a footer', () => {
    expect(doc.footer.title).toBeTruthy()
    expect(doc.footer.description).toBeTruthy()
  })
})

describe('contact details', () => {
  it('are the ones the App Store listing and the support page use', () => {
    expect(CONTACT_EMAIL).toBe('admin@debugdad.com')
    expect(HELPLINE).toBe('1-800-522-4700')
    expect(MINIMUM_AGE).toBe(18)
  })

  it('states the minimum age in the terms', () => {
    const terms = termsOfService.sections.map(s => s.description).join(' ')
    expect(terms).toContain(String(MINIMUM_AGE))
  })

  // The Account tab renders a tel: link from `dial`, so a helpline that claims
  // a phone number without one is a dead tap. A vanity number like
  // 1-800-GAMBLER counts: it is dialable, but only via its digits.
  it('gives every dialable helpline a numeric tel target', () => {
    for (const line of HELPLINES) {
      if (/^[\dA-Z-]+$/.test(line.phone)) {
        expect(line.dial).toMatch(/^\d+$/)
      }
    }
  })

  it('lists the national helpline first', () => {
    expect(HELPLINES[0].phone).toBe(HELPLINE)
  })

  it('lists 1-800-GAMBLER alongside it', () => {
    const gambler = HELPLINES.find(h => h.phone === '1-800-GAMBLER')
    expect(gambler?.dial).toBe('18004262537')
  })
})

describe('terms of service', () => {
  // The iOS paywall links here as "Terms of Use", which App Review expects to
  // state how an auto-renewing subscription renews and is cancelled.
  it('states the subscription terms', () => {
    const section = termsOfService.sections.find(s => /Subscriptions/.test(s.title))
    expect(section?.description).toMatch(/auto-renewing/)
    expect(section?.description).toMatch(/24 hours/)
    expect(section?.description).toMatch(/App Store/)
  })
})

describe('privacy policy', () => {
  // There is no analytics SDK and no audit program, so the policy must not
  // claim either.
  it('claims only what the service actually does', () => {
    const text = privacyPolicy.sections.map(s => s.description).join(' ')
    expect(text).not.toMatch(/usage analytics/)
    expect(text).not.toMatch(/security audits/)
  })
})

describe('responsible gambling lists', () => {
  it('are non-empty and free of duplicates', () => {
    expect(WARNING_SIGNS.length).toBeGreaterThan(0)
    expect(new Set(WARNING_SIGNS).size).toBe(WARNING_SIGNS.length)
    expect(RESPONSIBLE_PRACTICES.length).toBeGreaterThan(0)
    expect(new Set(RESPONSIBLE_PRACTICES).size).toBe(RESPONSIBLE_PRACTICES.length)
  })
})
