"use strict";

// =====================================================
// APPLICATION STATE & ARRAYS
// =====================================================
let enteredPostcode = localStorage.getItem("savedPostcode") || "";
const NATIONAL_POSTCODE_VALUE = "BB7 3BL";
let makesAndModels = {};
const selectedMakes = new Set();
const excludedMakes = new Set();
const selectedModels = new Set();
const excludedModels = new Set();
const customKeywords = new Set();
const openModelGroups = new Set();

const formatCurrency = new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'GBP', 
    maximumFractionDigits: 0 
});

const totalPrices = [
    500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 
    6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 
    12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 
    22500, 25000, 27500, 30000, 35000, 40000, 45000, 50000, 55000, 
    60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 
    250000, 500000, 1000000, 2000000
];

const monthlyPrices = [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 
    600, 700, 750, 800, 900, 1000, 1250, 1500, 2000
];


// =====================================================
// DOM ELEMENTS
// =====================================================
const form = document.getElementById("paramForm");
const statusMessage = document.getElementById("statusMessage");

const locationOptions = form.querySelectorAll('input[name="locationType"]');
const postcodeSection = document.getElementById("postcodeSection");
const postcodeInput = document.getElementById("postcode");
const radiusSection = document.getElementById("radiusSection");
const radiusInput = document.getElementById("radius");
const radiusOutput = document.getElementById("radiusOutput");
let selectedRadius = radiusInput.value;

const priceOptions = form.querySelectorAll('input[name="price_search_type"]');
const payTotalFields = document.getElementById("payTotalFields");
const payMonthlyFields = document.getElementById("payMonthlyFields");
const paymentTypeMonthly = document.getElementById("paymentTypeMonthly");

const anyMileageCheckbox = document.getElementById("anyMileage");
const mileageSliders = document.getElementById("mileage-sliders"); 
const minDisplay = document.getElementById("minDisplay");
const maxDisplay = document.getElementById("maxDisplay");

const anyMakeCheckbox = document.getElementById("anyMake");
const anyModelCheckbox = document.getElementById("anyModel");
const makeSelector = document.getElementById("makeSelector");
const modelSelector = document.getElementById("modelSelector");
const makeSearch = document.getElementById("makeSearch");
const modelSearch = document.getElementById("modelSearch");
const makeOptions = document.getElementById("makeOptions");
const modelOptions = document.getElementById("modelOptions");
const modelSection = document.getElementById("modelSection");
const makeCount = document.getElementById("makeCount");
const modelCount = document.getElementById("modelCount");
const clearMakesButton = document.getElementById("clearMakes");
const clearModelsButton = document.getElementById("clearModels");
const selectedMakesDisplay = document.getElementById("selectedMakesDisplay");
const selectedModelsDisplay = document.getElementById("selectedModelsDisplay");
const vehicleDataError = document.getElementById("vehicleDataError");

const anyEngineSizeCheckbox = document.getElementById("anyEngineSize");
const engineSizeSliders = document.getElementById("engine-size-sliders");

const anyEnginePowerCheckbox = document.getElementById("anyEnginePower");
const enginePowerSliders = document.getElementById("engine-power-sliders");

const co2Radios = form.querySelectorAll('input[name="co2_selection"]');
const co2SliderContainer = document.getElementById("co2-slider-container");
const co2Slider = document.getElementById("co2Slider");
const co2Display = document.getElementById("co2Display");
const co2FinalValue = document.getElementById("co2FinalValue");

const taxRadios = form.querySelectorAll('input[name="tax_selection"]');
const taxSliderContainer = document.getElementById("tax-slider-container");
const taxSlider = document.getElementById("taxSlider");
const taxDisplay = document.getElementById("taxDisplay");
const taxFinalValue = document.getElementById("taxFinalValue");

const anyInsuranceCheckbox = document.getElementById("anyInsurance");
const insuranceSliderContainer = document.getElementById("insurance-slider-container");
const insuranceSlider = document.getElementById("insuranceSlider");
const insuranceDisplay = document.getElementById("insuranceDisplay");
const insuranceFinalValue = document.getElementById("insuranceFinalValue");

