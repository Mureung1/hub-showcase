import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js'
import type { Keyword } from '@prisma/client'
import { keywordService } from '../../keyword/keyword.service.js'
import { noticeConfigRepository } from '../../notice-config/notice-config.repository.js'
import type { DiscordCommand } from './discord-command.types.js'

const keywordViewPageSize = 10
const keywordDeletePageSize = 25
const keywordInputCustomId = 'keyword:value'
const irisEmbedColor = 0x633df4

export const keywordAddButtonCustomId = 'keyword:add'
export const keywordDeleteModeButtonCustomId = 'keyword:delete-mode'
export const keywordDeleteCancelButtonCustomId = 'keyword:delete-cancel'
export const keywordDeleteConfirmButtonCustomId = 'keyword:delete-confirm'
export const keywordPageButtonPrefix = 'keyword:page:'
export const keywordDeletePageButtonPrefix = 'keyword:delete-page:'
export const keywordAddModalCustomId = 'keyword:add-modal'
export const keywordDeleteSelectCustomId = 'keyword:delete-select'

const pendingKeywordDeleteIds = new Map<string, number[]>()

const keywordCommandData = new SlashCommandBuilder()
  .setName('keyword')
  .setDescription('키워드 알림을 관리합니다.')

export async function executeKeywordCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 명령어는 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  await interaction.reply({
    ...(await buildKeywordMessage(interaction.guildId, interaction.user.id)),
    ephemeral: true,
  })
}

export async function executeKeywordButton(interaction: ButtonInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 버튼은 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  if (interaction.customId === keywordAddButtonCustomId) {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(keywordAddModalCustomId)
        .setTitle('키워드 추가')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId(keywordInputCustomId)
              .setLabel('추가할 키워드')
              .setPlaceholder('예: 장학')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(50)
              .setRequired(true),
          ),
        ),
    )
    return
  }

  if (interaction.customId === keywordDeleteModeButtonCustomId) {
    clearPendingKeywordDelete(interaction.message.id, interaction.user.id)
    await interaction.update({
      ...(await buildKeywordMessage(interaction.guildId, interaction.user.id, undefined, 0, 'delete')),
    })
    return
  }

  if (interaction.customId === keywordDeleteCancelButtonCustomId) {
    clearPendingKeywordDelete(interaction.message.id, interaction.user.id)

    await interaction.update({
      ...(await buildKeywordMessage(interaction.guildId, interaction.user.id)),
    })
    return
  }

  if (interaction.customId === keywordDeleteConfirmButtonCustomId) {
    const keywordIds = getPendingKeywordDelete(interaction.message.id, interaction.user.id)

    if (keywordIds.length > 0) {
      await keywordService.removeKeywordsByIds(interaction.guildId, interaction.user.id, keywordIds)
      clearPendingKeywordDelete(interaction.message.id, interaction.user.id)

      await interaction.update({
        ...(await buildKeywordMessage(interaction.guildId, interaction.user.id)),
      })
      return
    }

    await interaction.update({
      ...(await buildKeywordMessage(interaction.guildId, interaction.user.id)),
    })
    return
  }

  if (interaction.customId.startsWith(keywordPageButtonPrefix)) {
    const page = Number(interaction.customId.slice(keywordPageButtonPrefix.length))
    await interaction.update({
      ...(await buildKeywordMessage(interaction.guildId, interaction.user.id, undefined, page)),
    })
    return
  }

  if (interaction.customId.startsWith(keywordDeletePageButtonPrefix)) {
    const page = Number(interaction.customId.slice(keywordDeletePageButtonPrefix.length))
    const keywordIds = getPendingKeywordDelete(interaction.message.id, interaction.user.id)
    await interaction.update({
      ...(await buildKeywordMessage(
        interaction.guildId,
        interaction.user.id,
        undefined,
        page,
        'delete',
        keywordIds.length > 0,
        keywordIds,
      )),
    })
    return
  }

  await interaction.reply({
    content: '처리할 수 없는 키워드 버튼입니다.',
    ephemeral: true,
  })
}

