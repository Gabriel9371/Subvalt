import { useEffect, useRef, useState } from 'react'
import { imageSrc } from './api'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export function ImagePicker({ currentImageUrl, alt, kind, file, onFileChange, removalRequested, onRemovalRequestedChange, disabled }: {
  currentImageUrl: string | null
  alt: string
  kind: 'subscription' | 'media'
  file: File | null
  onFileChange: (file: File | null) => void
  removalRequested: boolean
  onRemovalRequestedChange: (remove: boolean) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const existingImageUrl = currentImageUrl ? imageSrc(currentImageUrl) : null
  const displayedUrl = file && previewUrl ? previewUrl : removalRequested ? null : existingImageUrl
  const imageFailed = displayedUrl !== null && failedUrl === displayedUrl
  const hasImage = Boolean(file || (currentImageUrl && !removalRequested))

  const selectFile = (selected: File | undefined) => {
    if (!selected) return
    if (selected.size > MAX_IMAGE_SIZE) {
      setFileError('A imagem deve ter no máximo 5 MB.')
      return
    }
    if (!/\.(jpe?g|png|webp)$/i.test(selected.name)) {
      setFileError('Selecione uma imagem JPEG, PNG ou WEBP.')
      return
    }
    setFileError('')
    setPreviewUrl(URL.createObjectURL(selected))
    onRemovalRequestedChange(false)
    onFileChange(selected)
  }

  const clearImage = () => {
    setFileError('')
    if (file) {
      setPreviewUrl(null)
      onFileChange(null)
    } else {
      onRemovalRequestedChange(true)
    }
  }

  return (
    <section
      className={`image-picker ${kind} ${dragging ? 'dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) selectFile(event.dataTransfer.files[0])
      }}
      aria-label="Imagem da entidade"
    >
      <div className={`image-picker-preview ${kind}`}>
        {displayedUrl && !imageFailed
          ? <img src={displayedUrl} alt={alt} onError={() => setFailedUrl(displayedUrl)} />
          : <div className="image-picker-placeholder">
            <span aria-hidden="true">{imageFailed ? '!' : kind === 'subscription' ? 'LOGO' : 'CAPA'}</span>
            <small>{imageFailed ? 'Imagem indisponível' : removalRequested ? 'Imagem removida' : 'Nenhuma imagem cadastrada'}</small>
          </div>}
      </div>
      <div className="image-picker-content">
        <div>
          <strong>{kind === 'subscription' ? 'Logo da assinatura' : 'Capa da mídia'}</strong>
          <p>JPEG, PNG ou WEBP · até 5 MB · arraste uma imagem até aqui</p>
        </div>
        <div className="image-picker-actions">
          <button type="button" className="button secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
            {hasImage ? 'Substituir imagem' : 'Selecionar imagem'}
          </button>
          {removalRequested ? (
            <button type="button" className="text-button" disabled={disabled} onClick={() => onRemovalRequestedChange(false)}>
              Desfazer remoção
            </button>
          ) : hasImage ? (
            <button type="button" className="text-button danger-text" disabled={disabled} onClick={clearImage}>
              Remover
            </button>
          ) : null}
          <input
            ref={inputRef}
            className="image-picker-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(event) => {
              selectFile(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </div>
        {fileError && <p className="image-picker-error" role="alert">{fileError}</p>}
      </div>
    </section>
  )
}
