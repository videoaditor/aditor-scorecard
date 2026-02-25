import EditorCard from './EditorCard'
import EditorDetail from './EditorDetail'
import { useState } from 'react'

function EditorSection({ allEditors, onDragStart }) {
  const [selectedEditor, setSelectedEditor] = useState(null)

  if (!allEditors || allEditors.length === 0) {
    return null
  }

  return (
    <div className="editor-section">
      <div className="editor-section-header">
        <span className="editor-section-icon">⚔️</span>
        <span className="editor-section-title">EDITORS</span>
        <span className="editor-section-count">{allEditors.length}</span>
      </div>

      <div className="editor-card-row">
        {allEditors.map(editor => (
          <EditorCard
            key={editor.id}
            editor={editor}
            onClick={() => setSelectedEditor(
              selectedEditor?.id === editor.id ? null : editor
            )}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      {selectedEditor && (
        <EditorDetail
          editor={selectedEditor}
          onClose={() => setSelectedEditor(null)}
        />
      )}
    </div>
  )
}

export default EditorSection
