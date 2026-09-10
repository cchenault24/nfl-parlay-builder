import {
  AccountCircle as AccountIcon,
  History as HistoryIcon,
  NotificationsActive as RemindersIcon,
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
  Switch,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { logOut } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useKickoffReminders } from '../../hooks/useKickoffReminders'
import { AuthModal } from './AuthModal'

interface UserMenuProps {
  onViewHistory?: () => void
}

export const UserMenu: React.FC<UserMenuProps> = ({ onViewHistory }) => {
  const { user, userProfile } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const reminders = useKickoffReminders()

  const close = () => setAnchorEl(null)

  const handleLogout = async () => {
    close()
    try {
      await logOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) {
    return (
      <>
        <Button variant="outlined" startIcon={<LoginIcon />} onClick={() => setAuthModalOpen(true)}>
          Sign in
        </Button>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    )
  }

  const displayName = userProfile?.displayName || user.displayName || 'User'

  return (
    <Box>
      <Button
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}
      >
        <Avatar
          src={userProfile?.photoURL || user.photoURL || undefined}
          alt={displayName}
          sx={{ width: 32, height: 32 }}
        >
          {displayName[0].toUpperCase()}
        </Avatar>
        <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {displayName}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ variant: 'outlined', elevation: 0, sx: { mt: 1, minWidth: 220 } }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <AccountIcon />
          </ListItemIcon>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close()
            onViewHistory?.()
          }}
        >
          <ListItemIcon>
            <HistoryIcon />
          </ListItemIcon>
          <Typography variant="body2">Parlay history</Typography>
        </MenuItem>
        <Divider />
        {/* Stays open on click: toggling a setting isn't navigation, and
            closing the menu would hide the state that just changed. */}
        <MenuItem onClick={reminders.toggle} disabled={reminders.saving}>
          <ListItemIcon>
            <RemindersIcon />
          </ListItemIcon>
          <Typography variant="body2" sx={{ flex: 1, mr: 1 }}>
            Email me before kickoff
          </Typography>
          <Switch size="small" edge="end" checked={reminders.enabled} tabIndex={-1} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <Typography variant="body2">Sign out</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
