import { subscriptionRepository } from './subscription.repository.js'

type SubscribableCategory = {
  categoryId: number
  name: string
  roleId: string | null
  roleName: string
}

export class SubscriptionService {
  async getSubscribableCategories(guildId: string) {
    const categories = await subscriptionRepository.findActiveCategoriesByGuildId(guildId)
    const invalidCategories = categories.filter((category) => !category.roleId)

    return {
      categories: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        roleId: category.roleId,
        roleName: category.roleName,
      })),
      invalidCategories: invalidCategories.map((category) => ({
        categoryId: category.id,
        name: category.name,
      })),
    }
  }

  async getSelectedSubscribableCategories(guildId: string, categoryIds: number[]) {
    const categories = await subscriptionRepository.findActiveCategoriesByGuildIdAndIds(
      guildId,
      categoryIds,
    )
    const invalidCategories = categories.filter((category) => !category.roleId)

    return {
      categories: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        roleId: category.roleId,
        roleName: category.roleName,
      })),
      invalidCategories: invalidCategories.map((category) => ({
        categoryId: category.id,
        name: category.name,
      })),
    }
  }

  async getUserSubscriptionChanges(guildId: string, userId: string, selectedCategoryIds: number[]) {
    const currentSubscriptions = await subscriptionRepository.findUserSubscriptionsByGuildId(guildId, userId)
    const currentCategoryIds = new Set(
      currentSubscriptions.map((subscription) => subscription.categoryId),
    )
    const selectedCategoryIdSet = new Set(selectedCategoryIds)
    const addedCategoryIds = selectedCategoryIds.filter((categoryId) => !currentCategoryIds.has(categoryId))
    const removedSubscriptions = currentSubscriptions.filter(
      (subscription) => !selectedCategoryIdSet.has(subscription.categoryId),
    )

    return {
      addedCategoryIds,
      removedCategories: removedSubscriptions.map((subscription) => ({
        categoryId: subscription.category.id,
        name: subscription.category.name,
        roleId: subscription.category.roleId,
        roleName: subscription.category.roleName,
      })),
    }
  }

  async getUserSubscribedCategoryIds(guildId: string, userId: string) {
    const subscriptions = await subscriptionRepository.findUserSubscriptionsByGuildId(guildId, userId)

    return subscriptions.map((subscription) => subscription.categoryId)
  }

  replaceUserSubscriptions(guildId: string, userId: string, categories: SubscribableCategory[]) {
    return subscriptionRepository.replaceUserSubscriptions(
      guildId,
      userId,
      categories.map((category) => category.categoryId),
    )
  }

  createSubscription(userId: string, categoryId: number) {
    return subscriptionRepository.createSubscription(userId, categoryId)
  }

  deleteSubscription(userId: string, categoryId: number) {
    return subscriptionRepository.deleteSubscription(userId, categoryId)
  }
}

export const subscriptionService = new SubscriptionService()
