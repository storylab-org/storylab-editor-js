import React, { useState, useEffect } from 'react'
import { User, MapPin, Package, X } from 'lucide-react'
import { type EntityType } from '@/api/entities'
import './EntityCreationModal.css'

const ENTITY_ICONS = {
  character: User,
  location: MapPin,
  item: Package,
}

const ENTITY_LABELS = {
  character: 'Person',
  location: 'Location',
  item: 'Item',
}

interface EntityCreationModalProps {
  type: EntityType
  initialData?: {
    name: string
    description: string
    tags: string[]
  }
  onConfirm: (data: { name: string; description: string; tags: string[] }) => void
  onClose: () => void
}

export default function EntityCreationModal({
  type,
  initialData,
  onConfirm,
  onClose,
}: EntityCreationModalProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const isEditing = !!initialData

  const IconComponent = ENTITY_ICONS[type]

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleConfirm = () => {
    if (!name.trim()) return
    onConfirm({ name: name.trim(), description, tags })
  }

  useEffect(() => {
    // Focus name input on mount
    setTimeout(() => {
      const input = document.querySelector('[data-entity-modal-name]') as HTMLInputElement
      input?.focus()
    }, 0)
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div className="entity-modal-backdrop" onClick={onClose} />

      {/* Modal Panel */}
      <div className="entity-modal-panel">
        {/* Header */}
        <div className="entity-modal-header">
          <IconComponent size={18} />
          <span>{isEditing ? 'Edit' : 'Create'} {ENTITY_LABELS[type]}</span>
        </div>

        {/* Form Body */}
        <div className="entity-modal-body">
          {/* Name */}
          <div className="entity-modal-field">
            <label className="entity-modal-label">Name</label>
            <input
              type="text"
              className="entity-modal-input"
              data-entity-modal-name
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name..."
            />
          </div>

          {/* Description */}
          <div className="entity-modal-field">
            <label className="entity-modal-label">Description</label>
            <textarea
              className="entity-modal-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter description..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="entity-modal-field">
            <label className="entity-modal-label">Tags</label>
            <div className="entity-modal-tag-input-wrapper">
              <input
                type="text"
                className="entity-modal-input"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Enter a tag and press Enter..."
              />
              <button className="entity-modal-tag-add-btn" onClick={handleAddTag}>
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="entity-modal-tags-list">
                {tags.map((tag, index) => (
                  <div key={index} className="entity-modal-tag">
                    <span>{tag}</span>
                    <button
                      className="entity-modal-tag-remove"
                      onClick={() => handleRemoveTag(index)}
                      aria-label={`Remove tag: ${tag}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="entity-modal-footer">
          <button className="entity-modal-btn entity-modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="entity-modal-btn entity-modal-btn-confirm"
            onClick={handleConfirm}
            disabled={!name.trim()}
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </>
  )
}
