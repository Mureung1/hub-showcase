// 브라우저 Geolocation API 프로미스 래퍼.
// 참고: 카카오 로컬 API는 x=경도(longitude), y=위도(latitude) 순서를 사용한다.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          x: position.coords.longitude,
          y: position.coords.latitude,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해주세요.'))
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('현재 위치를 확인할 수 없습니다.'))
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('위치 확인 시간이 초과되었습니다.'))
        } else {
          reject(new Error('위치 정보를 가져오지 못했습니다.'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}
