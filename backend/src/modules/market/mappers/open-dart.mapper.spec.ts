import {
  assertOpenDartSuccess,
  mapOpenDartDisclosure,
  OpenDartBusinessError,
} from './open-dart.mapper'

describe('open-dart.mapper', () => {
  it('throws on OpenDART business status errors', () => {
    expect(() =>
      assertOpenDartSuccess({ status: '020', message: '요청 제한을 초과하였습니다.' }),
    ).toThrow(OpenDartBusinessError)
  })

  it('maps disclosure rows to viewer URLs', () => {
    const disclosure = mapOpenDartDisclosure({
      rcept_no: '20260727000001',
      corp_code: '00126380',
      stock_code: '005930',
      corp_name: '삼성전자',
      report_nm: '주요사항보고서',
      rcept_dt: '20260727',
      flr_nm: '삼성전자',
      rm: '유',
    })

    expect(disclosure.id).toBe('20260727000001')
    expect(disclosure.originalUrl).toBe(
      'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260727000001',
    )
    expect(disclosure.provider).toBe('OPENDART')
  })
})
