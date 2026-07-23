import { createTeamInvite, getReceivedTeamInvites } from '../services/teamInviteService.js'

// 친구 코드(inviteCode)로 상대를 찾아 pending 상태의 팀 초대를 생성한다
export async function sendTeamInvite(req, res) {
  try {
    const { userId } = req.user
    const { inviteCode } = req.body

    if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return res.status(400).json({ message: '초대 코드를 입력해주세요.' })
    }

    const invite = await createTeamInvite(userId, inviteCode.trim())

    return res.status(201).json({
      inviteId: invite.id.toString(),
      fromUserId: invite.fromUserId.toString(),
      toUserId: invite.toUserId.toString(),
      status: invite.status,
      createdAt: invite.createdAt,
    })
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '초대 생성 중 오류가 발생했습니다.' })
  }
}

// 로그인한 유저가 받은 pending 상태의 팀 초대 목록을 보낸 사람의 닉네임과 함께 반환한다
export async function getReceivedInvites(req, res) {
  try {
    const { userId } = req.user

    const invites = await getReceivedTeamInvites(userId)

    return res.status(200).json({
      invites: invites.map((invite) => ({
        inviteId: invite.id.toString(),
        fromUserId: invite.fromUserId.toString(),
        fromUserNickname: invite.fromUser.nickname,
        createdAt: invite.createdAt,
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '초대 목록 조회 중 오류가 발생했습니다.' })
  }
}
