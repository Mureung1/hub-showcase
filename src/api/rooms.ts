import { request } from './client.ts'

export type Room = {
  id: string
  name: string
  inviteCode: string
  memberCount: number
}

export type RoomMemberStatus = {
  userId: string
  nickname: string
  recorded: boolean
  imageUrl?: string
  memo?: string
}

export type RoomToday = {
  roomId: string
  roomName: string
  inviteCode: string
  date: string
  members: RoomMemberStatus[]
}

export function getMyRooms(): Promise<Room[]> {
  return request('/rooms')
}

export function createRoom(name: string): Promise<Room> {
  return request('/rooms', { method: 'POST', body: JSON.stringify({ name }) })
}

export function joinRoom(inviteCode: string): Promise<{ id: string; name: string }> {
  return request('/rooms/join', { method: 'POST', body: JSON.stringify({ inviteCode }) })
}

export function getRoomToday(roomId: string): Promise<RoomToday> {
  return request(`/rooms/${roomId}/today`)
}
