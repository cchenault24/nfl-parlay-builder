import { Box, Chip, Container, Divider, Link, Paper, Typography } from '@mui/material'
import React from 'react'
import type { BaseLegalDialogProps } from './BaseLegalDialog'

type LegalContent = Omit<BaseLegalDialogProps, 'open' | 'onClose'>

// The same content the dialogs render, at a URL. App Store Connect requires a
// publicly reachable privacy policy link, and a reviewer has to be able to open
// it cold — so this route sits outside both the age gate and sign-in, and takes
// its content from the dialog configs rather than restating any of it.
const LegalPage: React.FC<{ content: LegalContent }> = ({ content }) => {
  const { title, subtitle, headerNotice, sections, footerSection } = content

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>

      {headerNotice && (
        <Paper variant="outlined" sx={{ mt: 3, p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {headerNotice.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {headerNotice.description}
          </Typography>
          {headerNotice.chips && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              {headerNotice.chips.map(chip => (
                <Chip
                  key={chip.label}
                  label={chip.label}
                  color={chip.color}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Divider sx={{ my: 4 }} />

      {sections.map(section => (
        <Box key={section.title} component="section" sx={{ mb: 3.5 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            {section.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {section.description}
          </Typography>
        </Box>
      ))}

      {footerSection && (
        <Paper variant="outlined" sx={{ p: 2.5, mt: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {footerSection.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {footerSection.description}
            {footerSection.contactInfo && (
              <>
                {' '}
                <Link href={`mailto:${footerSection.contactInfo}`}>
                  {footerSection.contactInfo}
                </Link>
                .
              </>
            )}
          </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="caption" color="text.secondary">
        ParlAId generates AI analysis and parlays for entertainment. No wagers are
        placed and no money changes hands. 18+. © {new Date().getFullYear()} ParlAId.{' '}
        <Link href="/">Return to the app</Link>
      </Typography>
    </Container>
  )
}

export default LegalPage
