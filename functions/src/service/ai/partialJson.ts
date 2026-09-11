// Reads the JSON a structured-output response has produced so far.
//
// A streamed draft arrives as a growing prefix of one JSON object, which is not
// valid JSON at any point before the last token. Rather than wait ~25s for the
// close brace, this closes whatever is open and parses that — so a half-written
// `matchupSummary` shows up as a half-written sentence, which is exactly what a
// reader wants to watch.
//
// Deliberately tolerant and deliberately lossy: anything it cannot make sense of
// is dropped rather than guessed at. The authoritative draft is still the parsed
// final response — nothing here ever reaches the validator or a priced leg.

interface ScanState {
  // Open containers, innermost last.
  stack: string[]
  inString: boolean
  escaped: boolean
}

function scan(text: string): ScanState {
  const stack: string[] = []
  let inString = false
  let escaped = false
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '{' || ch === '[') {
      stack.push(ch)
    } else if (ch === '}' || ch === ']') {
      stack.pop()
    }
  }
  return { stack, inString, escaped }
}

// A value that was still being written when the buffer ended: a number missing
// its digits (`1.`, `-`, `2e`), or a truncated keyword (`tru`, `nul`). Closing
// the containers around one of these produces invalid JSON, so it goes.
function dropTrailingPartialValue(text: string): string {
  const trimmed = text.replace(/\s+$/, '')
  const partialNumber = /[-+.eE]$/.exec(trimmed)
  if (partialNumber) {
    return dropTrailingPartialValue(trimmed.slice(0, -1))
  }
  const keyword = /(?:^|[[,:\s])(t|tr|tru|f|fa|fal|fals|n|nu|nul)$/.exec(trimmed)
  if (keyword) {
    return trimmed.slice(0, trimmed.length - keyword[1].length)
  }
  return trimmed
}

// A key with no value yet (`{"a": 1, "b":` or `{"a": 1, "b"`), and the comma
// that would otherwise be left dangling in front of a closing brace.
//
// `insideObject` is what separates a key from a value: inside an array a
// trailing string is the last element and must survive. Within an object, what
// marks a key is sitting directly after `{` or `,` — an object's *value* always
// has a `:` in front of it (`{"a": "x"` keeps its string, `{"a": 1, "b"` and
// `{"b"` both lose theirs).
function dropDanglingKey(text: string, insideObject: boolean): string {
  let out = text.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, '')
  if (insideObject) {
    out = out.replace(/([{,])\s*"(?:[^"\\]|\\.)*"?\s*$/, (_m, before) =>
      before === '{' ? '{' : ''
    )
  }
  return out.replace(/,\s*$/, '')
}

/**
 * Parses the longest valid prefix of a partial JSON document, or null when
 * there is not yet enough to parse. Never throws.
 */
export function parsePartialJson(buffer: string): unknown {
  if (!buffer.trim()) {
    return null
  }

  // Not trimmed: trailing whitespace inside an unterminated string is content,
  // and a sentence being typed a word at a time spends most of its life ending
  // in a space.
  let body = buffer
  const state = scan(body)
  if (state.inString) {
    // A trailing backslash is the first half of an escape sequence; closing the
    // quote behind it would escape the quote itself.
    if (state.escaped) {
      body = body.slice(0, -1)
    }
    body += '"'
  } else {
    body = dropTrailingPartialValue(body)
  }
  // Runs even for a closed string, because the string that just closed may have
  // been a key halfway to its value (`{"a": 1, "bb"`).
  body = dropDanglingKey(body, state.stack.at(-1) === '{')

  const closers = state.stack
    .map(open => (open === '{' ? '}' : ']'))
    .reverse()
    .join('')

  try {
    return JSON.parse(body + closers)
  } catch {
    return null
  }
}
