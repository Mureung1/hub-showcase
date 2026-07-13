import type { InitializeResponse } from './generated/InitializeResponse.js'

export type ClientRequestResponseByMethod = {
  initialize: InitializeResponse
}

type ClientRequestResponseContract = {
  schemaPath: string
}

export const clientRequestResponseContracts = {
  initialize: {
    schemaPath: 'v1/InitializeResponse.json',
  },
} as const satisfies Record<
  keyof ClientRequestResponseByMethod,
  ClientRequestResponseContract
>