const keywordInput = document.getElementById("keywordInput");
const btnAddKeyword = document.getElementById("btnAddKeyword");
const customKeywordsDisplay = document.getElementById("customKeywordsDisplay");


// =====================================================
// INIT & DATA LOADING
// =====================================================
async function loadMakesAndModels() {
    const jsonUrl = new URL("makes_and_models.json", document.baseURI);
    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`Request failed with HTTP status ${response.status}`);
        const data = await response.json();
        
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("The JSON root must be an object.");
        }
        
        const makes = Object.keys(data);
        if (makes.length === 0) throw new Error("The make and model file is empty.");
        
        const invalidMakes = makes.filter(make => !Array.isArray(data[make]));
        if (invalidMakes.length > 0) throw new Error("One or more makes do not contain model arrays.");

        makesAndModels = data;
        renderMakes();
        renderModels();
        updateMakeModelInterface();
        vehicleDataError.hidden = true;
    } catch (error) {
        console.error("Unable to load make/model data:", error);
        makeOptions.replaceChildren();
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No make data is available.";
        makeOptions.appendChild(message);
        vehicleDataError.textContent = `The make and model data could not be loaded. ${error.message}`;
        vehicleDataError.hidden = false;
    }
}

function populateDropdowns() {
    const minPriceSelect = document.getElementById("minPrice");
    const maxPriceSelect = document.getElementById("maxPrice");
    const minMonthlySelect = document.getElementById("minPriceRange");
    const maxMonthlySelect = document.getElementById("maxPriceRange");
    const minYearSelect = document.getElementById("minYear");
    const maxYearSelect = document.getElementById("maxYear");

    // Full Prices
    totalPrices.forEach(price => {
        const formattedPrice = formatCurrency.format(price);
        minPriceSelect.appendChild(new Option(formattedPrice, price));
        maxPriceSelect.appendChild(new Option(formattedPrice, price));
    });

    // Monthly Prices
    monthlyPrices.forEach(price => {
        const formattedPrice = formatCurrency.format(price);
        minMonthlySelect.appendChild(new Option(formattedPrice, price));
        maxMonthlySelect.appendChild(new Option(formattedPrice, price));
    });

    // Years
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; ) {
        minYearSelect.appendChild(new Option(year, year));
        maxYearSelect.appendChild(new Option(year, year));
        
        if (year > 2000) year -= 1;
        else if (year > 1970) year -= 5;
        else year -= 10;
    }
}


// =====================================================
// COMPONENT LOGIC & HELPERS
// =====================================================
function toggleSections(shouldHide, sections) {
    sections.forEach(section => {
        if (!section) return;
        section.hidden = shouldHide;
        const inputs = section.querySelectorAll("input, select, textarea");
        inputs.forEach(input => {
            if (shouldHide) {
                if (input.name) {
                    input.dataset.savedName = input.name;
                    input.removeAttribute("name");
                }
            } else if (input.dataset.savedName) {
                input.name = input.dataset.savedName;
                delete input.dataset.savedName;
            }
        });
    });
}

