# Third-party code

Code adapted from MIT-licensed projects. Each entry names the source, the
file it landed in, and the copyright line its license requires.

## nim-duel

- Source: https://github.com/Nailer/nim-duel, `src/lib/nimiq.ts` (waitForConsensus, the post-consensus grace in payNim)
- Here: `src/wallet/send-ready.ts`
- License: MIT. Copyright (c) 2026 Sukuna

## nimiq-radio

- Source: https://github.com/PanoramicRum/nimiq-radio, `apps/web/src/lib/payFlow.ts` (payThenConfirm)
- Here: `src/wallet/pay-then-confirm.ts`
- License: MIT. Copyright (c) 2026 PanoramicRum

## nimiq-app-validatorswipe

- Source: https://github.com/Julien59247787/nimiq-app-validatorswipe, `index.html` (the `vs:pending` lock: storePending, readPending, clearPending, applyLock)
- Here: `src/wallet/send-lock.ts` (pattern rewritten as a store; no code copied verbatim)
- License: MIT. Copyright (c) 2026 Julien CURTO

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
