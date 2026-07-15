<template>
  <div id="app">
    <!-- 상단 헤더 및 메뉴 바 -->
    <header class="navbar">
      <h1 class="logo">정적 SPA 서비스</h1>
      <nav class="menu-tabs">
        <button 
          :class="{ active: currentTab === 'map' }" 
          @click="currentTab = 'map'"
        >
          지도
        </button>
        <button 
          :class="{ active: currentTab === 'board' }" 
          @click="currentTab = 'board'"
        >
          게시판
        </button>
      </nav>
    </header>

    <!-- 조건부 렌더링을 통한 화면 전환 -->
    <main class="content-area">
      <!-- 1. 지도 탭 화면 (추후 개발) -->
      <div v-if="currentTab === 'map'" class="map-placeholder">
        <h2>지도 영역</h2>
        <p>여기에 지도 API 관련 기능이 구현될 예정입니다.</p>
      </div>

      <!-- 2. 게시판 탭 화면 -->
      <Board v-else-if="currentTab === 'board'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Board from './components/Board.vue' // 💡 Board.vue 경로 매칭 완료!

// 기본으로 게시판 탭이 먼저 보이도록 설정
const currentTab = ref('board')
</script>

<style>
/* 전역 및 네비게이션바 스타일 */
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.navbar { display: flex; justify-content: space-between; align-items: center; background-color: #333; color: white; padding: 10px 20px; }
.logo { margin: 0; font-size: 1.2rem; }
.menu-tabs button { background: none; border: none; color: #ccc; padding: 10px 15px; font-size: 1rem; cursor: pointer; border-bottom: 2px solid transparent; }
.menu-tabs button:hover { color: white; }
.menu-tabs button.active { color: #fff; border-bottom: 2px solid #007bff; font-weight: bold; }
.content-area { padding: 20px; }
.map-placeholder { text-align: center; margin-top: 50px; color: #666; }
</style>
