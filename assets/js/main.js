// -------- GLOBALNE KONSTANTE I PROMENLJIVE --------
const FILE_PATH = "assets/data/";
const CART_KEY = "cart";
const FAVOURITES_KEY = "favourites";
const REGEX = {
  name: /^[A-Za-z\s'-]{2,}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  message: /^[\s\S]{10,500}$/,
};

let visibleCount = 9;
let lastFiltered = [];
let allProducts = [];
let categories = [];
let featuredProducts = [];
let popularProducts = [];
let promoApplied = false;
let activeToast = null;


// -------- INICIJALIZOVANJE PODATAKA I RENDEROVANJE --------
document.addEventListener("DOMContentLoaded", function () {
  initializeCart();
  initializeFavourites();
  initialize();
  renderBanner();
});

async function initialize() {
  allProducts = await loadJSON("products.json");
  categories = await loadJSON("categories.json");
  navigation = await loadJSON("navigation.json");

  onDataReady();
}

function onDataReady() {
  lastFiltered = [...allProducts];
  renderProducts();
  renderNavigation(navigation);
  renderFooter(navigation);
  populateCategories();
  updateCartCount();
  renderSaleProducts();
  renderPopularProducts();
  renderCart();
}

// RAD SA LOCALSTORAGE-om
function saveToLS(name, value) {
  localStorage.setItem(name, JSON.stringify(value));
}

function getFromLS(name) {
  return JSON.parse(localStorage.getItem(name));
}

// UCITAVANJE PODATAKA
async function loadJSON(filename) {
  try {
    const response = await fetch(FILE_PATH + filename);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// TOAST
function showToast(message, type = "bg-success") {
  const toastEl = document.querySelector(".toast");
  if (!activeToast) {
    activeToast = new bootstrap.Toast(toastEl, { delay: 2000 });
  }
  activeToast.hide();

  toastEl.className = `toast align-items-center text-white ${type}`; // ← reset and apply color
  document.getElementById("toastMessage").textContent = message;

  setTimeout(() => {
    activeToast.show();
  }, 50);
}

// RENDEROVANJE KOMPONENTI
function renderNavigation(navigation) {
  let html = ``;
  const navRegion = document.getElementById("navRegion");
  navigation.forEach((nav) => {
    html += `<li class="nav-li">
                    <a href="${nav.href}">
                        ${nav.icon ? `<i class="${nav.icon}"></i>` : ""}
                        ${nav.text ? `<span>${nav.text}</span>` : ""}
                    </a>
                </li>`;
  });
  navRegion.innerHTML = html;
}

function renderFooter(navigation) {
  const footerRegion = document.getElementById("footerLinks");
  if (!footerRegion) {
    return;
  }
  let html = ``;
  navigation.forEach((nav) => {
    if (nav.icon) {
      return;
    }
    html += `<li class=""><a href="${nav.href}" class="text-white text-decoration-none opacity-75-hover">${nav.text}</a><li>`;
  });
  footerRegion.innerHTML = html;
}

const footerTime = document.getElementById("footerTime");
if (footerTime) {
  const date = new Date();
  const currentYear = date.getFullYear();
  footerTime.textContent += ` ${currentYear} NexGear. All rights reserved.`;
}

function renderBanner() {
  const banner = document.getElementById("saleBanner");
  if (!banner) return;

  const saleEndDate = new Date("2026-04-10T00:00:00");
  let interval;

  function updateCountdown() {
    const now = new Date();
    const diff = saleEndDate - now;

    if (diff <= 0) {
      banner.classList.add("hidden");
      clearInterval(interval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById("bannerCountdown").textContent =
      `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  updateCountdown();
  interval = setInterval(updateCountdown, 1000);

  document.getElementById("bannerClose").addEventListener("click", () => {
    banner.classList.add("hidden");
    clearInterval(interval);
  });
}

function renderProducts(products = allProducts) {
  const productRegion = document.getElementById("productRegion");
  const favourites = getFromLS(FAVOURITES_KEY) || [];
  const btnShowMore = document.getElementById("btnShowMore");
  const visibleProducts = products.slice(0, visibleCount);

  if (!productRegion) {
    return;
  }
  let html = "";
  if (products.length === 0) {
    html = `<p class="text-center w-100">No products found.</p>`;
  } else {
    visibleProducts.forEach((product) => {
      const category = categories.find((x) => x.id === product.category);
      const isFav = favourites.includes(String(product.id));
      html += `
                <div class="col-12 col-lg-6 col-xxl-4 mb-0">
                    <div class="product-card mx-auto h-100">
                        ${isHot(product.status.isHot)}
                        ${isOnSale(product.status.sale.onSale)}
                        <div class="product-tumb">
                            <img src="${product.img.src}" alt="${product.img.alt}">
                        </div>
                        <div class="product-details">
                            <span class="product-category">${category.name}</span>

                            <h4 class="product-title">${product.name}</h4>

                            <p class="product-description">
                                ${product.description}
                            </p>

                            <div class="product-bottom-details">
                                <div class="product-price">
                                    ${price(product.status.sale.onSale, product.price, product.status.sale.discountPercent)}
                                </div>
                                <div class="product-links d-flex justify-content-end gap-2">
                                    <button class="btnFavorite ${isFav ? "active" : ""}"
                                    data-id="${product.id}"><i class="bi bi-heart-fill"></i></button>
                                    <button class="btnSaveToCart" data-id="${product.id}"><i class="bi bi-basket2-fill"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
    });
  }

  productRegion.innerHTML = html;

  btnShowMore.style.display = visibleCount < products.length ? "block" : "none";
}
function renderSaleProducts() {
  const saleProductsRegion = document.getElementById("saleProducts");
  if (!saleProductsRegion) {
    return;
  }
  const favourites = getFromLS(FAVOURITES_KEY) || [];
  if (featuredProducts.length === 0) {
    const saleProducts = allProducts.filter((x) => x.status.sale.onSale);
    const random = saleProducts.sort(() => Math.random() - 0.5);
    featuredProducts = random.slice(0, 3);
  }

  let html = ``;

  featuredProducts.forEach((product) => {
    const category = categories.find((x) => x.id === product.category);
    const isFav = favourites.includes(String(product.id));
    html += `
            <div class="col-12 col-md-6 col-lg-4 hover-anim">
                <div class="product-card mx-auto h-100">
                    ${isHot(product.status.isHot)}
                    ${isOnSale(product.status.sale.onSale)}
                    <div class="product-tumb">
                        <img src="${product.img.src}" alt="${product.img.alt}">
                    </div>
                    <div class="product-details">
                        <span class="product-category">${category.name}</span>
                        <h4 class="product-title">${product.name}</h4>
                        <div class="product-bottom-details">
                            <div class="product-price">
                                ${price(product.status.sale.onSale, product.price, product.status.sale.discountPercent)}
                            </div>
                            <div class="product-links d-flex justify-content-end gap-2">
                            <button class="btnFavorite ${isFav ? "active" : ""}"
                                    data-id="${product.id}"><i class="bi bi-heart-fill"></i></button>
                                <button class="btnSaveToCart" data-id="${product.id}"><i class="bi bi-basket2-fill"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
  saleProductsRegion.innerHTML = html;
}

function renderPopularProducts() {
  const popularProductsRegion = document.getElementById("popularProducts");
  if (!popularProductsRegion) {
    return;
  }
  const favourites = getFromLS(FAVOURITES_KEY) || [];
  if (popularProducts.length === 0) {
    const hotProducts = allProducts.filter((x) => x.status.isHot);
    const random = hotProducts.sort(() => Math.random() - 0.5);
    popularProducts = random.slice(0, 3);
  }

  let html = ``;

  popularProducts.forEach((product) => {
    const category = categories.find((x) => x.id === product.category);
    const isFav = favourites.includes(String(product.id));
    html += `
            <div class="col-12 col-md-6 col-lg-4 hover-anim">
                <div class="product-card mx-auto h-100">
                    ${isHot(product.status.isHot)}
                    ${isOnSale(product.status.sale.onSale)}
                    <div class="product-tumb">
                        <img src="${product.img.src}" alt="${product.img.alt}">
                    </div>
                    <div class="product-details">
                        <span class="product-category">${category.name}</span>
                        <h4 class="product-title">${product.name}</h4>
                        <div class="product-bottom-details">
                            <div class="product-price">
                                ${price(product.status.sale.onSale, product.price, product.status.sale.discountPercent)}
                            </div>
                            <div class="product-links d-flex justify-content-end gap-2">
                            <button class="btnFavorite ${isFav ? "active" : ""}"
                                    data-id="${product.id}"><i class="bi bi-heart-fill"></i></button>
                                <button class="btnSaveToCart" data-id="${product.id}"><i class="bi bi-basket2-fill"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
  popularProductsRegion.innerHTML = html;
}

function renderCart() {
  const cart = getFromLS(CART_KEY);
  const cartRegion = document.getElementById("cartItemsContainer");
  const badge = document.getElementById("itemCountBadge");
  if (!badge) {
    return;
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  badge.textContent = `${totalItems} item${totalItems !== 1 ? "s" : ""}`;

  if (cart.length === 0) {
    cartRegion.innerHTML = `
        <div class="empty-cart">
          <i class="bi bi-cart-x"></i>
          <h4 class="empty-cart-title">Your cart is empty</h4>
          <p>Looks like you haven't added anything yet.</p>
          <a href="./store.html" class="btn-checkout">
            Start Shopping
          </a>
        </div>`;
    updateSummary(0);
    return;
  }

  let html = "";
  let subtotal = 0;

  cart.forEach((cartItem) => {
    const product = allProducts.find(
      (p) => String(p.id) === String(cartItem.id),
    );
    if (!product) return;

    const finalPrice = product.status?.sale?.onSale
      ? product.price * (1 - product.status.sale.discountPercent / 100)
      : product.price;

    const lineTotal = finalPrice * cartItem.quantity;
    subtotal += lineTotal;

    html += `
        <div class="cart-item">
          <div class="product-cell">
            <div class="product-img-placeholder">
              <img src="${product.img?.src || ""}" alt="${product.img?.alt || ""}"
                class="product-img"/>
            </div>
            <div>
              <div class="product-name">${product.name}</div>
              <div class="product-id">ID: ${product.id}</div>
              ${
                product.status?.sale?.onSale
                  ? `<div class="sale-info">
                    <s class="old-price">$${product.price}</s>
                    −${product.status.sale.discountPercent}% off
                  </div>`
                  : ""
              }
            </div>
          </div>
          <div class="qty-cell">
            <div class="qty-control">
              <button class="qty-btn-minus" data-id="${product.id}">−</button>
              <div class="qty-display">${cartItem.quantity}</div>
              <button class="qty-btn-plus" data-id="${product.id}">+</button>
            </div>
          </div>
          <div class="price-cell item-price">$${lineTotal.toFixed(2)}</div>
          <div class="remove-cell">
            <button class="btn-remove" data-id="${product.id}">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>`;
  });

  cartRegion.innerHTML = html;
  updateSummary(subtotal);
}

// POMOCNE FUNKCIJE ZA RENDEROVANJE
function getFinalPrice(originalPrice, discount) {
  return originalPrice * (1 - discount / 100);
}

function price(sale, price, discount) {
  let html = ``;
  if (sale) {
    html = `<s class="small">${price}</s>$&nbsp&nbsp&nbsp${getFinalPrice(price, discount).toFixed(2)}$`;
    return html;
  } else {
    html = `${price}$`;
    return html;
  }
}

function isOnSale(sale) {
  return sale ? `<div class="badgeSale">Sale</div>` : ``;
}

function isHot(hot) {
  return hot ? `<div class="badgeHot">Hot</div>` : ``;
}

//FILTERI
function getCurrentFilters() {
  return {
    search: document.getElementById("searchFilter")?.value.toLowerCase() || "",
    category: document.getElementById("categoryFilter")?.value || "0",
    maxPrice: Number(document.getElementById("priceFilter")?.value) || 500,
    onlyFavourites:
      document.getElementById("favouriteFilter")?.checked || false,
    onlySale: document.getElementById("saleFilter")?.checked || false,
    sortOption: document.getElementById("sortFilter")?.value || "",
  };
}

function filterProducts() {
  let filtered = [...allProducts];
  const { search, category, maxPrice, onlyFavourites, onlySale, sortOption } =
    getCurrentFilters();
  const favourites = getFromLS(FAVOURITES_KEY);

  if (search) {
    filtered = filtered.filter((x) => x.name.toLowerCase().includes(search));
  }
  if (category && category !== "0") {
    filtered = filtered.filter((x) => x.category === Number(category));
  }

  filtered = filtered.filter(
    (x) => getFinalPrice(x.price, x.status.sale.discountPercent) <= maxPrice,
  );

  if (onlySale) {
    filtered = filtered.filter((x) => x.status.sale.onSale);
  }

  if (onlyFavourites) {
    filtered = filtered.filter((x) => favourites.includes(String(x.id)));
  }

  if (sortOption === "name-az") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOption === "name-za") {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortOption === "price-high") {
    filtered.sort((a, b) => {
      const priceA = getFinalPrice(a.price, a.status.sale.discountPercent);
      const priceB = getFinalPrice(b.price, b.status.sale.discountPercent);
      return priceB - priceA;
    });
  } else if (sortOption === "price-low") {
    filtered.sort((a, b) => {
      const priceA = getFinalPrice(a.price, a.status.sale.discountPercent);
      const priceB = getFinalPrice(b.price, b.status.sale.discountPercent);
      return priceA - priceB;
    });
  }
  lastFiltered = filtered;
  renderProducts(filtered);
}

const searchFilter = document.getElementById("searchFilter");
if (searchFilter) {
  searchFilter.addEventListener("input", filterProducts);
  document
    .getElementById("categoryFilter")
    .addEventListener("change", filterProducts);
  document
    .getElementById("priceFilter")
    .addEventListener("input", filterProducts);
  document
    .getElementById("favouriteFilter")
    .addEventListener("change", filterProducts);
  document
    .getElementById("saleFilter")
    .addEventListener("change", filterProducts);
  document
    .getElementById("sortFilter")
    .addEventListener("change", filterProducts);
}

// FUNKCIJE ZA DODAVANJE U KORPU I OMILJENE PROIZVODE
function saveToCart(id) {
  let cart = getFromLS(CART_KEY);
  const index = cart.findIndex((x) => x.id === id);
  if (index === -1) {
    cart.push({ id: id, quantity: 1 });
    showToast("Product has been added to cart.", "bg-success");
  } else {
    if (cart[index].quantity < 5) {
      cart[index].quantity += 1;
      showToast(
        `Quantity updated to ${cart[index].quantity}! 🛒`,
        "bg-primary",
      );
    } else {
      showToast("Maximum quantity of 5 reached! ⚠️", "bg-warning");
    }
  }

  saveToLS(CART_KEY, cart);
  updateCartCount();
}

function updateCartCount() {
  const cart = getFromLS(CART_KEY) || [];
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  document
    .querySelectorAll(".cartCount")
    .forEach((x) => (x.textContent = total));
}

function saveToFavourites(id) {
  let favourites = getFromLS(FAVOURITES_KEY);
  const index = favourites.indexOf(String(id));

  if (index === -1) {
    favourites.push(String(id));
    showToast("Added to favourites! ❤️", "bg-danger");
  } else {
    favourites.splice(index, 1);
    showToast("Removed from favourites! 🤍", "bg-secondary");
  }

  saveToLS(FAVOURITES_KEY, favourites);
  filterProducts();
  renderSaleProducts();
  renderPopularProducts();
}

// FUNKCIJE ZA INICIJALIZOVANJE KORPE I OMILJENIH
function initializeCart() {
  if (!getFromLS(CART_KEY)) {
    saveToLS(CART_KEY, []);
  }
}
function initializeFavourites() {
  if (!getFromLS(FAVOURITES_KEY)) {
    saveToLS(FAVOURITES_KEY, []);
  }
}

//FUNKCIJA ZA POPUNJAVANJE KATEGORIJA
function populateCategories() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) {
    return;
  }
  let html = `<option value="0">All</option>`;
  categories.forEach((category) => {
    html += `<option value="${category.id}">${category.name}</option>`;
  });
  categoryFilter.innerHTML = html;
}

// FUNKCIJE ZA RAD SA PROIZVODIMA U KORPI
function minusQuantity(id) {
  let cart = getFromLS(CART_KEY);
  const index = cart.findIndex((x) => x.id === String(id));
  if (index === -1) return;
  if (cart[index].quantity > 1) {
    cart[index].quantity -= 1;
  }
  saveToLS(CART_KEY, cart);
  updateCartCount();
  renderCart();
}
function plusQuantity(id) {
  let cart = getFromLS(CART_KEY);
  const index = cart.findIndex((x) => x.id === String(id));
  if (index === -1) return;
  if (cart[index].quantity < 5) {
    cart[index].quantity += 1;
  } else {
    showToast("Maximum quantity of 5 reached! ⚠️", "bg-warning");
  }

  saveToLS(CART_KEY, cart);
  updateCartCount();
  renderCart();
}

function removeProduct(id) {
  let cart = getFromLS(CART_KEY).filter((x) => x.id !== String(id));
  saveToLS(CART_KEY, cart);
  updateCartCount();
  renderCart();
}

function updateSummary(subtotal) {
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const grandTotal = subtotal - discount;

  document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("discount").textContent = promoApplied
    ? `−$${discount.toFixed(2)}`
    : "$0.00";
  document.getElementById("shipping").textContent = subtotal > 0 ? "Free" : "—";
  document.getElementById("grandTotal").textContent = `$${grandTotal.toFixed(2)}`;
}

function applyPromoCode() {
  const promoInput = document.getElementById("promoInput");
  const code = promoInput.value;
  const isAllUpperCase = /^[A-Z]+$/.test(code);
  const isLongEnough = code.length >= 5;

  if (isAllUpperCase && isLongEnough) {
    promoApplied = true;
    showToast("Promo code applied! 10% discount added.", "bg-success");
    renderCart();
  } else {
    promoApplied = false;
    showToast("Invalid code.", "bg-danger");
    renderCart();
  }
}

//FUNKCIJE ZA VALIDACIJU I PRIKAZ GRESAKA
function validateName() {
  const first = document.getElementById("firstName");
  const last = document.getElementById("lastName");

  if (!first.value.trim()) {
    showError("nameError", "First name is required.");
    setFieldState(first, "error");
    return false;
  } else if (!REGEX.name.test(first.value.trim())) {
    showError(
      "nameError",
      "First name must be at least 2 letters, no numbers.",
    );
    setFieldState(first, "error");
    return false;
  } else if (!last.value.trim()) {
    showError("nameError", "Last name is required.");
    setFieldState(last, "error");
    return false;
  } else if (!REGEX.name.test(last.value.trim())) {
    showError("nameError", "Last name must be at least 2 letters, no numbers.");
    setFieldState(last, "error");
    return false;
  }

  clearError("nameError");
  setFieldState(first, "valid");
  setFieldState(last, "valid");
  return true;
}

function validateEmail() {
  const email = document.getElementById("email");

  if (!email.value.trim()) {
    showError("emailError", "Email address is required.");
    setFieldState(email, "error");
    return false;
  } else if (!REGEX.email.test(email.value.trim())) {
    showError("emailError", "Please enter a valid email address.");
    setFieldState(email, "error");
    return false;
  }

  clearError("emailError");
  setFieldState(email, "valid");
  return true;
}

function validateMessage() {
  const review = document.getElementById("review");

  if (!review.value.trim()) {
    showError("reviewError", "Message is required.");
    setFieldState(review, "error");
    return false;
  } else if (!REGEX.message.test(review.value.trim())) {
    showError("reviewError", "Message must be at least 10 characters.");
    setFieldState(review, "error");
    return false;
  }

  clearError("reviewError");
  setFieldState(review, "valid");
  return true;
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.querySelector("span").textContent = message;
  el.classList.add("visible");
}

function clearError(id) {
  const el = document.getElementById(id);
  el.querySelector("span").textContent = "";
  el.classList.remove("visible");
}

function setFieldState(el, state) {
  el.classList.remove("is-error", "is-valid-input");
  if (state === "error") el.classList.add("is-error");
  if (state === "valid") el.classList.add("is-valid-input");
}


//BINDOVANJE EVENTLISTENERA
const productRegion = document.getElementById("productRegion");
if (productRegion) {
  productRegion.addEventListener("click", (e) => {
    const btnCart = e.target.closest(".btnSaveToCart");
    if (btnCart) saveToCart(btnCart.dataset.id);

    const btnFav = e.target.closest(".btnFavorite");
    if (btnFav) saveToFavourites(btnFav.dataset.id);
  });
}

const btnShowMore = document.getElementById("btnShowMore");
if (btnShowMore) {
  btnShowMore.addEventListener("click", () => {
    visibleCount += 9;
    renderProducts(lastFiltered);
  });
}

const saleRegion = document.getElementById("saleProducts");
if (saleRegion) {
  saleRegion.addEventListener("click", (e) => {
    const btnCart = e.target.closest(".btnSaveToCart");
    if (btnCart) saveToCart(btnCart.dataset.id);

    const btnFav = e.target.closest(".btnFavorite");
    if (btnFav) saveToFavourites(btnFav.dataset.id);
  });
}

const popularRegion = document.getElementById("popularProducts");
if (popularRegion) {
  popularRegion.addEventListener("click", (e) => {
    const btnCart = e.target.closest(".btnSaveToCart");
    if (btnCart) saveToCart(btnCart.dataset.id);

    const btnFav = e.target.closest(".btnFavorite");
    if (btnFav) saveToFavourites(btnFav.dataset.id);
  });
}

const priceFilter = document.getElementById("priceFilter");
const priceValue = document.getElementById("priceValue");

if (priceFilter && priceValue) {
  priceFilter.addEventListener("input", (e) => {
    priceValue.textContent = `$${e.target.value}`;
  });
}

const cartRegion = document.getElementById("cartItemsContainer");
if (cartRegion) {
  cartRegion.addEventListener("click", (e) => {
    const btnMinus = e.target.closest(".qty-btn-minus");
    if (btnMinus) minusQuantity(btnMinus.dataset.id);

    const btnPlus = e.target.closest(".qty-btn-plus");
    if (btnPlus) plusQuantity(btnPlus.dataset.id);

    const btnRemove = e.target.closest(".btn-remove");
    if (btnRemove) removeProduct(btnRemove.dataset.id);
  });
}

const btnPromo = document.getElementById("promo-btn");
if (btnPromo) {
  btnPromo.addEventListener("click", () => {
    applyPromoCode();
  });
}

const textarea = document.getElementById("review");
const charCount = document.getElementById("charCount");
if (textarea && charCount) {
  textarea.addEventListener("input", () => {
    const len = textarea.value.length;
    charCount.textContent = `${len} / 500`;
    charCount.className = "char-count";
    if (len >= 450) charCount.classList.add("near-limit");
    if (len >= 500) charCount.classList.add("at-limit");
  });
}


const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = validateName(), em = validateEmail(), m = validateMessage();
    if (!n || !em || !m) return;

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending...`;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-send-fill"></i> Send Message`;
      document.getElementById("contactForm").reset();
      charCount.textContent = "0 / 500";
      ["firstName", "lastName", "email", "review"].forEach((id) =>
        setFieldState(document.getElementById(id), ""),
      );
      showToast("Message sent successfully!", "bg-success");
    }, 1500);
  });
}

const firstName = document.getElementById("firstName"); 
const lastName = document.getElementById("lastName"); 
const email = document.getElementById("email"); 
const message = document.getElementById("review"); 
if (firstName && lastName && email && message) {
  document.getElementById("firstName").addEventListener("blur", validateName);
  document.getElementById("lastName").addEventListener("blur", validateName);
  document.getElementById("email").addEventListener("blur", validateEmail);
  document.getElementById("review").addEventListener("blur", validateMessage);
}
