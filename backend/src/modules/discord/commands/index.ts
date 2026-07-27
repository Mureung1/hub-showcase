import { helpCommand } from './help.command.js'
import { keywordCommand } from './keyword.command.js'
import { setupCommand } from './setup.command.js'
import { subscribeCommand } from './subscribe.command.js'

export const discordCommands = [helpCommand, setupCommand, subscribeCommand, keywordCommand]

export const discordCommandMap = new Map(discordCommands.map((command) => [command.name, command]))
