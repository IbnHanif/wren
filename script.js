// DEVELOPED AND WRITTEN: BilalDevDex
// ====================================
// 🗺️ DATA FLOW:
// DOMContentLoaded → fetchWallpapers()
// → Unsplash API → renderCards()
// → IntersectionObserver watches sentinel
// → user scrolls → sentinel enters viewport
// → fetchWallpapers() (next page)
// → repeat until empty → showEnd()
// → reload button → resetAndFetch()

// ============ CONFIG ============
const ACCESS_KEY = 'Id2hMI0tMMEjHr3_NJJ6fU2GjnyKN8Ps8LXQzdBiYEQ';
const BASE_URL   = 'https://api.unsplash.com';
const PER_PAGE   = 20;

// ============ STATE ============
let currentQuery = '';
let currentPage  = 1;
let orientation  = window.innerWidth <= 768 ? 'portrait' : 'landscape';
let isLoading    = false;
let hasMore      = true;
let currentTheme = localStorage.getItem('wren-theme') || 'dark';

// ============ THEME CONFIG ============
// cycles: dark → light → everforest → dark
const themes = ['dark', 'light', 'everforest'];

// icon shows what you'll switch TO next
const themeIcons = {
  dark:       'sun',
  light:      'tree-pine',
  everforest: 'moon'
};

// icon shows what you'll switch TO next
const orientationIcons = {
  landscape: 'smartphone',
  portrait:  'monitor'
};

// ============ DOM REFS ============
const grid           = document.getElementById('grid');
const searchInput    = document.getElementById('searchInput');
const endMessage     = document.getElementById('endMessage');
const themeBtn       = document.getElementById('themeBtn');
const orientationBtn = document.getElementById('orientationBtn');
const sentinel       = document.getElementById('sentinel');
const modal          = document.getElementById('modal');
const modalImg       = document.getElementById('modalImg');
const modalDownload  = document.getElementById('modalDownload');
const photographerLink = document.getElementById('photographerLink');

// ============ INTERSECTION OBSERVER ============
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    fetchWallpapers();
  }
}, {
  rootMargin: '200px' // fetch before user hits actual bottom
});

observer.observe(sentinel);

// ============ FETCH ============
async function fetchWallpapers() {
  if (isLoading || !hasMore) return;
  isLoading = true;

  try {
    let url;

    if (currentQuery.trim() === '') {
      // no search — random editorial
      url = `${BASE_URL}/photos?page=${currentPage}&per_page=${PER_PAGE}&order_by=editorial&orientation=${orientation}&client_id=${ACCESS_KEY}`;
    } else {
      // search mode
      url = `${BASE_URL}/search/photos?query=${encodeURIComponent(currentQuery)}&page=${currentPage}&per_page=${PER_PAGE}&orientation=${orientation}&client_id=${ACCESS_KEY}`;
    }

    const response = await fetch(url);

    if (response.status === 403) {
      showEnd('Rate limit hit. Come back in an hour ☕');
      return;
    }

    if (!response.ok) {
      showEnd('Something went wrong. Try again later.');
      return;
    }

    const data = await response.json();

    // /photos returns array, /search/photos returns { results: [] }
    const photos = currentQuery.trim() === '' ? data : data.results;

    if (!photos || photos.length === 0) {
      hasMore = false;
      showEnd("You've reached the end.");
      return;
    }

    renderCards(photos);
    currentPage++;

  } catch (err) {
    console.error('Fetch failed:', err);
    showEnd('Network error. Check your connection.');
  } finally {
    isLoading = false;
  }
}

// ============ RENDER CARDS ============
function renderCards(photos) {
  const template = document.getElementById('cardTemplate');

  photos.forEach(photo => {
    const clone       = template.content.cloneNode(true);
    const card        = clone.querySelector('.card');
    const img         = clone.querySelector('img');
    const previewBtn  = clone.querySelector('.btn-preview');
    const downloadBtn = clone.querySelector('.btn-download');

    // set image
    img.src = photo.urls.regular;
    img.alt = photo.alt_description || 'Wallpaper by ' + photo.user.name;

    // store data for modal + download
    card.dataset.full           = photo.urls.full;
    card.dataset.downloadLocation = photo.links.download_location;
    card.dataset.photographer   = photo.user.name;
    card.dataset.photographerUrl = photo.user.links.html;

    // preview → open modal
    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(card);
    });

    // download
    downloadBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      triggerDownload(
        photo.links.download_location,
        photo.urls.full
      );
    });

    grid.appendChild(clone);
  });
}

