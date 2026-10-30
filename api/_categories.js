// 카테고리 = 깃허브 토픽 1~2개. 검색 API는 토픽끼리 OR가 안 돼서 토픽마다 한 번씩 찾아 합친다
export const CATEGORIES = [
  { id: 'agent', name: 'AI 에이전트', topics: ['ai-agents', 'agents'] },
  { id: 'coding', name: '코딩 에이전트', topics: ['claude-code', 'coding-agent'] },
  { id: 'mcp', name: 'MCP', topics: ['mcp', 'mcp-server'] },
  { id: 'llm', name: 'LLM과 로컬 모델', topics: ['llm', 'local-llm'] },
  { id: 'rag', name: 'RAG와 검색', topics: ['rag', 'vector-database'] },
  { id: 'auto', name: '업무 자동화', topics: ['automation', 'browser-automation'] },
  { id: 'media', name: '이미지와 영상 생성', topics: ['image-generation', 'video-generation'] },
  { id: 'voice', name: '음성', topics: ['text-to-speech', 'speech-recognition'] },
  { id: 'data', name: '데이터 분석', topics: ['data-visualization', 'data-analysis'] },
  { id: 'docs', name: '생산성과 문서', topics: ['productivity', 'pdf'] },
  { id: 'security', name: '보안', topics: ['security', 'cybersecurity'] },
  { id: 'robot', name: '로봇과 피지컬 AI', topics: ['robotics', 'embodied-ai'] },
  { id: 'selfhost', name: '셀프 호스팅', topics: ['self-hosted'] },
];
