import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js'
import type { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js'
import { discordService } from '../discord.service.js'
import { subscriptionService } from '../../subscription/subscription.service.js'
import type { DiscordCommand } from './discord-command.types.js'

const maxDiscordButtonCount = 25
const maxDiscordActionRowButtonCount = 5
const irisEmbedColor = 0x633df4
export const subscribeCategoryButtonPrefix = 'subscribe:category:'

const subscribeCommandData = new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('공지 카테고리 구독을 관리합니다.')

export async function executeSubscribeCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 명령어는 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  const { categories, invalidCategories } = await subscriptionService.getSubscribableCategories(
    interaction.guildId,
  )

  if (categories.length === 0) {
    await interaction.reply({
      content: '구독할 수 있는 활성 카테고리가 없습니다. 서버 관리자에게 IRIS 설정을 요청해주세요.',
      ephemeral: true,
    })
    return
  }

  if (invalidCategories.length > 0) {
    await interaction.reply({
      content:
        '일부 카테고리의 역할 설정이 올바르지 않아 구독을 변경할 수 없습니다. 서버 관리자에게 `/setup`에서 카테고리 역할 설정을 다시 저장해달라고 요청해주세요.',
      ephemeral: true,
    })
    return
  }

  const subscribedCategoryIds = await subscriptionService.getUserSubscribedCategoryIds(
    interaction.guildId,
    interaction.user.id,
  )

  await interaction.reply({
    ...buildSubscribeMessage(),
    components: buildSubscribeCategoryRows(categories, subscribedCategoryIds),
    ephemeral: true,
  })
}

export async function executeSubscribeCategoryButton(interaction: ButtonInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 버튼은 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  const categoryId = Number(interaction.customId.slice(subscribeCategoryButtonPrefix.length))

  if (!Number.isInteger(categoryId)) {
    await interaction.update({
      content: '선택한 카테고리를 찾을 수 없습니다. 다시 `/subscribe`를 실행해주세요.',
      components: [],
    })
    return
  }

  const { categories, invalidCategories } = await subscriptionService.getSelectedSubscribableCategories(
    interaction.guildId,
    [categoryId],
  )

  if (categories.length === 0) {
    await interaction.update({
      content: '선택한 카테고리를 찾을 수 없습니다. 다시 `/subscribe`를 실행해주세요.',
      components: [],
    })
    return
  }

  if (invalidCategories.length > 0) {
    await interaction.update({
      content:
        '일부 카테고리의 역할 설정이 올바르지 않아 구독을 변경할 수 없습니다. 서버 관리자에게 `/setup`에서 카테고리 역할 설정을 다시 저장해달라고 요청해주세요.',
      components: [],
    })
    return
  }

  const selectedCategory = categories[0]

  if (!selectedCategory?.roleId) {
    await interaction.update({
      content:
        '선택한 카테고리의 역할 설정이 올바르지 않아 구독을 변경할 수 없습니다. 서버 관리자에게 `/setup`에서 카테고리 역할 설정을 다시 저장해달라고 요청해주세요.',
      components: [],
    })
    return
  }

  const subscribedCategoryIds = await subscriptionService.getUserSubscribedCategoryIds(
    interaction.guildId,
    interaction.user.id,
  )
  const isSubscribed = subscribedCategoryIds.includes(selectedCategory.categoryId)

  if (isSubscribed) {
    await discordService.removeMemberRole(interaction.guildId, interaction.user.id, selectedCategory.roleId)
    await subscriptionService.deleteSubscription(interaction.user.id, selectedCategory.categoryId)
  } else {
    await discordService.addMemberRole(interaction.guildId, interaction.user.id, selectedCategory.roleId)
    await subscriptionService.createSubscription(interaction.user.id, selectedCategory.categoryId)
  }

  const { categories: allCategories } = await subscriptionService.getSubscribableCategories(
    interaction.guildId,
  )
  const nextSubscribedCategoryIds = await subscriptionService.getUserSubscribedCategoryIds(
    interaction.guildId,
    interaction.user.id,
  )

  await interaction.update({
    ...buildSubscribeMessage(`${selectedCategory.name} 카테고리를 ${isSubscribed ? '구독 해제했습니다.' : '구독했습니다.'}`),
    components: buildSubscribeCategoryRows(allCategories, nextSubscribedCategoryIds),
  })
}

function buildSubscribeMessage(notice?: string) {
  const descriptionLines = [
    ...(notice ? [notice, ''] : []),
    '구독할 카테고리를 선택하세요.',
    '버튼을 누르면 구독 상태가 바로 변경됩니다.',
  ]

  return {
    content: '',
    embeds: [
      new EmbedBuilder()
        .setTitle('구독 카테고리')
        .setDescription(descriptionLines.join('\n'))
        .setColor(irisEmbedColor),
    ],
  }
}

function buildSubscribeCategoryRows(
  categories: { categoryId: number; name: string }[],
  subscribedCategoryIds: number[],
) {
  const subscribedCategoryIdSet = new Set(subscribedCategoryIds)
  const visibleCategories = categories.slice(0, maxDiscordButtonCount)
  const rows: ActionRowBuilder<ButtonBuilder>[] = []

  for (let index = 0; index < visibleCategories.length; index += maxDiscordActionRowButtonCount) {
    const rowCategories = visibleCategories.slice(index, index + maxDiscordActionRowButtonCount)
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      rowCategories.map((category) => {
        const isSubscribed = subscribedCategoryIdSet.has(category.categoryId)

        return new ButtonBuilder()
          .setCustomId(`${subscribeCategoryButtonPrefix}${category.categoryId}`)
          .setLabel(category.name)
          .setStyle(isSubscribed ? ButtonStyle.Primary : ButtonStyle.Secondary)
      }),
    )

    rows.push(row)
  }

  return rows
}

export const subscribeCommand: DiscordCommand = {
  name: 'subscribe',
  data: subscribeCommandData,
  execute: executeSubscribeCommand,
}
