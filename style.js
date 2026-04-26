// =======================
// ACCOUNTS
// =======================
const accounts = [
    { username: "CSS", password: "css@012", role: "admin" },
    { username: "CSS", password: "css@012", role: "viewer" }
];

// =======================
// LOGIN SESSION & GLOBALS
// =======================
let loggedInUser = localStorage.getItem("loggedInUser");
const OVERDUE_LIMIT = 10 * 1000; // 10 Seconds

// =======================
// DATA PERSISTENCE
// =======================
let borrowList = JSON.parse(localStorage.getItem("borrowList")) || [];
let instrumentStock = JSON.parse(localStorage.getItem("instrumentStock")) || {};
let expiryData = JSON.parse(localStorage.getItem("expiryData")) || {};
let barcodeData = JSON.parse(localStorage.getItem("barcodeData")) || {}; 

// CHANGE THIS: Load from localStorage if it exists, otherwise use the default list
const defaultList = {
    "Alligator Forcep": 1, "Alus Forcep": 1, "Bobcock Forcep": 4, "Blade Holder": 2,
    "Bonecurette": 1, "Bone Ronguer": 1, "CTT Set": 5, "Cutdown": 3, "Cutting Needles": 3,
    "Enema Can": 6, "Hemostatic Curve": 1, "Hemostatic Straight": 2, "Minor Set": 6,
    "Kelly Straight": 4, "Mayo Scissors Soaked": 3, "Metz Scissors Soaked": 7,
    "Mosquito Curve": 2, "Needle Holder Gold": 1, "Needle Holder Small": 1,
    "Needle Holder Medium": 1, "Needle Holder Large": 1, "Ovum Forcep": 5,
    "Skin Retractor": 2, "Stainless Kidney Basin": 5, "Suture Remover Soaked": 4,
    "Vaginal Speculum Large": 1, "Vaginal Speculum Small": 2, "Suturing Set": 5,
    "Red Ribbon": 1, "Infectious Minor Set": 2, "Infectious CTT Set": 2,
    "Infectious Kidney Basin": 2, "Needle Holder Long/Straight": 1,
    "Needle Holder Long/Curve": 1, "Pean Straight": 1, "Pean Curve": 1,
    "Bayonet forcep Long": 2, "Bayonet forcep Small": 2, "Nasal Speculum": 2,
    "Tissue forcep w/ Teeth": 4, "Long Nose": 2
};

let initialStock = JSON.parse(localStorage.getItem("initialStock")) || defaultList;

// Initialize stock
for (let key in initialStock) {
    if (instrumentStock[key] === undefined) {
        instrumentStock[key] = initialStock[key];
    }
}

// =======================
// CORE FUNCTIONS
// =======================

function saveAll() {
    localStorage.setItem("borrowList", JSON.stringify(borrowList));
    localStorage.setItem("instrumentStock", JSON.stringify(instrumentStock));
    localStorage.setItem("initialStock", JSON.stringify(initialStock)); // Save the master list
    localStorage.setItem("expiryData", JSON.stringify(expiryData));
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
}

/**
 * Saves details and shows a green success notification
 */
function saveInstrumentDetails(key) {
    const safeKey = key.replace(/\s/g, '-');
    const barcodeInput = document.getElementById("barcode-" + safeKey);
    const expiryInput = document.getElementById("expiry-" + safeKey);

    if (barcodeInput && expiryInput) {
        barcodeData[key] = barcodeInput.value;
        expiryData[key] = expiryInput.value;
        
        saveAll();
        loadAvailable();
        
        // Trigger the success message
        showSuccessToast(`Successfully saved: ${key}`);
    }
}

/**
 * Creates the "Successful" popup box
 */
function showSuccessToast(message) {
    const toast = document.createElement("div");
    toast.className = "save-toast";
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #2ecc71; 
        color: white; padding: 15px 25px; border-radius: 8px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;
        font-weight: bold; transition: opacity 0.5s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

function handleKeyDown(event, key) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        saveInstrumentDetails(key);
    }
}

// =======================
// LOGIN / LOGOUT
// =======================
document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = accounts.find(a => a.username === document.getElementById("username").value.trim() && a.password === document.getElementById("password").value.trim());

    if (!user) {
        document.getElementById("error-msg").textContent = "Invalid login!";
        return;
    }

    localStorage.setItem("loggedInUser", user.username);
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("dashboard-page").classList.remove("hidden");
    loadAll();
});

