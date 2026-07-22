import { loginDiscordBot } from './discord.client.js'

const client = await loginDiscordBot()

console.log(`Discord bot logged in as ${client.user?.tag ?? 'unknown user'}`)

client.destroy()
