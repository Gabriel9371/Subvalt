import { useState } from 'react'
import { imageSrc } from './api'

export function EntityArtwork({ imageUrl, alt, fallback, className }: {
  imageUrl: string | null
  alt: string
  fallback: string
  className: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const source = imageUrl ? imageSrc(imageUrl) : null

  return (
    <div className={`entity-artwork ${className}`} role="img" aria-label={alt}>
      {source && failedUrl !== source
        ? <img src={source} alt="" onError={() => setFailedUrl(source)} />
        : <span aria-hidden="true">{fallback}</span>}
    </div>
  )
}