function logout() {
    localStorage.removeItem("loggedInUser");
    location.reload(); 
}
document.getElementById("logout-btn")?.addEventListener("click", logout);

// =======================
// BORROW / RETURN
// =======================
document.getElementById("borrow-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const equipment = document.getElementById("equipment-select").value.trim();

    if (!instrumentStock.hasOwnProperty(equipment) || instrumentStock[equipment] <= 0) {
        alert("Stock unavailable!");
        return;
    }

    instrumentStock[equipment]--;
    borrowList.push({
        id: Date.now(),
        name: document.getElementById("borrower-name").value,
        type: document.getElementById("type-select").value,
        equipment: equipment,
        area: document.getElementById("area-select").value,
        issuedBy: document.getElementById("issued-by").value,
        returnTime: new Date().toLocaleString(),
        timestamp: Date.now(),
        returned: false
    });

    saveAll();
    loadAll();
    e.target.reset();
});

function returnItem(id) {
    const item = borrowList.find(i => i.id === id);
    if (!item || item.returned) return;

    const receiver = prompt("Enter the name of the person receiving the instrument:");
    if (!receiver) return;

    item.returned = true;
    item.receivedBy = receiver;
    item.returnTime = new Date().toLocaleString();

    if (instrumentStock[item.equipment] !== undefined) {
        instrumentStock[item.equipment]++;
    }

    saveAll();
    loadAll();
}

// =======================
// TABLE RENDERING
// =======================

function loadAvailable() {
    const tbody = document.querySelector("#available-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    for (let key in initialStock) {
        const safeKey = key.replace(/\s/g, '-');
        tbody.innerHTML += `
        <tr>
            <td>${key}</td>
            <td style="text-align:center;">${initialStock[key]}</td>
            <td style="text-align:center;">${instrumentStock[key]}</td>
            <td style="text-align:center;">${expiryData[key] || "-"}</td>
            <td>
                <input type="text" id="barcode-${safeKey}" class="centered-input" placeholder="Code" value="${barcodeData[key] || ""}" onkeydown="handleKeyDown(event, '${key}')">
            </td>
            <td>
                <div style="display: flex; gap: 5px; align-items: center; justify-content: center;">
                    <input type="date" id="expiry-${safeKey}" class="centered-input" value="${expiryData[key] || ""}" onkeydown="handleKeyDown(event, '${key}')">
                    <button type="button" onclick="saveInstrumentDetails('${key}')" class="enter-btn-style">Enter</button>
                </div>
            </td>
        </tr>`;
    }
}

