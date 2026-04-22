import { useState } from 'react';
import type { FileTreeNode } from '../types';

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string, sha: string) => void;
}

function FileTreeItem({ node, depth, selectedPath, onSelect, onDelete }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          className="tree-item tree-folder"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="tree-icon">{expanded ? '▾' : '▸'}</span>
          <span className="tree-name">{node.name}</span>
        </button>
        {expanded &&
          node.children?.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
      </div>
    );
  }

  return (
    <div className="tree-item-wrapper">
      <button
        className={`tree-item tree-file ${selectedPath === node.path ? 'active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelect(node.path)}
      >
        <span className="tree-icon">📄</span>
        <span className="tree-name">{node.name}</span>
      </button>
      <button
        className="tree-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`"${node.name}" 파일을 삭제하시겠습니까?`)) {
            onDelete(node.path, node.sha);
          }
        }}
        title="삭제"
      >
        ×
      </button>
    </div>
  );
}

interface Props {
  tree: FileTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string, sha: string) => void;
  onCreateFile: () => void;
}

export function FileTree({ tree, selectedPath, onSelect, onDelete, onCreateFile }: Props) {
  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>파일</span>
        <button className="btn btn-icon" onClick={onCreateFile} title="새 노트">
          +
        </button>
      </div>
      <div className="file-tree-content">
        {tree.length === 0 ? (
          <p className="empty-state" style={{ padding: '16px' }}>
            마크다운 파일이 없습니다
          </p>
        ) : (
          tree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
