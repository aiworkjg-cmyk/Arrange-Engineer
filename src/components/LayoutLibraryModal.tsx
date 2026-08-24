import React, { useEffect, useRef, useState } from 'react';
import { BoardSnapshot, BoardState, UserAccount } from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';
import {
  listSnapshots,
  saveSnapshot,
  overwriteSnapshot,
  deleteSnapshot,
  renameSnapshot,
  defaultSnapshotName,
  formatSavedAt
} from '../utils/snapshots';
import { boardStateToMarkdown, downloadMarkdownFile, markdownToBoardState } from '../utils/markdownHelper';
import {
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  Check,
  X,
  Clock,
  Users,
  Layout,
  Pencil,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface LayoutLibraryModalProps {
  isOpen: boolean;
  userId: string;
  activeUser: UserAccount;
  state: BoardState;
  onClose: () => void;
  onRestoreState: (state: BoardState, label: string) => void;
}

export const LayoutLibraryModal: React.FC<LayoutLibraryModalProps> = ({
  isOpen,
  userId,
  activeUser,
  state,
  onClose,
  onRestoreState
}) => {
  const [snapshots, setSnapshots] = useState<BoardSnapshot[]>([]);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setSnapshots(listSnapshots(userId));
    setName(defaultSnapshotName());
    setNotice(null);
    setEditingId(null);
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const next = saveSnapshot(userId, name, state, activeUser.name);
    setSnapshots(next);
    setName(defaultSnapshotName());
    setNotice({ type: 'success', text: '현재 배치표를 저장했습니다.' });
  };

  const handleLoad = (snapshot: BoardSnapshot) => {
    if (
      !window.confirm(
        `'${snapshot.name}' 배치표를 불러오시겠습니까?\n현재 화면의 배치는 대체됩니다. (Ctrl+Z 로 되돌릴 수 있습니다)`
      )
    ) {
      return;
    }
    onRestoreState(snapshot.state, snapshot.name);
    onClose();
  };

  const handleOverwrite = (snapshot: BoardSnapshot) => {
    if (!window.confirm(`'${snapshot.name}' 에 현재 배치표를 덮어쓰시겠습니까?`)) return;
    setSnapshots(overwriteSnapshot(userId, snapshot.id, state, activeUser.name));
    setNotice({ type: 'success', text: `'${snapshot.name}' 에 덮어썼습니다.` });
  };

  const handleDelete = (snapshot: BoardSnapshot) => {
    if (!window.confirm(`'${snapshot.name}' 배치표를 삭제하시겠습니까?`)) return;
    setSnapshots(deleteSnapshot(userId, snapshot.id));
    setNotice({ type: 'success', text: '배치표를 삭제했습니다.' });
  };

  const commitRename = (snapshot: BoardSnapshot) => {
    setSnapshots(renameSnapshot(userId, snapshot.id, editingName));
    setEditingId(null);
  };

  const handleExportFile = () => {
    const filename = `배치표_${state.title.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    downloadMarkdownFile(boardStateToMarkdown(state, activeUser.name), filename);
    setNotice({ type: 'success', text: '배치표 파일을 내려받았습니다.' });
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = content ? markdownToBoardState(content) : null;
      if (!parsed) {
        setNotice({ type: 'error', text: '배치표 파일 형식이 아닙니다.' });
        return;
      }
      onRestoreState(parsed, file.name);
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <FolderOpen className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-base whitespace-nowrap">
                배치표 저장 / 불러오기
              </h3>
              <p className="text-xs text-stone-500 truncate whitespace-nowrap">
                현재 기사 {state.tokens.length}명 · 구역 {state.zones.length}개
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notice && (
          <div
            className={`mx-5 mt-4 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 ${
              notice.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {notice.type === 'error' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
          {/* 현재 배치표 저장 */}
          <div className="p-3.5 rounded-xl border-2 border-blue-200 bg-blue-50/50 space-y-2.5">
            <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5 whitespace-nowrap">
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>현재 배치표 저장하기</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="배치표 이름 (예: 월요일 오전 배치)"
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>저장</span>
              </button>
            </div>
          </div>

          {/* 저장된 배치표 목록 */}
          <div>
            <div className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between gap-2">
              <span className="whitespace-nowrap">저장된 배치표 ({snapshots.length}개)</span>
              <span className="text-[11px] font-medium text-stone-400 whitespace-nowrap">
                최대 30개까지 보관됩니다
              </span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-stone-300 text-center text-xs text-stone-400">
                아직 저장된 배치표가 없습니다.
                <br />위에서 이름을 정하고 [저장] 을 눌러보세요.
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {editingId === snapshot.id ? (
                          <input
                            type="text"
                            value={editingName}
                            autoFocus
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => commitRename(snapshot)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(snapshot);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full px-2 py-1 text-sm font-bold rounded border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-sm text-stone-900 truncate whitespace-nowrap">
                              {snapshot.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(snapshot.id);
                                setEditingName(snapshot.name);
                              }}
                              className="p-0.5 text-stone-400 hover:text-blue-600 shrink-0"
                              title="이름 변경"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-stone-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {formatSavedAt(snapshot.savedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 shrink-0" />
                            {snapshot.tokenCount}명
                          </span>
                          <span className="flex items-center gap-1">
                            <Layout className="w-3 h-3 shrink-0" />
                            {snapshot.zoneCount}구역
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoad(snapshot)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-stone-900 hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap"
                          title="이 배치표를 보드에 불러옵니다"
                        >
                          불러오기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOverwrite(snapshot)}
                          className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="현재 배치표로 덮어쓰기"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(snapshot)}
                          className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="배치표 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 파일 내보내기 / 가져오기 */}
          <div className="pt-4 border-t border-stone-200">
            <div className="text-xs font-bold text-stone-700 mb-2 whitespace-nowrap">
              파일로 백업 / 다른 PC 로 옮기기
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportFile}
                className="py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>파일로 내보내기</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>파일에서 불러오기</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
