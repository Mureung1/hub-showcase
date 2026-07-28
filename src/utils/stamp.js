function buildQrValue(memberNumber) {
  return `cafe-stamp:${memberNumber}`
}

function parseMemberLookupInput(input) {
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return {
      memberNumber: '',
      error: '회원번호 또는 QR 값을 입력해 주세요.',
    }
  }

  if (trimmedInput.startsWith('cafe-stamp:')) {
    const memberNumber = trimmedInput.replace('cafe-stamp:', '').trim()

    if (!memberNumber) {
      return {
        memberNumber: '',
        error: 'QR 안에 회원번호가 없습니다.',
      }
    }

    return {
      memberNumber,
      error: '',
    }
  }

  if (trimmedInput.includes(':')) {
    return {
      memberNumber: '',
      error: '지원하지 않는 QR 형식입니다.',
    }
  }

  return {
    memberNumber: trimmedInput,
    error: '',
  }
}

export { buildQrValue, parseMemberLookupInput }
