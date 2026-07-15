<template>
  <div class="board-container">
    <!-- 상단 소개 영역 -->
    <div class="board-header">
      <h2>🗺️ 시니어 여행 코스</h2>
      <p class="sub-text">너무 긴 이동거리는 어려워 😣 그렇지만 여행은 가고 싶은 시니어 👵👴</p>
    </div>

    <!-- 1. 게시글 작성/수정 폼 (모션 애니메이션 적용) -->
    <div v-if="isWriting || editingPost" class="board-form animate-fade-in">
      <h3>{{ editingPost ? '📍 코스 수정하기' : '📍 새 여행 코스 작성' }}</h3>
      <input v-model="form.title" placeholder="제목을 입력하세요 (예: [종로] 무장애 힐링 산책길)" />
      <textarea v-model="form.content" placeholder="이동 거리, 쉬어가기 좋은 곳, 추천 숙소를 적어주세요."></textarea>
      <input v-model="form.password" type="password" placeholder="수정/삭제 비밀번호" />
      
      <div class="form-buttons">
        <button @click="savePost" class="btn-submit">{{ editingPost ? '수정 완료' : '등록하기' }}</button>
        <button @click="cancelWrite" class="btn-cancel">취소</button>
      </div>
    </div>

    <!-- 2. 게시글 상세 보기 (모션 애니메이션 적용) -->
    <div v-else-if="selectedPost" class="board-detail animate-fade-in">
      <h3>
        <span v-if="selectedPost.is_notice" class="badge-notice-detail">추천 코스</span>
        {{ selectedPost.title }}
      </h3>
      <p class="meta">작성일: {{ selectedPost.date }}</p>
      <div class="content-box">{{ selectedPost.content }}</div>
      
      <div class="detail-buttons">
        <button v-if="!selectedPost.is_notice" @click="prepareEdit">수정</button>
        <button v-if="!selectedPost.is_notice" @click="prepareDelete" class="btn-danger">삭제</button>
        <button @click="selectedPost = null" class="btn-list">목록으로</button>
      </div>
    </div>

    <!-- 3. 게시글 목록 보기 -->
    <div v-else class="board-list animate-fade-in">
      <!-- 🌟 상단 검색바 및 버튼 컨트롤 영역 -->
      <div class="board-controls">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="찾고 싶은 지역이나 코스 제목을 입력하세요..." 
            class="search-input"
          />
        </div>
        <button @click="isWriting = true" class="btn-write">🗺️ 나만의 코스 등록하기</button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th class="text-center">구분</th>
            <th class="text-center">여행 코스 제목</th>
            <th class="text-center">작성일</th>
          </tr>
        </thead>
        <tbody>
          <!-- 🌟 검색어 필터링이 반영된 filteredPosts를 순회 -->
          <tr 
            v-for="(post, index) in filteredPosts" 
            :key="post.id" 
            @click="selectedPost = post"
            :class="{ 'notice-row': post.is_notice }"
            class="table-row-motion"
          >
            <td class="text-left">
              <span v-if="post.is_notice" class="badge-notice">추천</span>
              <span v-else class="visitor-id">#{{ posts.length - (index - noticePosts.length) }}</span>
            </td>
            <td :class="post.is_notice ? 'notice-title text-left' : 'title-link text-left'">
              {{ post.title }}
            </td>
            <td class="text-left">{{ post.date }}</td>
          </tr>
          
          <tr v-if="filteredPosts.length === 0">
            <td colspan="3" class="no-data">검색 결과 또는 등록된 여행 코스가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 고정 공지사항 데이터 (시니어 맞춤형 대표 코스 5선)
