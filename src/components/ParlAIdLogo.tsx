import { Box, type SxProps, type Theme } from '@mui/material'
import React from 'react'

type ResponsiveHeight = number | Partial<Record<'xs' | 'sm' | 'md', number>>

interface ParlAIdLogoProps {
  height?: ResponsiveHeight
  variant?: 'onDark' | 'onLight'
  sx?: SxProps<Theme>
}

// Wordmark artwork lives in /public; pick the variant by the background it sits on.
const SRC = {
  onDark: '/parlaid-wordmark-white.png',
  onLight: '/parlaid-wordmark-black.png',
}

const ParlAIdLogo: React.FC<ParlAIdLogoProps> = ({
  height = 40,
  variant = 'onDark',
  sx,
}) => (
  <Box
    component="img"
    src={SRC[variant]}
    alt="ParlAId — AI powered NFL parlay generator"
    draggable={false}
    sx={{
      height,
      width: 'auto',
      display: 'block',
      userSelect: 'none',
      ...sx,
    }}
  />
)

export default ParlAIdLogo
