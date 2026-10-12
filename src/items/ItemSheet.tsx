import { useRef, useState, type FormEvent } from 'react'
import type { Messages } from '../shared/i18n.ts'
import type { Overlays } from '../shared/ui/overlays.ts'
import type { AppActions } from '../app/useAppState.ts'
import { Sheet } from '../shared/ui/Sheet.tsx'
import { checkDraft, type Category, type DraftProblem, type Item, type ItemDraft } from './catalog.ts'
import { EMOJI_CHOICES } from './emoji.ts'

interface ItemSheetProps {
  /** The Item being edited, or undefined when adding a new one. */
  item?: Item
  /** Opened from the "+ New" tile: the new Item also goes straight into the Round. */
  forRound?: boolean
  t: Messages
  actions: Pick<AppActions, 'createItem' | 'updateItem' | 'removeFromCatalog'>
  overlays: Overlays
  onClose: () => void
}

const isChoice = (emoji: string) => (EMOJI_CHOICES as readonly string[]).includes(emoji)

/**
 * Bottom sheet to add or edit an Item. It works on its own copy of the Item, so Cancel (or tapping outside)
 * throws every change away; only Save touches the Catalog.
 */
export function ItemSheet({ item, forRound, t, actions, overlays, onClose }: ItemSheetProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState<Category>(item?.category ?? 'drink')
  const [picked, setPicked] = useState(item && isChoice(item.emoji) ? item.emoji : item ? '' : EMOJI_CHOICES[0])
  const [typed, setTyped] = useState(item && !isChoice(item.emoji) ? item.emoji : '')
  const [problem, setProblem] = useState<DraftProblem | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const save = (draft: ItemDraft) => {
    if (item) actions.updateItem(item.id, draft)
    else actions.createItem(draft, { addToRound: forRound })
    onClose()
  }
  /** Deletes at once, no confirm: the toast's Undo puts it back where it was (#54). */
  const remove = (item: Item) => {
    const undo = actions.removeFromCatalog(item.id)
    onClose()
    overlays.notify(t.itemDeleted(item.name), { label: t.undo, run: undo })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const checked = checkDraft({ name, category, emoji: typed || picked })
    if (checked.ok) save(checked.value)
    else setProblem(checked.problem)
  }

  const title = item ? t.editItem : forRound ? t.newItem : t.addItem
  return (
    <Sheet
      title={title}
      titleId="sheet-title"
      initialFocusRef={item ? undefined : nameRef}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="field">
        <label htmlFor="item-name">{t.name}</label>
          <input
            ref={nameRef}
            id="item-name"
            className="input"
            value={name}
            placeholder={t.namePlaceholder}
            maxLength={30}
            autoComplete="off"
            aria-invalid={problem === 'nameRequired'}
            aria-describedby={problem === 'nameRequired' ? 'item-name-problem' : undefined}
            onChange={(e) => {
              setName(e.target.value)
              if (problem === 'nameRequired') setProblem(null)
            }}
          />
          {problem === 'nameRequired' && (
            <p className="field-problem" id="item-name-problem">
              {t.nameRequired}
            </p>
          )}
        </div>

        <fieldset className="field">
          <legend>{t.category}</legend>
          <div className="segmented">
            {(['drink', 'snack'] as const).map((c) => (
              <label key={c} className="choice">
                <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} />
                {t[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>{t.emoji}</legend>
          <div className="emoji-grid">
            {EMOJI_CHOICES.map((emoji) => (
              <label key={emoji} className="choice emoji-choice">
                <input
                  type="radio"
                  name="emoji"
                  value={emoji}
                  checked={!typed && picked === emoji}
                  onChange={() => {
                    setPicked(emoji)
                    setTyped('')
                  }}
                />
                {emoji}
              </label>
            ))}
          </div>
          <label htmlFor="item-emoji-own" className="field-sub">
            {t.typeYourOwn}
          </label>
          <input
            id="item-emoji-own"
            className="input input-emoji"
            value={typed}
            maxLength={16}
            autoComplete="off"
            aria-invalid={problem === 'emojiRequired'}
            aria-describedby={problem === 'emojiRequired' ? 'item-emoji-problem' : undefined}
            onChange={(e) => {
              setTyped(e.target.value)
              if (problem === 'emojiRequired') setProblem(null)
            }}
          />
          {problem === 'emojiRequired' && (
            <p className="field-problem" id="item-emoji-problem">
              {t.emojiRequired}
            </p>
          )}
        </fieldset>

        <div className="sheet-actions">
          {item && (
            <button type="button" className="btn btn-danger-text" onClick={() => remove(item)}>
              {t.delete}
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {item ? t.save : forRound ? t.addToRound : t.add}
          </button>
        </div>
    </Sheet>
  )
}
