let kakaoMapPromise = null

export function loadKakaoMapSdk() {
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao)
  }

  if (kakaoMapPromise) {
    return kakaoMapPromise
  }

  const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY

  if (!apiKey) {
    return Promise.reject(
      new Error(
        '카카오맵 API 키가 없습니다. .env에 VITE_KAKAO_MAP_API_KEY를 설정하세요.',
      ),
    )
  }

  kakaoMapPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-kakao-map-sdk]',
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.kakao.maps.load(() => {
          resolve(window.kakao)
        })
      })

      existingScript.addEventListener('error', () => {
        kakaoMapPromise = null
        reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'))
      })

      return
    }

    const script = document.createElement('script')

    script.dataset.kakaoMapSdk = 'true'
    script.async = true
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js` +
      `?appkey=${apiKey}` +
      `&autoload=false` +
      `&libraries=clusterer`

    script.onload = () => {
      if (!window.kakao?.maps) {
        kakaoMapPromise = null
        reject(new Error('카카오맵 객체가 생성되지 않았습니다.'))
        return
      }

      window.kakao.maps.load(() => {
        resolve(window.kakao)
      })
    }

    script.onerror = () => {
      kakaoMapPromise = null
      reject(
        new Error(
          '카카오맵 SDK를 불러오지 못했습니다. API 키와 등록 도메인을 확인하세요.',
        ),
      )
    }

    document.head.appendChild(script)
  })

  return kakaoMapPromise
}