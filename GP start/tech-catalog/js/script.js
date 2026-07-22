// Product Data
const products = [
    { id: 1, brand: "HP", title: "Hp Elite ProBook (Nvidia 4GB, i7)", category: "Laptops", price: "₦1,000,000.00", priceValue: 1000000, image: "img/Hp Eliete pro book Nividia 4GB and 8GB Ram i7, 1M.jpg", specs: [{ icon: "ph-cpu", label: "Core i7" }, { icon: "ph-memory", label: "8GB" }, { icon: "ph-video-camera", label: "Nvidia 4GB" }], isSale: false },
    { id: 2, brand: "Apple", title: "iPhone 17 | 256GB Storage", category: "Phones", price: "₦1,000,000.00", priceValue: 1000000, image: "img/iPhone 17, 1M 256GB,.jpg", specs: [{ icon: "ph-monitor", label: "6.7\" OLED" }, { icon: "ph-cpu", label: "A19 Pro" }, { icon: "ph-database", label: "256GB" }], isSale: true },
    { id: 3, brand: "Apple", title: "Macbook Neo | 256GB", category: "Laptops", price: "₦900,000.00", priceValue: 900000, image: "img/Macbook Neo, 8GB 256GB 900K.jpg", specs: [{ icon: "ph-monitor", label: "13.6\" Liquid Retina" }, { icon: "ph-cpu", label: "M-Series" }, { icon: "ph-memory", label: "8GB" }], isSale: false },
    { id: 4, brand: "HP", title: "HP Elitebook X335", category: "Laptops", price: "₦150,000.00", priceValue: 150000, image: "img/Hp Elitebook X335 8GB RAM,150K.jpg", specs: [{ icon: "ph-monitor", label: "13.3\"" }, { icon: "ph-memory", label: "8GB" }], isSale: true },
    { id: 5, brand: "Apple", title: "iPhone 16 | 128GB Storage", category: "Phones", price: "₦600,000.00", priceValue: 600000, image: "img/Iphone 16 128GB 600K.jpg", specs: [{ icon: "ph-monitor", label: "6.1\" OLED" }, { icon: "ph-cpu", label: "A18" }, { icon: "ph-database", label: "128GB" }], isSale: false },
    { id: 6, brand: "Apple", title: "iPhone 15 | 128GB Storage", category: "Phones", price: "₦700,000.00", priceValue: 700000, image: "img/iPhone 15, 128GB 700K,.jpg", specs: [{ icon: "ph-monitor", label: "6.1\" OLED" }, { icon: "ph-cpu", label: "A16 Bionic" }, { icon: "ph-database", label: "128GB" }], isSale: false },
    { id: 7, brand: "Dell", title: "Dell XPS 15 9560 Core i7", category: "Laptops", price: "₦1,200,000.00", priceValue: 1200000, image: "img/dell-xps-15-9560-core-i7-7th-gen-16gb-ram-512gb-ssd-4gb-nvidia-gtx-4k-display-touchscreen-backlit-keyboard-7665505.png", specs: [{ icon: "ph-cpu", label: "Core i7" }, { icon: "ph-memory", label: "16GB" }, { icon: "ph-video-camera", label: "Nvidia GTX" }], isSale: false },
    { id: 8, brand: "Dell", title: "Dell Precision 5470 Core i9", category: "Laptops", price: "₦1,500,000.00", priceValue: 1500000, image: "img/dell-precision-5470-core-i9-12th-gen-32gb-ram-512gb-ssd-4gb-nvidia-rtx-backlit-keyboard-6484770.png", specs: [{ icon: "ph-cpu", label: "Core i9" }, { icon: "ph-memory", label: "32GB" }, { icon: "ph-video-camera", label: "Nvidia RTX" }], isSale: false },
    { id: 9, brand: "Lenovo", title: "Thinkplus TH60 Headphones", category: "Audio", price: "₦35,000.00", priceValue: 35000, image: "img/lenovo-thinkplus-th60-wireless-bluetooth-headphones-9761399.png", specs: [{ icon: "ph-headphones", label: "Over-Ear" }, { icon: "ph-bluetooth", label: "Wireless" }], isSale: true },
    { id: 10, brand: "Lenovo", title: "LE206 True Wireless Earbuds", category: "Audio", price: "₦25,000.00", priceValue: 25000, image: "img/lenovo-services-le206-true-wireless-bluetooth-earbuds-7528551.png", specs: [{ icon: "ph-earbuds", label: "In-Ear" }, { icon: "ph-bluetooth", label: "Wireless" }], isSale: false },
    { id: 11, brand: "Yesido", title: "YP76 20000mAh Power Bank (65W)", category: "Components", price: "₦45,000.00", priceValue: 45000, image: "img/yesido-yp76-20000mah-65w-fast-charging-laptop-power-bank-4767429.png", specs: [{ icon: "ph-battery-charging", label: "20000mAh" }, { icon: "ph-lightning", label: "65W Fast Charge" }], isSale: false },
    { id: 12, brand: "Samsung", title: "Galaxy Tab A6", category: "Phones", price: "₦120,000.00", priceValue: 120000, image: "img/samsung-galaxy-tab-a6-8gb-2019245.webp", specs: [{ icon: "ph-tablet", label: "10.1\" Display" }, { icon: "ph-database", label: "32GB" }], isSale: true }
];

