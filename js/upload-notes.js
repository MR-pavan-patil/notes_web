// js/upload-notes.js

let currentUser = null;

// CHECK AUTHENTICATION ON PAGE LOAD
(async function initUploadPage() {
    // Require user to be logged in
    currentUser = await requireAuth();

    // Display user name
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();

    if (profile) {
        document.getElementById('userName').textContent = profile.full_name;
    }
})();

// LOGOUT BUTTON
document.getElementById('logoutBtn').addEventListener('click', async function() {
    await logout();
    window.location.href = 'login.html';
});

// UPLOAD FORM SUBMIT
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get form values
    const title = document.getElementById('noteTitle').value.trim();
    const subject = document.getElementById('noteSubject').value.trim();
    const semester = parseInt(document.getElementById('noteSemester').value);
    const unit = document.getElementById('noteUnit').value.trim();
    const description = document.getElementById('noteDescription').value.trim();
    const fileInput = document.getElementById('noteFile');
    const file = fileInput.files[0];

    const messageEl = document.getElementById('uploadMessage');

    // Validation
    if (!file) {
        messageEl.textContent = 'Please select a PDF file';
        messageEl.style.color = 'red';
        return;
    }

    if (file.type !== 'application/pdf') {
        messageEl.textContent = 'Only PDF files are allowed';
        messageEl.style.color = 'red';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        messageEl.textContent = 'File size must be less than 10MB';
        messageEl.style.color = 'red';
        return;
    }

    // Show uploading message
    messageEl.textContent = 'Uploading... Please wait';
    messageEl.style.color = 'blue';

    try {
        // Step 1: Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + fileExt;
        const filePath = 'semester-' + semester + '/' + subject.replace(/\s+/g, '-').toLowerCase() + '/' + fileName;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('notes-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        console.log('File uploaded successfully:', uploadData);

        // Step 2: Insert note metadata into database
        const { data: noteData, error: noteError } = await supabaseClient
            .from('notes')
            .insert([{
                title: title,
                subject: subject,
                semester: semester,
                unit: unit,
                description: description,
                file_path: filePath,
                uploaded_by: currentUser.id
            }])
            .select();

        if (noteError) throw noteError;

        console.log('Note metadata saved:', noteData);

        // Success!
        messageEl.textContent = '✅ Notes uploaded successfully!';
        messageEl.style.color = 'green';

        // Reset form
        document.getElementById('uploadForm').reset();

        // Redirect to home page after 2 seconds
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Upload error:', error);
        messageEl.textContent = 'Error: ' + error.message;
        messageEl.style.color = 'red';
    }
});