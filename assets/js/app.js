'use strict';

const {
    appsScriptUrl: APPS_SCRIPT_URL,
    adultRoutes: ADULT_ROUTES,
    kidsCamps: KIDS_CAMPS,
    youthCamps: YOUTH_CAMPS,
    kidsLevels: KIDS_LEVELS,
    youthLevels: YOUTH_LEVELS,
    examLevelLanguages: EXAM_LEVEL_LANGUAGES
} = window.EACC_CONFIG;

// DOM references and mutable application state
const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const cameraView = document.getElementById('camera-view');
        const formView = document.getElementById('form-view');
        const capturedPhoto = document.getElementById('captured-photo');
        const form = document.getElementById('data-form');
        const statusMessage = document.getElementById('status-message');
        const submitButton = document.getElementById('submit-button');
        const programmeInput = document.getElementById('programme');
        const languageInput = document.getElementById('language');
        const campGroup = document.getElementById('camp-group');
        const campInput = document.getElementById('camp');
        const levelControl = document.getElementById('level-control');
        let stream = null;
        let isSubmitting = false;

// Status and view helpers
function showStatus(message, type = 'info') {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
        }

        function clearStatus() {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }

        function setDefaultTestDate() {
            const testDate = document.getElementById('testDate');
            if (!testDate.value) {
                const today = new Date();
                const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10);
                testDate.value = formatDateDayMonthYear(localDate);
            }
        }

        // Camera workflow
async function startCamera() {
            clearStatus();
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showStatus('Camera access is unavailable in this browser. You can continue without a photo.', 'error');
                return;
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                });
                video.srcObject = stream;
            } catch (err) {
                console.warn('Camera unavailable:', err);
                showStatus('Unable to access the camera. Check browser permissions or continue without a photo.', 'error');
            }
        }

        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
        }

        function showForm() {
            stopCamera();
            cameraView.style.display = 'none';
            formView.style.display = 'block';
            setDefaultTestDate();
            updateRoutingFields();
            clearStatus();
        }

        function takePhoto() {
            if (!stream || !video.videoWidth) {
                showStatus('The camera is not ready yet. Try again or continue without a photo.', 'error');
                return;
            }

            const maxWidth = 720;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);

            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // JPEG compression keeps the web-app submission small and reliable.
            const photoData = canvas.toDataURL('image/jpeg', 0.82);
            capturedPhoto.src = photoData;
            showForm();
        }

        function continueWithoutPhoto() {
            capturedPhoto.removeAttribute('src');
            capturedPhoto.alt = 'No photo captured';
            showForm();
        }

        // Routing and dynamic form controls
