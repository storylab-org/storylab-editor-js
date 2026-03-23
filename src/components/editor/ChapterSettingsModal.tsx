import { useState, useEffect } from 'react'
import './ChapterSettingsModal.css'

const PRESET_COLOURS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Light', value: '#f9f9f9' },
  { name: 'Parchment', value: '#f5f0e8' },
  { name: 'Sepia', value: '#fdf6e3' },
  { name: 'Dark', value: '#1e1e1e' },
  { name: 'Soft Dark', value: '#2d2d2d' },
]

interface ChapterSettingsModalProps {
  initialBackground: string
  onChange: (background: string) => void
  chapterName: string
  onNameChange: (name: string) => void
}

export default function ChapterSettingsModal({
  initialBackground,
  onChange,
  chapterName,
  onNameChange,
}: ChapterSettingsModalProps) {
  const [background, setBackground] = useState(initialBackground)
  const [name, setName] = useState(chapterName)

  useEffect(() => {
    setBackground(initialBackground)
  }, [initialBackground])

  useEffect(() => {
    setName(chapterName)
  }, [chapterName])

  const handleColourChange = (colour: string) => {
    setBackground(colour)
    onChange(colour)
  }

  const handleNameChange = (newName: string) => {
    setName(newName)
    // Only call onNameChange if name is not empty
    // Allows empty state in input without triggering unnecessary updates
    if (newName.trim()) {
      onNameChange(newName)
    }
  }

  return (
    <div className="ChapterSettingsModal">
      <div className="settings-section">
        <label className="settings-label" htmlFor="chapter-name">Chapter Name</label>
        <input
          id="chapter-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter chapter name"
          className="chapter-name-input"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">Page Background</label>

        <div className="colour-swatches">
          {PRESET_COLOURS.map((preset) => (
            <button
              key={preset.value}
              className={`colour-swatch ${background === preset.value ? 'active' : ''}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => handleColourChange(preset.value)}
              title={preset.name}
              aria-label={`${preset.name} (${preset.value})`}
            />
          ))}
        </div>

        <div className="colour-picker-wrapper">
          <input
            type="color"
            value={background}
            onChange={(e) => handleColourChange(e.target.value)}
            className="colour-picker"
            aria-label="Custom colour picker"
          />
          <span className="colour-value">{background}</span>
        </div>
      </div>
    </div>
  )
}