const noticePosts = [
  {
    id: 'n1',
    title: '대표 코스 1. 종로 역사·문화 한바퀴 코스',
    content: `🏠 추천 베이스캠프 숙소: 앰배서더 서울 풀만 호텔\n🎯 컨셉: "동선을 최소화한 조선의 심장 문화 산책"\n⏱️ 총 소요 시간: 약 8시간 (이동거리 짧음, 휴식 시간 충분)\n\n📌 상세 코스 동선:\n숙소 ➡️ 경복궁 ➡️ 북촌 한옥마을 ➡️ 이화벽화마을 ➡️ 덕수궁 ➡️ 숙소 리턴\n\n💡 시니어 꿀팁:\n경복궁과 덕수궁은 보행로가 평탄하여 휠체어나 유모차 이동도 수월합니다. 북촌 한옥마을은 오르막길이 있으니 완만한 삼청동 길을 경유하는 것을 추천합니다.`,
    date: '2026. 07. 15',
    is_notice: true
  },
  {
    id: 'n2',
    title: '대표 코스 2. 한강 뷰 & 감성 힐링 코스',
    content: `🏠 추천 베이스캠프 숙소: 몬드리안 서울 이태원\n🎯 컨셉: "답답한 도심을 벗어난 푸른 한강 힐링"\n⏱️ 총 소요 시간: 약 7시간\n\n📌 상세 코스 동선:\n숙소 ➡️ 남산서울타워 ➡️ 용산공원 ➡️ 반포한강공원 ➡️ 문래창작촌 ➡️ 숙소 리턴\n\n💡 시니어 꿀팁:\n남산타워는 순환버스를 이용하면 정상 바로 아래까지 편하게 이동할 수 있습니다. 반포한강공원은 평지가 길게 이어져 있어 저녁 노을을 보며 가볍게 걷기 좋습니다.`,
    date: '2026. 07. 15',
    is_notice: true
  },
  {
    id: 'n3',
    title: '대표 코스 3. 송파·잠실 도심 속 자연 코스',
    content: `🏠 추천 베이스캠프 숙소: 롯데호텔 월드\n🎯 컨셉: "멀리 가지 않고 즐기는 도심 속 비밀 정원"\n⏱️ 총 소요 시간: 약 8시간\n\n📌 상세 코스 동선:\n숙소 ➡️ 롯데월드 ➡️ 석촌호수 산책로 ➡️ 서울숲 ➡️ 방이동 생태보전지역 ➡️ 숙소 리턴\n\n💡 시니어 꿀팁:
석촌호수는 그늘이 많고 벤치가 촘촘하게 배치되어 있어 걷다 쉬어가기 가장 좋은 코스입니다. 서울숲은 평탄한 흙길 위주로 걸어보세요.`,
    date: '2026. 07. 15',
    is_notice: true
  },
  {
    id: 'n4',
    title: '대표 코스 4. 마포·강서 도심 속 숲캉스 코스',
    content: `🏠 추천 베이스캠프 숙소: L7 홍대 바이 롯데\n🎯 컨셉: "탁 트인 한강 바람과 잔잔한 천변 산책"\n⏱️ 총 소요 시간: 약 7시간\n\n📌 상세 코스 동선:\n숙소 ➡️ 하늘공원 ➡️ 마포음식문화거리 ➡️ 불광천 산책로 ➡️ 양천향교 ➡️ 숙소 리턴\n\n💡 시니어 꿀팁:\n하늘공원 정상까지 걸어가기 힘들 때는 왕복 운행하는 '맹꽁이 전동차'를 타면 다리에 무리 없이 편안하게 올라갈 수 있습니다.`,
    date: '2026. 07. 15',
    is_notice: true
  },
  {
    id: 'n5',
    title: '대표 코스 5. 서울 북동부 숨은 힐링 명소 코스',
    content: `🏠 추천 베이스캠프 숙소: 더 디자이너스 호텔 청량리\n🎯 컨셉: "피톤치드 가득한 비밀의 숲과 문화 쉼터"\n⏱️ 총 소요 시간: 약 7시간 30분\n\n📌 상세 코스 동선:\n숙소 ➡️ 홍릉시험림(홍릉숲) ➡️ 등나무근린공원 ➡️ 수락산 당고개지구 공원 ➡️ 봉화산 옹기테마공원 ➡️ 숙소 리턴\n\n💡 시니어 꿀팁:\n홍릉숲은 완만한 경사의 숲길로 조성되어 있어 어르신들이 걷기 좋습니다. 주말에만 일반 개방을 하니 일정을 짤 때 꼭 참고하세요.`,
    date: '2026. 07. 15',
    is_notice: true
  }
]