function createSubmissionId() {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
            return `PT-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }

        function isValidAppsScriptUrl(value) {
            try {
                const url = new URL(value);
                return url.protocol === 'https:' &&
                    url.hostname === 'script.google.com' &&
                    url.pathname.endsWith('/exec');
            } catch (error) {
                return false;
            }
        }

        function fillCampOptions(camps) {
            const previousValue = campInput.value;
            campInput.innerHTML = '<option value="">-- Select Camp --</option>';

            camps.forEach(camp => {
                const option = document.createElement('option');
                option.value = camp;
                option.textContent = camp;
                campInput.appendChild(option);
            });

            if (camps.includes(previousValue)) {
                campInput.value = previousValue;
            }
        }

        function renderLevelField(programme, language) {
            const currentLevel = document.getElementById('level');
            const previousValue = currentLevel ? currentLevel.value : '';

            if ((programme === 'Adults' || programme === 'Private') && EXAM_LEVEL_LANGUAGES.includes(language)) {
                const levels = [`Eligible ${language}`, `Ineligible ${language}`];
                const options = ['<option value="">-- Select Level --</option>']
                    .concat(levels.map(level => `<option value="${level}">${level}</option>`));

                levelControl.innerHTML = `<select id="level" name="level" required>${options.join('')}</select>`;

                if (levels.includes(previousValue)) {
                    document.getElementById('level').value = previousValue;
                }
                return;
            }

            if (programme === 'Adults' || programme === 'Private') {
                levelControl.innerHTML = '<input type="text" id="level" name="level" required maxlength="80" placeholder="Type candidate level manually">';
                document.getElementById('level').value = previousValue;
                return;
            }

            const levels = programme === 'Kids'
                ? KIDS_LEVELS
                : programme === 'Youth'
                    ? YOUTH_LEVELS
                    : DEFAULT_LEVELS;
            const options = ['<option value="">-- Select Level --</option>']
                .concat(levels.map(level => `<option value="${level}">${level}</option>`));

            levelControl.innerHTML = `<select id="level" name="level" required>${options.join('')}</select>`;

            if (levels.includes(previousValue)) {
                document.getElementById('level').value = previousValue;
            }
        }

        function updateRoutingFields() {
            const programme = programmeInput.value;
            const language = languageInput.value;
            renderLevelField(programme, language);

            if (programme === 'Kids') {
                languageInput.required = false;
                languageInput.disabled = false;
                campGroup.style.display = 'block';
                campInput.required = true;
                fillCampOptions(KIDS_CAMPS);
                return;
            }

            if (programme === 'Youth') {
                languageInput.required = false;
                languageInput.disabled = false;
                campGroup.style.display = 'block';
                campInput.required = true;
                fillCampOptions(YOUTH_CAMPS);
                return;
            }

            if (programme === 'Private') {
                languageInput.disabled = false;
                languageInput.required = false;
                campGroup.style.display = 'none';
                campInput.required = false;
                campInput.value = '';
                return;
            }

            languageInput.disabled = false;
            languageInput.required = programme === 'Adults';
            campGroup.style.display = 'none';
            campInput.required = false;
            campInput.value = '';

            if (programme === 'Adults') {
                return;
            }
        }

        function syncRoutingFallbackFields() {
            document.getElementById('programmeFallback').value = programmeInput.value || '';
            document.getElementById('languageFallback').value = languageInput.value || '';
            document.getElementById('campFallback').value = campInput.value || '';
        }

        // Form validation and submission
function getControlValue(id) {
            const control = document.getElementById(id);
            return control ? String(control.value || '').trim() : '';
        }

        function validateRequiredDateField(id, label, errors) {
            const value = getControlValue(id);
            if (!value) {
                errors.push(`${label} is required.`);
                return;
            }

            if (!parseDayMonthYear(value)) {
                errors.push(`${label} must be a real date in DD/MM/YYYY format.`);
            }
        }

        function validateOptionalDateField(id, label, errors) {
            const value = getControlValue(id);
            if (value && !parseDayMonthYear(value)) {
                errors.push(`${label} must be a real date in DD/MM/YYYY format.`);
            }
        }

        function validateCourseTime(errors) {
            const from = getControlValue('courseTimeFrom');
            const to = getControlValue('courseTimeTo');

            if (!from && !to) {
                return;
            }

            if (!from || !to) {
                errors.push('Course Time needs both From and To, or leave both empty.');
                return;
            }

            if (from >= to) {
                errors.push('Course Time To must be after From.');
            }
        }

        function validateFormBeforeAction() {
            const errors = [];
            validateRequiredDateField('testDate', 'Test Date', errors);
            validateOptionalDateField('startingDate', 'Starting Date', errors);
            validateCourseTime(errors);

            if (errors.length) {
                showStatus(`Please fix these fields:\n${errors.join('\n')}`, 'error');
                return false;
            }

            return true;
        }

        function prepareSubmission(event) {
            if (isSubmitting) {
                event.preventDefault();
                return;
            }

            clearStatus();
            updateRoutingFields();
            syncRoutingFallbackFields();

            if (!form.reportValidity()) {
                event.preventDefault();
                return;
            }

            if (!validateFormBeforeAction()) {
                event.preventDefault();
                return;
            }

            if (!isValidAppsScriptUrl(APPS_SCRIPT_URL)) {
                event.preventDefault();
                showStatus('The Google Apps Script Web App URL is invalid. It must be an HTTPS script.google.com URL ending with /exec.', 'error');
                return;
            }

            const restoreSubmissionDateFields = prepareDateFieldsForSubmission();
            document.getElementById('submissionId').value = createSubmissionId();
            form.action = APPS_SCRIPT_URL;
            form.target = '_blank';
            isSubmitting = true;
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            showStatus('Saving the record in a new tab. Keep this form open for the next candidate.', 'info');
            window.setTimeout(() => {
                restoreSubmissionDateFields.forEach(restore => restore());
                isSubmitting = false;
                submitButton.disabled = false;
                submitButton.textContent = 'Submit to Google Sheet';
            }, 2500);
            // Do not call preventDefault(): the normal form POST is intentionally used
            // so Apps Script can save the data. The response opens in a new tab
            // because Google Apps Script pages cannot reliably navigate back to file:// forms.
        }

        // Date and time formatting
function formatTime12Hour(value) {
            if (!value || !value.includes(':')) {
                return value;
            }

            const parts = value.split(':');
            const hours24 = Number(parts[0]);
            const minutes = parts[1] || '00';

            if (Number.isNaN(hours24)) {
                return value;
            }

            const suffix = hours24 >= 12 ? 'PM' : 'AM';
            const hours12 = hours24 % 12 || 12;
            return `${hours12}:${minutes} ${suffix}`;
        }

        function formatDateDayMonthYear(value) {
            const isoMatch = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!isoMatch) {
                return normalizeDayMonthYear(value);
            }

            const [, year, month, day] = isoMatch;
            return `${day}/${month}/${year}`;
        }

        function formatDayMonthYearToIso(value) {
            const parsed = parseDayMonthYear(value);
            if (!parsed) {
                return value;
            }

            return `${parsed.year}-${parsed.month}-${parsed.day}`;
        }

        function parseDayMonthYear(value) {
            const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (!match) {
                return null;
            }

            const dayNumber = Number(match[1]);
            const monthNumber = Number(match[2]);
            const yearNumber = Number(match[3]);
            const date = new Date(yearNumber, monthNumber - 1, dayNumber);

            if (
                date.getFullYear() !== yearNumber ||
                date.getMonth() !== monthNumber - 1 ||
                date.getDate() !== dayNumber
            ) {
                return null;
            }

            return {
                day: String(dayNumber).padStart(2, '0'),
                month: String(monthNumber).padStart(2, '0'),
                year: String(yearNumber)
            };
        }

        function normalizeDayMonthYear(value) {
            const parsed = parseDayMonthYear(value);
            return parsed ? `${parsed.day}/${parsed.month}/${parsed.year}` : value;
        }

        function setupDayMonthYearDateField(id) {
            const dateInput = document.getElementById(id);
            if (!dateInput) {
                return;
            }

            dateInput.addEventListener('focus', () => {
                if (dateInput.type !== 'date') {
                    const isoValue = formatDayMonthYearToIso(dateInput.value);
                    dateInput.value = isoValue.includes('/') ? '' : isoValue;
                    dateInput.type = 'date';
                }
            });

            dateInput.addEventListener('change', () => {
                if (dateInput.type === 'date' && dateInput.value) {
                    const selectedDate = dateInput.value;
                    dateInput.type = 'text';
                    dateInput.value = formatDateDayMonthYear(selectedDate);
                }
            });

            dateInput.addEventListener('blur', () => {
                if (dateInput.type === 'date') {
                    const selectedDate = dateInput.value;
                    dateInput.type = 'text';
                    dateInput.value = formatDateDayMonthYear(selectedDate);
                } else if (dateInput.value) {
                    dateInput.value = normalizeDayMonthYear(dateInput.value);
                }
            });
        }

        function prepareDateFieldsForSubmission() {
            return ['testDate', 'startingDate']
                .map(id => {
                    const input = document.getElementById(id);
                    if (!input || !input.value) {
                        return null;
                    }

                    const originalType = input.type;
                    const originalValue = input.value;
                    const isoValue = formatDayMonthYearToIso(originalValue);
                    input.type = 'date';
                    input.value = isoValue;

                    return () => {
                        input.type = originalType;
                        input.value = originalValue;
                    };
                })
                .filter(Boolean);
        }

        function prepareDateFieldsForPdf() {
            return ['testDate', 'startingDate']
                .map(id => {
                    const input = document.getElementById(id);
                    if (!input || !input.value) {
                        return null;
                    }

                    const originalType = input.type;
                    const originalValue = input.value;
                    input.type = 'text';
                    input.value = formatDateDayMonthYear(originalValue);

                    return () => {
                        input.type = originalType;
                        input.value = originalValue;
                    };
                })
                .filter(Boolean);
        }

        function prepareTimeFieldsForPdf() {
            return ['courseTimeFrom', 'courseTimeTo']
                .map(id => {
                    const input = document.getElementById(id);
                    if (!input || !input.value) {
                        return null;
                    }

                    const originalType = input.type;
                    const originalValue = input.value;
                    input.type = 'text';
                    input.value = formatTime12Hour(originalValue);

                    return () => {
                        input.type = originalType;
                        input.value = originalValue;
                    };
                })
                .filter(Boolean);
        }

        // PDF preparation and export
function prepareEmptyFieldsForPdf(root = document) {
            const hiddenElements = [];
            const hideForPdf = element => {
                if (!element || element.classList.contains('pdf-hidden')) {
                    return;
                }

                element.classList.add('pdf-hidden');
                hiddenElements.push(element);
            };

            const isFilledControl = control => {
                if (!control || control.disabled || control.type === 'hidden') {
                    return false;
                }

                if (control.type === 'checkbox' || control.type === 'radio') {
                    return control.checked;
                }

                return String(control.value || '').trim() !== '';
            };

            root.querySelectorAll('#data-form .form-group').forEach(group => {
                const dayCheckboxes = Array.from(group.querySelectorAll('.day-checkbox input[type="checkbox"]'));
                if (dayCheckboxes.length) {
                    let hasCheckedDay = false;

                    group.querySelectorAll('.day-checkbox').forEach(dayWrapper => {
                        const checkbox = dayWrapper.querySelector('input[type="checkbox"]');
                        if (checkbox && checkbox.checked) {
                            hasCheckedDay = true;
                            return;
                        }

                        hideForPdf(dayWrapper);
                    });

                    if (!hasCheckedDay) {
                        hideForPdf(group);
                    }
                    return;
                }

                const timeWrappers = Array.from(group.querySelectorAll('.time-input-wrapper'));
                if (timeWrappers.length) {
                    let hasFilledTime = false;

                    timeWrappers.forEach(wrapper => {
                        const input = wrapper.querySelector('input');
                        if (isFilledControl(input)) {
                            hasFilledTime = true;
                            return;
                        }

                        hideForPdf(wrapper);
                    });

                    if (!hasFilledTime) {
                        hideForPdf(group);
                    }
                    return;
                }

                const controls = Array.from(group.querySelectorAll('input, select, textarea'));
                if (controls.length && !controls.some(isFilledControl)) {
                    hideForPdf(group);
                }
            });

            root.querySelectorAll('#data-form .done-by-section').forEach(section => {
                const input = section.querySelector('input');
                if (!isFilledControl(input)) {
                    hideForPdf(section);
                }
            });

            root.querySelectorAll('#data-form .form-row').forEach(row => {
                const visibleGroups = Array.from(row.querySelectorAll('.form-group'))
                    .filter(group => !group.classList.contains('pdf-hidden'));

                if (!visibleGroups.length) {
                    hideForPdf(row);
                }
            });

            return () => {
                hiddenElements.forEach(element => element.classList.remove('pdf-hidden'));
            };
        }

        function syncFormStateToClone(sourceRoot, cloneRoot) {
            const sourceControls = Array.from(sourceRoot.querySelectorAll('input, select, textarea'));
            const cloneControls = Array.from(cloneRoot.querySelectorAll('input, select, textarea'));

            sourceControls.forEach((sourceControl, index) => {
                const cloneControl = cloneControls[index];
                if (!cloneControl) {
                    return;
                }

                if (sourceControl.type === 'checkbox' || sourceControl.type === 'radio') {
                    cloneControl.checked = sourceControl.checked;
                    return;
                }

                cloneControl.value = sourceControl.value;

                if (sourceControl.tagName === 'SELECT') {
                    cloneControl.selectedIndex = sourceControl.selectedIndex;
                }
            });
        }

        function prepareCloneDatesForPdf(cloneRoot) {
            ['testDate', 'startingDate'].forEach(id => {
                const input = cloneRoot.querySelector(`#${id}`);
                if (!input || !input.value) {
                    return;
                }

                input.type = 'text';
                input.value = formatDateDayMonthYear(input.value);
            });
        }

        function prepareCloneTimesForPdf(cloneRoot) {
            ['courseTimeFrom', 'courseTimeTo'].forEach(id => {
                const input = cloneRoot.querySelector(`#${id}`);
                if (!input || !input.value) {
                    return;
                }

                input.type = 'text';
                input.value = formatTime12Hour(input.value);
            });
        }

        function createPdfClone(sourceElement) {
            const cloneHost = document.createElement('div');
            const clone = sourceElement.cloneNode(true);

            clone.id = 'printable-area-pdf';
            clone.classList.add('pdf-export');
            cloneHost.style.position = 'fixed';
            cloneHost.style.left = '-10000px';
            cloneHost.style.top = '0';
            cloneHost.style.width = '210mm';
            cloneHost.style.background = '#ffffff';
            cloneHost.appendChild(clone);
            document.body.appendChild(cloneHost);

            syncFormStateToClone(sourceElement, clone);
            prepareCloneDatesForPdf(clone);
            prepareCloneTimesForPdf(clone);
            prepareEmptyFieldsForPdf(clone);

            const actionsDiv = clone.querySelector('.actions');
            const statusDiv = clone.querySelector('#status-message');
            if (actionsDiv) {
                actionsDiv.remove();
            }
            if (statusDiv) {
                statusDiv.remove();
            }

            return { clone, cloneHost };
        }

        async function downloadPDF() {
            clearStatus();
            updateRoutingFields();

            if (!form.reportValidity()) {
                return;
            }

            if (!validateFormBeforeAction()) {
                return;
            }

            if (typeof html2pdf !== 'function') {
                showStatus('PDF could not be generated because the PDF library did not load. Check your internet connection, then refresh and try again.', 'error');
                return;
            }

            const name = document.getElementById('name').value.trim() || 'Candidate';
            const element = document.getElementById('printable-area');
            let cloneHost = null;

            window.scrollTo(0, 0);

            try {
                const pdfClone = createPdfClone(element);
                const clone = pdfClone.clone;
                cloneHost = pdfClone.cloneHost;

                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                const worker = html2pdf()
                    .set({
                        html2canvas: {
                            scale: 2,
                            useCORS: true,
                            allowTaint: false,
                            letterRendering: true,
                            scrollY: 0,
                            logging: false
                        },
                        jsPDF: {
                            unit: 'mm',
                            format: 'a4',
                            orientation: 'portrait'
                        }
                    })
                    .from(clone)
                    .toCanvas();
                const canvas = await worker.get('canvas');

                await worker.toPdf();
                const pdf = await worker.get('pdf');
                const existingPages = pdf.getNumberOfPages();
                pdf.addPage();
                for (let page = 0; page < existingPages; page += 1) {
                    pdf.deletePage(1);
                }
                pdf.setPage(1);

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 4;
                const maxWidth = pageWidth - margin * 2;
                const maxHeight = pageHeight - margin * 2;
                const imageRatio = canvas.width / canvas.height;
                let imageWidth = maxWidth;
                let imageHeight = imageWidth / imageRatio;

                if (imageHeight > maxHeight) {
                    imageHeight = maxHeight;
                    imageWidth = imageHeight * imageRatio;
                }

                const x = (pageWidth - imageWidth) / 2;
                const y = margin;
                const imageData = canvas.toDataURL('image/jpeg', 0.98);

                pdf.addImage(imageData, 'JPEG', x, y, imageWidth, imageHeight);
                pdf.save(`PlacementTest_${name.replace(/[^a-z0-9_-]+/gi, '_')}.pdf`);
                showStatus('PDF downloaded. You can now submit the form to Google Sheets.', 'info');
            } catch (err) {
                console.error('PDF generation error:', err);
                showStatus(`PDF could not be generated: ${err.message}`, 'error');
            } finally {
                if (cloneHost) {
                    cloneHost.remove();
                }
            }
        }

        // Application lifecycle
function resetForm() {
            stopCamera();
            form.reset();
            capturedPhoto.removeAttribute('src');
            capturedPhoto.alt = '';
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = 'Submit to Google Sheet';
            updateRoutingFields();
            formView.style.display = 'none';
            cameraView.style.display = 'block';
            clearStatus();
            startCamera();
        }

        form.addEventListener('submit', prepareSubmission);
        document.getElementById('take-photo-button').addEventListener('click', takePhoto);
        document.getElementById('continue-without-photo-button').addEventListener('click', continueWithoutPhoto);
        document.getElementById('download-pdf-button').addEventListener('click', downloadPDF);
        document.getElementById('reset-form-button').addEventListener('click', resetForm);
        programmeInput.addEventListener('change', updateRoutingFields);
        languageInput.addEventListener('change', updateRoutingFields);
        setupDayMonthYearDateField('testDate');
        setupDayMonthYearDateField('startingDate');
        window.addEventListener('load', startCamera);
        window.addEventListener('beforeunload', stopCamera);
