import { memo } from 'react'
import { ItemsSection, type ItemsSectionProps } from '../items/ItemsSection.tsx'
import { AppVersion } from './AppVersion.tsx'
import { GeneralSection, type GeneralSectionProps } from './GeneralSection.tsx'

interface SettingsPageProps {
  items: Omit<ItemsSectionProps, 't'>
  general: Omit<GeneralSectionProps, 't'>
  version: Omit<Parameters<typeof AppVersion>[0], 't'>
  t: ItemsSectionProps['t']
}

/** The fourth swipe page: the Operator's Items (the Catalog), the General settings, then the app's version. Memoized, like History. */
export const SettingsPage = memo(function SettingsPage({ items, general, version, t }: SettingsPageProps) {
  return (
    <section className="page" aria-labelledby="settings-page-title">
      <h1 className="page-title" id="settings-page-title">
        {t.settings}
      </h1>
      <ItemsSection {...items} t={t} />
      <GeneralSection {...general} t={t} />
      <AppVersion {...version} t={t} />
    </section>
  )
})
