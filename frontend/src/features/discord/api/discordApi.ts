import { getJson } from '../../../api/httpClient'
import type { DiscordChannel } from '../types/discordTypes'

interface DiscordChannelsResponse {
  data: {
    channels: DiscordChannel[]
  }
}

export async function getDiscordChannels(guildId: string) {
  const response = await getJson<DiscordChannelsResponse>(`/admin/${guildId}/discord/channels`)

  return response.data.channels
}