function sortNaturally(values) {
    return Array.from(values).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

function linkDropdowns(minSelectId, maxSelectId) {
    const minSelect = document.getElementById(minSelectId);
    const maxSelect = document.getElementById(maxSelectId);
    if (!minSelect || !maxSelect) return;

    function parseValue(val, isMax) {
        if (val === "") return isMax ? Infinity : 0;
        if (val === "new") return 9999;
        return parseInt(val, 10);
    }

    function syncDropdowns() {
        const minVal = parseValue(minSelect.value, false);
        const maxVal = parseValue(maxSelect.value, true);

        Array.from(maxSelect.options).forEach(option => {
            if (option.value === "") option.disabled = false;
            else option.disabled = parseValue(option.value, true) < minVal;
        });

        Array.from(minSelect.options).forEach(option => {
            if (option.value === "") option.disabled = false;
            else option.disabled = parseValue(option.value, false) > maxVal;
        });
    }

    minSelect.addEventListener("change", () => {
        if (parseValue(minSelect.value, false) > parseValue(maxSelect.value, true)) maxSelect.value = "";
        syncDropdowns();
    });

    maxSelect.addEventListener("change", () => {
        if (parseValue(maxSelect.value, true) < parseValue(minSelect.value, false)) minSelect.value = "";
        syncDropdowns();
    });

    syncDropdowns();
}

function setupDualSliders(minId, maxId, minOutputId, maxOutputId) {
    const minInput = document.getElementById(minId);
    const maxInput = document.getElementById(maxId);
    const minOutput = document.getElementById(minOutputId);
    const maxOutput = document.getElementById(maxOutputId);

    if (!minInput || !maxInput || !minOutput || !maxOutput) return;

    minInput.addEventListener("input", () => {
        if (parseFloat(minInput.value) > parseFloat(maxInput.value)) minInput.value = maxInput.value;
        minOutput.textContent = minInput.value;
    });

    maxInput.addEventListener("input", () => {
        if (parseFloat(maxInput.value) < parseFloat(minInput.value)) maxInput.value = minInput.value;
        maxOutput.textContent = maxInput.value;
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function createModelKey(make, model) { return `${make}\u0000${model}`; }
function splitModelKey(modelKey) {
    const sep = modelKey.indexOf("\u0000");
    return { make: modelKey.slice(0, sep), model: modelKey.slice(sep + 1) };
}

function createCheckbox({ name, value, labelText, checked = false, make = null }) {
    const label = document.createElement("label");
    label.className = "checkbox-option";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = name;
    checkbox.value = value;
    checkbox.checked = checked;
    if (make !== null) checkbox.dataset.make = make;

    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(checkbox, text);
    
    return label;
}

function createSelectedChip({ text, removeLabel, onRemove }) {
    const chip = document.createElement("span");
    chip.className = "selected-chip";
    const chipText = document.createElement("span");
    chipText.className = "selected-chip-text";
    chipText.textContent = text;
    
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", removeLabel);
    removeButton.addEventListener("click", onRemove);
    
    chip.append(chipText, removeButton);
    return chip;
}

function removeModelsForMake(make) {
    const prefix = `${make}\u0000`;
    for (const modelKey of selectedModels) {
        if (modelKey.startsWith(prefix)) selectedModels.delete(modelKey);
    }
    openModelGroups.delete(make);
}

function countSelectedModelsForMake(make) {
    let count = 0;
    for (const modelKey of selectedModels) {
        if (splitModelKey(modelKey).make === make) count++;
    }
    return count;
}

function renderMakes(filterText = makeSearch.value) {
    const normalizedFilter = filterText.trim().toLowerCase();
    makeOptions.replaceChildren();

    const makes = sortNaturally(Object.keys(makesAndModels));
    const visibleMakes = makes.filter(make => make.toLowerCase().includes(normalizedFilter));

    if (visibleMakes.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No matching makes found.";
        makeOptions.appendChild(message);
        return;
    }

    const fragment = document.createDocumentFragment();
    visibleMakes.forEach(make => {
        fragment.appendChild(createCheckbox({
            name: "make",
            value: make,
            labelText: make,
            checked: selectedMakes.has(make) || excludedMakes.has(make)
        }));
    });
    makeOptions.appendChild(fragment);
}

function renderModels(filterText = modelSearch.value) {
    modelOptions.replaceChildren();
    if (anyMakeCheckbox.checked || selectedMakes.size === 0) return;

    const normalizedFilter = filterText.trim().toLowerCase();
    const fragment = document.createDocumentFragment();
    let displayedModelCount = 0;

    sortNaturally(selectedMakes).forEach(make => {
        const models = Array.isArray(makesAndModels[make]) ? sortNaturally(makesAndModels[make]) : [];
        const visibleModels = models.filter(model => model.toLowerCase().includes(normalizedFilter));
        if (visibleModels.length === 0) return;

        const details = document.createElement("details");
        details.className = "model-group";
        details.dataset.make = make;
        details.open = normalizedFilter.length > 0 || openModelGroups.has(make);
        
        details.addEventListener("toggle", () => {
            if (details.open) openModelGroups.add(make);
            else openModelGroups.delete(make);
        });

        const summary = document.createElement("summary");
        const makeName = document.createElement("span");
        makeName.textContent = make;

        const count = document.createElement("span");
        count.className = "model-group-count";
        const selectedForMake = countSelectedModelsForMake(make);
        count.textContent = selectedForMake > 0 ? `${selectedForMake} selected` : `${visibleModels.length} models`;

        summary.append(makeName, count);
        details.appendChild(summary);

        visibleModels.forEach(model => {
            const modelKey = createModelKey(make, model);
            details.appendChild(createCheckbox({
                name: "model",
                value: model,
                labelText: model,
                checked: selectedModels.has(modelKey),
                make
            }));
            displayedModelCount++;
        });
        fragment.appendChild(details);
    });

    if (displayedModelCount === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No matching models found for the selected makes.";
        modelOptions.appendChild(message);
    } else {
        modelOptions.appendChild(fragment);
    }
}

function renderSelectedMakes() {
    selectedMakesDisplay.replaceChildren();
    if (selectedMakes.size === 0 && excludedMakes.size === 0) {
        selectedMakesDisplay.hidden = true;
        return;
    }

    const fragment = document.createDocumentFragment();
    sortNaturally(selectedMakes).forEach(make => {
        fragment.appendChild(createSelectedChip({
            text: make,
            removeLabel: `Remove ${make}`,
            onRemove: () => {
                selectedMakes.delete(make);
                removeModelsForMake(make);
                renderMakes();
                renderModels();
                updateMakeModelInterface();
            }
        }));
    });

    sortNaturally(excludedMakes).forEach(make => {
        const chip = createSelectedChip({
            text: `- ${make}`,
            removeLabel: `Remove exclusion for ${make}`,
            onRemove: () => {
                excludedMakes.delete(make);
                removeModelsForMake(make);
                renderMakes();
                renderModels();
                updateMakeModelInterface();
            }
        });
        chip.classList.add("exclude-chip");
        fragment.appendChild(chip);
    });

    selectedMakesDisplay.appendChild(fragment);
    selectedMakesDisplay.hidden = false;
}

function renderSelectedModels() {
    selectedModelsDisplay.replaceChildren();
    if (selectedModels.size === 0 && excludedModels.size === 0) {
        selectedModelsDisplay.hidden = true;
        return;
    }

    const fragment = document.createDocumentFragment();
    Array.from(selectedModels).forEach(modelKey => {
        const { make, model } = splitModelKey(modelKey);
        fragment.appendChild(createSelectedChip({
            text: `${make}: ${model}`,
            removeLabel: `Remove ${model}`,
            onRemove: () => {
                selectedModels.delete(modelKey);
                renderModels();
                updateMakeModelInterface();
            }
        }));
    });

    Array.from(excludedModels).forEach(modelKey => {
        const { make, model } = splitModelKey(modelKey);
        const chip = createSelectedChip({
            text: `- ${make}: ${model}`,
            removeLabel: `Remove exclusion for ${model}`,
            onRemove: () => {
                excludedModels.delete(modelKey);
                renderModels();
                updateMakeModelInterface();
            }
        });
        chip.classList.add("exclude-chip");
        fragment.appendChild(chip);
    });

    selectedModelsDisplay.appendChild(fragment);
    selectedModelsDisplay.hidden = false;
}

function updateMakeModelInterface() {
    const anyMake = anyMakeCheckbox.checked;
    const hasSelectedMakes = selectedMakes.size > 0;
    const anyModel = anyModelCheckbox.checked;

    makeSelector.hidden = anyMake;
    modelSection.hidden = anyMake || !hasSelectedMakes;
    modelSelector.hidden = anyModel || anyMake || !hasSelectedMakes;
    anyModelCheckbox.disabled = anyMake || !hasSelectedMakes;
    
    makeCount.textContent = selectedMakes.size === 0 ? "No makes selected" : `${selectedMakes.size} ${selectedMakes.size === 1 ? "make" : "makes"} selected`;
    modelCount.textContent = selectedModels.size === 0 ? "No models selected" : `${selectedModels.size} ${selectedModels.size === 1 ? "model" : "models"} selected`;

    clearMakesButton.hidden = (selectedMakes.size === 0 && excludedMakes.size === 0);
    clearModelsButton.hidden = (selectedModels.size === 0 && excludedModels.size === 0);

    renderSelectedMakes();
    renderSelectedModels();
}

function renderCustomKeywords() {
    customKeywordsDisplay.replaceChildren();
    if (customKeywords.size === 0) {
        customKeywordsDisplay.hidden = true;
        return;
    }

    const fragment = document.createDocumentFragment();
    customKeywords.forEach(keyword => {
        fragment.appendChild(createSelectedChip({
            text: keyword,
            removeLabel: `Remove keyword ${keyword}`,
            onRemove: () => {
                customKeywords.delete(keyword);
                renderCustomKeywords();
            }
        }));
    });

    customKeywordsDisplay.appendChild(fragment);
    customKeywordsDisplay.hidden = false;
}

// UPDATE FIELDS LOGIC
function updateLocationFields() {
    const selectedOption = form.querySelector('input[name="locationType"]:checked');
    if (!selectedOption) return;

    if (selectedOption.value === "national") {
        if (postcodeInput.value && postcodeInput.value !== NATIONAL_POSTCODE_VALUE) {
            enteredPostcode = postcodeInput.value;
        }
        selectedRadius = radiusInput.value;
        postcodeSection.hidden = true;
        radiusSection.hidden = true;
        postcodeInput.required = false;
        postcodeInput.value = NATIONAL_POSTCODE_VALUE;
        radiusInput.removeAttribute("name");
    } else {
        postcodeSection.hidden = false;
        radiusSection.hidden = false;
        postcodeInput.value = enteredPostcode;
        postcodeInput.required = true;
        radiusInput.value = selectedRadius;
        radiusOutput.value = radiusInput.value;
        radiusInput.name = "radius";
        postcodeInput.focus();
    }
}

function updatePriceFields() {
    payTotalFields.hidden = paymentTypeMonthly.checked;
    payMonthlyFields.hidden = !paymentTypeMonthly.checked;
}

function updateMileageFields() {
    toggleSections(anyMileageCheckbox.checked, [mileageSliders]);
}

function updateCo2Fields() {
    const selected = form.querySelector('input[name="co2_selection"]:checked').value;
    if (selected === "any") {
        co2SliderContainer.hidden = true;
        co2FinalValue.value = "";
    } else if (selected === "upto") {
        co2SliderContainer.hidden = false;
        co2FinalValue.value = "TO_" + co2Slider.value;
    } else if (selected === "over255") {
        co2SliderContainer.hidden = true;
        co2FinalValue.value = "OVER_255"; 
    }
}

function updateTaxFields() {
    const selected = form.querySelector('input[name="tax_selection"]:checked').value;
    if (selected === "any") {
        taxSliderContainer.hidden = true;
        taxFinalValue.value = "";
    } else if (selected === "upto") {
        taxSliderContainer.hidden = false;
        taxFinalValue.value = "TO_" + taxSlider.value;
    } else if (selected === "over500") {
        taxSliderContainer.hidden = true;
        taxFinalValue.value = "OVER_500";
    }
}

function updateInsuranceFields() {
    if (anyInsuranceCheckbox.checked) {
        insuranceSliderContainer.hidden = true;
        insuranceFinalValue.value = "";
    } else {
        insuranceSliderContainer.hidden = false;
        const rawValue = insuranceSlider.value;
        const paddedValue = rawValue.padStart(2, "0");
        insuranceDisplay.textContent = rawValue;
        insuranceFinalValue.value = paddedValue + "U";
    }
}


// =====================================================
// URL BUILDER LOGIC
// =====================================================
function buildUrl() {
    const BASE_URL = "https://www.autotrader.co.uk/car-search?channel=cars";
    const url = new URL(BASE_URL);
    const formData = new FormData(form);
    const isMonthlyChecked = paymentTypeMonthly.checked;

    for (const [name, value] of formData.entries()) {
        if (
            name === "make" || name === "model" || name === "locationType" ||
            name === "co2_selection" || name === "tax_selection" || 
            name === "makeMode" || name === "modelMode"
        ) {
            continue;
        }

        if (isMonthlyChecked && (name === "price-from" || name === "price-to")) continue;
        if (!isMonthlyChecked && (
            name === "min-monthly-price" || name === "max-monthly-price" ||
            name === "deposit" || name === "term" || name === "yearly-mileage"
        )) continue;

        if (typeof value !== "string") continue;
        const trimmedValue = value.trim();
        if (trimmedValue === "") continue;

        url.searchParams.append(name, trimmedValue);
    }

    // Appending persistent manual sets
    for (const make of sortNaturally(excludedMakes)) url.searchParams.append("keywords", `-${make}`);
    for (const modelKey of excludedModels) {
        const { model } = splitModelKey(modelKey);
        url.searchParams.append("keywords", `-${model}`);
    }
    for (const kw of customKeywords) url.searchParams.append("keywords", kw);

    if (!anyMakeCheckbox.checked) {
        for (const make of sortNaturally(selectedMakes)) url.searchParams.append("make", make);
    }

    if (!anyMakeCheckbox.checked && !anyModelCheckbox.checked) {
        const sortedModelKeys = Array.from(selectedModels).sort((a, b) => {
            const first = splitModelKey(a);
            const second = splitModelKey(b);
            return `${first.make} ${first.model}`.localeCompare(`${second.make} ${second.model}`, undefined, { numeric: true, sensitivity: "base" });
        });
        for (const modelKey of sortedModelKeys) {
            const { model } = splitModelKey(modelKey);
            url.searchParams.append("model", model);
        }
    }

    return url.toString();
}


// =====================================================
// EVENT LISTENERS
// =====================================================
const collapsibleHeaders = document.querySelectorAll(".collapsible-header");

collapsibleHeaders.forEach(function (header) {
    // Apply accessibility attributes to all headers
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", header.classList.contains("active") ? "true" : "false");

    function toggleContent() {
        const content = header.nextElementSibling;
        if (!content) return; // Safety check
        
        const isExpanded = header.classList.toggle("active");
        content.style.display = isExpanded ? "block" : "none";
        header.setAttribute("aria-expanded", String(isExpanded));
    }

    // Attach the click event to ALL headers
    header.addEventListener("click", toggleContent);

    // Allow keyboard toggling
    header.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleContent();
        }
    });
});

priceOptions.forEach(option => option.addEventListener("change", updatePriceFields));
locationOptions.forEach(option => option.addEventListener("change", updateLocationFields));

postcodeInput.addEventListener("input", () => {
    enteredPostcode = postcodeInput.value;
    localStorage.setItem("savedPostcode", enteredPostcode);
});

radiusInput.addEventListener("input", () => {
    selectedRadius = radiusInput.value;
    radiusOutput.value = radiusInput.value;
    localStorage.setItem("savedRadius", selectedRadius);
});

anyEngineSizeCheckbox.addEventListener("change", () => toggleSections(anyEngineSizeCheckbox.checked, [engineSizeSliders]));
anyEnginePowerCheckbox.addEventListener("change", () => toggleSections(anyEnginePowerCheckbox.checked, [enginePowerSliders]));
anyMileageCheckbox.addEventListener("change", updateMileageFields);

co2Radios.forEach(radio => radio.addEventListener("change", updateCo2Fields));
co2Slider.addEventListener("input", (e) => {
    co2Display.textContent = e.target.value;
    co2FinalValue.value = "TO_" + e.target.value;
});

taxRadios.forEach(radio => radio.addEventListener("change", updateTaxFields));
taxSlider.addEventListener("input", (e) => {
    taxDisplay.textContent = e.target.value;
    taxFinalValue.value = "TO_" + e.target.value;
});

anyInsuranceCheckbox.addEventListener("change", updateInsuranceFields);
insuranceSlider.addEventListener("input", (e) => {
    const rawValue = e.target.value;
    const paddedValue = rawValue.padStart(2, "0");
    insuranceDisplay.textContent = rawValue;
    insuranceFinalValue.value = paddedValue + "U";
});

makeOptions.addEventListener("change", event => {
    const checkbox = event.target.closest('input[name="make"]');
    if (!checkbox) return;
    const make = checkbox.value;
    const isExcludeMode = form.querySelector('input[name="makeMode"]:checked').value === "exclude";
    
    if (checkbox.checked) {
        if (isExcludeMode) { excludedMakes.add(make); selectedMakes.delete(make); }
        else { selectedMakes.add(make); excludedMakes.delete(make); }
    } else {
        selectedMakes.delete(make); excludedMakes.delete(make);
        removeModelsForMake(make);
    }

    if (selectedMakes.size === 0 && excludedMakes.size === 0) {
        anyMakeCheckbox.checked = true;
        anyModelCheckbox.checked = true;
        selectedModels.clear();
        excludedModels.clear(); 
        openModelGroups.clear();
        makeSearch.value = "";
        modelSearch.value = "";
    }
    renderMakes(); renderModels(); updateMakeModelInterface();
});
makeSearch.addEventListener("input", debounce(() => {
    renderMakes(makeSearch.value);
}, 300));

anyMakeCheckbox.addEventListener("change", () => {
    if (anyMakeCheckbox.checked) {
        selectedMakes.clear(); 
        excludedMakes.clear(); 
        selectedModels.clear(); 
        excludedModels.clear(); 
        openModelGroups.clear();
        anyModelCheckbox.checked = true;
        makeSearch.value = ""; modelSearch.value = "";
    }
    renderMakes(); renderModels(); updateMakeModelInterface();
    if (!anyMakeCheckbox.checked) makeSearch.focus();
});

clearMakesButton.addEventListener("click", () => {
    selectedMakes.clear(); 
    excludedMakes.clear(); 
    selectedModels.clear(); 
    excludedModels.clear(); 
    openModelGroups.clear();
    anyMakeCheckbox.checked = true; anyModelCheckbox.checked = true;
    makeSearch.value = ""; modelSearch.value = "";
    renderMakes(); renderModels(); updateMakeModelInterface();
});

modelOptions.addEventListener("change", event => {
    const checkbox = event.target.closest('input[name="model"]');
    if (!checkbox) return;
    const modelKey = createModelKey(checkbox.dataset.make, checkbox.value);
    const isExcludeMode = form.querySelector('input[name="modelMode"]:checked').value === "exclude";

    if (checkbox.checked) {
        if (isExcludeMode) { excludedModels.add(modelKey); selectedModels.delete(modelKey); }
        else { selectedModels.add(modelKey); excludedModels.delete(modelKey); }
    } else {
        selectedModels.delete(modelKey); excludedModels.delete(modelKey);
    }
    
    if (selectedModels.size === 0 && excludedModels.size === 0) {
        anyModelCheckbox.checked = true;
        modelSearch.value = "";
    }
    renderModels(); updateMakeModelInterface();
});
modelSearch.addEventListener("input", debounce(() => {
    renderModels(modelSearch.value);
}, 300));

anyModelCheckbox.addEventListener("change", () => {
    if (anyModelCheckbox.checked) { 
        selectedModels.clear(); 
        excludedModels.clear(); 
        modelSearch.value = ""; 
    }
    renderModels(); updateMakeModelInterface();
    if (!anyModelCheckbox.checked) modelSearch.focus();
});

clearModelsButton.addEventListener("click", () => {
    selectedModels.clear(); 
    excludedModels.clear(); 
    anyModelCheckbox.checked = true; modelSearch.value = "";
    renderModels(); updateMakeModelInterface();
});

btnAddKeyword.addEventListener("click", () => {
    if (keywordInput.value.trim() !== "") {
        customKeywords.add(keywordInput.value.trim());
        keywordInput.value = "";
        renderCustomKeywords();
    }
});
keywordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); 
        btnAddKeyword.click();
    }
});

