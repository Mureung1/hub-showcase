import * as store from '../store.js';

export function createReceipt(req, res) {
  // 실제로는 여기서 외부 OCR API를 호출한다. 지금은 데모 인식 결과를 그대로 반환.
  const receipt = store.createReceipt();
  res.status(201).json(receipt);
}

export function confirmReceipt(req, res) {
  const fridge = store.confirmReceipt(req.params.id, { expiryOverrides: req.body.expiryOverrides });
  if (!fridge) return res.status(404).json({ error: `receipt ${req.params.id} not found` });
  res.json(fridge);
}
