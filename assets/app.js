const state = {
  pets: [],
  filter: 'all',
  query: ''
}

const grid = document.querySelector('#gallery-grid')
const search = document.querySelector('#search')
const filters = document.querySelectorAll('[data-filter]')
const resultCount = document.querySelector('#result-count')
const carousel = document.querySelector('.pet-carousel')
const slideButtons = document.querySelectorAll('[data-slide]')
const randomButtons = document.querySelectorAll('[data-random-pet]')
const clearSearchButton = document.querySelector('[data-clear-search]')
const dialog = document.querySelector('#pet-dialog')
const dialogImage = document.querySelector('#dialog-image')
const dialogTitle = document.querySelector('#dialog-title')
const dialogMeta = document.querySelector('#dialog-meta')
const dialogPath = document.querySelector('#dialog-path')
const dialogOpen = document.querySelector('#dialog-open')
let activeDialogPet = null

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

function petLabelFromPath(path) {
  return path
    .split('/')
    .pop()
    .replace(/\.svg$/, '')
    .split('-')
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

function getPetByPath(path) {
  return state.pets.find(pet => pet.path === path) || {
    path,
    label: petLabelFromPath(path),
    name: path.split('/').pop().replace(/\.svg$/, ''),
    series: path.split('/')[1] || 'pet',
    group: path.split('/')[2] || 'svg'
  }
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

function flashButton(button, text = 'Copied') {
  const original = button.textContent
  button.textContent = text
  window.setTimeout(() => {
    button.textContent = original
  }, 1000)
}

function markdownForPet(pet) {
  return `![${pet.label}](${pet.path})`
}

function updateCounts() {
  const counts = {
    all: state.pets.length,
    orange: state.pets.filter(pet => pet.series === 'orange').length,
    dark: state.pets.filter(pet => pet.series === 'dark').length,
    pink: state.pets.filter(pet => pet.series === 'pink').length,
    animated: state.pets.filter(pet => pet.group === 'animated').length
  }

  Object.entries(counts).forEach(([key, value]) => {
    document.querySelectorAll(`[data-count="${key}"]`).forEach(item => {
      item.textContent = value
    })
  })
}

function openPet(pet) {
  activeDialogPet = pet
  dialogImage.src = pet.path
  dialogImage.alt = `${pet.label} SVG preview`
  dialogTitle.textContent = pet.label
  dialogMeta.textContent = `${pet.series} / ${pet.group}`
  dialogPath.textContent = pet.path
  dialogOpen.href = pet.path

  if (typeof dialog.showModal === 'function') {
    dialog.showModal()
  } else {
    dialog.setAttribute('open', '')
  }
}

function openRandomPet() {
  if (!state.pets.length) return
  const index = Math.floor(Math.random() * state.pets.length)
  openPet(state.pets[index])
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
    const bytes = pet.bytes ? `${Math.round(pet.bytes / 10) / 100} KB` : 'SVG'

    return `
      <article class="pet-card">
        <img src="${path}" alt="${label} SVG" loading="lazy" decoding="async">
        <span class="pet-meta">${meta}</span>
        <h3>${label}</h3>
        <span class="pet-size">${bytes}</span>
        <code>${path}</code>
        <div class="card-actions">
          <button type="button" data-open-pet="${path}">Preview</button>
          <button type="button" data-copy="${path}">Copy</button>
        </div>
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
  updateCounts()
  render()
}

search.addEventListener('input', event => {
  state.query = event.target.value
  render()
})

filters.forEach(button => {
  button.addEventListener('click', () => {
    filters.forEach(item => item.classList.remove('is-active'))
    filters.forEach(item => item.setAttribute('aria-pressed', 'false'))
    button.classList.add('is-active')
    button.setAttribute('aria-pressed', 'true')
    state.filter = button.dataset.filter
    render()
  })
})

document.addEventListener('click', event => {
  const openTrigger = event.target.closest('[data-open-pet]')
  if (openTrigger) {
    event.preventDefault()
    openPet(getPetByPath(openTrigger.dataset.openPet))
    return
  }

  const button = event.target.closest('[data-copy]')
  if (!button) return

  copyText(button.dataset.copy).then(() => {
    flashButton(button)
  })
})

document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => dialog.close())
})

dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close()
})

dialog.addEventListener('click', event => {
  const button = event.target.closest('[data-dialog-copy]')
  if (!button || !activeDialogPet) return

  const value = button.dataset.dialogCopy === 'markdown'
    ? markdownForPet(activeDialogPet)
    : activeDialogPet.path

  copyText(value).then(() => {
    flashButton(button)
  })
})

randomButtons.forEach(button => {
  button.addEventListener('click', openRandomPet)
})

clearSearchButton.addEventListener('click', () => {
  search.value = ''
  state.query = ''
  state.filter = 'all'
  filters.forEach(item => {
    item.classList.toggle('is-active', item.dataset.filter === 'all')
    item.setAttribute('aria-pressed', item.dataset.filter === 'all' ? 'true' : 'false')
  })
  render()
  search.focus()
})

document.addEventListener('keydown', event => {
  const tag = event.target.tagName
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable
  if (event.key === '/' && !isTyping) {
    event.preventDefault()
    search.focus()
  }
})

function scrollShowcase(direction = 1) {
  if (!carousel) return
  const distance = Math.min(380, carousel.clientWidth * 0.72)
  const maxScroll = carousel.scrollWidth - carousel.clientWidth

  if (direction > 0 && carousel.scrollLeft >= maxScroll - 8) {
    carousel.scrollTo({ left: 0, behavior: 'smooth' })
    return
  }

  if (direction < 0 && carousel.scrollLeft <= 8) {
    carousel.scrollTo({ left: maxScroll, behavior: 'smooth' })
    return
  }

  carousel.scrollBy({ left: distance * direction, behavior: 'smooth' })
}

slideButtons.forEach(button => {
  button.addEventListener('click', () => {
    scrollShowcase(button.dataset.slide === 'next' ? 1 : -1)
  })
})

if (carousel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let carouselTimer = window.setInterval(() => scrollShowcase(1), 3600)
  const pause = () => window.clearInterval(carouselTimer)
  const resume = () => {
    window.clearInterval(carouselTimer)
    carouselTimer = window.setInterval(() => scrollShowcase(1), 3600)
  }

  carousel.addEventListener('pointerenter', pause)
  carousel.addEventListener('focusin', pause)
  carousel.addEventListener('pointerleave', resume)
  carousel.addEventListener('focusout', resume)
}

init().catch(error => {
  resultCount.textContent = 'Manifest unavailable'
  grid.innerHTML = `<div class="empty-state">Could not load SVG manifest: ${escapeHtml(error.message)}</div>`
})
