<template>
  <div class="container">
    <h1>汉字拼音注音工具</h1>
    
    <div class="content-wrapper">
      <div class="input-area">
        <textarea 
          ref="textareaRef"
          v-model="inputText" 
          placeholder="请输入中文文字..."
          @input="autoResize"
        ></textarea>
        <div class="button-group">
          <button class="convert-btn" @click="convertToPinyin">
            添加注音
          </button>
          <button class="ai-btn" @click="aiConvertToPinyin" :disabled="isLoading">
            {{ isLoading ? '处理中...' : 'AI注音' }}
          </button>
        </div>
      </div>

      <div class="result-area" ref="resultAreaRef">
        <div 
          v-for="(paragraph, pIndex) in splitParagraphs" 
          :key="pIndex" 
          class="text-line"
        >
          <div class="char-grid">
            <template v-for="(char, cIndex) in paragraph.hanzi" :key="cIndex">
              <div class="char-column" :data-is-punct="isPunctuation(char)">
                <div class="pinyin-char">
                  {{ paragraph.pinyin.split(' ')[cIndex] }}
                </div>
                <div class="hanzi-char">{{ char }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { pinyin } from 'pinyin-pro'

const inputText = ref('')
const pinyinResult = ref([])
const textareaRef = ref(null)
const resultAreaRef = ref(null)
const isLoading = ref(false)

// 将输入文本按行分割
const textLines = computed(() => {
  return inputText.value.split('\n')
})

// 监听输入文本变化，重置拼音结果
watch(inputText, () => {
  pinyinResult.value = []
})

// 判断是否是标点符号
const isPunctuation = (char) => {
  const punctuationRegex = /[，。！？、；：""''（）]/
  return punctuationRegex.test(char)
}

// 处理分段后的结果
const splitParagraphs = computed(() => {
  return textLines.value.map((line, index) => {
    if (line.trim() === '') return []
    return {
      hanzi: line,
      pinyin: pinyinResult.value[index] || ''
    }
  })
})

// 转换拼音
const convertToPinyin = () => {
  pinyinResult.value = textLines.value.map(line => {
    return pinyin(line, { 
      toneType: 'symbol', 
      type: 'array',
      pattern: 'pinyin',
      multiple: true,
      mode: 'surname'
    })
      .map(item => item.length > 0 ? item : ' ')
      .join(' ')
  })
}

// AI 转换拼音
const aiConvertToPinyin = async () => {
  if (!inputText.value.trim()) return
  
  const maxRetries = 1
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  
  const tryConvert = async (retryCount = 0) => {
    try {
      isLoading.value = true
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('API key not found')
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "你是一个精通汉语拼音的助手。请将给定的中文文本转换为拼音，使用声调符号（ā á ǎ à）而不是数字。每个汉字的拼音之间用空格分隔，标点符号单独占位。请只返回拼音结果，不要包含其他解释文字。"
          }, {
            role: "user",
            content: `${inputText.value}`
          }],
          temperature: 0.2
        })
      })

      if (response.status === 429 && retryCount < maxRetries) {
        await delay(2000 * (retryCount + 1))
        return tryConvert(retryCount + 1)
      } else if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()
      const aiPinyin = data.choices[0].message.content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim())

      pinyinResult.value = aiPinyin
      return true
    } catch (error) {
      console.error('AI conversion failed:', error)
      if (retryCount < maxRetries) {
        await delay(2000 * (retryCount + 1))
        return tryConvert(retryCount + 1)
      }
      throw error
    }
  }

  try {
    await tryConvert()
  } catch (error) {
    console.error('Final error:', error)
    alert(error.message.includes('429') ? '请求过于频繁，请稍后再试' : 'AI 转换失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 自动调整文本框高度并滚动到底部
const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return

  // 重置高度以获取正确的scrollHeight
  textarea.style.height = 'auto'
  
  // 计算最大高度（视口高度 - 头部高度 - 按钮高度 - 边距）
  const viewportHeight = window.innerHeight
  const headerHeight = 80  // h1 标题及其边距
  const buttonHeight = 60  // 按钮高度及其边距
  const padding = 40      // 容器的上下内边距
  const maxHeight = viewportHeight - headerHeight - buttonHeight - padding

  // 设置新高度，但不超过最大高度
  const newHeight = Math.min(textarea.scrollHeight, maxHeight)
  textarea.style.height = newHeight + 'px'

  // 如果内容超出可视区域，滚动到底部
  if (textarea.scrollHeight > newHeight) {
    textarea.scrollTop = textarea.scrollHeight
  }
}

// 监听窗口大小变化时重新计算分行
let resizeTimeout
const handleResize = () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    // 强制重新计算 splitParagraphs
    pinyinResult.value = [...pinyinResult.value]
  }, 200)
}

