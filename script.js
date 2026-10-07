const products = [
  { id: 1, name: "Classic School Backpack", category: "Bags", price: 18500, oldPrice: 22000, rating: 4.8, reviews: 34, badge: "SALE", emoji: "🎒" },
  { id: 2, name: "Everyday School Backpack", category: "Bags", price: 16000, rating: 4.7, reviews: 27, badge: "POPULAR", emoji: "🎒" },
  { id: 3, name: "Classic Canvas School Shoes", category: "Shoes", price: 14500, rating: 4.9, reviews: 41, badge: "BESTSELLER", emoji: "👟" },
  { id: 4, name: "Black School Sneakers", category: "Shoes", price: 18500, oldPrice: 21000, rating: 4.6, reviews: 19, badge: "SALE", emoji: "👟" },
  { id: 5, name: "School Polo Shirt", category: "Clothes", price: 8500, rating: 4.7, reviews: 23, badge: "POPULAR", emoji: "👕" },
  { id: 6, name: "Pleated School Skirt", category: "Clothes", price: 9000, rating: 4.8, reviews: 18, badge: "NEW", emoji: "👗" },
  { id: 7, name: "Insulated Lunch Box", category: "Lunch boxes", price: 10500, rating: 4.9, reviews: 38, badge: "BESTSELLER", emoji: "🍱" },
  { id: 8, name: "Kids Water Bottle", category: "Lunch boxes", price: 6500, rating: 4.6, reviews: 25, badge: "NEW", emoji: "🥤" }
];

const DELIVERY_FEE = 2500;
const FREE_DELIVERY_THRESHOLD = 75000;
const WHATSAPP_NUMBER = "2348166438947"; // CHANGE THIS to your business WhatsApp number.

let firebaseAuth = null;
let firebaseSetupError = "";
const firebaseConfig = window.CORNER_STALL_FIREBASE_CONFIG;

if (window.firebase && firebaseConfig && firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("YOUR_")) {
  try {
    firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
  } catch (error) {
    firebaseSetupError = "Firebase could not be initialized. Check the configuration in firebase-config.js.";
    console.error(firebaseSetupError, error);
  }
} else {
  firebaseSetupError = "Add your Firebase project settings to firebase-config.js to enable sign in.";
}

let cart = JSON.parse(localStorage.getItem("cornerStallCart") || "[]");
let selectedCategory = "All";

const $ = (selector) => document.querySelector(selector);

function formatMoney(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
}

function saveCart() {
  localStorage.setItem("cornerStallCart", JSON.stringify(cart));
}