document.getElementById("btnLaunch").addEventListener("click", () => {
    if (!form.reportValidity()) return;
    statusMessage.textContent = "";
    window.open(buildUrl(), "_blank", "noopener");
});

document.getElementById("btnCopy").addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const finalUrl = buildUrl();
    const urlInput = document.getElementById("url");
    urlInput.value = finalUrl;
    try {
        await navigator.clipboard.writeText(finalUrl);
        statusMessage.textContent = "URL copied to clipboard.";
    } catch (error) {
        console.error("Unable to copy URL:", error);
        statusMessage.textContent = "The URL could not be copied.";
    }
});

form.addEventListener("submit", event => event.preventDefault());

form.addEventListener("reset", () => {
    setTimeout(() => {
        enteredPostcode = ""; 
        selectedRadius = "15";
        localStorage.removeItem("savedPostcode");
        localStorage.setItem("savedRadius", "15");
        selectedMakes.clear(); selectedModels.clear(); openModelGroups.clear();
        anyMakeCheckbox.checked = true; anyModelCheckbox.checked = true;
        makeSearch.value = ""; modelSearch.value = "";
        statusMessage.textContent = "";

        minDisplay.textContent = "0"; maxDisplay.textContent = "10000";
        document.getElementById("minEngineDisplay").textContent = "0.0";
        document.getElementById("maxEngineDisplay").textContent = "8.0";
        document.getElementById("minPowerDisplay").textContent = "0";
        document.getElementById("maxPowerDisplay").textContent = "1000";

        toggleSections(true, [engineSizeSliders, enginePowerSliders]);
        radiusInput.value = "15"; radiusOutput.value = "15";

        renderMakes(); renderModels(); updateMakeModelInterface();
        updateMileageFields(); updateLocationFields(); updatePriceFields();

        co2Display.textContent = "150"; updateCo2Fields();
        taxDisplay.textContent = "50"; updateTaxFields();
        insuranceDisplay.textContent = "1"; updateInsuranceFields();

        excludedMakes.clear(); excludedModels.clear(); customKeywords.clear();
        renderCustomKeywords();
    }, 0);
});

