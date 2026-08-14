import { gamesData } from './games.js';

document.addEventListener("DOMContentLoaded", () => {
    // Application State
    const state = {
        selectedGameIds: new Set(),
        searchQuery: "",
        activeGenre: "all",
        sizeFilter: "all",
        specFilter: "all",
        sortOrder: "name-asc",
        targetDriveSizeGB: 232.88,
        isWidgetCollapsed: false,
        currentPage: 1,
        itemsPerPage: 24 // Dynamic grid pagination size
    };

    // DOM Elements
    const gameGrid = document.getElementById("gameGrid");
    const paginationContainer = document.getElementById("paginationContainer");
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const sizeFilterSelect = document.getElementById("sizeFilterSelect");
    const specFilterSelect = document.getElementById("specFilterSelect");
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
    const btnCloseModal = document.getElementById("btnCloseModal");
    const toastContainer = document.getElementById("toastContainer");

    // String normalization for fast searching
    const normalize = (str) => (str ? str.toLowerCase().replace(/['’]/g, "").trim() : "");

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

    // Helper: Convert all sizes to GB
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

    // Helper: Parse RAM in GB from requirement string
    function parseRamInGB(ramStr) {
        if (!ramStr) return 0;
        const match = ramStr.toUpperCase().match(/(\d+(\.\d+)?)\s*(GB|MB)/);
        if (!match) return 0;
        const val = parseFloat(match[1]);
        return match[3] === "MB" ? val / 1024 : val;
    }

    // Multi-Filter & Render Game Cards with Pagination
    function renderGames() {
        let filtered = gamesData.filter(game => {
            const matchesSearch = normalize(game.title).includes(normalize(state.searchQuery));
            
            const matchesGenre = state.activeGenre === "all" || 
                game.genre.toLowerCase().includes(state.activeGenre.toLowerCase());

            const sizeGB = getGameSizeInGB(game);
            let matchesSize = true;
            if (state.sizeFilter === "under-1") matchesSize = sizeGB < 1;
            else if (state.sizeFilter === "1-5") matchesSize = sizeGB >= 1 && sizeGB <= 5;
            else if (state.sizeFilter === "5-10") matchesSize = sizeGB > 5 && sizeGB <= 10;
            else if (state.sizeFilter === "over-10") matchesSize = sizeGB > 10;

            const ramGB = parseRamInGB(game.ram);
            let matchesSpec = true;
            if (state.specFilter === "low") matchesSpec = ramGB <= 2;
            else if (state.specFilter === "mid") matchesSpec = ramGB > 2 && ramGB <= 8;
            else if (state.specFilter === "high") matchesSpec = ramGB > 8;

            return matchesSearch && matchesGenre && matchesSize && matchesSpec;
        });

        // Sorting Logic
        filtered.sort((a, b) => {
            if (state.sortOrder === "name-asc") return a.title.localeCompare(b.title);
            if (state.sortOrder === "name-desc") return b.title.localeCompare(a.title);
            if (state.sortOrder === "size-asc") return getGameSizeInGB(a) - getGameSizeInGB(b);
            if (state.sortOrder === "size-desc") return getGameSizeInGB(b) - getGameSizeInGB(a);
            return 0;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;

        if (state.currentPage > totalPages) {
            state.currentPage = totalPages;
        }

        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const pagedGames = filtered.slice(startIndex, startIndex + state.itemsPerPage);

        if (pagedGames.length === 0) {
            gameGrid.innerHTML = `<div class="empty-msg" style="grid-column: 1/-1;">No games found matching your criteria.</div>`;
            paginationContainer.innerHTML = "";
            return;
        }

        // Render Cards
        gameGrid.innerHTML = pagedGames.map(game => {
            const isSelected = state.selectedGameIds.has(game.id);
            return `
                <div class="game-card ${isSelected ? 'selected' : ''}" data-id="${game.id}">
                    <div class="card-img-wrapper">
                        <img src="${game.imgUrl}" alt="${game.title}" class="card-img" loading="lazy" onError="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=No+Image';">
                    </div>
                    <div class="card-content">
                        <div class="game-title" title="${game.title}">${game.title}</div>
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

        renderPaginationControls(totalPages);
    }

    // Smart Pagination Controls
    function renderPaginationControls(totalPages) {
        if (totalPages <= 1) {
            paginationContainer.innerHTML = "";
            return;
        }

        let html = `
            <button class="page-btn" id="prevPageBtn" ${state.currentPage === 1 ? 'disabled' : ''} aria-label="Previous Page">
                <i class="fa-solid fa-chevron-left"></i> Prev
            </button>
        `;

        const maxVisible = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        html += `
            <button class="page-btn" id="nextPageBtn" ${state.currentPage === totalPages ? 'disabled' : ''} aria-label="Next Page">
                Next <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = html;
    }

    // Event Handlers Setup
    function setupEventListeners() {
        paginationContainer.addEventListener("click", (e) => {
            const btn = e.target.closest(".page-btn");
            if (!btn || btn.disabled) return;

            if (btn.id === "prevPageBtn") {
                state.currentPage--;
            } else if (btn.id === "nextPageBtn") {
                state.currentPage++;
            } else if (btn.hasAttribute("data-page")) {
                state.currentPage = parseInt(btn.getAttribute("data-page"), 10);
            }

            renderGames();
            gameGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        searchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value;
            state.currentPage = 1;
            clearSearchBtn.style.display = state.searchQuery ? "flex" : "none";
            renderGames();
        });

        clearSearchBtn.addEventListener("click", (e) => {
            e.preventDefault();
            searchInput.value = "";
            state.searchQuery = "";
            state.currentPage = 1;
            clearSearchBtn.style.display = "none";
            searchInput.focus();
            renderGames();
        });

        if (sizeFilterSelect) {
            sizeFilterSelect.addEventListener("change", (e) => {
                state.sizeFilter = e.target.value;
                state.currentPage = 1;
                renderGames();
            });
        }

        if (specFilterSelect) {
            specFilterSelect.addEventListener("change", (e) => {
                state.specFilter = e.target.value;
                state.currentPage = 1;
                renderGames();
            });
        }

        sortSelect.addEventListener("change", (e) => {
            state.sortOrder = e.target.value;
            renderGames();
        });

        genreChips.addEventListener("click", (e) => {
            if (e.target.classList.contains("chip")) {
                document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
                e.target.classList.add("active");
                state.activeGenre = e.target.getAttribute("data-genre");
                state.currentPage = 1;
                renderGames();
            }
        });

        gameGrid.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const action = btn.getAttribute("data-action");
            const gameId = parseInt(btn.getAttribute("data-id"), 10);
            const game = gamesData.find(g => g.id === gameId);

            if (action === "toggle" && game) toggleGameSelection(game);
            else if (action === "reqs" && game) openReqsModal(game);
        });

        driveSelect.addEventListener("change", (e) => {
            state.targetDriveSizeGB = parseFloat(e.target.value);
            updateDrawerUI();
        });

        cartToggleBtn.addEventListener("click", () => {
            state.isWidgetCollapsed = !state.isWidgetCollapsed;
            cartWidget.classList.toggle("collapsed", state.isWidgetCollapsed);
        });

        btnClearAll.addEventListener("click", () => {
            state.selectedGameIds.clear();
            renderGames();
            updateDrawerUI();
            showToast("Selection cleared");
        });

        btnCopyDrawer.addEventListener("click", () => {
            if (state.selectedGameIds.size === 0) return;

            const selectedGames = gamesData.filter(g => state.selectedGameIds.has(g.id));
            let text = "🎮Selected Games🎮\n\n";
            let total = 0;

            selectedGames.forEach((g, idx) => {
                const sizeGB = getGameSizeInGB(g);
                total += sizeGB;
                text += `${idx + 1}. ${g.title} (${formatGameSize(g)})\n`;
            });

            text += `\nTotal Games Selected: ${selectedGames.length}\nTotal Estimated Storage: ${total.toFixed(2)} GB`;

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(() => showToast("Copied game list to clipboard!"))
                    .catch(() => fallbackCopyText(text));
            } else {
                fallbackCopyText(text);
            }
        });

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

        btnCloseModal.addEventListener("click", closeModal);
        modalOverlay.addEventListener("click", closeModal);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeModal();
        });
    }

    function fallbackCopyText(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            showToast("Copied game list to clipboard!");
        } catch (err) {
            showToast("Failed to copy list");
        }
        document.body.removeChild(textArea);
    }

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

    function updateDrawerUI() {
        const selectedGames = gamesData.filter(g => state.selectedGameIds.has(g.id));
        const totalGB = selectedGames.reduce((acc, g) => acc + getGameSizeInGB(g), 0);

        cartCountEl.textContent = selectedGames.length;
        cartTotalGbEl.textContent = totalGB.toFixed(2);
        btnCopyDrawer.disabled = selectedGames.length === 0;

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
