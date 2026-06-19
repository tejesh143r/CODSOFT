const screen = document.getElementById('screen');
const buttons = document.querySelectorAll('.button');
let currentValue = '';
let previousValue = '';
let operator = null;
let resetScreen = false;

function updateScreen() {
  if (previousValue !== '' && operator !== null) {
    const displayCurrent = currentValue || '';
    screen.textContent = `${previousValue} ${operator} ${displayCurrent}`.trim();
  } else {
    screen.textContent = currentValue || '0';
  }
}

function appendNumber(number) {
  if (resetScreen) {
    currentValue = '';
    resetScreen = false;
  }
  if (number === '.' && currentValue.includes('.')) return;
  currentValue = currentValue === '0' && number !== '.' ? number : currentValue + number;
  updateScreen();
}

function chooseOperator(selectedOperator) {
  if (currentValue === '') return;
  if (previousValue !== '') {
    compute();
  }
  operator = selectedOperator;
  previousValue = currentValue;
  currentValue = '';
  resetScreen = false;
  updateScreen();
}

function compute() {
  const prev = parseFloat(previousValue);
  const current = parseFloat(currentValue);
  if (isNaN(prev) || isNaN(current)) return;

  let result;
  if (operator === '+') {
    result = prev + current;
  } else if (operator === '-') {
    result = prev - current;
  } else if (operator === '*') {
    result = prev * current;
  } else if (operator === '/') {
    result = current === 0 ? 'Error' : prev / current;
  } else {
    return;
  }

  currentValue = result.toString();
  operator = null;
  previousValue = '';
  updateScreen();
}

function clearAll() {
  currentValue = '';
  previousValue = '';
  operator = null;
  resetScreen = false;
  updateScreen();
}

function deleteLast() {
  currentValue = currentValue.toString().slice(0, -1);
  updateScreen();
}

function applyPercent() {
  if (currentValue === '') return;
  currentValue = (parseFloat(currentValue) / 100).toString();
  updateScreen(currentValue);
}

buttons.forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (button.classList.contains('number')) {
      appendNumber(action);
      return;
    }

    if (button.classList.contains('operator')) {
      chooseOperator(action);
      return;
    }

    if (action === 'clear') {
      clearAll();
      return;
    }

    if (action === 'delete') {
      deleteLast();
      return;
    }

    if (action === 'percent') {
      applyPercent();
      return;
    }

    if (action === '=') {
      compute();
      return;
    }
  });
});

updateScreen('0');
