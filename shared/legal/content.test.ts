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
  // a phone number without one is a dead tap.
  it('gives every dialable helpline a tel target', () => {
    for (const line of HELPLINES) {
      if (/^[\d-]+$/.test(line.phone)) {
        expect(line.dial).toBeTruthy()
      }
    }
  })

  it('lists the national helpline first', () => {
    expect(HELPLINES[0].phone).toBe(HELPLINE)
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
