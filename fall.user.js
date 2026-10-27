// ==UserScript==
// @name         CatWar Fall Damage Calculator
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Калькулятор урона от падения с высоты для CatWar
// @author       Горицвет [1705753]
// @match        https://catwar.su/cw3/*
// @match        https://catwar.net/cw3/*
// @updateURL    https://raw.githubusercontent.com/SpringChaos-boop/Fall-Damage-Calculator/refs/heads/main/fall.user.js
// @downloadURL  https://raw.githubusercontent.com/SpringChaos-boop/Fall-Damage-Calculator/refs/heads/main/fall.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // === ПРОВЕРКА URL ===
    const currentPath = window.location.pathname;
    if (currentPath !== '/cw3/' && currentPath !== '/cw3/index.php') {
        return;
    }

    // ========== ДАННЫЕ ==========
    const DAMAGE_TABLE = {
        'young': { // до 3 лун
            1: [6, 3, 2, 2, 2, 1, 0.5, 0.5, 0.5, 0.5],
            2: [56, 28, 19, 14, 12, 10, 8, 7, 7, 5],
            3: [100, 99, 66, 50, 40, 33, 29, 25, 22, 18],
            4: [100, 100, 100, 100, 98, 82, 70, 61, 55, 44],
            5: [100, 100, 100, 100, 100, 100, 100, 100, 100, 88]
        },
        'teen': { // от 3 до 6 лун
            1: [5, 3, 2, 2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            2: [45, 23, 15, 12, 9, 8, 7, 6, 5, 4],
            3: [100, 79, 53, 40, 32, 27, 23, 20, 18, 14],
            4: [100, 100, 100, 98, 78, 65, 56, 49, 44, 35],
            5: [100, 100, 100, 100, 100, 100, 100, 99, 88, 71]
        },
        'adult': { // от 6 лун
            1: [4, 2, 2, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            2: [37, 19, 13, 10, 8, 7, 6, 5, 5, 4],
            3: [100, 66, 44, 33, 27, 22, 19, 17, 15, 12],
            4: [100, 100, 100, 82, 65, 55, 47, 41, 37, 29],
            5: [100, 100, 100, 100, 100, 100, 94, 83, 74, 59]
        }
    };

    // ========== ЛОГИКА РАСЧЁТА ==========
    function calculateDamage(ageGroup, height, climbLevel, feathers, currentHp) {
        const table = DAMAGE_TABLE[ageGroup];
        if (!table || !table[height]) return null;

        const baseDamage = table[height][climbLevel - 1];

        // Применяем перья
        let finalDamage = baseDamage * (1 - 0.08 * feathers);
        if (finalDamage < 0) finalDamage = 0;

        const roundedDamage = Math.round(finalDamage * 10) / 10;

        // 98% и выше - это смерть из-за ран, даже если HP больше
        const isLethalWounds = finalDamage >= 98;
        const isDead = finalDamage >= currentHp || isLethalWounds;

        const remainingHp = isDead ? 0 : currentHp - finalDamage;

        return {
            baseDamage: baseDamage,
            finalDamage: roundedDamage,
            isDead: isDead,
            isLethalWounds: isLethalWounds,
            remainingHp: Math.round(remainingHp * 10) / 10,
            isBaseDeath: baseDamage >= 100
        };
    }

    // ========== ИНТЕРФЕЙС ==========
    const style = document.createElement('style');
    style.textContent = `
        #fall-calc-btn {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9999;
            padding: 10px 15px;
            background: #2b323b;
            color: #eaeff6;
            border: 1px solid #a7b3c3;
            border-radius: 8px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: background 0.2s;
        }
        #fall-calc-btn:hover {
            background: #3c4552;
        }
        #fall-calc-window {
            position: fixed;
            top: 100px;
            left: 100px;
            width: 340px;
            background: #2b323b;
            border: 1px solid #a7b3c3;
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            font-family: sans-serif;
            color: #eaeff6;
            z-index: 10000;
            display: none;
            flex-direction: column;
            user-select: none;
        }
        #fall-calc-window .header {
            padding: 12px 16px;
            background: #1e242b;
            border-bottom: 1px solid #a7b3c3;
            border-radius: 10px 10px 0 0;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        }
        #fall-calc-window .header .close {
            cursor: pointer;
            font-size: 18px;
            color: #a7b3c3;
        }
        #fall-calc-window .header .close:hover {
            color: #eaeff6;
        }
        #fall-calc-window .body {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #fall-calc-window label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        #fall-calc-window select,
        #fall-calc-window input {
            width: 120px;
            padding: 5px 8px;
            background: #1e242b;
            border: 1px solid #a7b3c3;
            border-radius: 5px;
            color: #eaeff6;
            font-size: 14px;
        }
        #fall-calc-window select:focus,
        #fall-calc-window input:focus {
            outline: none;
            border-color: #eaeff6;
        }
        #fall-calc-window .result {
            margin-top: 10px;
            padding: 12px;
            background: #1e242b;
            border-radius: 8px;
            border-left: 4px solid #a7b3c3;
            font-size: 14px;
            line-height: 1.5;
        }
        #fall-calc-window .result .damage {
            font-weight: bold;
            font-size: 16px;
        }
        #fall-calc-window .result .dead {
            color: #ff6b6b;
        }
        #fall-calc-window .result .alive {
            color: #6bff6b;
        }
        #fall-calc-window .result .note {
            font-size: 12px;
            color: #a7b3c3;
            margin-top: 4px;
        }
        /* Стиль для красного выделения процента урона */
        .red-damage {
            color: #ff6b6b;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    // Кнопка
    const btn = document.createElement('div');
    btn.id = 'fall-calc-btn';
    btn.textContent = '📉 Калькулятор падения';
    document.body.appendChild(btn);

    // Окно
    const win = document.createElement('div');
    win.id = 'fall-calc-window';
    win.innerHTML = `
        <div class="header">
            <span>🧮 Урон от падения</span>
            <span class="close">×</span>
        </div>
        <div class="body">
            <label>Возраст:
                <select id="fc-age">
                    <option value="young">до 3 лун</option>
                    <option value="teen">от 3 до 6 лун</option>
                    <option value="adult">от 6 лун</option>
                </select>
            </label>
            <label>Высота:
                <select id="fc-height">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </label>
            <label>Уровень лазания:
                <select id="fc-climb">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">9 (100/∞)</option>
                </select>
            </label>
            <label>Перья (шт.):
                <input type="number" id="fc-feathers" min="0" max="20" value="0">
            </label>
            <label>Текущее HP (%):
                <input type="number" id="fc-hp" min="1" max="100" value="100">
            </label>
            <div class="result" id="fc-result">
                <!-- сюда выводится результат -->
            </div>
        </div>
    `;
    document.body.appendChild(win);

    // ========== ВЗАИМОДЕЙСТВИЕ ==========
    const closeBtn = win.querySelector('.close');
    const ageSel = win.querySelector('#fc-age');
    const heightSel = win.querySelector('#fc-height');
    const climbSel = win.querySelector('#fc-climb');
    const feathersInput = win.querySelector('#fc-feathers');
    const hpInput = win.querySelector('#fc-hp');
    const resultDiv = win.querySelector('#fc-result');

    function updateResult() {
        const age = ageSel.value;
        const height = parseInt(heightSel.value);
        const climb = parseInt(climbSel.value);
        const feathers = parseInt(feathersInput.value) || 0;
        const hp = parseFloat(hpInput.value) || 1;

        const res = calculateDamage(age, height, climb, feathers, hp);
        if (!res) {
            resultDiv.innerHTML = 'Ошибка данных';
            return;
        }

        let html = '';

        // Базовый урон
        if (res.isBaseDeath) {
            html += `<div class="note">Базовый урон: <span class="red-damage">смерть (100%)</span></div>`;
        } else {
            html += `<div class="note">Базовый урон: ${res.baseDamage}%</div>`;
        }

        // Итоговый урон (с перьями)
        // Если урон смертельный (в том числе 98-99%), красит его в красный
        const damageClass = res.isDead ? 'red-damage' : '';
        if (feathers > 0) {
            html += `<div class="note">С перьями (${feathers} шт.): <span class="${damageClass}">${res.finalDamage}%</span></div>`;
        } else {
            html += `<div class="note">Итоговый урон: <span class="${damageClass}">${res.finalDamage}%</span></div>`;
        }

        // Вердикт
        if (res.isDead) {
            let deathText = "💀 Персонаж погибает";
            // Если урон 98-99%, но HP было больше, уточняет, что убили раны
            if (res.isLethalWounds && res.finalDamage < hp) {
                deathText = "💀 Персонаж погибает (от полученных ран)";
            }
            html += `<div class="damage dead">${deathText}</div>`;
        } else {
            html += `<div class="damage alive">✅ Выживает</div>`;
            html += `<div class="note">Остаток HP: ${res.remainingHp}%</div>`;
        }

        resultDiv.innerHTML = html;
    }

    // Показать/скрыть окно
    btn.addEventListener('click', () => {
        win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
        if (win.style.display === 'flex') updateResult();
    });
    closeBtn.addEventListener('click', () => {
        win.style.display = 'none';
    });

    // Пересчёт при изменении
    [ageSel, heightSel, climbSel, feathersInput, hpInput].forEach(el => {
        el.addEventListener('input', updateResult);
        el.addEventListener('change', updateResult);
    });

    // ========== ПЕРЕТАСКИВАНИЕ ==========
    let isDragging = false;
    let offsetX, offsetY;

    const header = win.querySelector('.header');
    header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('close')) return;
        isDragging = true;
        offsetX = e.clientX - win.offsetLeft;
        offsetY = e.clientY - win.offsetTop;
        win.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        win.style.left = (e.clientX - offsetX) + 'px';
        win.style.top = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        win.style.cursor = 'default';
    });

    // Инициализация
    updateResult();
})();