// ============ MODAL ============
function openModal(card) {
  modalImg.src                = card.dataset.full;
  modalImg.alt                = card.querySelector('img').alt;
  modalDownload.href          = card.dataset.full;
  photographerLink.textContent = card.dataset.photographer;
  photographerLink.href       = card.dataset.photographerUrl;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // prevent scroll behind modal
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  // clear src so previous image doesn't flash on next open
  setTimeout(() => { modalImg.src = ''; }, 300);
}

// close on X button
document.getElementById('modalClose').addEventListener('click', closeModal);

// close on backdrop click
document.getElementById('modalBackdrop').addEventListener('click', closeModal);

// close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal();
  }
});

// ============ DOWNLOAD ============
async function triggerDownload(downloadLocation, fallbackUrl) {
  try {
    // required by Unsplash API terms — ping download endpoint
    await fetch(`${downloadLocation}?client_id=${ACCESS_KEY}`);
  } catch(e) {
    // silent fail — still download
  }

  const a = document.createElement('a');
  a.href     = fallbackUrl;
  a.download = 'wren-wallpaper.jpg';
  a.target   = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============ THEME TOGGLE ============
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('wren-theme', theme);

  // re-insert fresh <i> tag — Lucide replaced the old one with <svg>
  themeBtn.innerHTML = `<i data-lucide="${themeIcons[theme]}"></i>`;
  lucide.createIcons();
}
themeBtn.addEventListener('click', () => {
  const currentIndex = themes.indexOf(currentTheme);
  currentTheme = themes[(currentIndex + 1) % themes.length];
  applyTheme(currentTheme);
});

// ============ ORIENTATION TOGGLE ============
function applyOrientation(value) {
  orientation = value;
  localStorage.setItem('wren-orientation', value);
  orientationBtn.innerHTML = `<i data-lucide="${orientationIcons[value]}"></i>`;
  lucide.createIcons();
}
orientationBtn.addEventListener('click', () => {
  const next = orientation === 'landscape' ? 'portrait' : 'landscape';
  applyOrientation(next);
  resetAndFetch(); // re-fetch with new orientation
});

// ============ SEARCH ============
let searchTimer;

searchInput.addEventListener('input', function() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentQuery = this.value.trim();
    resetAndFetch();
  }, 500); // wait 500ms after user stops typing
});

// ============ RESET ============
function resetAndFetch() {
  // clear grid but keep sentinel out of it
  grid.innerHTML = '';

  // reset state
  currentPage = 1;
  hasMore     = true;
  isLoading   = false;

  // re-enable sentinel
  sentinel.style.display = 'block';
  observer.observe(sentinel);

  // hide end message
  endMessage.classList.remove('visible');
  endMessage.innerHTML = '';

  fetchWallpapers();
}

// ============ END MESSAGE ============
function showEnd(message = "You've reached the end.") {
  observer.unobserve(sentinel);
  sentinel.style.display = 'none';

  endMessage.textContent = message;
  endMessage.classList.add('visible');

  const reloadBtn = document.createElement('button');
  reloadBtn.textContent = 'Start over';
  reloadBtn.className   = 'reload-btn';
  reloadBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetAndFetch();
  });

  endMessage.appendChild(reloadBtn);
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  // restore theme
  applyTheme(currentTheme);

  // restore orientation
  const savedOrientation = localStorage.getItem('wren-orientation');
  if (savedOrientation) {
    applyOrientation(savedOrientation);
  } else {
    // set default icon based on detected screen size
    applyOrientation(orientation);
  }

  // initial fetch
  fetchWallpapers();
});