function loadMonthly() {
    const tbody = document.querySelector("#monthly-table tbody");
    const noMonth = document.getElementById("no-month-record");
    const monthVal = document.getElementById("month-filter")?.value;
    const yearVal = document.getElementById("year-filter")?.value;

    if (!tbody) return;
    tbody.innerHTML = "";

    const filtered = borrowList.filter(item => {
        const date = new Date(item.timestamp);
        const monthMatch = monthVal === "all" || date.getMonth() === parseInt(monthVal);
        const yearMatch = yearVal === "all" || date.getFullYear() === parseInt(yearVal);
        return monthMatch && yearMatch;
    });

    if (filtered.length > 0) {
        tbody.innerHTML = filtered.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.equipment}</td>
                <td>${item.area}</td>
                <td>${item.returnTime}</td>
                <td>${item.issuedBy || "---"}</td>
                <td>${item.receivedBy || (item.returned ? "---" : "Still Borrowed")}</td>
            </tr>
        `).join('');
        if (noMonth) noMonth.classList.add("hidden");
    } else if (noMonth) {
        noMonth.classList.remove("hidden");
    }
}
function loadActive() {
    const tbody = document.querySelector("#borrow-table tbody");
    if (!tbody) return;
    tbody.innerHTML = borrowList.filter(i => !i.returned).map(item => `
        <tr>
            <td>${item.name}</td><td>${item.type}</td><td>${item.equipment}</td>
            <td>${item.area}</td><td>${item.issuedBy}</td><td>${item.returnTime}</td>
            <td>Borrowed</td><td><button onclick="returnItem(${item.id})">Return</button></td>
        </tr>`).join('');
}

function loadReturned() {
    const tbody = document.querySelector("#returned-table tbody");
    if (!tbody) return;
    tbody.innerHTML = borrowList.filter(i => i.returned).map(item => `
        <tr>
            <td>${item.name}</td><td>${item.type}</td><td>${item.equipment}</td>
            <td>${item.area}</td><td>${item.returnTime}</td><td>${item.issuedBy}</td>
            <td>${item.receivedBy}</td>
        </tr>`).join('');
}

function loadTotal() {
    const tbody = document.querySelector("#total-table tbody");
    if (!tbody) return;
    tbody.innerHTML = borrowList.map(item => `
        <tr>
            <td>${item.name}</td><td>${item.type}</td><td>${item.equipment}</td>
            <td>${item.area}</td><td>${item.returnTime}</td><td>${item.issuedBy}</td>
            <td>${item.receivedBy || (item.returned ? "-" : "Borrowed")}</td>
        </tr>`).join('');
}

function loadOverdue() {
    const tbody = document.querySelector("#overdue-table tbody");
    if (!tbody) return;
    const now = Date.now();
    tbody.innerHTML = borrowList.filter(item => !item.returned && (now - item.timestamp > OVERDUE_LIMIT)).map(item => `
        <tr>
            <td>${item.name}</td><td>${item.type}</td><td>${item.equipment}</td>
            <td>${item.area}</td><td>${item.returnTime}</td><td>${item.issuedBy}</td>
        </tr>`).join('');
}

function loadStats() {
    if(document.getElementById("stat-total")) {
        document.getElementById("stat-total").textContent = borrowList.length;
        document.getElementById("stat-active").textContent = borrowList.filter(i => !i.returned).length;
        document.getElementById("stat-returned").textContent = borrowList.filter(i => i.returned).length;
        document.getElementById("stat-overdue").textContent = borrowList.filter(item => !item.returned && (Date.now() - item.timestamp > OVERDUE_LIMIT)).length;
    }
}
// Idugang pud ni sa ubos para sa filter dropdown
document.getElementById("month-filter")?.addEventListener("change", loadMonthly);
let selectedInstrumentToDelete = "";

function openAddInstrumentModal() { document.getElementById("add-modal").classList.remove("hidden"); }
function closeAddInstrumentModal() { document.getElementById("add-modal").classList.add("hidden"); document.getElementById("new-inst-name").value = ""; }

function saveNewInstrument() {
    const name = document.getElementById("new-inst-name").value.trim();
    const stock = parseInt(document.getElementById("new-inst-stock").value);
    if (!name || isNaN(stock)) { alert("Please fill up all fields!"); return; }
    if (detailedStock[name]) { alert("Instrument already exists!"); return; }
    detailedStock[name] = [];
    for (let i = 0; i < stock; i++) { detailedStock[name].push({ barcode: "", expiry: "", status: "available" }); }
    saveAll(); loadAll(); closeAddInstrumentModal();
}

function openDeleteModal() {
    const listContainer = document.getElementById("delete-list-container");
    listContainer.innerHTML = "";
    document.getElementById("delete-action-area").classList.add("hidden");
    for (let name in detailedStock) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "delete-item-row";
        itemDiv.innerHTML = `<strong>${name}</strong> <span style="float:right; color:#999;">${detailedStock[name].length} units</span>`;
        itemDiv.onclick = function() {
            const allItems = listContainer.querySelectorAll('.delete-item-row');
            allItems.forEach(d => d.style.background = "none");
            itemDiv.style.background = "#fff5f5";
            showDeleteConfirmation(name);
        };
        listContainer.appendChild(itemDiv);
    }
    document.getElementById("delete-modal").classList.remove("hidden");
}

function showDeleteConfirmation(name) {
    selectedInstrumentToDelete = name;
    document.getElementById("target-to-delete").textContent = name;
    document.getElementById("delete-action-area").classList.remove("hidden");
}

function confirmDelete() {
    if (selectedInstrumentToDelete) {
        delete detailedStock[selectedInstrumentToDelete];
        saveAll(); loadAll(); openDeleteModal();
        alert(`Successfully removed ${selectedInstrumentToDelete}`);
    }
}
function cancelSelection() { document.getElementById("delete-action-area").classList.add("hidden"); }
function closeDeleteModal() { document.getElementById("delete-modal").classList.add("hidden"); }
// =======================
// INVENTORY MANAGEMENT (ADD/DELETE)
// =======================

function openAddInstrumentModal() { 
    document.getElementById("add-modal").classList.remove("hidden"); 
}

function closeAddInstrumentModal() { 
    document.getElementById("add-modal").classList.add("hidden"); 
    document.getElementById("new-inst-name").value = ""; 
    document.getElementById("new-inst-stock").value = "1";
}

function saveNewInstrument() {
    const name = document.getElementById("new-inst-name").value.trim();
    const stock = parseInt(document.getElementById("new-inst-stock").value);

    if (!name || isNaN(stock)) { 
        alert("Please fill up all fields!"); 
        return; 
    }

    // Add to our data objects
    if (initialStock[name]) { 
        alert("Instrument already exists!"); 
        return; 
    }

    initialStock[name] = stock;
    instrumentStock[name] = stock;

    saveAll(); 
    loadAvailable(); // Refresh the table
    closeAddInstrumentModal();
    alert(`${name} added successfully!`);
}

function openDeleteModal() {
    const listContainer = document.getElementById("delete-list-container");
    listContainer.innerHTML = "";
    document.getElementById("delete-action-area").classList.add("hidden");

    // Style the list for selection
    for (let name in initialStock) {
        const itemDiv = document.createElement("div");
        itemDiv.style.padding = "10px";
        itemDiv.style.borderBottom = "1px solid #eee";
        itemDiv.style.cursor = "pointer";
        itemDiv.className = "delete-item-row";
        itemDiv.innerHTML = `<strong>${name}</strong> <span style="float:right; color:#999;">${initialStock[name]} units</span>`;
        
        itemDiv.onclick = function() {
            // Reset others
            document.querySelectorAll('.delete-item-row').forEach(d => d.style.background = "none");
            // Highlight selected
            itemDiv.style.background = "#fff5f5";
            showDeleteConfirmation(name);
        };
        listContainer.appendChild(itemDiv);
    }
    document.getElementById("delete-modal").classList.remove("hidden");
}

function showDeleteConfirmation(name) {
    selectedInstrumentToDelete = name;
    document.getElementById("target-to-delete").textContent = name;
    document.getElementById("delete-action-area").classList.remove("hidden");
}

function confirmDelete() {
    if (selectedInstrumentToDelete) {
        delete initialStock[selectedInstrumentToDelete];
        delete instrumentStock[selectedInstrumentToDelete];
        delete expiryData[selectedInstrumentToDelete];
        delete barcodeData[selectedInstrumentToDelete];

        saveAll(); 
        loadAvailable(); // Refresh the table
        openDeleteModal(); // Refresh the delete list
        alert(`Successfully removed ${selectedInstrumentToDelete}`);
    }
}

// Updated loadAvailable to loop through the current initialStock instead of a hardcoded list
function loadAvailable() {
    const tbody = document.querySelector("#available-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Sort keys alphabetically so the list is easy to read
    const sortedKeys = Object.keys(initialStock).sort();

    for (let key of sortedKeys) {
        const safeKey = key.replace(/\s/g, '-');
        tbody.innerHTML += `
        <tr>
            <td>${key}</td>
            <td style="text-align:center;">${initialStock[key]}</td>
            <td style="text-align:center;">${instrumentStock[key]}</td>
            <td style="text-align:center;">${expiryData[key] || "-"}</td>
            <td>
                <input type="text" id="barcode-${safeKey}" class="centered-input" placeholder="Code" value="${barcodeData[key] || ""}" onkeydown="handleKeyDown(event, '${key}')">
            </td>
            <td>
                <div style="display: flex; gap: 5px; align-items: center; justify-content: center;">
                    <input type="date" id="expiry-${safeKey}" class="centered-input" value="${expiryData[key] || ""}" onkeydown="handleKeyDown(event, '${key}')">
                    <button type="button" onclick="saveInstrumentDetails('${key}')" class="enter-btn-style">Enter</button>
                </div>
            </td>
        </tr>`;
    }
}
/**
 * Updates the 'Equipment' dropdown in the Borrowing Form 
 * so new instruments appear immediately.
 */
function updateBorrowDropdown() {
    const select = document.getElementById("equipment-select");
    if (!select) return;

    // 1. Clear existing options (keep the placeholder)
    select.innerHTML = '<option value="" disabled selected>Select Instrument</option>';
    
    // 2. Get all instrument names and sort them alphabetically
    const instruments = Object.keys(initialStock).sort();

    // 3. Add them back to the dropdown
    instruments.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (${instrumentStock[name]} available)`;
        select.appendChild(option);
    });
}

