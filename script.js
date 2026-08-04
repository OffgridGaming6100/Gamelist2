import { gamesData } from './games.js';

document.addEventListener("DOMContentLoaded", () => {
    // Application State
    const state = {
        selectedGameIds: new Set(),
        searchQuery: "",
        activeGenre: "all",
        sortOrder: "name-asc",
        targetDriveSizeGB: 232.88,
        isWidgetCollapsed: false
    };

    // DOM Elements
    const gameGrid = document.getElementById("gameGrid");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const genreChips = document.getElementById("genreChips");
    const cartWidget = document.getElementById("cartWidget");
    const cartItemsList = document.getElementById("cartItemsList");
    const cartCountEl = document.getElementById("cartCount");
    const cartTotalGbEl = document.getElementById("cartTotalGb");
    const tetrisBar = document.getElementById("tetrisBar");
    const driveSelect = document.getElementById("driveSelect");
    const storageAdviceText = document.getElementById("storageAdviceText");
    const btnCopyDrawer = document.getElementById("btnCopyDrawer");
    const btnClearAll = document.getElementById("btnClearAll");
    const cartToggleBtn = document.getElementById("cartToggleBtn");
    const reqsModal = document.getElementById("reqsModal");
    const modalOverlay = document.getElementById("modalOverlay");
    const toastContainer = document.getElementById("toastContainer");

    // Initialize Application
    init();

    function init() {
        if (driveSelect) {
            state.targetDriveSizeGB = parseFloat(driveSelect.value);
        }
        renderGames();
        setupEventListeners();
        updateDrawerUI();
    }

    // Helper: Convert all sizes to GB for accurate total calculations
    function getGameSizeInGB(game) {
        return game.sizeUnit === "MB" ? game.size / 1024 : game.size;
    }

    // Helper: Display size string
    function formatGameSize(game) {
        if (game.sizeUnit === "MB") {
            const mbVal = Math.round(game.size < 1 ? game.size * 1024 : game.size);
            return `${mbVal} MB`;
        }
        return `${game.size.toFixed(2)} GB`;
    }

    // Render Game Cards to Grid
    function renderGames() {
        let filtered = gamesData.filter(game => {
            const matchesSearch = game.title.toLowerCase().includes(state.searchQuery.toLowerCase());
            const matchesGenre = state.activeGenre === "all" || game.genre.toLowerCase() === state.activeGenre.toLowerCase();
            return matchesSearch && matchesGenre;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (state.sortOrder === "name-asc") {
                return a.title.localeCompare(b.title);
            } else if (state.sortOrder === "size-asc") {
                return getGameSizeInGB(a) - getGameSizeInGB(b);
            } else if (state.sortOrder === "size-desc") {
                return getGameSizeInGB(b) - getGameSizeInGB(a);
            }
            return 0;
        });

        if (filtered.length === 0) {
            gameGrid.innerHTML = `<div class="empty-msg" style="grid-column: 1/-1;">No games found matching your criteria.</div>`;
            return;
        }

        gameGrid.innerHTML = filtered.map(game => {
            const isSelected = state.selectedGameIds.has(game.id);
            return `
                <div class="game-card ${isSelected ? 'selected' : ''}" data-id="${game.id}">
                    <div class="card-img-wrapper">
                        <img src="${game.imgUrl}" alt="${game.title}" class="card-img" loading="lazy" onError="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    </div>
                    <div class="card-content">
                        <div class="game-title">${game.title}</div>
                        <div class="game-meta">
                            <span>${game.genre}</span>
                            <span>${formatGameSize(game)}</span>
                        </div>
                        <div class="card-actions">
                            <button class="btn-play" data-action="toggle" data-id="${game.id}">
                                <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-plus'}"></i> 
                                ${isSelected ? 'Selected' : 'Select Game'}
                            </button>
                            <button class="btn-reqs" data-action="reqs" data-id="${game.id}">
                                <i class="fa-solid fa-sliders"></i> System Reqs
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // Event Delegation & Setup
    function setupEventListeners() {
        // Search
        searchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value;
            renderGames();
        });

        // Sort
        sortSelect.addEventListener("change", (e) => {
            state.sortOrder = e.target.value;
            renderGames();
        });

        // Genre Filter Chips
        genreChips.addEventListener("click", (e) => {
            if (e.target.classList.contains("chip")) {
                document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
                e.target.classList.add("active");
                state.activeGenre = e.target.getAttribute("data-genre");
                renderGames();
            }
        });

        // Grid Button Actions
        gameGrid.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const action = btn.getAttribute("data-action");
            const gameId = parseInt(btn.getAttribute("data-id"), 10);
            const game = gamesData.find(g => g.id === gameId);

            if (action === "toggle" && game) {
                toggleGameSelection(game);
            } else if (action === "reqs" && game) {
                openReqsModal(game);
            }
        });

        // Target Drive Selector
        driveSelect.addEventListener("change", (e) => {
            state.targetDriveSizeGB = parseFloat(e.target.value);
            updateDrawerUI();
        });

        // Toggle Drawer Collapse
        cartToggleBtn.addEventListener("click", () => {
            state.isWidgetCollapsed = !state.isWidgetCollapsed;
            cartWidget.classList.toggle("collapsed", state.isWidgetCollapsed);
        });

        // Clear All Selections
        btnClearAll.addEventListener("click", () => {
            state.selectedGameIds.clear();
            renderGames();
            updateDrawerUI();
            showToast("Selection cleared");
        });

        // Copy Selection to Clipboard (With Mobile & Insecure HTTP Fallback)
        btnCopyDrawer.addEventListener("click", () => {
            if (state.selectedGameIds.size === 0) return;

            const selectedGames = gamesData.filter(g => state.selectedGameIds.has(g.id));
            let text = "🎮 My Offgrid Gaming Selection:\n\n";
            let total = 0;

            selectedGames.forEach((g, idx) => {
                const sizeGB = getGameSizeInGB(g);
                total += sizeGB;
                text += `${idx + 1}. ${g.title}\n`;
            });

            text += `\nTotal Games Selected: ${selectedGames.length}\nTotal Estimated Storage: ${total.toFixed(2)} GB`;

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast("Copied game list to clipboard!");
                }).catch(() => {
                    fallbackCopyText(text);
                });
            } else {
                fallbackCopyText(text);
            }
        });

        // Remove Individual Item from Drawer
        cartItemsList.addEventListener("click", (e) => {
            const removeBtn = e.target.closest(".btn-remove-item");
            if (removeBtn) {
                const gameId = parseInt(removeBtn.getAttribute("data-id"), 10);
                state.selectedGameIds.delete(gameId);
                renderGames();
                updateDrawerUI();
                showToast("Game removed");
            }
        });

        // Close Modal Events
        document.getElementById("btnCloseModal").addEventListener("click", closeModal);
        modalOverlay.addEventListener("click", closeModal);
    }

    // Fallback Clipboard Function for Mobile Browsers / HTTP Contexts
    function fallbackCopyText(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Prevent scrolling to bottom on iOS
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast("Copied game list to clipboard!");
            } else {
                showToast("Failed to copy list");
            }
        } catch (err) {
            showToast("Failed to copy list");
        }

        document.body.removeChild(textArea);
    }

    // Toggle Selection Logic
    function toggleGameSelection(game) {
        if (state.selectedGameIds.has(game.id)) {
            state.selectedGameIds.delete(game.id);
            showToast(`Removed "${game.title}"`);
        } else {
            state.selectedGameIds.add(game.id);
            showToast(`Added "${game.title}"`);
        }
        renderGames();
        updateDrawerUI();
    }

    // Update Bottom Drawer & Tetris Bar
    function updateDrawerUI() {
        const selectedGames = gamesData.filter(g => state.selectedGameIds.has(g.id));
        const totalGB = selectedGames.reduce((acc, g) => acc + getGameSizeInGB(g), 0);

        cartCountEl.textContent = selectedGames.length;
        cartTotalGbEl.textContent = totalGB.toFixed(2);
        btnCopyDrawer.disabled = selectedGames.length === 0;

        // Render Cart Items
        if (selectedGames.length === 0) {
            cartItemsList.innerHTML = `<li class="empty-msg">No games selected yet.</li>`;
        } else {
            cartItemsList.innerHTML = selectedGames.map(game => `
                <li class="cart-item">
                    <span class="cart-item-title">
                        <i class="fa-solid fa-gamepad"></i> ${game.title}
                    </span>
                    <div class="cart-item-right">
                        <span>${formatGameSize(game)}</span>
                        <button class="btn-remove-item" data-id="${game.id}" title="Remove">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </li>
            `).join("");
        }

        // Render Tetris Storage Visualization Bar
        renderTetrisBar(selectedGames, totalGB);
    }

    function renderTetrisBar(selectedGames, totalGB) {
        tetrisBar.innerHTML = "";
        const targetGB = state.targetDriveSizeGB;

        if (selectedGames.length === 0) return;

        const colors = [
            "#ff6a00", "#9d4edd", "#00e676", "#00b4d8", 
            "#ffd166", "#c77dff", "#ff3366", "#ff9e00"
        ];

        selectedGames.forEach((game, index) => {
            const sizeGB = getGameSizeInGB(game);
            const blockWidthPercent = (sizeGB / targetGB) * 100;

            const block = document.createElement("div");
            block.className = "tetris-block";
            block.style.width = `${blockWidthPercent}%`;
            block.style.backgroundColor = colors[index % colors.length];
            block.title = `${game.title}: ${formatGameSize(game)}`;

            // Highlight corresponding card on hover over tetris block
            block.addEventListener("mouseenter", () => {
                const card = document.querySelector(`.game-card[data-id="${game.id}"]`);
                if (card) card.classList.add("tetris-highlight");
            });
            block.addEventListener("mouseleave", () => {
                const card = document.querySelector(`.game-card[data-id="${game.id}"]`);
                if (card) card.classList.remove("tetris-highlight");
            });

            tetrisBar.appendChild(block);
        });

        // Dynamic Storage Advice Text
        if (totalGB > targetGB) {
            const overflow = (totalGB - targetGB).toFixed(2);
            storageAdviceText.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red)"></i> Drive full! Over capacity by <strong>${overflow} GB</strong>.`;
            tetrisBar.classList.add("tetris-overflow");
        } else {
            const remaining = (targetGB - totalGB).toFixed(2);
            storageAdviceText.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>${remaining} GB</strong> remaining on selected drive.`;
            tetrisBar.classList.remove("tetris-overflow");
        }
    }

    // Modal Operations
    function openReqsModal(game) {
        document.getElementById("modalGameTitle").textContent = game.title;
        document.getElementById("reqRam").textContent = game.ram || "N/A";
        document.getElementById("reqVram").textContent = game.vram || "N/A";
        document.getElementById("reqCpu").textContent = game.cpu || "N/A";
        document.getElementById("reqGpu").textContent = game.gpu || "N/A";

        modalOverlay.classList.add("active");
        reqsModal.classList.add("active");
    }

    function closeModal() {
        modalOverlay.classList.remove("active");
        reqsModal.classList.remove("active");
    }

    // Toast Notifications
    function showToast(message) {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2500);
    }
});
