# Security

Sinapis is an allergen graph that runs in the browser. This page states what it can and cannot touch.

## Contract addresses and chain id

None. Sinapis has no smart contract and no chain.

## Wallet permissions

None. The app never requests a wallet or a signature.

## Approvals and spenders

None.

## Source and data

Source: https://github.com/mericcintosun/sinapis

All kitchen state lives in this browser: the list of applied supplier changes in `localStorage` (read and written only through `lib/store.ts`) and, with `ADAPTER_MODE=real`, the Relate store `opfs://sinapis-kitchen` in the browser's private file system. The server holds none of it. No API key exists, and every environment variable is public and listed in `.env.example`. "Reset to seed" on the overview (or `/?reset=1`) clears both.

The API routes under `app/api/` answer from the seed through the local graph mirror. They write nothing, and their inputs are validated with zod schemas from `lib/schemas.ts`. No form sends data to a third party.

Decision support, not a medical guarantee.
