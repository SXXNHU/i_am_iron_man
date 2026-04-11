import type * as React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        alt?: string
        poster?: string
        autoplay?: boolean
        'camera-controls'?: boolean
        'disable-zoom'?: boolean
        'disable-pan'?: boolean
        'interaction-prompt'?: string
        'rotation-per-second'?: string
        'shadow-intensity'?: string
        exposure?: string
        class?: string
      }
    }
  }
}
