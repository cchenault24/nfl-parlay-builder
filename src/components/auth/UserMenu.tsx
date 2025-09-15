import {
  AccountCircle as AccountIcon,
  History as HistoryIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { logOut } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import { AuthModal } from './AuthModal'

interface UserMenuProps {
  onViewHistory?: () => void
}

export const UserMenu: React.FC<UserMenuProps> = ({ onViewHistory }) => {
  const { user, userProfile } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    try {
      await logOut()
      handleMenuClose()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleViewHistory = () => {
    handleMenuClose()
    onViewHistory?.()
  }

  if (!user) {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={<LoginIcon />}
          onClick={() => setAuthModalOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Sign In
        </Button>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    )
  }

  return (
    <Box>
      <Button
        onClick={handleMenuOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textTransform: 'none',
          color: 'text.primary',
        }}
      >
        <Avatar
          src={userProfile?.photoURL || user.photoURL || undefined}
          alt={userProfile?.displayName || user.displayName || 'User'}
          sx={{ width: 32, height: 32 }}
        >
          {(userProfile?.displayName ||
            user.displayName ||
            'U')[0].toUpperCase()}
        </Avatar>
        <Typography
          variant="body2"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {userProfile?.displayName || user.displayName || 'User'}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <AccountIcon />
          </ListItemIcon>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {userProfile?.displayName || user.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleViewHistory}>
          <ListItemIcon>
            <HistoryIcon />
          </ListItemIcon>
          <Typography variant="body2">Parlay History</Typography>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <Typography variant="body2">Sign Out</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
