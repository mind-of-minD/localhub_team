<template>
  <div id="app">
    <header class="navbar">
      <button
        type="button"
        class="brand"
        aria-label="LocalHub 게시판으로 이동"
        @click="currentTab = 'board'"
      >
        <span class="brand-icon">🗺️</span>

        <span class="brand-text">
          <strong>LocalHub 서울</strong>
          <small>시니어 지역 여행 커뮤니티</small>
        </span>
      </button>

      <nav class="menu-tabs" aria-label="주요 메뉴">
        <button
          type="button"
          :class="{ active: currentTab === 'map' }"
          @click="currentTab = 'map'"
        >
          <span>📍</span>
          지도
        </button>

        <button
          type="button"
          :class="{ active: currentTab === 'board' }"
          @click="currentTab = 'board'"
        >
          <span>📝</span>
          게시판
        </button>
      </nav>
    </header>

    <main class="content-area">
      <MapView v-if="currentTab === 'map'" />
      <Board v-else-if="currentTab === 'board'" />
    </main>

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
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 74px;
  padding: 0 32px;

  background: rgb(255 255 255 / 94%);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 4px 18px rgb(83 70 55 / 6%);
  backdrop-filter: blur(12px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;

  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 42px;
  height: 42px;

  background: var(--color-primary-soft);
  border-radius: 13px;
  font-size: 22px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-text strong {
  color: var(--color-primary);
  font-size: 19px;
  line-height: 1.3;
}

.brand-text small {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.menu-tabs {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 5px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
}

.menu-tabs button {
  display: flex;
  align-items: center;
  gap: 6px;

  padding: 10px 18px;

  color: var(--color-text-muted);
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);

  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.menu-tabs button:hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.menu-tabs button.active {
  color: #ffffff;
  background: var(--color-primary);
  box-shadow: 0 5px 14px rgb(45 90 39 / 22%);
}

.menu-tabs button:active {
  transform: translateY(1px);
}

.content-area {
  min-height: calc(100vh - 74px);
  padding: 1px 0 50px;
  background: var(--color-background);
}

@media (max-width: 700px) {
  .navbar {
    min-height: 64px;
    padding: 0 14px;
  }

  .brand-icon {
    width: 38px;
    height: 38px;
  }

  .brand-text strong {
    font-size: 16px;
  }

  .brand-text small {
    display: none;
  }

  .menu-tabs button {
    padding: 9px 12px;
    font-size: 13px;
  }

  .content-area {
    min-height: calc(100vh - 64px);
  }
}
</style>