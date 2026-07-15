<template>
  <div class="board-container">
    <!-- 상단 소개 영역 -->
    <div class="board-header">
      <h2>🗺️ 시니어 여행 코스</h2>
      <p class="sub-text">너무 긴 이동거리는 어려워 😣 그렇지만 여행은 가고 싶은 시니어 👵👴</p>
    </div>

    <!-- 1. 게시글 작성/수정 폼 -->
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

    <!-- 2. 게시글 상세 보기 -->
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
      <!-- 상단 검색바 및 버튼 컨트롤 영역 -->
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
        <button @click="isWriting = true" class="btn-write">🗺️ 코스 등록</button>
      </div>
      
      <!-- 🌟 트렌디하게 디자인된 테이블 (표) 영역 -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 15%;">구분</th>
              <th class="text-left" style="width: 65%;">여행 코스 제목</th>
              <th class="text-center" style="width: 20%;">작성일</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(post, index) in filteredPosts" 
              :key="post.id" 
              @click="selectedPost = post"
              :class="{ 'notice-row': post.is_notice }"
              class="table-row-motion"
            >
              <td class="text-center">
                <span v-if="post.is_notice" class="badge-notice">추천</span>
                <span v-else class="visitor-id">#{{ posts.length - (index - noticePosts.length) }}</span>
              </td>
              <td :class="post.is_notice ? 'notice-title text-left' : 'title-link text-left'">
                {{ post.title }}
              </td>
              <td class="text-center date-col">{{ post.date }}</td>
            </tr>
            
            <tr v-if="filteredPosts.length === 0">
              <td colspan="3" class="no-data">검색 결과 또는 등록된 여행 코스가 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

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
    content: `🏠 추천 베이스캠프 숙소: 롯데호텔 월드\n🎯 컨셉: "멀리 가지 않고 즐기는 도심 속 비밀 정원"\n⏱️ 총 소요 시간: 약 8시간\n\n📌 상세 코스 동선:\n숙소 ➡️ 롯데월드 ➡️ 석촌호수 산책로 ➡️ 서울숲 ➡️ 방이동 생태보전지역 ➡️ 숙소 리턴\n\n💡 시니어 꿀팁:\n석촌호수는 그늘이 많고 벤치가 촘촘하게 배치되어 있어 걷다 쉬어가기 가장 좋은 코스입니다. 서울숲은 평탄한 흙길 위주로 걸어보세요.`,
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
const searchQuery = ref('')

const combinedPosts = computed(() => {
  return [...noticePosts, ...posts.value]
})

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
/* 🎨 전체 레이아웃 & 배경 트렌디화 */
.board-container { 
  max-width: 850px; 
  margin: 40px auto; 
  padding: 35px; 
  font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; 
  background: linear-gradient(145deg, #fdfbfa 0%, #f4f0e6 100%); /* 입체감 넘치는 부드러운 그라데이션 */
  border-radius: 28px; /* 둥근 모서리 극대화 */
  box-shadow: 
    20px 20px 60px #e0dad0, 
    -20px -20px 60px #ffffff; /* 트렌디한 뉴모피즘 소프트 그림자 */
  border: 1px solid rgba(255, 255, 255, 0.6);
}

/* 🌟 배달의민족 한나체 폰트 클래스 매칭 */
h2, h3, th, button, .badge-notice, .badge-notice-detail, .visitor-id {
  font-family: 'BM HANNA Pro', 'BMHANNAPro', sans-serif !important;
  font-weight: normal; 
}

/* 상단 소개 영역 */
.board-header {
  border-bottom: 2px dashed #D5CBBF;
  padding-bottom: 22px;
  margin-bottom: 30px;
  text-align: center;
}
.board-header h2 { 
  color: #2D5A27; 
  margin: 0 0 10px 0; 
  font-size: 36px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
}
.sub-text { 
  color: #7D7162; 
  font-size: 16px; 
  margin: 0;
}

/* 작성/수정 폼 디자인 */
.board-form { 
  background: #FFFFFF; 
  padding: 30px; 
  border-radius: 20px; 
  border: 1px solid #EAE3D9;
  box-shadow: 0 10px 30px rgba(93, 80, 67, 0.05);
}
.board-form h3 { color: #8B5A2B; margin-top: 0; font-size: 24px; }
.board-form input, .board-form textarea { 
  display: block; width: 100%; margin-bottom: 16px; padding: 15px; 
  border: 1px solid #E2DCD3; border-radius: 12px; box-sizing: border-box; background: #FAF9F6;
  font-family: inherit; font-size: 15px;
  transition: all 0.25s ease;
}
.board-form input:focus, .board-form textarea:focus {
  outline: none;
  border-color: #2D5A27;
  background-color: #FFFFFF;
  box-shadow: 0 0 10px rgba(45,90,39,0.12);
}
.board-form textarea { height: 180px; resize: none; }
.form-buttons { display: flex; gap: 10px; justify-content: flex-end; }

/* 🔍 컨트롤 영역 (둥근 검색바 & 등록 단추 수평 배치) */
.board-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}
.search-wrapper {
  position: relative;
  flex: 1;
}
.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #8B5A2B;
  font-size: 16px;
}
.search-input {
  width: 100%;
  padding: 13px 13px 13px 48px;
  border: 1.5px solid #DED7CD;
  border-radius: 40px; /* 타원형 트렌디 디자인 */
  background-color: #FFFFFF;
  font-family: inherit;
  font-size: 15px;
  box-sizing: border-box;
  box-shadow: inset 1px 1px 3px rgba(0,0,0,0.03);
  transition: all 0.25s ease;
}
.search-input:focus {
  outline: none;
  border-color: #2D5A27;
  box-shadow: 0 0 12px rgba(45,90,39,0.15);
}