const posts = ref([])
const isWriting = ref(false)
const selectedPost = ref(null)
const editingPost = ref(null)
const form = ref({ title: '', content: '', password: '' })

// 🌟 검색어 상태 관리
const searchQuery = ref('')

const combinedPosts = computed(() => {
  return [...noticePosts, ...posts.value]
})

// 🌟 검색 가중치 필터링 기능 (제목 기준)
const filteredPosts = computed(() => {
  if (!searchQuery.value.trim()) {
    return combinedPosts.value
  }
  return combinedPosts.value.filter(post => 
    post.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

onMounted(() => {
  const saved = localStorage.getItem('local_board_posts')
  if (saved) {
    posts.value = JSON.parse(saved)
  }
})

const saveToLocalStorage = () => {
  localStorage.setItem('local_board_posts', JSON.stringify(posts.value))
}

const savePost = () => {
  if (!form.value.title || !form.value.content || !form.value.password) {
    alert('모든 필드를 입력해주세요.')
    return
  }

  if (editingPost.value) {
    if (editingPost.value.password !== form.value.password) {
      alert('비밀번호가 일치하지 않습니다!')
      return
    }
    
    const index = posts.value.findIndex(p => p.id === editingPost.value.id)
    if (index !== -1) {
      posts.value[index] = {
        ...posts.value[index],
        title: form.value.title,
        content: form.value.content,
        date: new Date().toLocaleDateString()
      }
    }
    editingPost.value = null
  } else {
    const newPost = {
      id: Date.now(),
      title: form.value.title,
      content: form.value.content,
      password: form.value.password,
      date: new Date().toLocaleDateString(),
      is_notice: false
    }
    posts.value.unshift(newPost)
    isWriting.value = false
  }

  saveToLocalStorage()
  resetForm()
  selectedPost.value = null
}

const prepareDelete = () => {
  const passwordInput = prompt('삭제를 위해 비밀번호를 입력하세요:')
  if (passwordInput === null) return

  if (selectedPost.value.password === passwordInput) {
    posts.value = posts.value.filter(p => p.id !== selectedPost.value.id)
    saveToLocalStorage()
    selectedPost.value = null
    alert('게시글이 삭제되었습니다.')
  } else {
    alert('비밀번호가 일치하지 않습니다!')
  }
}

const prepareEdit = () => {
  const passwordInput = prompt('수정을 위해 비밀번호를 입력하세요:')
  if (passwordInput === null) return

  if (selectedPost.value.password === passwordInput) {
    editingPost.value = selectedPost.value
    form.value = {
      title: selectedPost.value.title,
      content: selectedPost.value.content,
      password: ''
    }
  } else {
    alert('비밀번호가 일치하지 않습니다!')
  }
}

const cancelWrite = () => {
  isWriting.value = false
  editingPost.value = null
  resetForm()
}

const resetForm = () => {
  form.value = { title: '', content: '', password: '' }
}
</script>

<style scoped>
/* 🎨 지도(Map) 콘셉트 기본 디자인 디자인 */
.board-container { 
  max-width: 850px; 
  margin: 30px auto; 
  padding: 25px; 
  font-family: 'Malgun Gothic', sans-serif; 
  background-color: #F9F6F0; 
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.board-header {
  border-bottom: 3px double #2D5A27;
  padding-bottom: 15px;
  margin-bottom: 25px;
}
.board-header h2 { 
  color: #2D5A27; 
  margin: 0 0 8px 0; 
  font-size: 28px;
}
.sub-text { 
  color: #5D5043; 
  font-size: 15px; 
  font-weight: bold;
  margin: 0;
}

/* 폼 스타일 */
.board-form { background: #FFFFFF; padding: 20px; border-radius: 12px; border: 1px solid #E2DCD3; margin-bottom: 20px; }
.board-form h3 { color: #8B5A2B; margin-top: 0; }
.board-form input, .board-form textarea { 
  display: block; width: 100%; margin-bottom: 12px; padding: 12px; 
  border: 1px solid #CFC7BC; border-radius: 6px; box-sizing: border-box; background: #FAF9F6;
  font-family: inherit; 
}
.board-form textarea { height: 200px; resize: none; }

/* 🌟 상단 컨트롤 영역 (검색창 & 등록 단추 수평 배치) */
.board-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}
.search-wrapper {
  position: relative;
  flex: 1;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #8B5A2B;
  font-size: 16px;
}
.search-input {
  width: 100%;
  padding: 10px 10px 10px 40px;
  border: 1px solid #CFC7BC;
  border-radius: 30px; /* 나침반/지도 라운드 느낌 */
  background-color: #FFFFFF;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.25s ease;
}
.search-input:focus {
  outline: none;
  border-color: #2D5A27;
  box-shadow: 0 0 8px rgba(45,90,39,0.15);
}

/* 테이블 리스트 디자인 */
.board-list table { width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.board-list th { background-color: #2D5A27; color: white; padding: 14px; font-size: 15px; }
.board-list td { border-bottom: 1px solid #EAE6DF; padding: 14px; font-size: 15px; color: #333; }

/* 🌟 모션 디자인 적용: 테이블 행 마우스 호버 효과 */
.table-row-motion {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.table-row-motion:hover {
  background-color: #F3EFE6 !important;
  transform: translateY(-2px); /* 부드럽게 위로 떠오르는 지도 레이어 모션 */
  box-shadow: 0 4px 10px rgba(93,80,67,0.08);
  cursor: pointer;
}

.text-center { text-align: center !important; }
.text-left { text-align: left !important; }
.title-link { color: #2B6CB0; font-weight: bold; }
.visitor-id { color: #888; font-size: 13px; }

/* 추천 코스 스타일 차별화 */
.notice-row {
  background-color: #EBF4EB !important;
  border-bottom: 1px solid #C8DFC8;
}
.notice-row:hover {
  background-color: #DCECDC !important;
}
.notice-title {
  color: #1E4620;
  font-weight: bold;
  font-size: 16px;
}
.badge-notice {
  background-color: #8B5A2B;
  color: white; padding: 3px 8px; border-radius: 20px; font-size: 12px; font-weight: bold;
}
.badge-notice-detail {
  background-color: #2D5A27;
  color: white; padding: 4px 10px; border-radius: 20px; font-size: 14px; margin-right: 8px; vertical-align: middle;
}

/* 버튼 모음 및 모션 */
button { padding: 9px 16px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
button:hover {
  transform: scale(1.03); /* 단추가 꾹 눌리기 전 살짝 반응하는 모션 */
}
.btn-write { background-color: #8B5A2B; color: white; box-shadow: 0 2px 6px rgba(139,90,43,0.2); white-space: nowrap; }
.btn-write:hover { background-color: #734A22; }
.btn-submit { background-color: #2D5A27; color: white; }
.btn-submit:hover { background-color: #22441D; }
.btn-cancel { background-color: #E2DCD3; color: #555; }
.btn-danger { background-color: #C53030; color: white; }
.btn-list { background-color: #718096; color: white; }

/* 상세 보기 */
.board-detail h3 { color: #2D5A27; font-size: 22px; margin-top: 0; }
.content-box { 
  border: 1px solid #E2DCD3; padding: 22px; background-color: #FFFFFF; 
  min-height: 180px; margin-bottom: 20px; border-radius: 8px;
  white-space: pre-wrap; line-height: 1.8; color: #2D3748; font-size: 16px;
  font-family: inherit;
}
.meta { color: #718096; font-size: 13px; margin-bottom: 15px; }
.no-data { text-align: center; color: #A0AEC0; padding: 30px !important; }

/* 🌟 화면 보이기 모션: 페이지 전환 시 부드러운 불투명도 컴백 애니메이션 */
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>