// =====================================================
// THEME SWITCHER
// =====================================================
const themeSelector = document.getElementById('themeSelector');

const currentTheme = localStorage.getItem('appTheme') || 'theme-blue';
document.body.className = `w3-light-grey ${currentTheme}`;
if(themeSelector) {
    themeSelector.value = currentTheme;

    themeSelector.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        
        document.body.className = `w3-light-grey ${selectedTheme}`;
        
        localStorage.setItem('appTheme', selectedTheme);
    });
}

// =====================================================
// INITIAL FIRE
// =====================================================
const savedRadius = localStorage.getItem("savedRadius") || "15";
radiusInput.value = savedRadius;
radiusOutput.value = savedRadius;
selectedRadius = savedRadius;

populateDropdowns();
linkDropdowns("minPrice", "maxPrice");             
linkDropdowns("minPriceRange", "maxPriceRange");   
linkDropdowns("minYear", "maxYear");               
setupDualSliders("minMileage", "maxMileage", "minDisplay", "maxDisplay");
setupDualSliders("minEngineSize", "maxEngineSize", "minEngineDisplay", "maxEngineDisplay");
setupDualSliders("minEnginePower", "maxEnginePower", "minPowerDisplay", "maxPowerDisplay");
toggleSections(anyEngineSizeCheckbox.checked, [engineSizeSliders]);
toggleSections(anyEnginePowerCheckbox.checked, [enginePowerSliders]);
updateMileageFields();
updateLocationFields();
updateMakeModelInterface();
loadMakesAndModels();
updatePriceFields();
updateCo2Fields();
updateTaxFields();
updateInsuranceFields();
