// src/components/legal/BaseLegalDialog.tsx (Reduced font sizes)
import { Close as CloseIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import React from 'react'

export interface LegalDialogSection {
  title: string
  description: string
  icon: React.ReactNode
}

export interface LegalDialogNotice {
  title: string
  description: string
  severity?: 'info' | 'warning' | 'error' | 'success'
  chips?: Array<{
    label: string
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  }>
}

export interface LegalDialogFooter {
  title: string
  description: string
  contactInfo?: string
  contactLabel?: string
  bgColor?: string
  borderColor?: string
  titleColor?: string
}

export interface BaseLegalDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  icon: React.ReactNode
  themeColor: string
  gradientColor: string
  borderColor: string
  buttonText: string
  headerNotice?: LegalDialogNotice
  sections: LegalDialogSection[]
  footerSection?: LegalDialogFooter
  alertSection?: LegalDialogNotice
}

export const BaseLegalDialog: React.FC<BaseLegalDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  themeColor,
  gradientColor,
  borderColor,
  buttonText,
  headerNotice,
  sections,
  footerSection,
  alertSection,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          background: `linear-gradient(135deg, ${gradientColor} 0%, ${gradientColor.replace('0.1', '0.05')} 100%)`,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ color: themeColor, fontSize: 24 }}>{icon}</Box>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {/* Alert Section */}
        {alertSection && (
          <Alert
            severity={alertSection.severity || 'warning'}
            sx={{
              my: 2,
              borderRadius: 2,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              {alertSection.title}
            </Typography>
            <Typography variant="caption">
              {alertSection.description}
            </Typography>
          </Alert>
        )}

        {/* Header Notice */}
        {headerNotice && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              my: 2,
              bgcolor: gradientColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{ color: themeColor, fontWeight: 600 }}
              >
                {headerNotice.title}
              </Typography>
              {headerNotice.chips?.map((chip, index) => (
                <Chip
                  key={index}
                  label={chip.label}
                  size="small"
                  color={chip.color || 'primary'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {headerNotice.description}
            </Typography>
          </Paper>
        )}

        {/* Main Content Sections - IMPROVED ALIGNMENT */}
        <List disablePadding>
          {sections.map((section, index) => (
            <React.Fragment key={index}>
              <ListItem
                sx={{
                  px: 0,
                  py: 1,
                  alignItems: 'flex-start',
                }}
              >
                <ListItemIcon
                  sx={{
                    mt: 0, // Changed from 0.5 to 0 to align with text baseline
                    minWidth: 36, // Reduced from 40 for tighter spacing
                    display: 'flex',
                    alignItems: 'flex-start',
                    pt: 0.25, // Fine-tune vertical alignment with first line of text
                  }}
                >
                  {section.icon}
                </ListItemIcon>
                <ListItemText
                  sx={{ mt: 0 }} // Ensure no top margin on text container
                  primary={
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.4 }}
                    >
                      {section.title}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ lineHeight: 1.5, display: 'block' }} // Ensure proper line height
                    >
                      {section.description}
                    </Typography>
                  }
                />
              </ListItem>
              {index < sections.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {/* Footer Section */}
        {footerSection && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 2,
              bgcolor: footerSection.bgColor || 'rgba(46, 125, 50, 0.05)',
              border: `1px solid ${footerSection.borderColor || 'rgba(46, 125, 50, 0.2)'}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                color: footerSection.titleColor || '#2e7d32',
                fontWeight: 600,
                mb: 1,
              }}
            >
              {footerSection.title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              paragraph
              sx={{ mb: 1 }}
            >
              {footerSection.description}
            </Typography>
            {footerSection.contactInfo && (
              <Typography variant="caption" color="text.secondary">
                {footerSection.contactLabel || 'Contact us at'}{' '}
                <Typography
                  component="span"
                  sx={{
                    color: footerSection.titleColor || '#2e7d32',
                    fontWeight: 600,
                  }}
                >
                  {footerSection.contactInfo}
                </Typography>
              </Typography>
            )}
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            px: 4,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