let activeCategory = "All";
let searchQuery = "";
let sortMode = "Date, new to old"; // Default

document.addEventListener("DOMContentLoaded", () => {
    // Bind Search
    const searchInput = document.getElementById("product-search");
    if(searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderGrid();
        });
    }

    // Bind Category Pills
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelector('.pill.active').classList.remove('active');
            pill.classList.add('active');
            activeCategory = pill.innerText;
            renderGrid();
        });
    });

    // Bind Sorting
    const sortSelect = document.getElementById("sort-select");
    if(sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            sortMode = e.target.value;
            renderGrid();
        });
    }

    // Initial Render
    renderGrid();
});

function renderGrid() {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = ""; // Clear existing

    // 1. Filter by Category
    let filtered = products.filter(p => activeCategory === "All" || p.category === activeCategory);

    // 2. Filter by Search Query
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchQuery) || 
            p.brand.toLowerCase().includes(searchQuery)
        );
    }

    // 3. Sort
    if (sortMode === "Price: Low to High") {
        filtered.sort((a, b) => a.priceValue - b.priceValue);
    } else if (sortMode === "Price: High to Low") {
        filtered.sort((a, b) => b.priceValue - a.priceValue);
    } else {
        // Date, new to old -> just default ID order for demo
        filtered.sort((a, b) => a.id - b.id);
    }

    // 4. Render
    if (filtered.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);'>No products found.</p>";
        return;
    }

    filtered.forEach(product => {
        let specsHTML = product.specs.map(spec => `
            <span class="spec-pill">
                <i class="ph ${spec.icon}"></i> ${spec.label}
            </span>
        `).join('');

        const cardHTML = `
            <article class="product-card">
                <div class="image-container">
                    ${product.isSale ? '<span class="badge-sale">Sale</span>' : ''}
                    <img src="${product.image}" alt="${product.title}">
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h2 class="product-title">${product.title}</h2>
                    <div class="product-specs">
                        ${specsHTML}
                    </div>
                </div>
                <div class="product-footer">
                    <span class="product-price">${product.price}</span>
                    <button class="add-btn" aria-label="Buy on WhatsApp" onclick="buyOnWhatsApp(${product.id})" style="background-color: #25D366; color: white;">
                        <i class="ph-fill ph-whatsapp-logo"></i>
                    </button>
                </div>
            </article>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function buyOnWhatsApp(productId) {
    const product = products.find(p => p.id === productId);
    if(product) {
        const message = `Hi GP STAR TECH, I'm interested in buying the *${product.title}* for ${product.price}. Is it available?`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/2347048401468?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    }
}
