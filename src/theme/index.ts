import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  fonts: {
    heading: '"Noto Sans SC", sans-serif',
    body: '"Noto Sans SC", sans-serif',
  },
  colors: {
    brand: {
      50: '#F0EDFF',
      100: '#D9D3FF',
      200: '#B3A9FF',
      300: '#A29BFE',
      400: '#8B7FFA',
      500: '#6C5CE7',
      600: '#5A4BD6',
      700: '#4839C5',
      800: '#3628B4',
      900: '#2417A3',
    },
    success: {
      500: '#00B894',
      600: '#00A381',
    },
    warning: {
      500: '#FDCB6E',
      600: '#F0B842',
    },
    danger: {
      500: '#FF7675',
      600: '#E05655',
    },
    critical: {
      500: '#E53E3E',
      600: '#C53030',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: {
          borderRadius: '12px',
          fontWeight: '500',
          _hover: {
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          },
          _active: {
            transform: 'translateY(0)',
          },
        },
        outline: {
          borderRadius: '12px',
          fontWeight: '500',
        },
        ghost: {
          borderRadius: '12px',
          fontWeight: '500',
        },
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          field: {
            borderRadius: '12px',
          },
        },
        filled: {
          field: {
            borderRadius: '12px',
          },
        },
      },
    },
    Select: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          field: {
            borderRadius: '12px',
          },
        },
      },
    },
    Textarea: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          borderRadius: '12px',
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(108, 92, 231, 0.08)',
          overflow: 'hidden',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: '8px',
        px: 2,
        py: 0.5,
        fontWeight: '500',
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: '20px',
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: '#F7F8FC',
        color: '#2D3748',
        fontFamily: '"Noto Sans SC", sans-serif',
      },
      '*': {
        transition: 'all 0.2s ease',
      },
    },
  },
})

export default theme
