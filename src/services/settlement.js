export function calculateSettlement({
  unitPrice,
  shippingFee,
  targetPeople,
  currentPeople,
  quantity,
}) {
  const participantCount = Math.max(1, targetPeople, currentPeople);
  const productAmount = unitPrice * quantity;
  const shippingShare = Math.ceil(shippingFee / participantCount);

  return {
    productAmount,
    shippingShare,
    totalAmount: productAmount + shippingShare,
  };
}
