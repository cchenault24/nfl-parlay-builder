import { Box, Button, TextField, Typography } from '@mui/material'
import React from 'react'
import useParlayStore from '../store/parlayStore'

type LegSelectorProps = {
  disabled: boolean
}

export const LegSelector: React.FC<LegSelectorProps> = ({ disabled }) => {
  const legCount = useParlayStore(state => state.legCount)
  const setLegCount = useParlayStore(state => state.setLegCount)
  return (
    <Box
      id="legSelectorContainer"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography>Select number of legs</Typography>
      <Box
        id="legSelectorDescription"
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'baseline',
        }}
      >
        <Button
          id="decrementLeg"
          variant="contained"
          sx={{
            minWidth: 0, // removes default min width
            width: 40, // same width/height
            height: 40,
            borderRadius: '50%', // makes it circular
            padding: 0, // centers icon/text cleanly
          }}
          onClick={() => setLegCount(legCount - 1)}
          disabled={disabled || legCount === 2}
        >
          -
        </Button>
        <TextField
          id="legSelectorInput"
          variant="outlined"
          sx={{ marginBottom: '24px', width: '75px', mx: '16px' }}
          value={legCount}
          inputProps={{ style: { textAlign: 'center' } }}
          disabled={disabled}
        />
        <Button
          id="increaseLeg"
          variant="contained"
          sx={{
            minWidth: 0, // removes default min width
            width: 40, // same width/height
            height: 40,
            borderRadius: '50%', // makes it circular
            padding: 0, // centers icon/text cleanly
          }}
          onClick={() => setLegCount(legCount + 1)}
          disabled={disabled || legCount === 6}
        >
          +
        </Button>
      </Box>
    </Box>
  )
}
