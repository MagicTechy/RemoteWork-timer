let currentUser = null;
        let currentEntry = null;
        let timerInterval = null;
        let entries = [];
        let filteredEntries = [];
        let editingIndex = null;
        let isPaused = false;
        let pausedTime = 0;
        let notificationPermission = false;
        let lastMilestoneHour = 0;
        let weeklyChart = null;
        let dailyChart = null;

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                notificationPermission = permission === "granted";
                if (notificationPermission) {
                    showNotification("Notifications enabled! You'll get alerts at timer milestones.", "info");
                }
            });
        } else if ("Notification" in window && Notification.permission === "granted") {
            notificationPermission = true;
        }

        // Simple authentication using localStorage
        // In production, you'd want a real backend
        
        function showNotification(message, type = 'success') {
            // Visual notification
            const notif = document.createElement('div');
            notif.className = `notification ${type}`;
            notif.textContent = message;
            document.body.appendChild(notif);

            setTimeout(() => {
                notif.remove();
            }, 4000);

            // Browser notification for important messages
            if (notificationPermission && (type === 'warning' || type === 'info')) {
                try {
                    new Notification('Work Timer', {
                        body: message,
                        icon: '⏱️',
                        badge: '⏱️'
                    });
                } catch (e) {
                    console.log('Notification failed:', e);
                }
            }

            // Play sound
            if (type === 'success' || type === 'warning') {
                playSound(type === 'success' ? 'success' : 'alert');
            }
        }

        function playSound(type) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                if (type === 'start') {
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.15);
                } else if (type === 'stop' || type === 'success') {
                    oscillator.frequency.value = 600;
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.2);
                } else if (type === 'alert') {
                    oscillator.frequency.value = 1000;
                    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                }
            } catch (e) {
                console.log('Audio failed:', e);
            }
        }
        
        function checkAuth() {
            const user = localStorage.getItem('currentUser');
            if (user) {
                currentUser = JSON.parse(user);
                showApp();
                loadEntries();
            } else {
                // Check if there are saved credentials
                const savedUsername = localStorage.getItem('savedUsername');
                const savedPassword = localStorage.getItem('savedPassword');
                const rememberMe = localStorage.getItem('rememberMe') === 'true';
                
                if (rememberMe && savedUsername && savedPassword) {
                    document.getElementById('loginUsername').value = savedUsername;
                    document.getElementById('loginPassword').value = savedPassword;
                    document.getElementById('rememberMe').checked = true;
                }
            }
        }

        function togglePasswordVisibility(inputId, button) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        }

        function showSignup() {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
            document.getElementById('forgotPasswordForm').style.display = 'none';
            document.getElementById('authError').textContent = '';
        }

        function showLogin() {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('forgotPasswordForm').style.display = 'none';
            document.getElementById('authError').textContent = '';
        }

        function showForgotPassword() {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('forgotPasswordForm').style.display = 'block';
            document.getElementById('authError').textContent = '';
        }

        function resetPassword() {
            const username = document.getElementById('forgotUsername').value.trim();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!username) {
                document.getElementById('authError').textContent = 'Please enter your username';
                return;
            }

            if (!newPassword || !confirmPassword) {
                document.getElementById('authError').textContent = 'Please enter and confirm your new password';
                return;
            }

            if (newPassword.length < 6) {
                document.getElementById('authError').textContent = 'Password must be at least 6 characters';
                return;
            }

            if (newPassword !== confirmPassword) {
                document.getElementById('authError').textContent = 'Passwords do not match';
                return;
            }

            const users = JSON.parse(localStorage.getItem('users') || '{}');
            
            if (!users[username]) {
                document.getElementById('authError').textContent = 'User not found';
                return;
            }

            // Reset the password
            users[username].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));

            alert('Password reset successfully! You can now login with your new password.');
            
            // Clear the form
            document.getElementById('forgotUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            showLogin();
        }

        function login(event) {
            if (event) event.preventDefault();
            
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            if (!username || !password) {
                document.getElementById('authError').textContent = 'Please enter username and password';
                return;
            }

            // Get users from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            
            if (!users[username]) {
                document.getElementById('authError').textContent = 'User not found';
                return;
            }

            if (users[username].password !== password) {
                document.getElementById('authError').textContent = 'Incorrect password';
                return;
            }

            // Save credentials if remember me is checked
            if (rememberMe) {
                localStorage.setItem('savedUsername', username);
                localStorage.setItem('savedPassword', password);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('savedUsername');
                localStorage.removeItem('savedPassword');
                localStorage.setItem('rememberMe', 'false');
            }

            currentUser = { username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
            loadEntries();
        }

        function signup(event) {
            if (event) event.preventDefault();
            
            const username = document.getElementById('signupUsername').value.trim();
            const password = document.getElementById('signupPassword').value;
            
            if (!username || !password) {
                document.getElementById('authError').textContent = 'Please enter username and password';
                return;
            }

            if (password.length < 6) {
                document.getElementById('authError').textContent = 'Password must be at least 6 characters';
                return;
            }

            // Get users from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            
            if (users[username]) {
                document.getElementById('authError').textContent = 'Username already exists';
                return;
            }

            // Create new user
            users[username] = { password, entries: [] };
            localStorage.setItem('users', JSON.stringify(users));

            // Auto-save credentials for new user
            localStorage.setItem('savedUsername', username);
            localStorage.setItem('savedPassword', password);
            localStorage.setItem('rememberMe', 'true');

            currentUser = { username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
            loadEntries();
        }

        function logout() {
            localStorage.removeItem('currentUser');
            currentUser = null;
            entries = [];
            document.getElementById('authContainer').style.display = 'block';
            document.getElementById('appContainer').style.display = 'none';
        }

        function showApp() {
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('userEmail').textContent = currentUser.username;
        }

        function loadEntries() {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[currentUser.username]) {
                entries = users[currentUser.username].entries || [];
                filteredEntries = [...entries];
                updateEntriesList();
                updateSummaryCards();
                showSyncStatus('Loaded ✓');
            }
        }

        function saveEntries() {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[currentUser.username]) {
                users[currentUser.username].entries = entries;
                localStorage.setItem('users', JSON.stringify(users));
                showSyncStatus('Saved ✓');
                updateSummaryCards();
            }
        }

        function showSyncStatus(message) {
            const status = document.getElementById('syncStatus');
            status.textContent = message;
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
        }

        // Summary Cards
        function updateSummaryCards() {
            const now = new Date();
            const today = now.toLocaleDateString();
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            let todayTotal = 0;
            let weekTotal = 0;
            let monthTotal = 0;

            entries.forEach(entry => {
                const entryDate = new Date(entry.start);
                
                if (entry.date === today) {
                    todayTotal += entry.duration;
                }
                if (entryDate >= weekStart) {
                    weekTotal += entry.duration;
                }
                if (entryDate >= monthStart) {
                    monthTotal += entry.duration;
                }
            });

            document.getElementById('todayTotal').textContent = formatDuration(todayTotal);
            document.getElementById('weekTotal').textContent = formatDuration(weekTotal);
            document.getElementById('monthTotal').textContent = formatDuration(monthTotal);
            document.getElementById('totalEntries').textContent = entries.length;
        }

        // Filters
        function applyFilters() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const fromDate = document.getElementById('fromDate').value;
            const toDate = document.getElementById('toDate').value;

            filteredEntries = entries.filter(entry => {
                if (searchTerm && !entry.task.toLowerCase().includes(searchTerm)) {
                    return false;
                }

                const entryDate = new Date(entry.start);
                if (fromDate && entryDate < new Date(fromDate)) {
                    return false;
                }
                if (toDate && entryDate > new Date(toDate + 'T23:59:59')) {
                    return false;
                }

                return true;
            });

            updateEntriesList();
        }

        function setQuickFilter(type) {
            const now = new Date();
            let fromDate, toDate;

            if (type === 'today') {
                fromDate = toDate = now.toISOString().split('T')[0];
            } else if (type === 'week') {
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                fromDate = weekStart.toISOString().split('T')[0];
                toDate = new Date().toISOString().split('T')[0];
            } else if (type === 'month') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                fromDate = monthStart.toISOString().split('T')[0];
                toDate = new Date().toISOString().split('T')[0];
            }

            document.getElementById('fromDate').value = fromDate;
            document.getElementById('toDate').value = toDate;
            applyFilters();
        }

        function clearFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('fromDate').value = '';
            document.getElementById('toDate').value = '';
            filteredEntries = [...entries];
            updateEntriesList();
        }

        // Tabs
        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            event.target.classList.add('active');
            document.getElementById(tab + 'Tab').classList.add('active');

            if (tab === 'stats') {
                updateStatistics();
            }
        }

        // Statistics
        function updateStatistics() {
            if (entries.length === 0) return;

            const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
            const uniqueDays = new Set(entries.map(e => e.date)).size;
            const avgDaily = totalDuration / uniqueDays / 3600000;

            const dayTotals = {};
            entries.forEach(entry => {
                if (!dayTotals[entry.date]) dayTotals[entry.date] = 0;
                dayTotals[entry.date] += entry.duration;
            });
            const bestDayDate = Object.keys(dayTotals).reduce((a, b) => 
                dayTotals[a] > dayTotals[b] ? a : b
            );
            const bestDayName = new Date(entries.find(e => e.date === bestDayDate).start).toLocaleDateString('en-US', { weekday: 'short' });

            const longest = entries.reduce((max, e) => e.duration > max ? e.duration : max, 0);

            document.getElementById('avgDaily').textContent = avgDaily.toFixed(1) + 'h';
            document.getElementById('bestDay').textContent = bestDayName;
            document.getElementById('longestSession').textContent = formatDuration(longest);
            document.getElementById('totalAllTime').textContent = formatDuration(totalDuration);

            updateWeeklyChart();
            updateDailyChart();
        }

        function updateWeeklyChart() {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weekData = new Array(7).fill(0);

            entries.forEach(entry => {
                const day = new Date(entry.start).getDay();
                weekData[day] += entry.duration / 3600000;
            });

            const ctx = document.getElementById('weeklyChart');
            if (weeklyChart) weeklyChart.destroy();

            weeklyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Hours Worked',
                        data: weekData,
                        backgroundColor: '#A3A380',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: { display: true, text: 'Hours' }
                        }
                    }
                }
            });
        }

        function updateDailyChart() {
            const labels = [];
            const data = [];
            const today = new Date();

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString();
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                
                labels.push(dayName);
                
                const dayTotal = entries
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + e.duration, 0) / 3600000;
                
                data.push(dayTotal);
            }

            const ctx = document.getElementById('dailyChart');
            if (dailyChart) dailyChart.destroy();

            dailyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Hours',
                        data: data,
                        borderColor: '#D8A48F',
                        backgroundColor: 'rgba(216, 164, 143, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Hours' }
                        }
                    }
                }
            });
        }

        function toggleTimer() {
            if (currentEntry) {
                stopTimer();
            } else {
                startTimer();
            }
        }

        function startTimer() {
            const taskName = document.getElementById('taskInput').value.trim() || 'Untitled task';
            
            currentEntry = {
                task: taskName,
                start: Date.now() - pausedTime,
                elapsed: 0
            };

            isPaused = false;
            lastMilestoneHour = 0;
            timerInterval = setInterval(updateCurrentTimer, 100);

            document.getElementById('currentTaskName').textContent = taskName;
            document.getElementById('currentTimer').style.display = 'block';
            document.getElementById('toggleBtn').classList.add('running');
            document.getElementById('btnIcon').textContent = '■';
            document.getElementById('btnText').textContent = 'Stop';
            document.getElementById('taskInput').value = '';
            document.getElementById('pauseBtn').style.display = 'flex';
            document.getElementById('pauseBtn').classList.remove('paused');
            document.getElementById('pauseIcon').textContent = '⏸';
            document.getElementById('pauseText').textContent = 'Pause';
            document.getElementById('timerMilestone').style.display = 'none';

            playSound('start');
            showNotification('Timer started! 🚀', 'info');
        }

        function togglePause() {
            if (isPaused) {
                // Resume
                isPaused = false;
                currentEntry.start = Date.now() - pausedTime;
                timerInterval = setInterval(updateCurrentTimer, 100);
                document.getElementById('pauseBtn').classList.remove('paused');
                document.getElementById('pauseIcon').textContent = '⏸';
                document.getElementById('pauseText').textContent = 'Pause';
            } else {
                // Pause
                isPaused = true;
                pausedTime = Date.now() - currentEntry.start;
                clearInterval(timerInterval);
                document.getElementById('pauseBtn').classList.add('paused');
                document.getElementById('pauseIcon').textContent = '▶';
                document.getElementById('pauseText').textContent = 'Resume';
            }
        }

        function stopTimer() {
            if (!currentEntry) return;

            clearInterval(timerInterval);

            const duration = isPaused ? pausedTime : (Date.now() - currentEntry.start);

            const entry = {
                id: Date.now().toString(),
                task: currentEntry.task,
                start: Date.now() - duration,
                end: Date.now(),
                duration: duration,
                date: new Date(Date.now() - duration).toLocaleDateString()
            };

            entries.unshift(entry);
            saveEntries();

            currentEntry = null;
            isPaused = false;
            pausedTime = 0;
            lastMilestoneHour = 0;
            document.getElementById('currentTimer').style.display = 'none';
            document.getElementById('toggleBtn').classList.remove('running');
            document.getElementById('btnIcon').textContent = '▶';
            document.getElementById('btnText').textContent = 'Start';
            document.getElementById('pauseBtn').style.display = 'none';

            playSound('stop');
            showNotification(`✅ Task completed! Duration: ${formatDuration(duration)}`, 'success');

            applyFilters();
            updateSummaryCards();
        }

        function updateCurrentTimer() {
            if (!currentEntry) return;

            const elapsed = isPaused ? pausedTime : (Date.now() - currentEntry.start);
            document.getElementById('currentTaskTime').textContent = formatTime(elapsed);

            // Check for hour milestones
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);

            if (hours > lastMilestoneHour && hours <= 4) {
                lastMilestoneHour = hours;
                const milestone = document.getElementById('timerMilestone');
                
                if (hours === 1) {
                    milestone.textContent = '🎉 1 hour completed! Great focus!';
                    milestone.style.display = 'block';
                    showNotification('⏱️ 1 hour milestone reached! Keep going!', 'info');
                } else if (hours === 2) {
                    milestone.textContent = '💪 2 hours! You\'re on a roll!';
                    milestone.style.display = 'block';
                    showNotification('⏱️ 2 hours of focused work! Awesome!', 'info');
                } else if (hours === 3) {
                    milestone.textContent = '🔥 3 hours! Incredible productivity!';
                    milestone.style.display = 'block';
                    showNotification('⏱️ 3 hours! You\'re crushing it!', 'info');
                } else if (hours === 4) {
                    milestone.textContent = '⚠️ 4 hours! Consider taking a break 😊';
                    milestone.style.display = 'block';
                    showNotification('⚠️ 4 hours of work! Time for a break?', 'warning');
                }

                setTimeout(() => {
                    milestone.style.display = 'none';
                }, 8000);
            }

            // Show minute milestone at 30 minutes
            if (hours === 0 && minutes === 30 && lastMilestoneHour === 0) {
                const milestone = document.getElementById('timerMilestone');
                milestone.textContent = '⏱️ 30 minutes! Halfway to your first hour!';
                milestone.style.display = 'block';
                showNotification('30 minutes completed! 👍', 'info');
                setTimeout(() => {
                    milestone.style.display = 'none';
                }, 5000);
            }
        }

        function formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        function formatDuration(ms) {
            const totalMinutes = Math.floor(ms / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
        }

        function formatTimeRange(start, end) {
            const startTime = new Date(start).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            const endTime = new Date(end).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            return `${startTime} - ${endTime}`;
        }

        function openEditModal(index) {
            editingIndex = index;
            const entry = entries[index];

            document.getElementById('editTask').value = entry.task;
            
            const startDate = new Date(entry.start);
            const endDate = new Date(entry.end);
            
            document.getElementById('editStart').value = formatDateTimeLocal(startDate);
            document.getElementById('editEnd').value = formatDateTimeLocal(endDate);

            document.getElementById('editModal').classList.add('active');
        }

        function formatDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        function closeEditModal() {
            document.getElementById('editModal').classList.remove('active');
            editingIndex = null;
        }

        function saveEdit() {
            if (editingIndex === null) return;

            const newTask = document.getElementById('editTask').value.trim();
            const newStart = new Date(document.getElementById('editStart').value).getTime();
            const newEnd = new Date(document.getElementById('editEnd').value).getTime();

            if (!newTask || !newStart || !newEnd) {
                alert('Please fill in all fields');
                return;
            }

            if (newEnd <= newStart) {
                alert('End time must be after start time');
                return;
            }

            entries[editingIndex] = {
                id: entries[editingIndex].id,
                task: newTask,
                start: newStart,
                end: newEnd,
                duration: newEnd - newStart,
                date: new Date(newStart).toLocaleDateString()
            };

            saveEntries();
            applyFilters();
            closeEditModal();
            showNotification('Entry updated successfully!', 'success');
        }

        function duplicateEntry(index) {
            const entry = entries[index];
            document.getElementById('taskInput').value = entry.task;
            document.getElementById('taskInput').focus();
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            showNotification(`📋 Task "${entry.task}" ready to start!`, 'info');
        }

        function deleteEntry(index) {
            if (!confirm('Delete this entry?')) return;

            entries.splice(index, 1);
            saveEntries();
            applyFilters();
        }

        function updateEntriesList() {
            const list = document.getElementById('sessionsList');

            if (filteredEntries.length === 0) {
                list.innerHTML = '<div class="empty-state">No entries found. Try adjusting your filters or start tracking!</div>';
            } else {
                let html = '';
                let currentDate = null;

                filteredEntries.forEach((entry, index) => {
                    // Find original index for actions
                    const originalIndex = entries.findIndex(e => e.id === entry.id);

                    if (entry.date !== currentDate) {
                        currentDate = entry.date;
                        const dateObj = new Date(entry.start);
                        const today = new Date().toLocaleDateString();
                        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
                        
                        let dateLabel = entry.date;
                        if (entry.date === today) dateLabel = 'Today';
                        else if (entry.date === yesterday) dateLabel = 'Yesterday';

                        html += `<div class="date-separator">${dateLabel}</div>`;
                    }

                    html += `
                        <div class="session-item">
                            <div class="session-info">
                                <div class="session-task">${entry.task}</div>
                                <div class="session-time">${formatTimeRange(entry.start, entry.end)}</div>
                            </div>
                            <div class="session-duration">${formatDuration(entry.duration)}</div>
                            <div class="session-actions">
                                <button class="duplicate-btn" onclick="duplicateEntry(${originalIndex})" title="Duplicate this task">📋 Duplicate</button>
                                <button class="edit-btn" onclick="openEditModal(${originalIndex})">Edit</button>
                                <button class="delete-btn" onclick="deleteEntry(${originalIndex})">Delete</button>
                            </div>
                        </div>
                    `;
                });

                list.innerHTML = html;
            }

            // Update total for filtered entries
            const total = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
            const totalHours = Math.floor(total / 3600000);
            const totalMinutes = Math.floor((total % 3600000) / 60000);

            document.getElementById('totalTime').textContent = `Total: ${totalHours}h ${totalMinutes}m`;
        }

        function exportToCSV() {
            if (entries.length === 0) {
                alert('No entries to export');
                return;
            }

            // Create CSV header
            let csv = 'Date,Task,Start Time,End Time,Duration (hours),Duration (minutes)\n';

            // Add each entry
            entries.forEach(entry => {
                const date = new Date(entry.start).toLocaleDateString();
                const startTime = new Date(entry.start).toLocaleTimeString();
                const endTime = new Date(entry.end).toLocaleTimeString();
                const durationHours = (entry.duration / 3600000).toFixed(2);
                const durationMinutes = Math.floor(entry.duration / 60000);
                
                // Escape commas in task names
                const task = entry.task.replace(/"/g, '""');
                
                csv += `"${date}","${task}","${startTime}","${endTime}",${durationHours},${durationMinutes}\n`;
            });

            // Add total row
            const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
            const totalHours = (totalDuration / 3600000).toFixed(2);
            const totalMinutes = Math.floor(totalDuration / 60000);
            csv += `\n"TOTAL","","","",${totalHours},${totalMinutes}\n`;

            // Create and download file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `work-log-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('📊 Exported to CSV successfully!', 'success');
        }

        function exportEntries() {
            if (entries.length === 0) {
                alert('No entries to export');
                return;
            }

            let text = 'WORK TIME LOG\n';
            text += '='.repeat(60) + '\n\n';

            let currentDate = null;
            entries.forEach((entry, index) => {
                if (entry.date !== currentDate) {
                    currentDate = entry.date;
                    text += `\n${entry.date}\n`;
                    text += '-'.repeat(60) + '\n';
                }

                text += `${entry.task}\n`;
                text += `  ${formatTimeRange(entry.start, entry.end)} (${formatDuration(entry.duration)})\n\n`;
            });

            const total = entries.reduce((sum, entry) => sum + entry.duration, 0);
            const totalHours = Math.floor(total / 3600000);
            const totalMinutes = Math.floor((total % 3600000) / 60000);

            text += '='.repeat(60) + '\n';
            text += `TOTAL TIME: ${totalHours}h ${totalMinutes}m\n`;

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `work-log-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }

        document.getElementById('taskInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !currentEntry) {
                toggleTimer();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Only work when app is visible and not typing in inputs (except task input for Enter)
            if (document.getElementById('appContainer').style.display === 'none') return;
            if (e.target.tagName === 'INPUT' && e.target.id !== 'taskInput' && !e.altKey) return;

            // Alt + S: Start/Stop timer
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                toggleTimer();
            }

            // Alt + P: Pause/Resume (only when timer is running)
            if (e.altKey && e.key.toLowerCase() === 'p' && currentEntry) {
                e.preventDefault();
                togglePause();
            }

            // Alt + E: Export to CSV
            if (e.altKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                exportToCSV();
            }

            // Alt + D: Duplicate last entry
            if (e.altKey && e.key.toLowerCase() === 'd' && entries.length > 0) {
                e.preventDefault();
                duplicateEntry(0);
            }
        });

        // Show welcome tip after 3 seconds
        setTimeout(() => {
            if (document.getElementById('appContainer').style.display !== 'none' && entries.length === 0) {
                showNotification('💡 Tip: Press Alt+S to start the timer quickly!', 'info');
            }
        }, 3000);

        // Check if user is already logged in
        checkAuth();