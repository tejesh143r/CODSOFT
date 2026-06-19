function getMedicines() {
    return JSON.parse(localStorage.getItem('smartmed_medicines') || '[]');
}

function getMedicine() {
    const medicines = getMedicines();
    return medicines.length ? medicines[medicines.length - 1] : null;
}

function saveMedicine(medicine) {
    const medicines = getMedicines();
    medicine.id = Date.now();
    medicine.createdAt = new Date().toISOString();
    medicines.push(medicine);
    localStorage.setItem('smartmed_medicines', JSON.stringify(medicines));
    if (document.getElementById('medicine-list')) {
        renderMedicines();
    }
}

function getMedicineByName(name) {
    return getMedicines().find(med => med.name === name) || null;
}

function deleteMedicine(id) {
    const medicines = getMedicines().filter(med => med.id !== id);
    localStorage.setItem('smartmed_medicines', JSON.stringify(medicines));
    if (document.getElementById('medicine-list')) {
        renderMedicines();
    }
    showInAppNotification('Medicine removed from your SmartMed profile.');
}

function deleteSchedule(id) {
    const schedules = getSchedules().filter(schedule => schedule.id !== id);
    localStorage.setItem('smartmed_schedules', JSON.stringify(schedules));
    if (document.getElementById('schedule-list')) {
        renderSchedules();
    }
    showInAppNotification('Schedule deleted. Your reminder list is updated.');
}

const BACKEND_API_URL = 'http://localhost:3000/api';
let backendConnected = false;
let backendConnectionState = null;

async function checkBackendConnection() {
    try {
        const response = await fetch(`${BACKEND_API_URL}/health`, { method: 'GET' });
        const connected = response.ok;
        if (connected) {
            backendConnected = true;
            backendConnectionState = 'connected';
            return true;
        }
    } catch (error) {
        console.warn('Backend health check failed:', error);
    }
    backendConnected = false;
    backendConnectionState = 'disconnected';
    return false;
}

function saveSchedule(schedule) {
    const schedules = JSON.parse(localStorage.getItem('smartmed_schedules') || '[]');
    schedule.id = schedule.id || Date.now();
    schedule.createdAt = schedule.createdAt || new Date().toISOString();
    schedule.synced = schedule.synced || false;
    schedules.push(schedule);
    localStorage.setItem('smartmed_schedules', JSON.stringify(schedules));
    if (document.getElementById('schedule-list')) {
        renderSchedules();
    }
    return schedule;
}

function updateLocalSchedule(schedule) {
    const schedules = getSchedules().map(item => item.id === schedule.id ? schedule : item);
    localStorage.setItem('smartmed_schedules', JSON.stringify(schedules));
    if (document.getElementById('schedule-list')) {
        renderSchedules();
    }
}

