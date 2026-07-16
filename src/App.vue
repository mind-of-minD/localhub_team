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

    <!-- 지도/게시판 어느 화면에서도 표시되는 플로팅 챗봇 -->
    <ChatBot />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Board from './components/Board.vue'
import ChatBot from './components/chatbot/ChatBot.vue'
import MapView from './features/map/MapView.vue'

const currentTab = ref('board')
</script>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

button,
input,
textarea {
  font: inherit;
}

.navbar {
  position: relative;
  z-index: 1000;
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

@media (max-width: 600px) {
  .navbar {
    min-height: 56px;
    padding: 0 14px;
  }

  .logo {
    font-size: 1rem;
  }

  .menu-tabs button {
    padding: 17px 11px;
    font-size: 0.9rem;
  }

  .content-area {
    min-height: calc(100vh - 56px);
  }
}
</style>