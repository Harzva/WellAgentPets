const state = {
  pets: [],
  filter: 'all',
  query: ''
}

const grid = document.querySelector('#gallery-grid')
const search = document.querySelector('#search')
const filters = document.querySelectorAll('[data-filter]')
const resultCount = document.querySelector('#result-count')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function matchesFilter(pet) {
  if (state.filter === 'all') return true
  if (state.filter === 'animated') return pet.group === 'animated'
  return pet.series === state.filter
}

function matchesQuery(pet) {
  const q = state.query.trim().toLowerCase()
  if (!q) return true
  return [pet.name, pet.label, pet.series, pet.group, pet.path]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function render() {
  const pets = state.pets.filter(pet => matchesFilter(pet) && matchesQuery(pet))
  resultCount.textContent = `${pets.length} SVG${pets.length === 1 ? '' : 's'} shown`

  if (!pets.length) {
    grid.innerHTML = '<div class="empty-state">No SVG matched this search.</div>'
    return
  }

  grid.innerHTML = pets.map(pet => {
    const label = escapeHtml(pet.label)
    const path = escapeHtml(pet.path)
    const meta = `${escapeHtml(pet.series)} / ${escapeHtml(pet.group)}`

    return `
      <article class="pet-card">
        <img src="${path}" alt="${label} SVG" loading="lazy" decoding="async">
        <span class="pet-meta">${meta}</span>
        <h3>${label}</h3>
        <code>${path}</code>
        <button type="button" data-copy="${path}">Copy path</button>
      </article>
    `
  }).join('')
}

async function init() {
  const response = await fetch('data/pets.json')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const manifest = await response.json()
  state.pets = manifest.pets
  document.querySelector('#total-count').textContent = manifest.total
  render()
}

search.addEventListener('input', event => {
  state.query = event.target.value
  render()
})

filters.forEach(button => {
  button.addEventListener('click', () => {
    filters.forEach(item => item.classList.remove('is-active'))
    button.classList.add('is-active')
    state.filter = button.dataset.filter
    render()
  })
})

document.addEventListener('click', event => {
  const button = event.target.closest('[data-copy]')
  if (!button) return

  copyText(button.dataset.copy).then(() => {
    const original = button.textContent
    button.textContent = 'Copied'
    window.setTimeout(() => {
      button.textContent = original
    }, 1000)
  })
})

init().catch(error => {
  resultCount.textContent = 'Manifest unavailable'
  grid.innerHTML = `<div class="empty-state">Could not load SVG manifest: ${escapeHtml(error.message)}</div>`
})
