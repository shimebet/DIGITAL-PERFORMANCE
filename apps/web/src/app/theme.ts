import {
  createTheme,
} from '@mui/material/styles';

export const appTheme =
  createTheme({
    palette: {
      mode: 'light',

      primary: {
        main: '#800080',
        dark: '#600060',
        light: '#F3E5F5',
      },

      secondary: {
        main: '#C79A2B',
      },

      background: {
        default: '#F5F7F8',
        paper: '#FFFFFF',
      },

      text: {
        primary: '#18231D',
        secondary: '#66736C',
      },

      divider:
        '#E1E6E3',

      success: {
        main: '#198754',
      },

      warning: {
        main: '#D99A00',
      },

      error: {
        main: '#C0392B',
      },

      info: {
        main: '#1976D2',
      },
    },

    typography: {
      fontFamily: [
        'Inter',
        '"Segoe UI"',
        'Roboto',
        'Arial',
        'sans-serif',
      ].join(','),

      h4: {
        fontWeight: 700,
      },

      h5: {
        fontWeight: 700,
      },

      h6: {
        fontWeight: 600,
      },

      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },

    shape: {
      borderRadius: 10,
    },

    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },

      MuiTextField: {
        defaultProps: {
          size: 'medium',
        },
      },
    },
  });