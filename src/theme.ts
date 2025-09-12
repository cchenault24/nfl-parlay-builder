import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2e7d32', // NFL Green
    },
    secondary: {
      main: '#ff9800', // Orange accent
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    // Default font for everything
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    h4: {
      fontWeight: 600,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    h5: {
      fontWeight: 600,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    h6: {
      fontWeight: 500,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    body2: {
      fontWeight: 400,
      lineHeight: 1.6,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.02em',
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Force Inter everywhere
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter for inputs
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter for selects
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Explicit Inter for menu items
        },
      },
    },
  },
})