async function sendScheduleToBackend(schedule) {
    try {
        const response = await fetch(`${BACKEND_API_URL}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();
        if (result && result.success) {
            schedule.synced = true;
            updateLocalSchedule(schedule);
        }
        return result;
    } catch (error) {
        console.warn('Backend sync failed:', error);
        return null;
    }
}

async function syncAllSchedulesToBackend() {
    const schedules = getSchedules();
    if (!schedules.length) {
        return;
    }

    const unsynced = schedules.filter(schedule => !schedule.synced);
    if (!unsynced.length) {
        return;
    }

    let anySynced = false;
    for (const schedule of unsynced) {
        const result = await sendScheduleToBackend(schedule);
        if (result && result.success) {
            anySynced = true;
        }
    }

    if (anySynced) {
        showInAppNotification('SmartMed synced schedules with the backend automatically.');
    }
}

function getSchedules() {
    return JSON.parse(localStorage.getItem('smartmed_schedules') || '[]');
}

function saveAlert(message) {
    const alerts = JSON.parse(localStorage.getItem('smartmed_alerts') || '[]');
    alerts.unshift({ message, time: new Date().toLocaleString() });
    localStorage.setItem('smartmed_alerts', JSON.stringify(alerts.slice(0, 5)));
}

function getAlerts() {
    return JSON.parse(localStorage.getItem('smartmed_alerts') || '[]');
}

function getLastNotified() {
    return JSON.parse(localStorage.getItem('smartmed_last_notified') || '{}');
}

function setLastNotified(id, dateString) {
    const record = getLastNotified();
    record[id] = dateString;
    localStorage.setItem('smartmed_last_notified', JSON.stringify(record));
}

function createNotification(title, body) {
    const message = `${title}: ${body}`;
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, { body, silent: true });
        } catch (error) {
            console.warn('Notification failed:', error);
        }
    }
    showInAppNotification(message);
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showInAppNotification('SmartMed can now send browser reminders along with in-app alerts.');
            }
        });
    }
}

function checksameDay(dateA, dateB) {
    const a = new Date(dateA);
    const b = new Date(dateB);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function checkReminders() {
    const schedules = getSchedules();
    const now = new Date();
    const notified = getLastNotified();

    schedules.forEach(schedule => {
        if (!schedule.time || !schedule.medicine) {
            return;
        }

        const scheduleTime = new Date(`${now.toDateString()} ${schedule.time}`);
        if (isNaN(scheduleTime)) {
            return;
        }

        const diffMilliseconds = now - scheduleTime;
        const shouldNotify = diffMilliseconds >= 0 && diffMilliseconds < 60000;
        const alreadyNotifiedToday = notified[schedule.id] && checksameDay(notified[schedule.id], now);

        if (shouldNotify && !alreadyNotifiedToday) {
            const contact = [];
            if (schedule.email) contact.push(`Email to ${schedule.email}`);
            if (schedule.phone) contact.push(`SMS to ${schedule.phone}`);
            const contactLabel = contact.length ? ` (${contact.join(', ')})` : '';
            const message = `Time to take ${schedule.medicine} at ${schedule.time}.${contactLabel}`;
            saveAlert(message);
            createNotification('SmartMed Reminder', message);
            setLastNotified(schedule.id, now.toISOString());
        }
    });
}

function startReminderChecker() {
    requestNotificationPermission();
    checkReminders();
    checkBackendConnection();
    syncAllSchedulesToBackend();
    setInterval(checkReminders, 15000);
    setInterval(checkBackendConnection, 30000);
    setInterval(syncAllSchedulesToBackend, 60000);
}

function renderUpcomingReminders() {
    const listEl = document.getElementById('upcoming-list');
    const schedules = getSchedules();
    listEl.innerHTML = '';

    if (!schedules.length) {
        const empty = document.createElement('li');
        empty.textContent = 'No upcoming reminders yet. Add a medicine and schedule it to get started.';
        empty.style.color = '#64748b';
        listEl.appendChild(empty);
        return;
    }

    const sortedSchedules = schedules.slice().sort((a, b) => a.time.localeCompare(b.time));
    sortedSchedules.slice(0, 5).forEach(entry => {
        const item = document.createElement('li');
        const timeText = entry.time || 'No time set';
        const repeatText = entry.repeat ? `(${entry.repeat})` : '';
        const contact = [];
        if (entry.email) contact.push(`Email: ${entry.email}`);
        if (entry.phone) contact.push(`SMS: ${entry.phone}`);
        const contactText = contact.length ? ` • ${contact.join(' • ')}` : '';
        item.textContent = `${entry.medicine} — ${timeText} ${repeatText}${contactText}`.trim();
        listEl.appendChild(item);
    });
}

function getNextReminder() {
    const schedules = getSchedules();
    if (!schedules.length) return null;

    const now = new Date();
    const upcoming = schedules
        .map(schedule => ({
            ...schedule,
            date: new Date(`${now.toDateString()} ${schedule.time}`)
        }))
        .filter(schedule => !isNaN(schedule.date))
        .sort((a, b) => a.date - b.date);

    return upcoming.find(schedule => schedule.date >= now) || upcoming[0] || null;
}

function renderNextReminder() {
    const nextEl = document.getElementById('next-reminder');
    if (!nextEl) return;

    const nextReminder = getNextReminder();
    if (!nextReminder) {
        nextEl.textContent = 'No reminders scheduled yet. Add a medicine and schedule it to get started.';
        return;
    }

    const methodText = nextReminder.methods ? nextReminder.methods.join(', ') : 'In-app';
    nextEl.textContent = `Next: ${nextReminder.medicine} at ${nextReminder.time} • ${nextReminder.repeat || 'Daily'} • ${methodText}`;
}

function renderAlertHistory() {
    const historyEl = document.getElementById('alert-history');
    if (!historyEl) return;
    const alerts = getAlerts();
    historyEl.innerHTML = '';

    if (!alerts.length) {
        const empty = document.createElement('li');
        empty.textContent = 'No alerts yet. Schedule a reminder to see app notifications here.';
        empty.style.color = '#64748b';
        historyEl.appendChild(empty);
        return;
    }

    alerts.forEach(alert => {
        const item = document.createElement('li');
        item.textContent = `${alert.time} – ${alert.message}`;
        historyEl.appendChild(item);
    });
}

function showInAppNotification(message) {
    const container = document.getElementById('app-notification');
    const messageEl = document.getElementById('app-notification-text');
    if (!container || !messageEl) return;
    messageEl.textContent = message;
    container.classList.remove('hidden');
}

function hideInAppNotification() {
    const container = document.getElementById('app-notification');
    if (!container) return;
    container.classList.add('hidden');
}

function initMedicineForm() {
    const savedMedicine = getMedicine();
    if (!savedMedicine) {
        return;
    }

    const medicineInput = document.querySelector('input[name="name"]');
    const frequencyInput = document.querySelector('input[name="frequency"]');
    const startInput = document.querySelector('input[name="start"]');
    const dosageInput = document.querySelector('input[name="dosage"]');
    const notesInput = document.querySelector('textarea[name="notes"]');

    if (medicineInput) medicineInput.value = savedMedicine.name || '';
    if (dosageInput) dosageInput.value = savedMedicine.dosage || '';
    if (frequencyInput) frequencyInput.value = savedMedicine.frequency || '';
    if (startInput) startInput.value = savedMedicine.start || '';
    if (notesInput) notesInput.value = savedMedicine.notes || '';
}

function initScheduleForm() {
    const medicines = getMedicines();
    const medicineSelect = document.getElementById('medicine-select');

    if (!medicineSelect) {
        return;
    }

    medicineSelect.innerHTML = '<option value="">Select a medicine</option>';
    medicines.forEach(med => {
        const option = document.createElement('option');
        option.value = med.name;
        option.textContent = med.name;
        medicineSelect.appendChild(option);
    });

    if (!medicines.length) {
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Add a medicine first';
        }
    }
}