// 在组件挂载时添加窗口大小变化监听
onMounted(() => {
  textareaRef.value?.focus()
  autoResize()
  window.addEventListener('resize', handleResize)
})

// 在组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>

<style>
:root {
  --theme-color: #e6f3ff;
  --theme-color-light: #f0f7ff;
  --button-color: #4CAF50;
  --text-primary: #333;
  --text-secondary: #666;
  --result-bg: #fff9e6;
  /* 添加响应式变量 */
  --container-width-desktop: 800px;
  --container-width-tablet: 600px;
  --container-padding-desktop: 40px;
  --container-padding-mobile: 16px;
}
</style>

<style scoped>
.container {
  width: 100%;
  max-width: var(--container-width-desktop);
  margin: 0 auto;
  padding: var(--container-padding-desktop);
  background-color: var(--theme-color);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出导致页面可以横向滚动 */
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 30px;
  overflow-y: auto; /* 允许内容区域滚动 */
  -webkit-overflow-scrolling: touch; /* 在 iOS 上提供更流畅的滚动 */
  width: 100%; /* 确保内容宽度填满容器 */
}

h1 {
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 30px;
  font-size: 28px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-shrink: 0; /* 防止输入区域被压缩 */
  width: 100%; /* 确保输入区域宽度填满容器 */
}

textarea {
  width: 100%;
  min-height: 150px;
  max-height: 300px; /* 限制最大高度 */
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 18px;
  resize: none;
  background-color: var(--theme-color-light);
  transition: border-color 0.3s ease;
  box-sizing: border-box; /* 确保padding不会导致宽度溢出 */
}

.convert-btn {
  align-self: center;
  padding: 12px 32px;
  font-size: 18px;
  background-color: var(--button-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  min-width: 160px;
}

.result-area {
  background-color: var(--result-bg);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0e6cc;
  flex: 1;
  overflow-y: auto;
}

.text-line {
  margin-bottom: 24px;
}

.text-line:last-child {
  margin-bottom: 0;
}

.char-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  justify-content: flex-start;
  align-items: flex-start;
}

.char-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 28px;
  position: relative;
}

.pinyin-char {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 2px;
  line-height: 1.2;
  text-align: center;
  min-height: 19px;
}

.hanzi-char {
  font-size: 20px;
  color: var(--text-primary);
  line-height: 1.2;
  text-align: center;
  position: relative;
}

.char-column[data-is-punct="true"] {
  min-width: 16px;
  margin: 0 -2px;
}

/* 平板适配 */
@media (max-width: 1024px) {
  .container {
    max-width: var(--container-width-tablet);
    padding: 30px;
  }

  h1 {
    font-size: 24px;
    margin-bottom: 25px;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .container {
    padding: var(--container-padding-mobile);
    box-sizing: border-box; /* 确保padding不会导致宽度溢出 */
  }

  .content-wrapper {
    gap: 20px;
  }

  h1 {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .input-area {
    gap: 15px;
  }

  textarea {
    min-height: 120px;
    max-height: 200px;
    padding: 12px;
    font-size: 16px;
  }

  .convert-btn {
    padding: 10px 24px;
    font-size: 16px;
    min-width: 140px;
  }

  .result-area {
    padding: 16px;
  }

  .text-line {
    margin-bottom: 20px;
  }

  .char-grid {
    gap: 4px 6px;
  }

  .char-column {
    min-width: 24px;
  }

  .char-column[data-is-punct="true"] {
    min-width: 14px;
  }

  .pinyin-char {
    font-size: 14px;
    min-height: 17px;
  }

  .hanzi-char {
    font-size: 18px;
  }

  .button-group {
    gap: 12px;
  }

  .ai-btn {
    padding: 10px 24px;
    font-size: 16px;
    min-width: 140px;
  }
}

/* 小屏幕手机适配 */
@media (max-width: 375px) {
  .container {
    padding: 12px;
  }

  .content-wrapper {
    gap: 16px;
  }

  h1 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .result-area {
    padding: 12px;
  }

  .text-line {
    margin-bottom: 16px;
  }

  .char-grid {
    gap: 2px 4px;
  }

  .char-column {
    min-width: 20px;
  }

  .char-column[data-is-punct="true"] {
    min-width: 12px;
  }

  .pinyin-char {
    font-size: 13px;
    min-height: 15px;
  }

  .hanzi-char {
    font-size: 16px;
  }
}

.button-group {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.ai-btn {
  padding: 12px 32px;
  font-size: 18px;
  background-color: #1E90FF;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  min-width: 160px;
}

.ai-btn:hover {
  background-color: #187BE5;
}

.ai-btn:disabled {
  background-color: #B0C4DE;
  cursor: not-allowed;
}
</style>
