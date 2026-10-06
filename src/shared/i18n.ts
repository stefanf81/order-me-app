export type Locale = 'en' | 'nl'
/** 'system' follows the phone's language. */
export type LanguageSetting = 'system' | Locale

/** Dutch when the device language is any flavour of Dutch, otherwise English. */
export function detectLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('nl') ? 'nl' : 'en'
}

/** The language the app speaks: the Operator's choice, or the phone's language for 'system'. */
export function resolveLocale(setting: LanguageSetting, deviceLanguage: string | undefined): Locale {
  return setting === 'system' ? detectLocale(deviceLanguage) : setting
}

/**
 * The locale for formatting dates and times: the phone's full locale (e.g. en-GB, with its 24-hour clock) when it
 * speaks the app language, otherwise just the app language.
 */
export function formattingLocale(appLocale: Locale, deviceLanguage: string | undefined): string {
  const deviceLang = deviceLanguage?.toLowerCase().split('-')[0]
  return deviceLanguage && deviceLang === appLocale ? deviceLanguage : appLocale
}

export interface Messages {
  appName: string
  drinks: string
  snacks: string
  tileLabel: (name: string, count: number) => string
  removeOne: (name: string) => string
  roundTotal: string
  itemsCount: (n: number) => string
  emptyHint: string
  search: string
  searchPlaceholder: string
  closeSearch: string
  noMatch: (query: string) => string
  clear: string
  show: string
  showTitle: string
  backToRound: string
  showEmpty: string
  addOne: (name: string) => string
  total: string
  tableLabel: string
  remarkLabel: string
  tableLine: (table: string) => string
  remarkLine: (remark: string) => string
  share: string
  copied: string
  markOrdered: string
  roundPlaced: string
  roundCleared: string
  undo: string
  history: string
  round: string
  items: string
  pages: string
  historyEmpty: string
  roundsCount: (n: number) => string
  today: string
  yesterday: string
  roundAt: (time: string) => string
  deleteRoundFrom: (time: string) => string
  deleteRoundConfirm: string
  delete: string
  cancel: string
  orderAgain: string
  skippedItems: (n: number) => string
  catalogCount: (n: number) => string
  addItem: string
  newTile: string
  newItem: string
  addToRound: string
  editItem: string
  editNamed: (name: string) => string
  pinNamed: (name: string) => string
  shareItems: string
  shareItemsHint: string
  shareItemsTitle: string
  shareRound: string
  shareRoundHint: string
  qrRoundAlt: (n: number) => string
  shareAsText: string
  shareAsQr: string
  textShort: string
  roundReceived: string
  qrAlt: (n: number) => string
  tooBigForQr: string
  copiedShort: string
  copyFailed: string
  copyLink: string
  close: string
  replaceCatalogConfirm: (current: number, shared: number) => string
  replace: string
  badShareLink: string
  moveUp: (name: string) => string
  moveDown: (name: string) => string
  name: string
  namePlaceholder: string
  category: string
  drink: string
  snack: string
  emoji: string
  typeYourOwn: string
  add: string
  save: string
  nameRequired: string
  emojiRequired: string
  itemDeleted: (name: string) => string
  deleteNamed: (name: string) => string
  settings: string
  /** Short tab labels where the full word doesn't fit a quarter of the screen. */
  historyTab: string
  settingsTab: string
  general: string
  language: string
  theme: string
  system: string
  dark: string
  light: string
  addToHome: string
  updateAvailable: string
  update: string
  later: string
  updateReady: string
  versionLine: (version: string, build: string, date: string) => string
  installSteps: string[]
  clearHistory: string
  clearHistoryConfirm: string
  resetApp: string
  resetAppConfirm: string
  reset: string
  resetOffline: string
  crashTitle: string
  crashBody: string
  crashReload: string
}

