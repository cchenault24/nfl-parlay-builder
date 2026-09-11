// One rendering of a kickoff time for every surface that shows one. The list
// row used the device zone with no suffix and the matchup hero used Eastern
// with an "ET" suffix, so the same game read "Sun 10:00 AM" on one screen and
// "Sun 1:00 PM ET" on the next. Device-local, unlabelled, is the iOS convention.
export const formatKickoff = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
