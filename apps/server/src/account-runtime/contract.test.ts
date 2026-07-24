import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  AccountRuntimeCoordinator,
  AccountRuntimeTransitionLease,
} from './contract.js'

type Account = { readonly state: 'chatgpt' }
type Workspace = { readonly workspaceId: string }
type Ready = { readonly state: 'ready' }

type Lease = AccountRuntimeTransitionLease<Account, Workspace, Ready>
type Coordinator = AccountRuntimeCoordinator<Account, Workspace, Ready>
type Assert<T extends true> = T
type LeaseRoster = Assert<
  keyof Lease extends 'runAccountOperation' | 'transitionToWorkspace'
    ? true
    : false
>
type CoordinatorRoster = Assert<
  keyof Coordinator extends
    | 'runAccountOperation'
    | 'transitionToWorkspace'
    | 'logout'
    | 'close'
    ? true
    : false
>

test('account Runtime contract freezes one transition lease surface', () => {
  const leaseRoster: LeaseRoster = true
  const coordinatorRoster: CoordinatorRoster = true
  assert.equal(leaseRoster, true)
  assert.equal(coordinatorRoster, true)
})
