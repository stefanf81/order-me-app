import type { ReactNode } from 'react'

interface Tab {
  /** What the tab shows, shortened where a full word doesn't fit a quarter of a phone (NL "Historiek"). */
  label: string
  /** The page's full name, for screen readers (NL "Geschiedenis"). */
  name: string
  icon: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  page: number
  navLabel: string
  onPageChange: (page: number) => void
}

/** The swipe pages as a native-style tab bar: equal tabs, icon then label, the current one tinted amber. */
export function TabBar({ tabs, page, navLabel, onPageChange }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label={navLabel}>
      {tabs.map((tab, i) => (
        <button
          key={tab.name}
          type="button"
          className="tab"
          aria-label={tab.name === tab.label ? undefined : tab.name}
          aria-current={i === page ? 'page' : undefined}
          onClick={() => onPageChange(i)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
            {tab.icon}
          </svg>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
