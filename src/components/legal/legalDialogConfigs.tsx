// src/components/legal/legalDialogConfigs.tsx
//
// Presentation only. Every string comes from shared/legal/content.ts, which the
// iOS app reads too: this copy is regulated and is shown to the same user on
// both clients, so the wording cannot live in two places. What stays here is
// what is genuinely web-specific — the MUI icons and the dialog theming.
import {
  AccountBalance as AccountBalanceIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Gavel as GavelIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import {
  legalDisclaimer,
  privacyPolicy,
  termsOfService,
  type LegalDocument,
  type LegalIcon,
  type LegalSection,
} from '@shared/legal/content'
import { BaseLegalDialogProps } from './BaseLegalDialog'
import type { LegalContent as LegalPageContent } from './LegalPage'

// The shared text carries an icon key per section rather than an element, since
// nothing in shared/ may import a UI library.
const ICONS: Record<LegalIcon, React.ReactElement> = {
  warning: <WarningIcon color="warning" />,
  check: <CheckCircleIcon color="success" />,
  info: <InfoIcon color="info" />,
  block: <BlockIcon color="error" />,
  storage: <StorageIcon color="primary" />,
  settings: <SettingsIcon color="primary" />,
  shield: <ShieldIcon color="success" />,
  share: <ShareIcon color="warning" />,
  gavel: <GavelIcon color="secondary" />,
  account: <AccountBalanceIcon color="primary" />,
}

const withIcons = (sections: LegalSection[]) =>
  sections.map(({ title, description, icon }) => ({
    title,
    description,
    icon: ICONS[icon],
  }))

const footerOf = (doc: LegalDocument) => ({
  title: doc.footer.title,
  description: doc.footer.description,
  ...(doc.footer.contact ? { contactInfo: doc.footer.contact } : {}),
})

// Terms of Service Configuration
export const termsOfServiceConfig: Omit<
  BaseLegalDialogProps,
  'open' | 'onClose'
> = {
  title: termsOfService.title,
  subtitle: termsOfService.subtitle,
  icon: <GavelIcon />,
  themeColor: '#2e7d32',
  gradientColor: 'rgba(46, 125, 50, 0.1)',
  borderColor: 'rgba(46, 125, 50, 0.2)',
  buttonText: 'I Understand',
  headerNotice: {
    title: termsOfService.notice!.title,
    description: termsOfService.notice!.description,
    severity: 'warning',
  },
  sections: withIcons(termsOfService.sections),
  footerSection: {
    ...footerOf(termsOfService),
    bgColor: 'rgba(46, 125, 50, 0.05)',
    borderColor: 'rgba(46, 125, 50, 0.2)',
    titleColor: '#2e7d32',
  },
}

// Privacy Policy Configuration
export const privacyPolicyConfig: Omit<
  BaseLegalDialogProps,
  'open' | 'onClose'
> = {
  title: privacyPolicy.title,
  subtitle: privacyPolicy.subtitle,
  icon: <SecurityIcon />,
  themeColor: '#1976d2',
  gradientColor: 'rgba(25, 118, 210, 0.1)',
  borderColor: 'rgba(25, 118, 210, 0.2)',
  buttonText: 'Got It',
  headerNotice: {
    title: privacyPolicy.notice!.title,
    description: privacyPolicy.notice!.description,
    chips: [{ label: 'GDPR Compliant', color: 'primary' }],
  },
  sections: withIcons(privacyPolicy.sections),
  footerSection: {
    ...footerOf(privacyPolicy),
    bgColor: 'rgba(46, 125, 50, 0.05)',
    borderColor: 'rgba(46, 125, 50, 0.2)',
    titleColor: '#2e7d32',
  },
}

// Legal Disclaimer Configuration
export const legalDisclaimerConfig: Omit<
  BaseLegalDialogProps,
  'open' | 'onClose'
> = {
  title: legalDisclaimer.title,
  subtitle: legalDisclaimer.subtitle,
  icon: <GavelIcon />,
  themeColor: '#ff9800',
  gradientColor: 'rgba(255, 152, 0, 0.1)',
  borderColor: 'rgba(255, 152, 0, 0.2)',
  buttonText: 'I Acknowledge',
  alertSection: {
    title: legalDisclaimer.notice!.title,
    description: legalDisclaimer.notice!.description,
    severity: 'warning',
  },
  sections: withIcons(legalDisclaimer.sections),
  footerSection: {
    ...footerOf(legalDisclaimer),
    bgColor: 'rgba(244, 67, 54, 0.05)',
    borderColor: 'rgba(244, 67, 54, 0.2)',
    titleColor: '#f44336',
  },
}

// Support Page Configuration
//
// App Store Connect requires a Support URL to submit at all, and it has to be a
// page rather than a mailto. This is not a dialog — nothing in the app opens it
// — but it lives here so every piece of user-facing legal and support copy
// stays in one file.
export const supportConfig: LegalPageContent = {
  title: 'Support',
  subtitle: 'ParlAId — AI-generated NFL parlays, for entertainment',
  headerNotice: {
    title: 'Entertainment only',
    description:
      'ParlAId generates suggested parlays and explains the reasoning behind them. No wagers are placed through the app and no money changes hands. You must be 18 or older to use it.',
    severity: 'info',
  },
  sections: [
    {
      title: 'Getting help',
      description:
        'Email admin@debugdad.com with any question, bug report, or account request. Include the email address you signed in with so we can find your account. We answer everything, usually within a couple of days.',
      icon: <InfoIcon color="info" />,
    },
    {
      title: 'Deleting your account',
      description:
        'Delete your account from the Account tab on iPhone, or from the menu under your name on the web. Deletion removes your profile, your saved parlays and your generation history permanently and cannot be undone. It does not cancel a Pro subscription — neither the App Store nor Stripe cancels one because an account was removed — so cancel yours as well, or you will keep being charged.',
      icon: <BlockIcon color="error" />,
    },
    {
      title: 'Managing your subscription',
      description:
        'ParlAId Pro renews monthly and can be cancelled at any time. Subscriptions bought on iPhone are managed in Settings > your name > Subscriptions; subscriptions bought on the web are managed through the billing portal in the app. Deleting your account does not cancel a subscription, so cancel it separately.',
      icon: <AccountBalanceIcon color="primary" />,
    },
    {
      title: 'Gambling help',
      description:
        'If gambling is causing you or someone you know harm, call the National Council on Problem Gambling helpline at 1-800-522-4700, any time, free and confidential.',
      icon: <WarningIcon color="warning" />,
    },
  ],
  footerSection: {
    title: 'Contact',
    description: 'ParlAId is built and run by DebugDad LLC. Reach us at',
    contactInfo: 'admin@debugdad.com',
  },
}