export const messages: Record<Locale, Messages> = {
  en: {
    appName: 'This round is on me',
    drinks: 'Drinks',
    snacks: 'Snacks',
    tileLabel: (name, count) => (count ? `${name}, ${count} in round` : name),
    removeOne: (name) => `Remove one ${name}`,
    roundTotal: 'Round total',
    itemsCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    emptyHint: 'Tap a drink to start',
    search: 'Search',
    searchPlaceholder: 'Search drinks and snacks',
    closeSearch: 'Close search',
    noMatch: (query) => `No drinks or snacks match “${query}”`,
    clear: 'Clear',
    show: 'Show',
    showTitle: 'Round for the counter',
    backToRound: 'Back to Round',
    showEmpty: 'Nothing in this Round yet. Tap drinks on the Round page.',
    addOne: (name) => `Add one ${name}`,
    total: 'Total',
    tableLabel: 'Table',
    remarkLabel: 'Remark',
    tableLine: (table) => `Table ${table}`,
    remarkLine: (remark) => `Remark: ${remark}`,
    share: 'Share',
    copied: 'Copied to clipboard',
    markOrdered: 'Ordered',
    roundPlaced: 'Round placed',
    roundCleared: 'Round cleared',
    undo: 'Undo',
    history: 'History',
    round: 'Round',
    items: 'Items',
    pages: 'Pages',
    historyEmpty: 'No Rounds yet. Mark a Round as ordered and it shows up here.',
    roundsCount: (n) => `${n} ${n === 1 ? 'Round' : 'Rounds'}`,
    today: 'Today',
    yesterday: 'Yesterday',
    roundAt: (time) => `Round at ${time}`,
    deleteRoundFrom: (time) => `Delete Round from ${time}`,
    deleteRoundConfirm: 'Delete this Round from history?',
    delete: 'Delete',
    cancel: 'Cancel',
    orderAgain: 'Order again',
    skippedItems: (n) =>
      n === 1 ? '1 item no longer exists and was skipped' : `${n} items no longer exist and were skipped`,
    catalogCount: (n) => `${n} in your Catalog`,
    addItem: 'Add Item',
    newTile: 'New',
    newItem: 'New Item',
    addToRound: 'Add to Round',
    editItem: 'Edit Item',
    editNamed: (name) => `Edit ${name}`,
    pinNamed: (name) => `Pin ${name}`,
    shareItems: 'Share',
    shareItemsHint: 'Scan to open the page',
    shareItemsTitle: 'Share Items',
    shareRound: 'Share Round',
    shareRoundHint: 'Scan to open the Round',
    qrRoundAlt: (n) => `QR code with your Round of ${n} ${n === 1 ? 'item' : 'items'}`,
    shareAsText: 'Share as text',
    shareAsQr: 'Share as QR code',
    textShort: 'Text',
    roundReceived: 'Round received',
    qrAlt: (n) => `QR code with your ${n} Items`,
    tooBigForQr: 'Too many Items for a QR code that scans reliably. Copy the link instead.',
    copiedShort: 'Copied',
    copyFailed: 'Couldn’t copy',
    copyLink: 'Copy link',
    close: 'Close',
    replaceCatalogConfirm: (current, shared) => `Replace your ${current} Items with the ${shared} shared Items? History is kept.`,
    replace: 'Replace',
    badShareLink: 'That share link couldn’t be read',
    moveUp: (name) => `Move ${name} up`,
    moveDown: (name) => `Move ${name} down`,
    name: 'Name',
    namePlaceholder: 'e.g. Kriek',
    category: 'Category',
    drink: 'Drink',
    snack: 'Snack',
    emoji: 'Emoji',
    typeYourOwn: 'Or type your own',
    add: 'Add',
    save: 'Save',
    nameRequired: 'Give the Item a name',
    emojiRequired: 'Pick an emoji',
    itemDeleted: (name) => `${name} deleted`,
    deleteNamed: (name) => `Delete ${name}`,
    settings: 'Settings',
    historyTab: 'History',
    settingsTab: 'Settings',
    general: 'General',
    language: 'Language',
    theme: 'Theme',
    system: 'System',
    dark: 'Dark',
    light: 'Light',
    addToHome: 'Add to Home Screen',
    updateAvailable: 'A new version of OrderMe is available.',
    update: 'Update',
    later: 'Later',
    updateReady: 'Update available',
    versionLine: (version, build, date) => `Version ${version} · build ${build} · ${date}`,
    installSteps: [
      'In Safari, tap Share (on newer iPhones it’s under •••).',
      'Scroll down and choose “Add to Home Screen”.',
      'Tap Add. OrderMe now opens full-screen from your home screen.',
    ],
    clearHistory: 'Clear history',
    clearHistoryConfirm: 'Delete all past Rounds?',
    resetApp: 'Reset app',
    resetAppConfirm:
      'Reset the app to how it was first installed? This deletes your Items, pins, the Round, all History and your settings, and loads the newest version.',
    reset: 'Reset',
    resetOffline: 'No connection. Resetting needs internet to load the newest version.',
    crashTitle: 'Something went wrong',
    crashBody: 'The app hit an unexpected error. Your Round and Items are saved on this phone.',
    crashReload: 'Reload',
  },
  nl: {
    appName: 'Dit rondje is van mij',
    drinks: 'Dranken',
    snacks: 'Snacks',
    tileLabel: (name, count) => (count ? `${name}, ${count} in rondje` : name),
    removeOne: (name) => `Eén ${name} minder`,
    roundTotal: 'Totaal van het rondje',
    itemsCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    emptyHint: 'Tik op een drankje om te starten',
    search: 'Zoeken',
    searchPlaceholder: 'Zoek drankjes en snacks',
    closeSearch: 'Zoeken sluiten',
    noMatch: (query) => `Geen drankjes of snacks gevonden voor “${query}”`,
    clear: 'Wissen',
    show: 'Toon',
    showTitle: 'Rondje voor de toog',
    backToRound: 'Terug naar rondje',
    showEmpty: 'Nog niets in dit rondje. Tik drankjes aan op de pagina Rondje.',
    addOne: (name) => `Eén ${name} meer`,
    total: 'Totaal',
    tableLabel: 'Tafel',
    remarkLabel: 'Opmerking',
    tableLine: (table) => `Tafel ${table}`,
    remarkLine: (remark) => `Opmerking: ${remark}`,
    share: 'Delen',
    copied: 'Gekopieerd',
    markOrdered: 'Besteld',
    roundPlaced: 'Rondje geplaatst',
    roundCleared: 'Rondje gewist',
    undo: 'Ongedaan maken',
    history: 'Geschiedenis',
    round: 'Rondje',
    items: 'Items',
    pages: 'Pagina’s',
    historyEmpty: 'Nog geen rondjes. Markeer een rondje als besteld en het verschijnt hier.',
    roundsCount: (n) => `${n} ${n === 1 ? 'rondje' : 'rondjes'}`,
    today: 'Vandaag',
    yesterday: 'Gisteren',
    roundAt: (time) => `Rondje van ${time}`,
    deleteRoundFrom: (time) => `Rondje van ${time} verwijderen`,
    deleteRoundConfirm: 'Dit rondje uit de geschiedenis verwijderen?',
    delete: 'Verwijderen',
    cancel: 'Annuleren',
    orderAgain: 'Opnieuw bestellen',
    skippedItems: (n) =>
      n === 1 ? '1 item bestaat niet meer en is overgeslagen' : `${n} items bestaan niet meer en zijn overgeslagen`,
    catalogCount: (n) => `${n} in je catalogus`,
    addItem: 'Item toevoegen',
    newTile: 'Nieuw',
    newItem: 'Nieuw item',
    addToRound: 'Aan rondje toevoegen',
    editItem: 'Item bewerken',
    editNamed: (name) => `${name} bewerken`,
    pinNamed: (name) => `${name} vastzetten`,
    shareItems: 'Delen',
    shareItemsHint: 'Scan om de pagina te openen',
    shareItemsTitle: 'Items delen',
    shareRound: 'Rondje delen',
    shareRoundHint: 'Scan om het rondje te openen',
    qrRoundAlt: (n) => `QR-code met je rondje van ${n} ${n === 1 ? 'item' : 'items'}`,
    shareAsText: 'Delen als tekst',
    shareAsQr: 'Delen als QR-code',
    textShort: 'Tekst',
    roundReceived: 'Rondje ontvangen',
    qrAlt: (n) => `QR-code met je ${n} items`,
    tooBigForQr: 'Te veel items voor een QR-code die vlot scant. Kopieer de link.',
    copiedShort: 'Gekopieerd',
    copyFailed: 'Kopiëren mislukt',
    copyLink: 'Link kopiëren',
    close: 'Sluiten',
    replaceCatalogConfirm: (current, shared) =>
      `Je ${current} items vervangen door de ${shared} gedeelde items? De geschiedenis blijft behouden.`,
    replace: 'Vervangen',
    badShareLink: 'Die deellink kon niet gelezen worden',
    moveUp: (name) => `${name} omhoog`,
    moveDown: (name) => `${name} omlaag`,
    name: 'Naam',
    namePlaceholder: 'bv. Kriek',
    category: 'Categorie',
    drink: 'Drank',
    snack: 'Snack',
    emoji: 'Emoji',
    typeYourOwn: 'Of typ er zelf een',
    add: 'Toevoegen',
    save: 'Bewaren',
    nameRequired: 'Geef het item een naam',
    emojiRequired: 'Kies een emoji',
    itemDeleted: (name) => `${name} verwijderd`,
    deleteNamed: (name) => `${name} verwijderen`,
    settings: 'Instellingen',
    historyTab: 'Historiek',
    settingsTab: 'Opties',
    general: 'Algemeen',
    language: 'Taal',
    theme: 'Thema',
    system: 'Systeem',
    dark: 'Donker',
    light: 'Licht',
    addToHome: 'Zet op beginscherm',
    updateAvailable: 'Er is een nieuwe versie van OrderMe beschikbaar.',
    update: 'Bijwerken',
    later: 'Later',
    updateReady: 'Update beschikbaar',
    versionLine: (version, build, date) => `Versie ${version} · build ${build} · ${date}`,
    installSteps: [
      'Tik in Safari op Deel (op nieuwere iPhones zit die onder •••).',
      'Scroll omlaag en kies “Zet op beginscherm”.',
      'Tik op Voeg toe. OrderMe opent nu schermvullend vanaf je beginscherm.',
    ],
    clearHistory: 'Geschiedenis wissen',
    clearHistoryConfirm: 'Alle vorige rondjes verwijderen?',
    resetApp: 'App resetten',
    resetAppConfirm:
      'De app terugzetten zoals bij de installatie? Je items, vastgezette items, het rondje, de hele geschiedenis en je instellingen worden gewist, en de nieuwste versie wordt geladen.',
    reset: 'Resetten',
    resetOffline: 'Geen verbinding. Om te resetten is internet nodig voor de nieuwste versie.',
    crashTitle: 'Er ging iets mis',
    crashBody: 'De app liep tegen een onverwachte fout aan. Je Rondje en Items staan veilig op deze telefoon.',
    crashReload: 'Opnieuw laden',
  },
}
