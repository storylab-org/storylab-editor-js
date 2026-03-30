import { NodeKey } from 'lexical'

interface ImageComponentProps {
  nodeKey: NodeKey
  src: string
  alt: string
  width: number | undefined
}

export default function ImageComponent({
  nodeKey,
  src,
  alt,
  width,
}: ImageComponentProps) {
  return (
    <img
      src={src}
      alt={alt}
      data-image-key={nodeKey}
      style={{
        width: width ? `${width}px` : undefined,
        maxWidth: '100%',
        display: 'block',
      }}
      draggable={false}
    />
  )
}
