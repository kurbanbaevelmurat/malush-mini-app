// ==========================================================
//  Malush Desserts — Telegram Mini App
// ==========================================================

// ---------- Инициализация Telegram WebApp ----------
const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();

  // Подкрашиваем шапку и фон Telegram под палитру приложения
  try {
    tg.setHeaderColor('#3e2318');
    tg.setBackgroundColor('#fbf1e3');
  } catch (e) {
    /* старые версии клиента могут не поддерживать эти методы */
  }
}

// ---------- Данные (заглушки) ----------
// Чтобы добавить настоящее фото, укажите путь в поле image, например: "images/trifle-1.jpg"
const CATEGORIES = [
  {
    id: 'trifles',
    name: 'Трайфлы',
    description: 'Нежные слоёные десерты в стаканчиках',
    emoji: '🍨',
    bg: 'bg-trifle',
  },
  {
    id: 'new',
    name: 'Новинки',
    description: 'Свежие вкусы этого сезона',
    emoji: '✨',
    bg: 'bg-new',
  },
  {
    id: 'cakes',
    name: 'Корпусные десерты',
    description: 'Торты, муссовые и бисквитные десерты',
    emoji: '🎂',
    bg: 'bg-cake',
  },
];

const PRODUCTS = [
  // Трайфлы
  { id: 't1', categoryId: 'trifles', name: 'Трайфл «Красный бархат»', description: 'Бисквит, крем-чиз, ягоды', price: 290, emoji: '🍰', image: '' },
  { id: 't2', categoryId: 'trifles', name: 'Трайфл «Шоколадный»',     description: 'Шоколадный бисквит, ганаш', price: 290, emoji: '🍫', image: '' },
  { id: 't3', categoryId: 'trifles', name: 'Трайфл «Сникерс»',        description: 'Арахис, карамель, нуга',    price: 320, emoji: '🥜', image: '' },
  { id: 't4', categoryId: 'trifles', name: 'Трайфл «Манго-маракуйя»', description: 'Тропический конфитюр, сливки', price: 310, emoji: '🥭', image: '' },

  // Новинки
  { id: 'n1', categoryId: 'new', name: 'Фисташковый круассан', description: 'Фисташковый крем, хрустящее тесто', price: 350, emoji: '🥐', image: '', tag: 'new' },
  { id: 'n2', categoryId: 'new', name: 'Тирамису в баночке',   description: 'Маскарпоне, кофе, савоярди',       price: 340, emoji: '☕', image: '', tag: 'new' },
  { id: 'n3', categoryId: 'new', name: 'Клубничное пирожное',  description: 'Ваниль, свежая клубника',          price: 280, emoji: '🍓', image: '', tag: 'new' },

  // Корпусные десерты
  { id: 'c1', categoryId: 'cakes', name: 'Торт «Медовик»',          description: '1 кг, сметанный крем',     price: 1800, emoji: '🍯', image: '' },
  { id: 'c2', categoryId: 'cakes', name: 'Торт «Наполеон»',         description: '1 кг, заварной крем',      price: 1900, emoji: '🎂', image: '' },
  { id: 'c3', categoryId: 'cakes', name: 'Муссовый «Три шоколада»', description: '1 кг, бельгийский шоколад', price: 2400, emoji: '🍫', image: '' },
  { id: 'c4', categoryId: 'cakes', name: 'Чизкейк «Нью-Йорк»',      description: '1 кг, классический',       price: 2100, emoji: '🧀', image: '' },
];

const CURRENCY = '₽';

// ---------- Состояние ----------
// cart: { [productId]: quantity }
const cart = {};
let currentCategory = null;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const el = {
  categoriesScreen: $('categoriesScreen'),
  productsScreen:   $('productsScreen'),
  categoriesList:   $('categoriesList'),
  productsList:     $('productsList'),
  backBtn:          $('backBtn'),
  pageTitle:        $('pageTitle'),
  pageSubtitle:     $('pageSubtitle'),
  greeting:         $('greeting'),
  cartCount:        $('cartCount'),
  cartLabel:        $('cartLabel'),
  cartTotal:        $('cartTotal'),
  checkoutBtn:      $('checkoutBtn'),
  toast:            $('toast'),
};

// ---------- Утилиты ----------
const formatPrice = (n) => n.toLocaleString('ru-RU') + ' ' + CURRENCY;

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function haptic(type = 'light') {
  try {
    tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(type);
  } catch (e) { /* нет поддержки */ }
}

let toastTimer = null;
function showToast(text) {
  el.toast.textContent = text;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1600);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- Рендер категорий ----------
function renderCategories() {
  el.categoriesList.innerHTML = CATEGORIES.map((cat) => {
    const count = PRODUCTS.filter((p) => p.categoryId === cat.id).length;
    return `
      <button class="category-card" data-category="${cat.id}">
        <div class="category-image ${cat.bg}">${cat.emoji}</div>
        <div class="category-body">
          <div class="category-name">${escapeHtml(cat.name)}</div>
          <div class="category-desc">${escapeHtml(cat.description)}</div>
          <span class="category-count">${count} ${pluralize(count, 'позиция', 'позиции', 'позиций')}</span>
        </div>
        <span class="category-arrow">›</span>
      </button>
    `;
  }).join('');
}

