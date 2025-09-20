const STORAGE_KEY = 'aigather-dashboard-data-v1';

function createDefaultData() {
  const now = new Date();
  return {
    projects: [
      { id: 'project-research', name: '前沿研究' },
      { id: 'project-product', name: '产品化探索' },
      { id: 'project-design', name: '设计灵感' }
    ],
    tags: [
      { id: 'tag-ai', name: 'AI', color: '#58b7ff' },
      { id: 'tag-llm', name: 'LLM', color: '#7c5cff' },
      { id: 'tag-product', name: '产品', color: '#4fd1c5' },
      { id: 'tag-research', name: '研究', color: '#f6ad55' },
      { id: 'tag-design', name: '设计', color: '#f687b3' },
      { id: 'tag-note', name: '笔记', color: '#9f7aea' }
    ],
    cards: [
      {
        id: 'card-gpt4',
        title: 'GPT-4 技术报告要点整理',
        projectId: 'project-research',
        tags: ['tag-ai', 'tag-llm', 'tag-research'],
        link: 'https://openai.com/research/gpt-4',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        sessions: [
          {
            id: 'session-gpt4-1',
            updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8).toISOString(),
            content:
              '<p><strong>摘要：</strong>GPT-4 在理解复杂指令、创造性写作和跨语言能力方面显著增强，尤其在法律和医学评测中表现突出。</p>' +
              '<ul><li>模型规模增长，推理能力显著提升</li><li>视觉输入管线仍处于受限测试阶段</li><li>对齐策略结合 RLHF 与大量批判性反馈</li></ul>'
          }
        ]
      },
      {
        id: 'card-ai-product',
        title: 'AI 辅助产品设计指南',
        projectId: 'project-product',
        tags: ['tag-ai', 'tag-product'],
        link: 'https://example.com/ai-product-handbook',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        sessions: [
          {
            id: 'session-product-1',
            updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            content:
              '<p>总结了产品在引入 AI 后需要重点关注的四个维度：</p>' +
              '<ol><li>清晰定义 AI 的角色</li><li>透明呈现模型的自信度</li><li>提供可理解的反馈</li><li>保留人工兜底机制</li></ol>'
          }
        ]
      },
      {
        id: 'card-design-system',
        title: '暗色模式设计系统灵感',
        projectId: 'project-design',
        tags: ['tag-design', 'tag-note'],
        link: 'https://dribbble.com/shots/19382907',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        sessions: [
          {
            id: 'session-design-1',
            updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1).toISOString(),
            content:
              '<p>亮点：</p>' +
              '<ul><li>采用分层玻璃拟物质感，突出信息层级</li><li>高饱和度霓虹色作为强调</li><li>卡片边缘使用内阴影增强空间感</li></ul>'
          }
        ]
      },
      {
        id: 'card-voice-agent',
        title: '语音 Agent 工作流搭建记录',
        projectId: 'project-product',
        tags: ['tag-ai', 'tag-product', 'tag-note'],
        link: 'https://example.com/voice-agent-guide',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
        sessions: [
          {
            id: 'session-voice-1',
            updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
            content:
              '<p>当前迭代重点：</p>' +
              '<blockquote>结合 Whisper + GPT-4o mini 构建实时语音互动流程，重点优化延迟。</blockquote>' +
              '<p>待验证假设：多轮上下文缓存能将响应时间缩短 18%。</p>'
          }
        ]
      }
    ]
  };
}

let dataCache = null;

function ensureData() {
  if (dataCache) {
    return dataCache;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      dataCache = JSON.parse(stored);
    } else {
      dataCache = createDefaultData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCache));
    }
  } catch (error) {
    console.warn('无法从本地存储读取数据，使用默认数据。', error);
    dataCache = createDefaultData();
  }
  return dataCache;
}

export function getData() {
  return ensureData();
}

export function saveData(data) {
  dataCache = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCache));
  } catch (error) {
    console.error('保存数据失败:', error);
  }
  return dataCache;
}

export function updateData(mutator) {
  const data = ensureData();
  const result = mutator(data);
  saveData(data);
  return result;
}

export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getProjectById(projectId) {
  if (!projectId) return null;
  return ensureData().projects.find((project) => project.id === projectId) || null;
}

export function getTagById(tagId) {
  return ensureData().tags.find((tag) => tag.id === tagId) || null;
}

export function findTagByName(name) {
  const normalized = name.trim().toLowerCase();
  return ensureData().tags.find((tag) => tag.name.toLowerCase() === normalized) || null;
}

export function ensureTag(name) {
  const existing = findTagByName(name);
  if (existing) {
    return existing;
  }
  const newTag = {
    id: createId('tag'),
    name: name.trim(),
    color: '#58b7ff'
  };
  updateData((data) => {
    data.tags.push(newTag);
  });
  return newTag;
}

export function resetData() {
  dataCache = createDefaultData();
  saveData(dataCache);
  return dataCache;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}
