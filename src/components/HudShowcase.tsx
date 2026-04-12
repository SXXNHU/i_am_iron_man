import { SuitGallery } from './SuitGallery'

type HudShowcaseProps = {
  assistantResponse: string
}

export function HudShowcase({
  assistantResponse,
}: HudShowcaseProps) {
  return (
    <section className="showcase-shell showcase-shell--hall">
      <SuitGallery />
      <div className="showcase-footer">
        <div className="showcase-waveform">
          {Array.from({ length: 56 }, (_, index) => (
            <span
              key={index}
              className={`wave-bar ${index % 9 === 0 ? 'accent' : ''}`}
              style={{ height: `${8 + ((index * 13) % 36)}px` }}
            />
          ))}
        </div>
        <div className="showcase-footer-copy">
          <span>assistant channel</span>
          <strong>{assistantResponse || 'Awaiting polished response output.'}</strong>
        </div>
      </div>
    </section>
  )
}
