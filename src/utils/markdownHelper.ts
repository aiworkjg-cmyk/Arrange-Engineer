import { BoardState, MagnetToken, BoardZone, ScheduleItem, ActivityLog } from '../types';

/**
 * Converts BoardState into a beautiful, human-readable & parseable Markdown document.
 */
export function boardStateToMarkdown(state: BoardState, activeUserName: string = '사용자'): string {
  const dateStr = new Date(state.lastSavedAt || Date.now()).toLocaleString('ko-KR');

  const zoneSummary = state.zones.map(zone => {
    const tokensInZone = state.tokens.filter(t => t.zoneId === zone.id);
    const memberNames = tokensInZone.map(t => `${t.title}(${t.subtitle || '배정'})`).join(', ') || '없음';
    return `| **${zone.title}** | \`${zone.code || '-'}\` | ${tokensInZone.length}명 | ${memberNames} | (${Math.round(zone.x)}%, ${Math.round(zone.y)}%) |`;
  }).join('\n');

  const tokensTable = state.tokens.map(token => {
    const zone = state.zones.find(z => z.id === token.zoneId);
    const zoneName = zone ? zone.title : '미지정(자유배치)';
    return `| ${token.orderNumber || '-'} | **${token.title}** | ${token.subtitle || '-'} | ${token.phone || '-'} | \`${token.shape}\` | \`${token.color}\` | \`${token.size}\` | ${Math.round(token.x)}% | ${Math.round(token.y)}% | ${zoneName} | ${token.status} |`;
  }).join('\n');

  const schedulesTable = state.schedules.map(sch => {
    return `| ${sch.date} | ${sch.timeRange} | **${sch.userName}** | ${sch.title} | ${sch.zoneName} | \`${sch.status}\` | ${sch.location} | ${sch.notes || '-'} |`;
  }).join('\n');

  const logsList = state.logs.slice(0, 15).map(log => {
    return `- **[${log.timestamp}]** ${log.userName}: *${log.action}* - **${log.targetName}** (${log.description}) ${log.fromZone && log.toZone ? `\`${log.fromZone} → ${log.toZone}\`` : ''}`;
  }).join('\n');

  // Embed lossless json block for perfect restoration
  const rawStateJson = JSON.stringify(state, null, 2);

  return `# 📋 ${state.title || '마그넷 보드 배치 및 분류 대시보드 백업'}

> **저장 일시:** ${dateStr}  
> **저장자:** ${activeUserName}  
> **보드 버전:** v${state.version || 1}  
> **총 모형/인원:** ${state.tokens.length}개 | **구역 수:** ${state.zones.length}개 | **배정 일정:** ${state.schedules.length}건  

---

## 🗺️ 1. 구역별 배치 및 인원 현황

| 구역명 | 코드 | 배정 인원 | 배정된 모형/작업자 | 보드 좌표 (X, Y) |
| :--- | :--- | :---: | :--- | :---: |
${zoneSummary}

---

## 🏷️ 2. 개별 모형 (자석/카드) 상세 속성 목록

| 번호 | 이름/라벨 | 역할/직책 | 연락처 | 모형 형태 | 색상 코드 | 크기 | X 위치 | Y 위치 | 소속 구역 | 상태 |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
${tokensTable}

---

## 📅 3. 작업자별 배정 일정 및 현장 스케줄

| 작업 일자 | 시간대 | 담당자 | 일정 / 업무명 | 배정 구역 | 진행 상태 | 현장 위치 | 특이사항/메모 |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
${schedulesTable}

---

## 📜 4. 최근 작업 및 배치 변경 이력 (Activity Log)

${logsList}

---

## ⚙️ 5. 시스템 복원용 데이터 (Lossless Data Engine)
<!-- 마크다운 파일 업로드 시 아래 JSON 데이터를 자동으로 파싱하여 보드 상태를 100% 완벽하게 복원합니다. -->
\`\`\`json
${rawStateJson}
\`\`\`
`;
}

/**
 * Parses an uploaded Markdown or JSON text and restores BoardState.
 */
export function markdownToBoardState(markdownContent: string): BoardState | null {
  try {
    // 1. Check if there's an embedded JSON block
    const jsonMatch = markdownContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && Array.isArray(parsed.tokens)) {
        return parsed as BoardState;
      }
    }

    // 2. Try direct JSON parse in case user uploaded a .json backup file
    const directParsed = JSON.parse(markdownContent.trim());
    if (directParsed && Array.isArray(directParsed.tokens)) {
      return directParsed as BoardState;
    }
  } catch (err) {
    console.warn('Direct JSON block parse failed, falling back to manual markdown table parsing...', err);
  }

  // 3. Fallback: Parse markdown tables if JSON block was removed
  try {
    const tokens: MagnetToken[] = [];
    const zones: BoardZone[] = [];
    const schedules: ScheduleItem[] = [];
    const logs: ActivityLog[] = [];

    // Parse tokens from table
    const lines = markdownContent.split('\n');
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## 1.') || line.includes('구역별 배치')) {
        currentSection = 'zones';
      } else if (line.startsWith('## 2.') || line.includes('개별 모형')) {
        currentSection = 'tokens';
      } else if (line.startsWith('## 3.') || line.includes('작업자별 배정 일정')) {
        currentSection = 'schedules';
      } else if (line.startsWith('## 4.') || line.includes('최근 작업')) {
        currentSection = 'logs';
      }

      if (line.startsWith('|') && !line.includes('---') && !line.includes('이름/라벨') && !line.includes('구역명') && !line.includes('작업 일자')) {
        const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        if (currentSection === 'tokens' && cols.length >= 7) {
          const title = cols[1]?.replace(/\*\*/g, '') || `모형-${tokens.length + 1}`;
          const subtitle = cols[2] !== '-' ? cols[2] : undefined;
          const phone = cols[3] !== '-' ? cols[3] : undefined;
          const shape = (cols[4]?.replace(/`/g, '') || 'circle') as any;
          const color = cols[5]?.replace(/`/g, '') || '#fef9c3';
          const size = (cols[6]?.replace(/`/g, '') || 'md') as any;
          const x = parseFloat(cols[7]?.replace('%', '')) || 20;
          const y = parseFloat(cols[8]?.replace('%', '')) || 20;
          const status = (cols[10] || 'assigned') as any;

          tokens.push({
            id: `mag-imported-${Date.now()}-${tokens.length}`,
            title,
            subtitle,
            phone,
            shape: ['circle', 'rounded-rect', 'hexagon', 'pill', 'square'].includes(shape) ? shape : 'circle',
            color,
            textColor: '#1c1917',
            size: ['sm', 'md', 'lg', 'xl'].includes(size) ? size : 'md',
            x,
            y,
            fontStyle: 'handwriting',
            status,
            orderNumber: tokens.length + 1,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    if (tokens.length > 0) {
      return {
        version: 1,
        title: '불러온 마그넷 보드',
        lastSavedAt: new Date().toISOString(),
        lastSavedBy: '복원된 백업',
        tokens,
        zones: zones.length > 0 ? zones : [],
        schedules,
        logs
      };
    }
  } catch (fallbackErr) {
    console.error('Markdown fallback parse failed:', fallbackErr);
  }

  return null;
}

/**
 * Triggers browser download for markdown file
 */
export function downloadMarkdownFile(markdownContent: string, fileName: string = 'magnet_board_backup.md') {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
