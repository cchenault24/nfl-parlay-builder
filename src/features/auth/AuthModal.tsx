import {
  Close as CloseIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { signInWithEmail, signUpWithEmail } from '../../config/firebase'

interface FirebaseAuthError {
  code?: string
  message?: string
}

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
      onClose()
      resetForm()
    } catch (error) {
      const authError = error as FirebaseAuthError
      const errorMessage =
        authError.code?.replace('auth/', '').replace(/-/g, ' ') ||
        authError.message ||
        'Authentication failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setIsSignUp(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Email Form */}
          <Box
            component="form"
            onSubmit={handleEmailAuth}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2e7d32',
                  },
                  '& input': {
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                    '&:-webkit-autofill': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                      transition:
                        'background-color 5000s ease-in-out 0s !important',
                      boxShadow: 'inset 0 0 0 1000px transparent !important',
                    },
                    '&:-webkit-autofill:hover': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                    },
                    '&:-webkit-autofill:focus': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                    },
                    '&:-webkit-autofill:active': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                    },
                  },
                },
              }}
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2e7d32',
                  },
                  '& input': {
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                    '&:-webkit-autofill': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                      transition:
                        'background-color 5000s ease-in-out 0s !important',
                      boxShadow: 'inset 0 0 0 1000px transparent !important',
                    },
                    '&:-webkit-autofill:hover': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                    },
                    '&:-webkit-autofill:focus': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                    },
                    '&:-webkit-autofill:active': {
                      WebkitBoxShadow:
                        '0 0 0 1000px transparent inset !important',
                      WebkitTextFillColor: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                    },
                  },
                },
              }}
            />

            {isSignUp && (
              <TextField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                fullWidth
                autoComplete="new-password"
                InputProps={{
                  startAdornment: (
                    <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'transparent',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2e7d32',
                    },
                    '& input': {
                      backgroundColor: 'transparent !important',
                      boxShadow: 'none !important',
                      '&:-webkit-autofill': {
                        WebkitBoxShadow:
                          '0 0 0 1000px transparent inset !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'transparent !important',
                        transition:
                          'background-color 5000s ease-in-out 0s !important',
                        boxShadow: 'inset 0 0 0 1000px transparent !important',
                      },
                      '&:-webkit-autofill:hover': {
                        WebkitBoxShadow:
                          '0 0 0 1000px transparent inset !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'transparent !important',
                      },
                      '&:-webkit-autofill:focus': {
                        WebkitBoxShadow:
                          '0 0 0 1000px transparent inset !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'transparent !important',
                      },
                      '&:-webkit-autofill:active': {
                        WebkitBoxShadow:
                          '0 0 0 1000px transparent inset !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'transparent !important',
                      },
                    },
                  },
                }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ py: 1.5, mt: 1 }}
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <Button
            onClick={() => setIsSignUp(!isSignUp)}
            sx={{ ml: 1, textTransform: 'none' }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </Button>
        </Typography>
      </DialogActions>
    </Dialog>
  )
}