// ---------- Рендер товаров ----------
function productControls(product) {
  const qty = cart[product.id] || 0;
  if (qty === 0) {
    return `<button class="add-btn" data-action="add" data-id="${product.id}">В корзину</button>`;
  }
  return `
    <div class="qty">
      <button class="qty-btn" data-action="dec" data-id="${product.id}" aria-label="Убрать">−</button>
      <span class="qty-value">${qty}</span>
      <button class="qty-btn" data-action="inc" data-id="${product.id}" aria-label="Добавить">+</button>
    </div>
  `;
}

function renderProducts(categoryId) {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const items = PRODUCTS.filter((p) => p.categoryId === categoryId);

  el.productsList.innerHTML = items.map((p) => `
    <article class="product-card">
      <div class="product-image ${category.bg}">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />` : p.emoji}
        ${p.tag === 'new' ? '<span class="product-tag">New</span>' : ''}
      </div>
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          <div class="controls" id="controls-${p.id}">${productControls(p)}</div>
        </div>
      </div>
    </article>
  `).join('');
}

function updateProductControls(productId) {
  const box = document.getElementById(`controls-${productId}`);
  const product = PRODUCTS.find((p) => p.id === productId);
  if (box && product) box.innerHTML = productControls(product);
}

// ---------- Навигация ----------
function openCategory(categoryId) {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return;

  currentCategory = categoryId;
  renderProducts(categoryId);

  el.pageTitle.textContent = category.name;
  el.pageSubtitle.textContent = category.description;
  el.backBtn.classList.remove('hidden');

  el.categoriesScreen.classList.remove('active');
  el.productsScreen.classList.add('active');
  window.scrollTo({ top: 0 });

  if (tg && tg.BackButton) tg.BackButton.show();
  haptic('light');
}

function goBack() {
  currentCategory = null;

  el.pageTitle.textContent = 'Malush Desserts';
  el.pageSubtitle.textContent = 'Домашние десерты с любовью';
  el.backBtn.classList.add('hidden');

  el.productsScreen.classList.remove('active');
  el.categoriesScreen.classList.add('active');
  window.scrollTo({ top: 0 });

  if (tg && tg.BackButton) tg.BackButton.hide();
}

// ---------- Корзина ----------
function changeQty(productId, delta) {
  const next = (cart[productId] || 0) + delta;
  if (next <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = next;
  }
  updateProductControls(productId);
  updateCartBar(delta > 0);
}

function getCartSummary() {
  let count = 0;
  let total = 0;
  const items = [];

  for (const [id, qty] of Object.entries(cart)) {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) continue;
    count += qty;
    total += product.price * qty;
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
      sum: product.price * qty,
    });
  }
  return { count, total, items };
}

function updateCartBar(bump = false) {
  const { count, total } = getCartSummary();

  el.cartCount.textContent = count;
  el.cartTotal.textContent = formatPrice(total);
  el.cartLabel.textContent = count === 0
    ? 'Корзина пуста'
    : `${count} ${pluralize(count, 'товар', 'товара', 'товаров')}`;
  el.checkoutBtn.disabled = count === 0;

  if (bump) {
    el.cartCount.classList.remove('bump');
    void el.cartCount.offsetWidth; // перезапуск анимации
    el.cartCount.classList.add('bump');
  }
}

// ---------- Оформление заказа ----------
function checkout() {
  const { count, total, items } = getCartSummary();
  if (count === 0) return;

  const order = {
    items: items.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
    totalCount: count,
    totalPrice: total,
    currency: 'RUB',
    createdAt: new Date().toISOString(),
  };

  const payload = JSON.stringify(order);

  // platform === 'unknown' — значит страница открыта в обычном браузере, а не в Telegram
  const insideTelegram = tg && tg.platform && tg.platform !== 'unknown';

  if (insideTelegram) {
    try {
      haptic('medium');
      // Mini App закроется автоматически, бот получит web_app_data
      tg.sendData(payload);
    } catch (e) {
      console.error('Ошибка sendData:', e);
      if (tg.showAlert) tg.showAlert('Не удалось отправить заказ. Попробуйте ещё раз.');
    }
  } else {
    // Режим отладки в обычном браузере
    console.log('Заказ (отладка, вне Telegram):', order);
    alert('Заказ сформирован (вне Telegram):\n\n' + JSON.stringify(order, null, 2));
  }
}

// ---------- Обработчики событий ----------
el.categoriesList.addEventListener('click', (e) => {
  const card = e.target.closest('[data-category]');
  if (card) openCategory(card.dataset.category);
});

el.productsList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'add') {
    changeQty(id, 1);
    haptic('light');
    showToast('Добавлено в корзину 🧁');
  } else if (action === 'inc') {
    changeQty(id, 1);
    haptic('light');
  } else if (action === 'dec') {
    changeQty(id, -1);
    haptic('light');
  }
});

el.backBtn.addEventListener('click', goBack);
el.checkoutBtn.addEventListener('click', checkout);

if (tg && tg.BackButton) {
  tg.BackButton.onClick(goBack);
}

// ---------- Приветствие ----------
(function greet() {
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (user && user.first_name) {
    el.greeting.textContent = `Привет, ${user.first_name}!`;
  }
})();

// ---------- Старт ----------
renderCategories();
updateCartBar();