function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function getSubtotal() {
  return cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function getDelivery() {
  const subtotal = getSubtotal();
  if (!subtotal || subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return DELIVERY_FEE;
}

function renderProducts() {
  const grid = $("#productGrid");
  const query = $("#searchInput").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;

  let filtered = products.filter(product => {
    const categoryMatch = selectedCategory === "All" || product.category === selectedCategory;
    const searchMatch = !query ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    return categoryMatch && searchMatch;
  });

  if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
  if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));

  grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-image">
        <span class="emoji-art">${product.emoji}</span>
        ${product.badge ? `<span class="badge ${product.badge === "SALE" ? "sale" : ""}">${product.badge}</span>` : ""}
      </div>
      <div class="product-info">
        <div class="product-category">${product.category}</div>
        <h3 class="product-name">${product.name}</h3>
        <div class="rating">★ ${product.rating} <span>(${product.reviews})</span></div>
        <div class="price-row">
          <div class="price">
            ${formatMoney(product.price)}
            ${product.oldPrice ? `<span class="old-price">${formatMoney(product.oldPrice)}</span>` : ""}
          </div>
          <button class="add-btn" data-add="${product.id}" aria-label="Add ${product.name} to cart">+</button>
        </div>
      </div>
    </article>
  `).join("");

  $("#emptyState").classList.toggle("hidden", filtered.length !== 0);
  $("#activeFilter").innerHTML =
    selectedCategory === "All" ? "" :
    `Showing <strong>${selectedCategory}</strong> · <button class="text-btn" id="removeFilter">Clear</button>`;

  grid.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.add)));
  });

  const removeFilter = $("#removeFilter");
  if (removeFilter) removeFilter.addEventListener("click", () => {
    selectedCategory = "All";
    renderProducts();
  });
}

function addToCart(id) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
  openCart();
  const product = products.find(p => p.id === id);
  showToast(`${product.name} added to cart`);
}

function changeQuantity(id, amount) {
  const item = cart.find(item => item.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function renderCart() {
  $("#cartCount").textContent = getCartCount();

  const empty = cart.length === 0;
  $("#cartEmpty").classList.toggle("hidden", !empty);
  $("#cartSummary").classList.toggle("hidden", empty);

  if (empty) {
    $("#cartItems").innerHTML = "";
    return;
  }

  $("#cartItems").innerHTML = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    return `
      <div class="cart-line">
        <div class="cart-thumb">${product.emoji}</div>
        <div>
          <h4>${product.name}</h4>
          <small>${formatMoney(product.price)} each</small>
          <div class="qty">
            <button data-minus="${product.id}">−</button>
            <strong>${item.quantity}</strong>
            <button data-plus="${product.id}">+</button>
          </div>
          <button class="remove" data-remove="${product.id}">Remove</button>
        </div>
        <div class="cart-price">${formatMoney(product.price * item.quantity)}</div>
      </div>
    `;
  }).join("");

  const subtotal = getSubtotal();
  const delivery = getDelivery();
  const total = subtotal + delivery;

  $("#subtotal").textContent = formatMoney(subtotal);
  $("#delivery").textContent = delivery === 0 ? "FREE" : formatMoney(delivery);
  $("#total").textContent = formatMoney(total);

  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    $("#deliveryMessage").textContent = "🎉 You qualify for free delivery!";
  } else {
    const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
    $("#deliveryMessage").textContent =
      `Add ${formatMoney(remaining)} more to qualify for free delivery.`;
  }

  $("#cartItems").querySelectorAll("[data-minus]").forEach(btn =>
    btn.addEventListener("click", () => changeQuantity(Number(btn.dataset.minus), -1))
  );
  $("#cartItems").querySelectorAll("[data-plus]").forEach(btn =>
    btn.addEventListener("click", () => changeQuantity(Number(btn.dataset.plus), 1))
  );
  $("#cartItems").querySelectorAll("[data-remove]").forEach(btn =>
    btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.remove)))
  );
}

function openCart() {
  $("#cartDrawer").classList.add("open");
  $("#cartOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  $("#cartDrawer").classList.remove("open");
  $("#cartOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function checkoutWhatsApp() {
  if (!cart.length) {
    showToast("Your cart is empty");
    return;
  }

  const lines = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    return `• ${product.name} × ${item.quantity} — ${formatMoney(product.price * item.quantity)}`;
  });

  const subtotal = getSubtotal();
  const delivery = getDelivery();
  const total = subtotal + delivery;

  const message = [
    "Hello Corner Stall 👋",
    "",
    "I would like to place this order:",
    ...lines,
    "",
    `Subtotal: ${formatMoney(subtotal)}`,
    `Delivery: ${delivery === 0 ? "FREE" : formatMoney(delivery)}`,
    `Total: ${formatMoney(total)}`,
    "",
    "Please confirm availability and next steps."
  ].join("\n");

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function openSellerModal() {
  $("#sellerModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("#sellerAuthMessage").textContent = firebaseAuth ? "" : firebaseSetupError;
  setTimeout(() => $("#sellerEmail").focus(), 100);
}

function closeSellerModal() {
  $("#sellerModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function sellerAuthError(error) {
  const messages = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/user-not-found": "No seller account was found for that email.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed before sign-in completed.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings.",
    "auth/operation-not-allowed": "Enable this sign-in method in Firebase Authentication settings.",
    "auth/network-request-failed": "A network error interrupted sign-in. Check your connection and try again."
  };

  console.error("Seller authentication failed:", error);
  $("#sellerAuthMessage").textContent =
    messages[error.code] || "Sign-in failed. Please check your details and Firebase settings.";
}

function updateSellerSession(user) {
  const signedIn = Boolean(user);
  $("#sellerForm").classList.toggle("hidden", signedIn);
  $(".auth-divider").classList.toggle("hidden", signedIn);
  $("#googleSignInBtn").classList.toggle("hidden", signedIn);
  $("#sellerSession").classList.toggle("hidden", !signedIn);
  $("#sellerUserEmail").textContent = user ? (user.email || "Google account") : "";
  if (signedIn) $("#sellerAuthMessage").textContent = "";
}

async function handleSellerAuthState(user) {
  if (!user) {
    updateSellerSession(null);
    return;
  }

  try {
    const token = await user.getIdTokenResult(true);
    if (token.claims.seller !== true) {
      await firebaseAuth.signOut();
      $("#sellerAuthMessage").textContent = "This account is not approved for seller access. Contact the store owner.";
      return;
    }
    updateSellerSession(user);
  } catch (error) {
    sellerAuthError(error);
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

$("#cartBtn").addEventListener("click", openCart);
$("#heroCartBtn").addEventListener("click", openCart);
$("#closeCartBtn").addEventListener("click", closeCart);
$("#cartOverlay").addEventListener("click", closeCart);
$("#startShoppingBtn").addEventListener("click", () => {
  closeCart();
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
});

$("#searchInput").addEventListener("input", renderProducts);
$("#sortSelect").addEventListener("change", renderProducts);

document.querySelectorAll(".category-card").forEach(card => {
  card.addEventListener("click", () => {
    selectedCategory = card.dataset.category;
    renderProducts();
    document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
  });
});

$("#allCategoriesBtn").addEventListener("click", () => {
  selectedCategory = "All";
  renderProducts();
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
});

$("#clearFiltersBtn").addEventListener("click", () => {
  selectedCategory = "All";
  $("#searchInput").value = "";
  $("#sortSelect").value = "featured";
  renderProducts();
});

$("#checkoutBtn").addEventListener("click", checkoutWhatsApp);
$("#footerSellerBtn").addEventListener("click", openSellerModal);
$("#closeSellerBtn").addEventListener("click", closeSellerModal);

$("#sellerModal").addEventListener("click", event => {
  if (event.target === $("#sellerModal")) closeSellerModal();
});

$("#sellerForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!firebaseAuth) {
    $("#sellerAuthMessage").textContent = firebaseSetupError;
    return;
  }

  firebaseAuth.signInWithEmailAndPassword(
    $("#sellerEmail").value.trim(),
    $("#sellerPassword").value
  ).catch(sellerAuthError);
});

$("#googleSignInBtn").addEventListener("click", () => {
  if (!firebaseAuth) {
    $("#sellerAuthMessage").textContent = firebaseSetupError;
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  firebaseAuth.signInWithPopup(provider).catch(sellerAuthError);
});

$("#resetPasswordBtn").addEventListener("click", () => {
  if (!firebaseAuth) {
    $("#sellerAuthMessage").textContent = firebaseSetupError;
    return;
  }

  const email = $("#sellerEmail").value.trim();
  if (!email) {
    $("#sellerAuthMessage").textContent = "Enter your email address first to reset your password.";
    $("#sellerEmail").focus();
    return;
  }

  firebaseAuth.sendPasswordResetEmail(email)
    .then(() => {
      $("#sellerAuthMessage").textContent = "If an account exists for this email, a password reset link has been sent.";
    })
    .catch(sellerAuthError);
});

$("#sellerSignOutBtn").addEventListener("click", () => {
  if (firebaseAuth) firebaseAuth.signOut().catch(sellerAuthError);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
    closeSellerModal();
  }
});

$("#year").textContent = new Date().getFullYear();
if (firebaseAuth) firebaseAuth.onAuthStateChanged(handleSellerAuthState, sellerAuthError);
renderProducts();
renderCart();
