import { stories, alsoToday, trackedStories, sourceList } from '../src/data';
import { writeFileSync } from 'fs';

// 给演示数据的 sources 补充 url 和 language 默认值
const enrichedStories = stories.map(story => ({
  ...story,
  sources: story.sources.map(s => ({
    ...s,
    url: s.url || '#',
    language: (s.language || 'en') as 'en' | 'zh',
  })),
}));

const data = {
  stories: enrichedStories,
  alsoToday,
  trackedStories,
  sourceList,
  generatedAt: new Date().toISOString(),
  dataVersion: '1.0.0',
};

writeFileSync('public/news-data.json', JSON.stringify(data, null, 2));
console.log('✅ Exported to public/news-data.json');