// ==========================================
// UPDATE YOUR ADD FUNCTION
// ==========================================
function saveNewInstrument() {
    const name = document.getElementById("new-inst-name").value.trim();
    const stock = parseInt(document.getElementById("new-inst-stock").value);

    if (!name || isNaN(stock)) { 
        alert("Please fill up all fields!"); 
        return; 
    }

    if (initialStock[name]) { 
        alert("Instrument already exists!"); 
        return; 
    }

    // Add to data
    initialStock[name] = stock;
    instrumentStock[name] = stock;

    saveAll(); 
    loadAvailable();      // Refresh the table
    updateBorrowDropdown(); // REFRESH THE DROPDOWN LIST <--- Key Step
    closeAddInstrumentModal();
    alert(`${name} added successfully!`);
}

// ==========================================
// UPDATE YOUR DELETE FUNCTION
// ==========================================
function confirmDelete() {
    if (selectedInstrumentToDelete) {
        delete initialStock[selectedInstrumentToDelete];
        delete instrumentStock[selectedInstrumentToDelete];
        
        saveAll(); 
        loadAvailable();
        updateBorrowDropdown(); // REFRESH THE DROPDOWN LIST <--- Key Step
        openDeleteModal();
        alert(`Successfully removed ${selectedInstrumentToDelete}`);
    }
}
/**
 * Filters the Inventory Table based on search input
 */