export async function executeKeywordAddModal(interaction: ModalSubmitInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 입력 창은 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  const keyword = interaction.fields.getTextInputValue(keywordInputCustomId)
  await keywordService.addKeyword(interaction.guildId, interaction.user.id, keyword)
  const message = await buildKeywordMessage(interaction.guildId, interaction.user.id)

  if (interaction.isFromMessage()) {
    await interaction.update(message)
    return
  }

  await interaction.reply({
    ...message,
    ephemeral: true,
  })
}

export async function executeKeywordDeleteSelect(interaction: StringSelectMenuInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 선택 메뉴는 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  const keywordIds = interaction.values.map((value) => Number(value))
  setPendingKeywordDelete(interaction.message.id, interaction.user.id, keywordIds)

  await interaction.update({
    ...(await buildKeywordMessage(
      interaction.guildId,
      interaction.user.id,
      `${keywordIds.length}개의 키워드를 선택했습니다.`,
      0,
      'delete',
      true,
      keywordIds,
    )),
  })
}

type KeywordMode = 'view' | 'delete'

async function buildKeywordMessage(
  guildId: string,
  userId: string,
  notice?: string,
  page = 0,
  mode: KeywordMode = 'view',
  canConfirmDelete = false,
  selectedKeywordIds: number[] = [],
) {
  const keywords = await keywordService.listKeywords(guildId, userId)
  const noticeSite = await noticeConfigRepository.findByGuildId(guildId)
  const normalizedPage = normalizePage(page, keywords.length, mode)

  return {
    content: '',
    embeds: [
      renderKeywordEmbed(
        keywords,
        notice,
        normalizedPage,
        mode,
        selectedKeywordIds,
        Boolean(noticeSite),
      ),
    ],
    components: buildKeywordRows(keywords, normalizedPage, mode, canConfirmDelete, selectedKeywordIds),
  }
}

function renderKeywordEmbed(
  keywords: Keyword[],
  notice?: string,
  page = 0,
  mode: KeywordMode = 'view',
  selectedKeywordIds: number[] = [],
  hasNoticeConfig = true,
) {
  const embed = new EmbedBuilder()
    .setTitle(mode === 'delete' ? '키워드 삭제' : '키워드 목록')
    .setColor(irisEmbedColor)
  const lines: string[] = []

  if (notice) {
    lines.push(notice, '')
  }

  if (!hasNoticeConfig && mode === 'view') {
    lines.push('아직 공지 사이트 설정이 완료되지 않았습니다.', '설정 완료 후 새 공지부터 키워드 알림을 받을 수 있습니다.', '')
  }

  if (keywords.length === 0) {
    lines.push('등록된 키워드가 없습니다.')
    return embed.setDescription(lines.join('\n'))
  }

  const pageSize = getPageSize(mode)
  const startIndex = page * pageSize
  const pageKeywords = keywords.slice(startIndex, startIndex + pageSize)

  if (mode === 'delete') {
    const selectedKeywordIdSet = new Set(selectedKeywordIds)
    const selectedKeywords = keywords.filter((keyword) => selectedKeywordIdSet.has(keyword.id))

    if (selectedKeywords.length > 0) {
      lines.push('선택한 키워드', '', selectedKeywords.map((keyword) => `**${keyword.keyword}**`).join(', '))
    } else if (!notice) {
      lines.push('삭제할 키워드를 선택하세요.')
    }

    return embed.setDescription(lines.join('\n'))
  }

  lines.push('', ...pageKeywords.map((keyword, index) => `${startIndex + index + 1}. **${keyword.keyword}**`))
  return embed.setDescription(lines.join('\n'))
}

type KeywordComponentRow = ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>

