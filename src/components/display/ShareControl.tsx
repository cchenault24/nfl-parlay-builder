import CheckIcon from '@mui/icons-material/Check'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import ShareIcon from '@mui/icons-material/Share'
import { Button, Tooltip } from '@mui/material'
import React, { useState } from 'react'
import { auth } from '../../config/firebase'
import { shareParlay, shareUrl, unshareParlay } from '../../services/ShareService'
import type { GeneratedParlay } from '../../types'

// Sharing is per parlay and opt-in: nothing is readable by link until the
// owner asks for one, and revoking deletes the public copy outright.
export const ShareControl: React.FC<{ parlay: GeneratedParlay }> = ({ parlay }) => {
  const [shareId, setShareId] = useState<string | undefined>(parlay.shareId)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withToken = async (fn: (token: string) => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not signed in')
      }
      await fn(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const onShare = () =>
    withToken(async token => {
      const id = shareId ?? (await shareParlay(parlay.parlayId, token))
      setShareId(id)
      await navigator.clipboard.writeText(shareUrl(id)).catch(() => undefined)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })

  const onUnshare = () =>
    withToken(async token => {
      await unshareParlay(parlay.parlayId, token)
      setShareId(undefined)
    })

  return (
    <>
      <Tooltip title={error ?? (shareId ? 'Copy link again' : 'Create a link anyone can open')}>
        <span>
          <Button
            size="small"
            color={error ? 'error' : 'inherit'}
            disabled={busy}
            startIcon={copied ? <CheckIcon /> : <ShareIcon />}
            onClick={onShare}
          >
            {copied ? 'Copied' : shareId ? 'Shared' : 'Share'}
          </Button>
        </span>
      </Tooltip>
      {shareId && (
        <Tooltip title="Stop sharing — the link stops working">
          <span>
            <Button
              size="small"
              color="inherit"
              disabled={busy}
              startIcon={<LinkOffIcon />}
              onClick={onUnshare}
            >
              Unshare
            </Button>
          </span>
        </Tooltip>
      )}
    </>
  )
}

export default ShareControl
