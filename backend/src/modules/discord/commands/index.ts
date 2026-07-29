import { helpCommand } from './help.command.js'
import { guideCommand } from './guide.command.js'
import { keywordCommand } from './keyword.command.js'
import { setupCommand } from './setup.command.js'
import { subscribeCommand } from './subscribe.command.js'

export const discordCommands = [helpCommand, setupCommand, subscribeCommand, keywordCommand, guideCommand]

export const discordCommandMap = new Map(discordCommands.map((command) => [command.name, command]))
