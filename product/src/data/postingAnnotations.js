const ANNOTATION_CONFIG = Object.freeze({
  deviation: { numberKey: 'mark_n', markClass: 'mark--dev', supClass: 'sup-dev' },
  signal: { numberKey: 'note_n', markClass: 'mark--signal', supClass: 'sup-signal' },
  baseline: { numberKey: 'base_n', markClass: null, supClass: 'sup-base' },
})

const DISPLAY_ORDER = Object.freeze(['deviation', 'signal', 'baseline'])

export function getPostingLinePresentation(line, activeTab = 'deviation') {
  const annotations = DISPLAY_ORDER.flatMap((type) => {
    const config = ANNOTATION_CONFIG[type]
    const number = line?.[config.numberKey]
    return number === null || number === undefined
      ? []
      : [{ type, number, supClass: config.supClass }]
  })

  const primary = annotations.find(({ type }) => type === activeTab) ?? annotations[0]
  return {
    annotations,
    markClass: primary ? ANNOTATION_CONFIG[primary.type].markClass : null,
  }
}