/* 🌟 대박 트렌디하게 변경된 테이블(표) 디자인 */
.table-container {
  background: #FFFFFF;
  border-radius: 20px; /* 표 전반을 둥글게 */
  overflow: hidden; /* 모서리가 상하지 않게 깎기 */
  box-shadow: 0 8px 24px rgba(93, 80, 67, 0.05);
  border: 1px solid #EAE3D9;
}
table { width: 100%; border-collapse: collapse; }
th { 
  background: linear-gradient(90deg, #2D5A27 0%, #1E441A 100%); /* 그라데이션 헤더 */
  color: white; 
  padding: 18px 16px; 
  font-size: 17px; 
  letter-spacing: 0.5px; 
}
td { border-bottom: 1px solid #F0ECE6; padding: 18px 16px; font-size: 15px; color: #333; }

/* 표 행에 적용된 트렌디한 모션 피드백 */
.table-row-motion {
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.table-row-motion:hover {
  background-color: #FAF6EE !important;
  transform: scale(1.002) translateX(4px); /* 마우스 올리면 은은하게 우측으로 밀림 */
  cursor: pointer;
}

.text-center { text-align: center !important; }
.text-left { text-align: left !important; }

/* 링크 스타일 */
.title-link { color: #2B6CB0; font-weight: bold; transition: color 0.2s; }
.table-row-motion:hover .title-link { color: #1A365D; }
.visitor-id { color: #8B5A2B; font-size: 14px; font-weight: bold; }
.date-col { color: #8E877E; font-size: 14px; }

/* 추천 코스 전용 디자인 (강조) */
.notice-row {
  background-color: #F3F8F2 !important;
}
.notice-row:hover {
  background-color: #E7F1E6 !important;
}
.notice-title {
  color: #1E4620;
  font-weight: bold;
  font-size: 16px;
}
.badge-notice {
  background-color: #8B5A2B;
  color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px;
}
.badge-notice-detail {
  background-color: #2D5A27;
  color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px; margin-right: 8px; vertical-align: middle;
}

/* 버튼 모음 (한나체 적용 및 부드러운 둥근 탭) */
button { 
  padding: 11px 20px; 
  border-radius: 30px; 
  border: none; 
  font-size: 15px; 
  cursor: pointer; 
  transition: all 0.25s ease; 
}
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.btn-write { background-color: #8B5A2B; color: white; box-shadow: 0 4px 12px rgba(139,90,43,0.2); white-space: nowrap; }
.btn-write:hover { background-color: #734A22; }
.btn-submit { background-color: #2D5A27; color: white; }
.btn-submit:hover { background-color: #22441D; }
.btn-cancel { background-color: #E2DCD3; color: #555; }
.btn-danger { background-color: #C53030; color: white; }
.btn-list { background-color: #718096; color: white; }

/* 상세 보기 */
.board-detail {
  background: #FFFFFF;
  padding: 30px;
  border-radius: 20px;
  border: 1px solid #EAE3D9;
  box-shadow: 0 10px 30px rgba(93, 80, 67, 0.05);
}
.board-detail h3 { color: #2D5A27; font-size: 26px; margin-top: 0; }
.content-box { 
  border: 1px solid #EAE6DF; padding: 24px; background-color: #FAF9F6; 
  min-height: 180px; margin-bottom: 20px; border-radius: 14px;
  white-space: pre-wrap; line-height: 1.8; color: #2D3748; font-size: 16px;
  font-family: inherit;
}
.meta { color: #8E877E; font-size: 13px; margin-bottom: 15px; }
.no-data { text-align: center; color: #A0AEC0; padding: 50px !important; }

/* 화면 전환 부드러운 페이드인 */
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>