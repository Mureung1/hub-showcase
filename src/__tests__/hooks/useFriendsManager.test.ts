import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/scheduler/friendsApi', () => ({
  fetchFriends: vi.fn(),
  fetchFriendRequests: vi.fn(),
  fetchGroups: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  respondToFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  createGroup: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
  addGroupMember: vi.fn(),
  removeGroupMember: vi.fn(),
}))

const friendsApi = await import('../../components/scheduler/friendsApi')
const { useFriendsManager } = await import('../../components/scheduler/useFriendsManager')

const FRIEND_A = { id: 'friend-a', name: 'A', email: 'a@b.com' }
const FRIEND_B = { id: 'friend-b', name: 'B', email: 'b@b.com' }

async function renderReady() {
  const view = renderHook(() => useFriendsManager())
  await waitFor(() => expect(view.result.current.friendsLoading).toBe(false))
  await waitFor(() => expect(view.result.current.requestsLoading).toBe(false))
  await waitFor(() => expect(view.result.current.groupsLoading).toBe(false))
  return view
}

describe('useFriendsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(friendsApi.fetchFriends).mockResolvedValue([FRIEND_A])
    vi.mocked(friendsApi.fetchFriendRequests).mockResolvedValue({ incoming: [], outgoing: [] })
    vi.mocked(friendsApi.fetchGroups).mockResolvedValue([])
  })

  it('마운트되면 친구·요청·그룹 목록을 각각 독립적으로 불러온다', async () => {
    const { result } = await renderReady()

    expect(result.current.friends).toEqual([FRIEND_A])
    expect(result.current.incomingRequests).toEqual([])
    expect(result.current.groups).toEqual([])
  })

  it('sendFriendRequest — 상대가 이미 나를 요청해둔 상태면 즉시 친구가 되고 안내 문구가 뜬다', async () => {
    const { result } = await renderReady()
    vi.mocked(friendsApi.sendFriendRequest).mockResolvedValue({ status: 'friended', friend: FRIEND_B })

    await act(async () => {
      await result.current.sendFriendRequest('b@b.com')
    })

    expect(result.current.friends).toEqual([FRIEND_A, FRIEND_B])
    expect(result.current.notice).toBe('B님과 친구가 되었어요!')
  })

  it('sendFriendRequest — 그 외에는 요청만 보내고 보낸 요청 목록을 다시 불러온다', async () => {
    const { result } = await renderReady()
    vi.mocked(friendsApi.sendFriendRequest).mockResolvedValue({ status: 'requested' })
    const outgoing = [{ id: 'req-1', user: FRIEND_B, createdAt: '2026-07-23T00:00:00.000Z' }]
    vi.mocked(friendsApi.fetchFriendRequests).mockResolvedValue({ incoming: [], outgoing })

    await act(async () => {
      await result.current.sendFriendRequest('b@b.com')
    })

    expect(result.current.notice).toBe('친구 요청을 보냈어요.')
    expect(result.current.outgoingRequests).toEqual(outgoing)
  })

  it('acceptRequest는 받은 요청 목록에서 빼고 친구 목록에 더한다', async () => {
    vi.mocked(friendsApi.fetchFriendRequests).mockResolvedValue({
      incoming: [{ id: 'req-1', user: FRIEND_B, createdAt: '2026-07-23T00:00:00.000Z' }],
      outgoing: [],
    })
    const { result } = await renderReady()
    vi.mocked(friendsApi.acceptFriendRequest).mockResolvedValue(FRIEND_B)

    await act(async () => {
      await result.current.acceptRequest('req-1')
    })

    expect(result.current.friends).toEqual([FRIEND_A, FRIEND_B])
    expect(result.current.incomingRequests).toEqual([])
  })

  it('removeFriend는 친구 목록뿐 아니라 그룹 멤버 목록에서도 같이 지운다', async () => {
    vi.mocked(friendsApi.fetchGroups).mockResolvedValue([{ id: 'group-1', name: '절친', members: [FRIEND_A] }])
    const { result } = await renderReady()

    await act(async () => {
      await result.current.removeFriend('friend-a')
    })

    expect(result.current.friends).toEqual([])
    expect(result.current.groups).toEqual([{ id: 'group-1', name: '절친', members: [] }])
    expect(result.current.notice).toBe('친구를 삭제했어요.')
  })

  it('createGroup 실패 시 서버 에러 메시지를 그대로 안내한다', async () => {
    const { result } = await renderReady()
    vi.mocked(friendsApi.createGroup).mockRejectedValue(new Error('이미 같은 이름의 그룹이 있어요.'))

    await act(async () => {
      await result.current.createGroup('절친')
    })

    expect(result.current.notice).toBe('이미 같은 이름의 그룹이 있어요.')
    expect(result.current.groups).toEqual([])
  })
})
