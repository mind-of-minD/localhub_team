<template>
  <div id="app">
    <header class="navbar">
      <h1 class="logo">LocalHub 서울</h1>

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

    <main class="content-area">
      <!-- 지도 탭 -->
      <MapView v-if="currentTab === 'map'" />

      <!-- 게시판 탭 -->
      <Board v-else-if="currentTab === 'board'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Board from './components/Board.vue'
import MapView from './features/map/MapView.vue'

const currentTab = ref('board')
</script>

<style>
body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 64px;
  padding: 0 24px;
  background-color: #333;
  color: white;
}

.logo {
  margin: 0;
  font-size: 1.2rem;
}

.menu-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.menu-tabs button {
  padding: 20px 16px;
  border: none;
  border-bottom: 3px solid transparent;
  background: none;
  color: #ccc;
  font-size: 1rem;
  cursor: pointer;
}

.menu-tabs button:hover {
  color: white;
}

.menu-tabs button.active {
  border-bottom-color: #007bff;
  color: white;
  font-weight: 700;
}

.content-area {
  min-height: calc(100vh - 64px);
}

/* 게시판에 여백이 필요하다면 Board.vue 내부에서 처리하는 것이 안전함 */
</style>