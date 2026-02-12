// ========== CONVERTISSEUR D'UNITÉS ==========

let currentConversionType = '';

const conversions = {
    pression: {
        units: ['bar', 'psi', 'Pa', 'kPa', 'MPa'],
        quickValues: [1, 2, 5, 10, 15, 20, 50, 100],
        toBase: {
            'bar': (v) => v,
            'psi': (v) => v * 0.0689476,
            'Pa': (v) => v * 0.00001,
            'kPa': (v) => v * 0.01,
            'MPa': (v) => v * 10
        },
        fromBase: {
            'bar': (v) => v,
            'psi': (v) => v / 0.0689476,
            'Pa': (v) => v / 0.00001,
            'kPa': (v) => v / 0.01,
            'MPa': (v) => v / 10
        }
    },
    debit: {
        units: ['L/min', 'L/s', 'm³/h', 'gpm'],
        quickValues: [100, 250, 500, 1000, 2000, 3000, 5000, 10000],
        toBase: {
            'L/min': (v) => v,
            'L/s': (v) => v * 60,
            'm³/h': (v) => v * 16.6667,
            'gpm': (v) => v * 3.78541
        },
        fromBase: {
            'L/min': (v) => v,
            'L/s': (v) => v / 60,
            'm³/h': (v) => v / 16.6667,
            'gpm': (v) => v / 3.78541
        }
    },
    volume: {
        units: ['L', 'm³', 'gal', 'mL'],
        quickValues: [1, 10, 100, 500, 1000, 5000, 10000, 50000],
        toBase: {
            'L': (v) => v,
            'm³': (v) => v * 1000,
            'gal': (v) => v * 3.78541,
            'mL': (v) => v * 0.001
        },
        fromBase: {
            'L': (v) => v,
            'm³': (v) => v / 1000,
            'gal': (v) => v / 3.78541,
            'mL': (v) => v / 0.001
        }
    },
    distance: {
        units: ['m', 'km', 'cm', 'mm', 'ft', 'mi'],
        quickValues: [1, 10, 50, 100, 500, 1000, 5000, 10000],
        toBase: {
            'm': (v) => v,
            'km': (v) => v * 1000,
            'cm': (v) => v * 0.01,
            'mm': (v) => v * 0.001,
            'ft': (v) => v * 0.3048,
            'mi': (v) => v * 1609.34
        },
        fromBase: {
            'm': (v) => v,
            'km': (v) => v / 1000,
            'cm': (v) => v / 0.01,
            'mm': (v) => v / 0.001,
            'ft': (v) => v / 0.3048,
            'mi': (v) => v / 1609.34
        }
    },
    vitesse: {
        units: ['km/h', 'm/s', 'mph', 'kn'],
        quickValues: [10, 30, 50, 90, 110, 130, 200, 300],
        toBase: {
            'km/h': (v) => v,
            'm/s': (v) => v * 3.6,
            'mph': (v) => v * 1.60934,
            'kn': (v) => v * 1.852
        },
        fromBase: {
            'km/h': (v) => v,
            'm/s': (v) => v / 3.6,
            'mph': (v) => v / 1.60934,
            'kn': (v) => v / 1.852
        }
    },
    temperature: {
        units: ['°C', '°F', 'K'],
        quickValues: [0, 20, 37, 50, 100, 200, 500, 1000],
        toBase: {
            '°C': (v) => v,
            '°F': (v) => (v - 32) * 5/9,
            'K': (v) => v - 273.15
        },
        fromBase: {
            '°C': (v) => v,
            '°F': (v) => (v * 9/5) + 32,
            'K': (v) => v + 273.15
        }
    }
};

function selectQuickConvert(type) {
    currentConversionType = type;
    const config = conversions[type];
    
    const titles = {
        'pression': '🔧 PRESSION',
        'debit': '💧 DÉBIT',
        'volume': '🪣 VOLUME',
        'distance': '📏 DISTANCE',
        'vitesse': '🚒 VITESSE',
        'temperature': '🌡️ TEMPÉRATURE'
    };
    document.getElementById('conversionTitle').innerHTML = titles[type] || '🔄 Conversion';
    
    const unit1 = document.getElementById('unit1');
    const unit2 = document.getElementById('unit2');
    unit1.innerHTML = '';
    unit2.innerHTML = '';
    
    config.units.forEach((unit, index) => {
        const option1 = document.createElement('option');
        option1.value = unit;
        option1.textContent = unit;
        unit1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = unit;
        option2.textContent = unit;
        unit2.appendChild(option2);
    });
    
    if (config.units.length >= 2) {
        unit1.value = config.units[0];
        unit2.value = config.units[1];
    }
    
    const buttonsContainer = document.getElementById('quickValuesButtons');
    buttonsContainer.innerHTML = '';
    config.quickValues.forEach(val => {
        const btn = document.createElement('button');
        btn.textContent = val;
        btn.onclick = () => {
            document.getElementById('value1').value = val;
            convertValue();
        };
        btn.style.cssText = 'padding: 10px 20px; background: var(--primary-red); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: bold; transition: all 0.2s;';
        btn.onmouseover = function() { this.style.background = 'var(--primary-red-dark)'; };
        btn.onmouseout = function() { this.style.background = 'var(--primary-red)'; };
        buttonsContainer.appendChild(btn);
    });
    
    document.getElementById('value1').value = '';
    document.getElementById('value2').innerHTML = '--';
    
    document.getElementById('conversionZone').style.display = 'block';
    document.getElementById('conversionZone').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function convertValue() {
    const value1 = parseFloat(document.getElementById('value1').value);
    const unit1 = document.getElementById('unit1').value;
    const unit2 = document.getElementById('unit2').value;
    const value2Div = document.getElementById('value2');
    
    if (isNaN(value1) || value1 === '') {
        value2Div.innerHTML = '--';
        return;
    }
    
    const config = conversions[currentConversionType];
    
    const baseValue = config.toBase[unit1](value1);
    const result = config.fromBase[unit2](baseValue);
    
    let formattedResult;
    if (Math.abs(result) >= 1000000) {
        formattedResult = result.toExponential(4);
    } else if (Math.abs(result) < 0.01 && result !== 0) {
        formattedResult = result.toExponential(4);
    } else {
        formattedResult = result.toFixed(4).replace(/\.?0+$/, '');
    }
    
    value2Div.innerHTML = formattedResult;
}

function swapUnits() {
    const unit1 = document.getElementById('unit1');
    const unit2 = document.getElementById('unit2');
    const value1 = document.getElementById('value1');
    const value2Div = document.getElementById('value2');
    
    const tempUnit = unit1.value;
    unit1.value = unit2.value;
    unit2.value = tempUnit;
    
    const tempValue = value1.value;
    value1.value = value2Div.innerHTML !== '--' ? value2Div.innerHTML : '';
    
    convertValue();
}

function closeConverter() {
    document.getElementById('conversionZone').style.display = 'none';
    document.getElementById('value1').value = '';
    document.getElementById('value2').innerHTML = '--';
}
