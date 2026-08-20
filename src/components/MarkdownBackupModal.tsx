import React, { useState, useRef } from 'react';
import { BoardState, UserAccount } from '../types';
import { boardStateToMarkdown, downloadMarkdownFile, markdownToBoardState } from '../utils/markdownHelper';
import { FileText, Download, Upload, Copy, Check, AlertCircle, RefreshCw, X, HardDrive } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MarkdownBackupModalProps {
  isOpen: boolean;
  state: BoardState;
  activeUser: UserAccount;
  onClose: () => void;
  onRestoreState: (restoredState: BoardState) => void;
}

export const MarkdownBackupModal: React.FC<MarkdownBackupModalProps> = ({
  isOpen,
  state,
  activeUser,
  onClose,
  onRestoreState
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const markdownContent = boardStateToMarkdown(state, activeUser.name);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `마그넷보드_${state.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`;
    downloadMarkdownFile(markdownContent, filename);
  };

  const handleFileProcess = (file: File) => {
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setImportError('파일 내용을 읽을 수 없습니다.');
        return;
      }

      const parsedState = markdownToBoardState(content);
      if (parsedState) {
        onRestoreState(parsedState);
        setImportSuccess(`백업 파일('${file.name}')에서 모형 ${parsedState.tokens.length}개, 구역 ${parsedState.zones.length}개를 성공적으로 복원했습니다!`);
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch (err) {}
      } else {
        setImportError('유효한 마그넷 보드 백업 마크다운/JSON 형식이 아닙니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleManualImport = () => {
    if (!manualText.trim()) return;
    setImportError(null);
    const parsed = markdownToBoardState(manualText);
    if (parsed) {
      onRestoreState(parsed);
      setImportSuccess(`붙여넣은 마크다운 데이터에서 모형 ${parsed.tokens.length}개를 성공적으로 복원했습니다!`);
      setManualText('');
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (err) {}
    } else {
      setImportError('입력된 텍스트에서 보드 데이터를 파싱할 수 없습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                마크다운 로컬 백업 및 불러오기 (Import/Export)
              </h3>
              <p className="text-xs text-stone-500">
                보드의 모든 모형 배치, 속성, 일정, 이력을 마크다운 파일로 저장하거나 복원합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-stone-200 bg-stone-50/50 px-5">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>마크다운 내보내기 & 로컬 저장</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>백업 파일 업로드 및 복원</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                <div>
                  <div className="text-xs text-stone-500">배치된 모형</div>
                  <div className="text-base font-bold text-stone-800">{state.tokens.length}개</div>
                </div>
                <div>
                  <div className="text-xs text-stone-500">지정 구역</div>
                  <div className="text-base font-bold text-blue-600">{state.zones.length}개</div>
                </div>
                <div>
                  <div className="text-xs text-stone-500">배정된 일정</div>
                  <div className="text-base font-bold text-emerald-600">{state.schedules.length}건</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-600">
                  생성된 Markdown 미리보기 (.md)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '복사 완료!' : '클립보드 복사'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.md 파일 다운로드</span>
                  </button>
                </div>
              </div>

              {/* Markdown Preview Box */}
              <div className="relative">
                <textarea
                  readOnly
                  value={markdownContent}
                  className="w-full h-64 p-3.5 text-xs font-mono bg-stone-900 text-stone-200 rounded-xl border border-stone-700 focus:outline-none resize-none custom-scrollbar leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                    : 'border-stone-300 hover:border-blue-400 bg-stone-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.json,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-stone-800">
                  백업 파일(.md / .json)을 여기로 드래그하거나 클릭하여 선택
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  이전에 저장했던 마크다운 백업본을 불러와 모형 배치와 일정을 즉시 복원합니다.
                </p>
              </div>

              {/* Status alerts */}
              {importSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Or Manual Paste Text */}
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-700">
                    또는 마크다운/JSON 내용 직접 붙여넣기
                  </label>
                  <button
                    onClick={handleManualImport}
                    disabled={!manualText.trim()}
                    className="px-3 py-1 text-xs font-bold text-white bg-blue-600 disabled:bg-stone-300 rounded-md transition-colors"
                  >
                    데이터 적용
                  </button>
                </div>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={4}
                  placeholder="# 마크다운 또는 복사한 백업 텍스트를 붙여넣으세요..."
                  className="w-full p-2.5 text-xs font-mono rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
