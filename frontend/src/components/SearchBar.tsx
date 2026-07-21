import { useState, type FormEvent } from 'react'
import './SearchBar.css'

type SearchBarProps = {
  initialValue?: string
  placeholder?: string
  onSearch?: (keyword: string) => void
  onSituationClick?: () => void
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m15.5 15.5 4 4" />
    </svg>
  )
}

function SearchBar({
  initialValue = '',
  placeholder = '가게를 검색해 보세요',
  onSearch,
  onSituationClick,
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialValue)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedKeyword = keyword.trim()
    if (!trimmedKeyword) return

    onSearch?.(trimmedKeyword)
  }

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <label className="search-bar__field">
        <span className="search-bar__icon">
          <SearchIcon />
        </span>
        <span className="search-bar__label">가게 검색</span>
        <input
          className="search-bar__input"
          type="search"
          value={keyword}
          placeholder={placeholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </label>

      <button className="search-bar__situation" type="button" onClick={onSituationClick}>
        상황추천
      </button>
    </form>
  )
}

export default SearchBar
