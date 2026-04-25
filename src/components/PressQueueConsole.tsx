'use client'

import { useState, useEffect } from 'react'

const STAGES = ['QUEUED', 'PRINTING', 'CURING', 'TRIM', 'PACKED', 'SHIPPED'] as const
type Stage = (typeof STAGES)[number]

const STAGE_COLORS: Record<Stage, string> = {
  QUEUED:   '#8A8A9A',
  PRINTING: '#00AECC',
  CURING:   '#FFCC00',
  TRIM:     '#CC0066',
  PACKED:   '#1A1208',
  SHIPPED:  '#28C840',
}
const STAGE_TEXT: Record<Stage, string> = {
  QUEUED:   '#fff',
  PRINTING: '#000',
  CURING:   '#000',
  TRIM:     '#fff',
  PACKED:   '#fff',
  SHIPPED:  '#000',
}

const DEMO_JOBS = [
  { id: 'PS-2401', name: 'HOODIE_BATCH_047',   stage: 0 },
  { id: 'PS-2402', name: 'BANNER_3X1_RED',     stage: 1 },
  { id: 'PS-2403', name: 'DTF_TRANSFER_200',   stage: 2 },
  { id: 'PS-2404', name: 'VINYL_CUT_SET_A',    stage: 3 },
  { id: 'PS-2405', name: 'TSHIRT_WHITE_50',    stage: 4 },
  { id: 'PS-2406', name: 'ROLLER_BANNER_X2',   stage: 5 },
]

const CMYK_COLORS = ['#00AECC', '#CC0066', '#FFCC00', '#1A1208']

export default function PressQueueConsole() {
  const [jobs, setJobs] = useState(DEMO_JOBS)

  useEffect(() => {
    const id = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) => ({ ...j, stage: (j.stage + 1) % STAGES.length }))
      )
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 800,
        background: 'var(--ink)',
        border: '2px solid var(--cream-border)',
        boxShadow: '5px 5px 0 var(--red)',
        borderRadius: 0,
      }}
    >
      {/* Console header bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.1)' }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--paper-white)' }}>
          Pressroom Console — Live
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full console-pulse" style={{ background: '#28C840' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.55rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(253,250,244,.4)' }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Job rows */}
      <div className="px-6 py-5 flex flex-col gap-4">
        {jobs.map((job) => {
          const stageName = STAGES[job.stage]
          return (
            <div key={job.id} className="flex flex-col gap-1.5">
              {/* Row: ID + name + stage badge + dots */}
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.6rem', letterSpacing: '.08em', color: 'rgba(253,250,244,.45)' }}>
                  {job.id}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.75rem', fontWeight: 600, letterSpacing: '.06em', color: 'var(--paper-white)', flex: 1 }}>
                  {job.name}
                </span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '.58rem',
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    padding: '3px 10px',
                    background: STAGE_COLORS[stageName],
                    color: STAGE_TEXT[stageName],
                    transition: 'background .3s ease',
                  }}
                >
                  {stageName}
                </span>
                <span className="flex items-center gap-[3px]">
                  {CMYK_COLORS.map((bg, i) => (
                    <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ background: bg }} />
                  ))}
                </span>
              </div>
              {/* Progress bar */}
              <div className="flex gap-[2px]">
                {STAGES.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      height: 3,
                      background: i <= job.stage ? 'var(--red)' : 'rgba(255,255,255,.1)',
                      transition: 'background .3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
