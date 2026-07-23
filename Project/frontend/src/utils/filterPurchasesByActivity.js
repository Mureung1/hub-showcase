export function filterPurchasesByActivity(purchases, filter) {
  if (filter === 'recruiting') {
    return purchases.filter((purchase) => purchase.status === 'RECRUITING');
  }

  if (filter === 'closed') {
    return purchases.filter((purchase) => purchase.status !== 'RECRUITING');
  }

  return purchases;
}
