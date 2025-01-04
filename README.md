# 汉字拼音注音工具

一个简单的在线工具，可以为中文文本添加拼音注音。支持普通注音和 AI 辅助注音两种模式。

## 功能特点

- 支持多行文本输入
- 自动为汉字添加拼音注音
- AI 辅助注音（更准确的多音字处理）
- 响应式设计，支持移动端
- 优雅的排版和显示效果

## 技术栈

- Vue 3
- Vite
- pinyin-pro
- OpenAI API

## 本地开发

1. 克隆仓库
```bash
git clone https://github.com/shiqstone/chinese-add-pinyin-cursor.git
cd chinese-add-pinyin-cursor
```
2. 安装依赖
```bash
pnpm install
```
3. 创建 .env 文件并配置 OpenAI API Key（可选，仅在需要 AI 注音功能时）
```bash
VITE_OPENAI_API_KEY=your_openai_api_key
```
4. 启动开发环境
```bash
pnpm run dev
```

5. 构建生产版本
```bash
pnpm run build
```


## 注意事项

- API Key 请妥善保管，不要提交到代码仓库
- 移动端使用时建议使用竖屏模式
- AI 注音功能可能受到 API 访问限制

## License

MIT