function buildKeywordRows(
  keywords: Keyword[],
  page: number,
  mode: KeywordMode,
  canConfirmDelete: boolean,
  selectedKeywordIds: number[],
): KeywordComponentRow[] {
  const pageSize = getPageSize(mode)
  const startIndex = page * pageSize
  const pageKeywords = keywords.slice(startIndex, startIndex + pageSize)
  const rows: KeywordComponentRow[] =
    mode === 'delete' ? buildKeywordDeleteRows(pageKeywords, selectedKeywordIds) : []

  rows.push(buildKeywordActionRow(keywords.length, page, mode, canConfirmDelete))
  return rows
}

function buildKeywordDeleteRows(
  keywords: Keyword[],
  selectedKeywordIds: number[],
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const selectedKeywordIdSet = new Set(selectedKeywordIds)

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(keywordDeleteSelectCustomId)
        .setPlaceholder('삭제할 키워드 선택')
        .setMinValues(1)
        .setMaxValues(keywords.length)
        .addOptions(
          keywords.map((keyword) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(keyword.keyword)
              .setValue(String(keyword.id))
              .setDefault(selectedKeywordIdSet.has(keyword.id)),
          ),
        ),
    ),
  ]
}

function buildKeywordActionRow(keywordCount: number, page: number, mode: KeywordMode, canConfirmDelete: boolean) {
  const totalPages = getTotalPages(keywordCount, mode)
  const hasMultiplePages = totalPages > 1
  const pageButtonPrefix = mode === 'delete' ? keywordDeletePageButtonPrefix : keywordPageButtonPrefix

  const row = new ActionRowBuilder<ButtonBuilder>()

  if (mode === 'delete') {
    if (canConfirmDelete) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(keywordDeleteConfirmButtonCustomId)
          .setLabel('삭제하기')
          .setStyle(ButtonStyle.Danger),
      )
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(keywordDeleteCancelButtonCustomId)
        .setLabel('나가기')
        .setStyle(ButtonStyle.Secondary),
    )
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(keywordAddButtonCustomId)
        .setLabel('키워드 추가')
        .setStyle(ButtonStyle.Primary),
    )
  }

  if (keywordCount > 0 && mode === 'view') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(keywordDeleteModeButtonCustomId)
        .setLabel('키워드 삭제')
        .setStyle(ButtonStyle.Danger),
    )
  }

  if (hasMultiplePages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${pageButtonPrefix}${Math.max(page - 1, 0)}`)
        .setLabel('이전')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`${pageButtonPrefix}${Math.min(page + 1, totalPages - 1)}`)
        .setLabel('다음')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    )
  }

  return row
}

function normalizePage(page: number, keywordCount: number, mode: KeywordMode) {
  if (!Number.isInteger(page) || page < 0) {
    return 0
  }

  return Math.min(page, getTotalPages(keywordCount, mode) - 1)
}

function getTotalPages(keywordCount: number, mode: KeywordMode) {
  return Math.max(Math.ceil(keywordCount / getPageSize(mode)), 1)
}

function getPageSize(mode: KeywordMode) {
  return mode === 'delete' ? keywordDeletePageSize : keywordViewPageSize
}

function getPendingKeywordDeleteKey(messageId: string, userId: string) {
  return `${messageId}:${userId}`
}

function setPendingKeywordDelete(messageId: string, userId: string, keywordIds: number[]) {
  pendingKeywordDeleteIds.set(getPendingKeywordDeleteKey(messageId, userId), keywordIds)
}

function getPendingKeywordDelete(messageId: string, userId: string) {
  return pendingKeywordDeleteIds.get(getPendingKeywordDeleteKey(messageId, userId)) ?? []
}

function clearPendingKeywordDelete(messageId: string, userId: string) {
  pendingKeywordDeleteIds.delete(getPendingKeywordDeleteKey(messageId, userId))
}

export const keywordCommand: DiscordCommand = {
  name: 'keyword',
  data: keywordCommandData,
  execute: executeKeywordCommand,
}
