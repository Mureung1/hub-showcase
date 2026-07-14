import { useEffect, useState } from 'react'
import * as friendsApi from './friendsApi'
import type { FriendRequestSummary, FriendSummary } from './types'

export function useFriendsManager() {
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestSummary[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestSummary[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    friendsApi.fetchFriends()
      .then((loaded) => { if (!cancelled) setFriends(loaded) })
      .catch(() => { if (!cancelled) setNotice('친구 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.') })
      .finally(() => { if (!cancelled) setFriendsLoading(false) })

    friendsApi.fetchFriendRequests()
      .then((loaded) => {
        if (!cancelled) {
          setIncomingRequests(loaded.incoming)
          setOutgoingRequests(loaded.outgoing)
        }
      })
      .catch(() => { if (!cancelled) setNotice('친구 요청을 불러오지 못했어요. 잠시 후 다시 시도해주세요.') })
      .finally(() => { if (!cancelled) setRequestsLoading(false) })

    return () => {
      cancelled = true
    }
  }, [])

  const sendFriendRequest = async (email: string) => {
    try {
      const result = await friendsApi.sendFriendRequest(email)
      if (result.status === 'friended') {
        setFriends((current) => [...current, result.friend])
        setNotice(`${result.friend.name}님과 친구가 되었어요!`)
      } else {
        setNotice('친구 요청을 보냈어요.')
        const requests = await friendsApi.fetchFriendRequests()
        setOutgoingRequests(requests.outgoing)
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '친구 요청을 보내지 못했어요.')
    }
  }

  const acceptRequest = async (requestId: string) => {
    try {
      const friend = await friendsApi.acceptFriendRequest(requestId)
      setFriends((current) => [...current, friend])
      setIncomingRequests((current) => current.filter((request) => request.id !== requestId))
      setNotice(`${friend.name}님과 친구가 되었어요!`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '친구 요청을 수락하지 못했어요.')
    }
  }

  const declineRequest = async (requestId: string) => {
    try {
      await friendsApi.respondToFriendRequest(requestId)
      setIncomingRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '친구 요청을 거절하지 못했어요.')
    }
  }

  const cancelRequest = async (requestId: string) => {
    try {
      await friendsApi.respondToFriendRequest(requestId)
      setOutgoingRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '친구 요청을 취소하지 못했어요.')
    }
  }

  const removeFriend = async (friendId: string) => {
    try {
      await friendsApi.removeFriend(friendId)
      setFriends((current) => current.filter((friend) => friend.id !== friendId))
      setNotice('친구를 삭제했어요.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '친구를 삭제하지 못했어요.')
    }
  }

  return {
    friends,
    friendsLoading,
    incomingRequests,
    outgoingRequests,
    requestsLoading,
    notice,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  }
}

export type FriendsManager = ReturnType<typeof useFriendsManager>