function filterInventory() {
    const input = document.getElementById("inventory-search");
    const filter = input.value.toLowerCase();
    const table = document.getElementById("available-table");
    const tr = table.getElementsByTagName("tr");

    // Loop through all table rows (starting from index 1 to skip the header)
    for (let i = 1; i < tr.length; i++) {
        const td = tr[i].getElementsByTagName("td")[0]; // The "Instrument Name" column
        if (td) {
            const txtValue = td.textContent || td.innerText;
            if (txtValue.toLowerCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}
// =======================
// NAVIGATION & INITIALIZATION
// =======================

function showView(view) {
    document.querySelectorAll(".main-content > div").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + view)?.classList.remove("hidden");
    document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));
    const navId = (view === "dashboard") ? "nav-dash" : "nav-" + view;
    document.getElementById(navId)?.classList.add("active");
}

/**
 * Re-loads all tables and UI components
 */
function loadAll() {
    loadActive(); 
    loadReturned(); 
    loadAvailable();
    loadStats(); 
    loadOverdue();
    updateBorrowDropdown(); // This ensures the borrowing list is always current
}

// Sidebar Navigation Events
document.getElementById("nav-dash").onclick = () => { showView("dashboard"); loadStats(); loadActive(); };
document.getElementById("nav-total").onclick = () => { showView("total"); loadTotal(); };
document.getElementById("nav-returned").onclick = () => { showView("returned"); loadReturned(); };
document.getElementById("nav-overdue").onclick = () => { showView("overdue"); loadOverdue(); };
document.getElementById("nav-monthly").onclick = () => { showView("monthly"); loadMonthly(); };
document.getElementById("nav-available").onclick = () => { showView("available"); loadAvailable(); };

// Filters
document.getElementById("month-filter")?.addEventListener("change", loadMonthly);
document.getElementById("year-filter")?.addEventListener("change", loadMonthly);

// Page Load initialization
window.addEventListener("load", () => {
    if (localStorage.getItem("loggedInUser")) {
        document.getElementById("login-page").classList.add("hidden");
        document.getElementById("dashboard-page").classList.remove("hidden");
        loadAll(); // Triggers the dropdown update on startup
    }
});