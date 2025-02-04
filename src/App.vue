<template>
  <div class="app">
    <Calculator />
  </div>
</template>

<script setup lang="ts">
import Calculator from './components/Calculator.vue'
import { onMounted } from 'vue'
import { nfcService } from './services/NFCService'

// 在组件挂载时请求权限
onMounted(async () => {
  try {
    await nfcService.requestPermission();
  } catch (error) {
    console.error('NFC 权限请求失败:', error);
  }
})
</script>

<style>
body {
  margin: 0;
  padding: 20px;
  background: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.app {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}
</style> 